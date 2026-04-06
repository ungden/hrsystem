import { DepartmentGoal, IndividualPlan, AgentMessage } from '../agent-types';
import { getEmployees, getTasksWithActuals, type TaskWithActual } from '@/lib/supabase-data';

export async function runDeptManagerAgent(goals: DepartmentGoal[]): Promise<{
  plans: IndividualPlan[];
  messages: AgentMessage[];
}> {
  const [employees, allTasks] = await Promise.all([
    getEmployees(),
    getTasksWithActuals(),
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
        const empTasks = (allTasks as TaskWithActual[]).filter(t => t.assignee_id === emp.id);
        const totalPoints = empTasks.reduce((s, t) => s + (t.points || 0), 0);
        const donePoints = empTasks
          .filter(t => t.status === 'done')
          .reduce((s, t) => s + (t.points || 0), 0);

        // KPI achievement from real submissions
        const kpiTasks = empTasks.filter(t => t.kpi_target);
        let kpiTgt = 0, kpiAct = 0;
        kpiTasks.forEach(t => {
          const tv = parseFloat(String(t.kpi_target).replace(/[^0-9.]/g, ''));
          if (!isNaN(tv) && tv > 0) { kpiTgt += tv; kpiAct += t.actualTotal || 0; }
        });
        const kpiPct = kpiTgt > 0 ? Math.round((kpiAct / kpiTgt) * 100) : 0;

        const completionRatio = totalPoints > 0 ? donePoints / totalPoints : 0;

        // Use both task completion AND KPI achievement for status
        let status: IndividualPlan['status'] = 'not_started';
        if (completionRatio >= 1) status = 'completed';
        else if (completionRatio >= 0.5) status = 'in_progress';
        else if (completionRatio >= 0.2) status = 'at_risk';

        // Override: if KPI tasks exist but achievement is very low, flag as at_risk
        if (kpiTasks.length > 0 && kpiPct < 30 && status === 'in_progress') {
          status = 'at_risk';
        }

        const taskTitle = empTasks.length > 0
          ? empTasks[0].title
          : 'Không có task';

        const dueDates = empTasks
          .filter(t => t.due_date)
          .map(t => t.due_date)
          .sort();
        const deadline = dueDates.length > 0
          ? dueDates[dueDates.length - 1]
          : '2026-06-30';

        const weight = deptEmployees.length > 0 ? Math.round(100 / deptEmployees.length) : 100;
        const kpiInfo = kpiTasks.length > 0 ? `, KPI: ${kpiPct}% (${kpiTasks.length} chỉ tiêu)` : '';

        allPlans.push({
          id: `ip-${planId}`,
          departmentGoalId: goal.id,
          employeeId: String(emp.id),
          employeeName: emp.name,
          taskTitle,
          description: `${empTasks.length} task, ${donePoints}/${totalPoints} điểm hoàn thành${kpiInfo}`,
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
    const deptTasks = (allTasks as TaskWithActual[]).filter(t =>
      deptEmployees.some((e: { id: number }) => e.id === t.assignee_id)
    );
    const deptKpiTasks = deptTasks.filter(t => t.kpi_target);
    let deptKpiTgt = 0, deptKpiAct = 0;
    deptKpiTasks.forEach(t => {
      const tv = parseFloat(String(t.kpi_target).replace(/[^0-9.]/g, ''));
      if (!isNaN(tv) && tv > 0) { deptKpiTgt += tv; deptKpiAct += t.actualTotal || 0; }
    });
    const deptKpiPct = deptKpiTgt > 0 ? Math.round((deptKpiAct / deptKpiTgt) * 100) : 0;

    allMessages.push({
      id: `msg-dm-${dept}`,
      agentRole: 'dept_manager',
      agentName: `Trưởng phòng ${dept}`,
      timestamp: new Date().toISOString(),
      content: `${dept}: ${deptTasks.length} task, ${deptEmployees.length} NV -> ${deptPlans.length} KH cá nhân. Hoàn thành: ${completed}, Rủi ro: ${atRisk}. KPI thực tế: ${deptKpiPct}% (${deptKpiTasks.length} chỉ tiêu).`,
      type: 'decision',
    });
  }

  return { plans: allPlans, messages: allMessages };
}
