import { DepartmentGoal, IndividualPlan, AgentMessage } from '../agent-types';
import { getEmployees, getTasks } from '@/lib/supabase-data';

export async function runDeptManagerAgent(goals: DepartmentGoal[]): Promise<{
  plans: IndividualPlan[];
  messages: AgentMessage[];
}> {
  const [employees, allTasks] = await Promise.all([
    getEmployees(),
    getTasks(),
  ]);

  const activeEmployees = employees.filter((e: { status: string }) => e.status === 'Đang làm việc');
  const departments = [...new Set(activeEmployees.map((e: { department: string }) => e.department))];

  const allPlans: IndividualPlan[] = [];
  const allMessages: AgentMessage[] = [];
  let planId = 1;

  for (const dept of departments) {
    const deptGoals = goals.filter(g => g.department === dept);
    const deptEmployees = activeEmployees.filter((e: { department: string }) => e.department === dept);
    if (deptEmployees.length === 0 || deptGoals.length === 0) continue;

    for (const goal of deptGoals) {
      for (const emp of deptEmployees) {
        const empTasks = allTasks.filter((t: { assignee_id: number }) => t.assignee_id === emp.id);
        const totalPoints = empTasks.reduce((s: number, t: { points: number }) => s + (t.points || 0), 0);
        const donePoints = empTasks
          .filter((t: { status: string }) => t.status === 'done')
          .reduce((s: number, t: { points: number }) => s + (t.points || 0), 0);

        const completionRatio = totalPoints > 0 ? donePoints / totalPoints : 0;

        let status: IndividualPlan['status'] = 'not_started';
        if (completionRatio >= 1) status = 'completed';
        else if (completionRatio >= 0.5) status = 'in_progress';
        else if (completionRatio >= 0.2) status = 'at_risk';

        const taskTitle = empTasks.length > 0
          ? empTasks[0].title
          : 'Khong co task';

        // Latest due_date from tasks, or end of current quarter
        const dueDates = empTasks
          .filter((t: { due_date: string | null }) => t.due_date)
          .map((t: { due_date: string }) => t.due_date)
          .sort();
        const deadline = dueDates.length > 0
          ? dueDates[dueDates.length - 1]
          : '2026-06-30';

        const weight = deptEmployees.length > 0 ? Math.round(100 / deptEmployees.length) : 100;

        allPlans.push({
          id: `ip-${planId}`,
          departmentGoalId: goal.id,
          employeeId: String(emp.id),
          employeeName: emp.name,
          taskTitle,
          description: `${empTasks.length} task, ${donePoints}/${totalPoints} diem hoan thanh`,
          targetValue: totalPoints,
          currentValue: donePoints,
          unit: goal.unit,
          weight,
          deadline,
          status,
          points: totalPoints,
        });
        planId++;
      }
    }

    // Summary message per dept
    const deptPlans = allPlans.filter(p =>
      deptEmployees.some((e: { id: number }) => String(e.id) === p.employeeId)
    );
    const completed = deptPlans.filter(p => p.status === 'completed').length;
    const atRisk = deptPlans.filter(p => p.status === 'at_risk').length;
    const deptTaskCount = allTasks.filter((t: { assignee_id: number }) =>
      deptEmployees.some((e: { id: number }) => e.id === t.assignee_id)
    ).length;

    allMessages.push({
      id: `msg-dm-${dept}`,
      agentRole: 'dept_manager',
      agentName: `Truong phong ${dept}`,
      timestamp: new Date().toISOString(),
      content: `${dept}: ${deptTaskCount} task thuc te tu Supabase, phan bo cho ${deptEmployees.length} nhan vien -> ${deptPlans.length} ke hoach ca nhan. Hoan thanh: ${completed}, Rui ro: ${atRisk}.`,
      type: 'decision',
    });
  }

  return { plans: allPlans, messages: allMessages };
}
