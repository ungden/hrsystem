import { IndividualPlan, AgentMessage } from '../agent-types';
import { getEmployees, getEmployeeCareers, getPerformanceRatings, getTasks } from '@/lib/supabase-data';

export async function runPerformanceCoachAgent(plans: IndividualPlan[]): Promise<{
  updatedPlans: IndividualPlan[];
  messages: AgentMessage[];
}> {
  const [employees, employeeCareers, allRatings, allTasks] = await Promise.all([
    getEmployees(),
    getEmployeeCareers(),
    getPerformanceRatings(),
    getTasks(),
  ]);

  const activeEmployees = employees.filter((e: { status: string }) => e.status === 'Đang làm việc');
  const messages: AgentMessage[] = [];

  // Build task completion map per employee: { empId → { done, total, completionRate } }
  const empTaskMap = new Map<number, { done: number; total: number; completionRate: number }>();
  for (const emp of activeEmployees) {
    const empTasks = allTasks.filter((t: { assignee_id: number }) => t.assignee_id === emp.id);
    const done = empTasks.filter((t: { status: string }) => t.status === 'done').length;
    const total = empTasks.length;
    empTaskMap.set(emp.id, {
      done,
      total,
      completionRate: total > 0 ? done / total : 0,
    });
  }

  // Analyze each plan: use BOTH performance ratings AND real task metrics
  const riskEmployees: string[] = [];
  const starEmployees: string[] = [];

  const updatedPlans = plans.map(plan => {
    const empId = Number(plan.employeeId);
    const empRatings = allRatings.filter((r: { employee_id: number }) => r.employee_id === empId);
    const recentRating = empRatings.length > 0 ? empRatings[empRatings.length - 1] : null;
    const taskStats = empTaskMap.get(empId);
    const completionRate = taskStats?.completionRate ?? 0;

    // Risk: < 30% task completion AND weak/poor rating → at_risk
    if (completionRate < 0.3 && recentRating && (recentRating.tier === 'Weak' || recentRating.tier === 'Poor')) {
      if (plan.status === 'in_progress' || plan.status === 'not_started') {
        return { ...plan, status: 'at_risk' as const };
      }
    }

    // Also flag if just weak/poor rating (existing logic)
    if (recentRating && (recentRating.tier === 'Weak' || recentRating.tier === 'Poor')) {
      if (plan.status === 'in_progress' || plan.status === 'not_started') {
        return { ...plan, status: 'at_risk' as const };
      }
    }

    return plan;
  });

  // Aggregate employee risk/star analysis using real data
  const processedEmployees = new Set<number>();
  for (const emp of activeEmployees) {
    if (processedEmployees.has(emp.id)) continue;
    processedEmployees.add(emp.id);

    const empId = String(emp.id);
    const empPlans = updatedPlans.filter(p => p.employeeId === empId);
    const taskStats = empTaskMap.get(emp.id);
    const completionRate = taskStats?.completionRate ?? 0;

    const empRatings = allRatings.filter((r: { employee_id: number }) => r.employee_id === emp.id);
    const avgKPI = empRatings.length > 0
      ? Math.round(empRatings.reduce((s: number, r: { kpi_score: number }) => s + r.kpi_score, 0) / empRatings.length)
      : 60;
    const recentRating = empRatings.length > 0 ? empRatings[empRatings.length - 1] : null;
    const recentTier = recentRating?.tier || 'Good';

    // Risk detection: < 30% task completion AND weak/poor rating
    if (completionRate < 0.3 && (recentTier === 'Weak' || recentTier === 'Poor')) {
      riskEmployees.push(`${emp.name} (tasks: ${Math.round(completionRate * 100)}%, KPI: ${avgKPI})`);
    }
    // Star detection: ≥ 80% task completion AND strong/top rating
    else if (completionRate >= 0.8 && (recentTier === 'Strong' || recentTier === 'Top')) {
      starEmployees.push(`${emp.name} (tasks: ${Math.round(completionRate * 100)}%, KPI: ${avgKPI})`);
    }
    // Also flag employees with plans at risk but who don't meet strict criteria
    else if (empPlans.some(p => p.status === 'at_risk') || avgKPI < 55) {
      if (!riskEmployees.some(r => r.startsWith(emp.name))) {
        riskEmployees.push(`${emp.name} (KPI: ${avgKPI})`);
      }
    }
  }

  // Generate insight messages
  const totalPlans = updatedPlans.length;
  const completedCount = updatedPlans.filter(p => p.status === 'completed').length;
  const atRiskCount = updatedPlans.filter(p => p.status === 'at_risk').length;
  const inProgressCount = updatedPlans.filter(p => p.status === 'in_progress').length;

  // Overall task stats across company
  let totalTasksDone = 0;
  let totalTasksAll = 0;
  empTaskMap.forEach(stats => {
    totalTasksDone += stats.done;
    totalTasksAll += stats.total;
  });
  const overallTaskCompletion = totalTasksAll > 0 ? Math.round((totalTasksDone / totalTasksAll) * 100) : 0;

  messages.push({
    id: 'msg-coach-1',
    agentRole: 'performance_coach',
    agentName: 'AI Coach',
    timestamp: new Date().toISOString(),
    content: `Tong quan hieu suat: ${totalPlans} nhiem vu - Hoan thanh: ${completedCount} (${totalPlans > 0 ? Math.round(completedCount/totalPlans*100) : 0}%), Dang thuc hien: ${inProgressCount}, Rui ro: ${atRiskCount} (${totalPlans > 0 ? Math.round(atRiskCount/totalPlans*100) : 0}%). Task completion thuc te (Supabase): ${totalTasksDone}/${totalTasksAll} (${overallTaskCompletion}%).`,
    type: 'analysis',
  });

  if (riskEmployees.length > 0) {
    messages.push({
      id: 'msg-coach-2',
      agentRole: 'performance_coach',
      agentName: 'AI Coach',
      timestamp: new Date().toISOString(),
      content: `Canh bao: ${riskEmployees.length} nhan vien can ho tro: ${riskEmployees.slice(0, 5).join(', ')}${riskEmployees.length > 5 ? '...' : ''}. De xuat: To chuc 1-on-1 coaching, dieu chinh khoi luong cong viec, hoac ghep cap mentor.`,
      type: 'alert',
    });
  }

  if (starEmployees.length > 0) {
    messages.push({
      id: 'msg-coach-3',
      agentRole: 'performance_coach',
      agentName: 'AI Coach',
      timestamp: new Date().toISOString(),
      content: `Nhan vien xuat sac: ${starEmployees.slice(0, 5).join(', ')}${starEmployees.length > 5 ? '...' : ''}. De xuat: Xem xet thuong hieu suat, can nhac promotion, hoac giao them trach nhiem de phat trien.`,
      type: 'recommendation',
    });
  }

  return { updatedPlans, messages };
}
