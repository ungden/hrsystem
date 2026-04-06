import { IndividualPlan, AgentMessage } from '../agent-types';
import { getEmployees, getEmployeeCareers, getPerformanceRatings, getTasksWithActuals, type TaskWithActual } from '@/lib/supabase-data';

export async function runPerformanceCoachAgent(plans: IndividualPlan[]): Promise<{
  updatedPlans: IndividualPlan[];
  messages: AgentMessage[];
}> {
  const [employees, employeeCareers, allRatings, allTasks] = await Promise.all([
    getEmployees(),
    getEmployeeCareers(),
    getPerformanceRatings(),
    getTasksWithActuals(),
  ]);

  const activeEmployees = employees.filter((e: { status: string }) => e.status === 'Đang làm việc');
  const messages: AgentMessage[] = [];

  // Build task completion + KPI achievement map per employee
  const empTaskMap = new Map<number, { done: number; total: number; completionRate: number; kpiPct: number; kpiTasks: number }>();
  for (const emp of activeEmployees) {
    const empTasks = (allTasks as TaskWithActual[]).filter(t => t.assignee_id === emp.id);
    const done = empTasks.filter(t => t.status === 'done').length;
    const total = empTasks.length;

    // KPI achievement from real submissions
    const kpiTasks = empTasks.filter(t => t.kpi_target);
    let kpiTgt = 0, kpiAct = 0;
    kpiTasks.forEach(t => {
      const tv = parseFloat(String(t.kpi_target).replace(/[^0-9.]/g, ''));
      if (!isNaN(tv) && tv > 0) { kpiTgt += tv; kpiAct += t.actualTotal || 0; }
    });

    empTaskMap.set(emp.id, {
      done,
      total,
      completionRate: total > 0 ? done / total : 0,
      kpiPct: kpiTgt > 0 ? Math.round((kpiAct / kpiTgt) * 100) : 0,
      kpiTasks: kpiTasks.length,
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

    const kpiPct = taskStats?.kpiPct ?? 0;
    const kpiTaskCount = taskStats?.kpiTasks ?? 0;
    const kpiLabel = kpiTaskCount > 0 ? `, KPI TT: ${kpiPct}%` : '';

    // Risk detection: < 30% task completion AND weak/poor rating, OR KPI < 30% with submissions
    if (completionRate < 0.3 && (recentTier === 'Weak' || recentTier === 'Poor')) {
      riskEmployees.push(`${emp.name} (tasks: ${Math.round(completionRate * 100)}%, KPI: ${avgKPI}${kpiLabel})`);
    }
    else if (kpiTaskCount > 0 && kpiPct < 30 && completionRate < 0.5) {
      riskEmployees.push(`${emp.name} (tasks: ${Math.round(completionRate * 100)}%${kpiLabel} - KPI thực tế quá thấp)`);
    }
    // Star detection: ≥ 80% task completion AND strong/top rating
    else if (completionRate >= 0.8 && (recentTier === 'Strong' || recentTier === 'Top')) {
      starEmployees.push(`${emp.name} (tasks: ${Math.round(completionRate * 100)}%, KPI: ${avgKPI}${kpiLabel})`);
    }
    // Also flag employees with plans at risk
    else if (empPlans.some(p => p.status === 'at_risk') || avgKPI < 55) {
      if (!riskEmployees.some(r => r.startsWith(emp.name))) {
        riskEmployees.push(`${emp.name} (KPI: ${avgKPI}${kpiLabel})`);
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
    content: (() => {
      let totalKpiTgt = 0, totalKpiAct = 0, totalKpiCount = 0;
      empTaskMap.forEach(stats => { totalKpiCount += stats.kpiTasks; });
      (allTasks as TaskWithActual[]).forEach(t => {
        if (t.kpi_target) {
          const tv = parseFloat(String(t.kpi_target).replace(/[^0-9.]/g, ''));
          if (!isNaN(tv) && tv > 0) { totalKpiTgt += tv; totalKpiAct += t.actualTotal || 0; }
        }
      });
      const overallKpi = totalKpiTgt > 0 ? Math.round((totalKpiAct / totalKpiTgt) * 100) : 0;
      return `Tổng quan hiệu suất: ${totalPlans} nhiệm vụ - Hoàn thành: ${completedCount} (${totalPlans > 0 ? Math.round(completedCount/totalPlans*100) : 0}%), Đang thực hiện: ${inProgressCount}, Rủi ro: ${atRiskCount}. Task: ${totalTasksDone}/${totalTasksAll} (${overallTaskCompletion}%). KPI thực tế: ${overallKpi}% (${totalKpiCount} chỉ tiêu có submission).`;
    })(),
    type: 'analysis',
  });

  if (riskEmployees.length > 0) {
    messages.push({
      id: 'msg-coach-2',
      agentRole: 'performance_coach',
      agentName: 'AI Coach',
      timestamp: new Date().toISOString(),
      content: `Cảnh báo: ${riskEmployees.length} nhân viên cần hỗ trợ: ${riskEmployees.slice(0, 5).join(', ')}${riskEmployees.length > 5 ? '...' : ''}. Đề xuất: Tổ chức 1-on-1 coaching, điều chỉnh khối lượng công việc, hoặc ghép cặp mentor.`,
      type: 'alert',
    });
  }

  if (starEmployees.length > 0) {
    messages.push({
      id: 'msg-coach-3',
      agentRole: 'performance_coach',
      agentName: 'AI Coach',
      timestamp: new Date().toISOString(),
      content: `Nhân viên xuất sắc: ${starEmployees.slice(0, 5).join(', ')}${starEmployees.length > 5 ? '...' : ''}. Đề xuất: Xem xét thưởng hiệu suất, cân nhắc promotion, hoặc giao thêm trách nhiệm để phát triển.`,
      type: 'recommendation',
    });
  }

  return { updatedPlans, messages };
}
