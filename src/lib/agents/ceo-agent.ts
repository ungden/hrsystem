import { BusinessTarget, AgentMessage, QuarterPeriod } from '../agent-types';
import { getEmployees, getEmployeeCareers, getMasterPlans, getMonthlyPnL, getDeals, getPerformanceRatings, getTasks } from '@/lib/supabase-data';

// Quarter → month labels in monthly_pnl (T1, T2, ...)
const quarterMonths: Record<string, string[]> = {
  Q1: ['T1', 'T2', 'T3'],
  Q2: ['T4', 'T5', 'T6'],
  Q3: ['T7', 'T8', 'T9'],
  Q4: ['T10', 'T11', 'T12'],
};

// Quarter → month numbers for filtering tasks/deals
const quarterMonthNumbers: Record<string, number[]> = {
  Q1: [1, 2, 3],
  Q2: [4, 5, 6],
  Q3: [7, 8, 9],
  Q4: [10, 11, 12],
};

export async function runCEOAgent(year: number, quarter: QuarterPeriod): Promise<{
  targets: BusinessTarget[];
  messages: AgentMessage[];
}> {
  const [employees, employeeCareers, pnlData, deals, allRatings, allTasks, masterPlans] = await Promise.all([
    getEmployees(),
    getEmployeeCareers(),
    getMonthlyPnL(),
    getDeals(),
    getPerformanceRatings(),
    getTasks(),
    getMasterPlans({ role: 'ceo', year }),
  ]);

  const activeEmployees = employees.filter((e: { status: string }) => e.status !== 'inactive');
  const totalSalary = employeeCareers.reduce((s: number, c: { current_salary: number }) => s + (c.current_salary || 0), 0);
  const departments = [...new Set(employees.map((e: { department: string }) => e.department))];

  // ---- 1. Revenue target from master_plans or fallback 20B / 4 quarters ----
  const revenuePlan = masterPlans.find((p: { plan_type: string; quarter: string }) =>
    p.plan_type === 'revenue' && p.quarter === quarter);
  const fallbackQuarterTargets: Record<string, number> = { Q1: 6_000_000_000, Q2: 4_000_000_000, Q3: 4_400_000_000, Q4: 5_600_000_000 };
  const revenueTarget = revenuePlan?.target_value ?? fallbackQuarterTargets[quarter] ?? 5_000_000_000;

  // Revenue actual: sum monthly_pnl.total_revenue for quarter months
  const months = quarterMonths[quarter];
  const quarterPnl = pnlData.filter((row: { month: string; year: number }) =>
    months.includes(row.month) && row.year === year);
  const revenueActual = quarterPnl.reduce((s: number, row: { total_revenue: number }) => s + (row.total_revenue || 0), 0);

  // ---- 2. Growth: count deals in the quarter period ----
  const monthNums = quarterMonthNumbers[quarter];
  const quarterDeals = deals.filter((d: { date: string }) => {
    if (!d.date) return false;
    const dt = new Date(d.date);
    return dt.getFullYear() === year && monthNums.includes(dt.getMonth() + 1);
  });
  const growthPlan = masterPlans.find((p: { plan_type: string; quarter: string }) =>
    p.plan_type === 'growth' && p.quarter === quarter);
  const growthTarget = growthPlan?.target_value ?? activeEmployees.length * 2;
  const growthActual = quarterDeals.length;

  // ---- 3. Efficiency: average kpi_score from performance_ratings ----
  const efficiencyPlan = masterPlans.find((p: { plan_type: string; quarter: string }) =>
    p.plan_type === 'efficiency' && p.quarter === quarter);
  const efficiencyTarget = efficiencyPlan?.target_value ?? 80;
  const avgKPI = allRatings.length > 0
    ? Math.round(allRatings.reduce((s: number, r: { kpi_score: number }) => s + (r.kpi_score || 0), 0) / allRatings.length)
    : 60;
  const efficiencyActual = avgKPI;

  // ---- 4. Quality: real task completion rate (done/total) ----
  const quarterTasks = allTasks.filter((t: { month_number: number }) =>
    monthNums.includes(t.month_number));
  const totalTasks = quarterTasks.length;
  const doneTasks = quarterTasks.filter((t: { status: string }) => t.status === 'done').length;
  const qualityPlan = masterPlans.find((p: { plan_type: string; quarter: string }) =>
    p.plan_type === 'quality' && p.quarter === quarter);
  const qualityTarget = qualityPlan?.target_value ?? 85;
  const qualityActual = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  // ---- 5. Customer satisfaction from master_plans or fallback ----
  const satisfactionPlan = masterPlans.find((p: { plan_type: string; quarter: string }) =>
    p.plan_type === 'satisfaction' && p.quarter === quarter);
  const satisfactionTarget = satisfactionPlan?.target_value ?? 90;
  // Use deal completion rate as proxy for customer satisfaction
  const completedDeals = quarterDeals.filter((d: { stage: string }) =>
    d.stage === 'Đã hoàn thành' || d.stage === 'Won' || d.stage === 'completed').length;
  const satisfactionActual = quarterDeals.length > 0
    ? Math.round((completedDeals / quarterDeals.length) * 100)
    : 0;

  function getStatus(actual: number, target: number): BusinessTarget['status'] {
    const ratio = actual / target;
    if (ratio >= 1) return 'achieved';
    if (ratio >= 0.8) return 'on_track';
    if (ratio >= 0.6) return 'at_risk';
    return 'behind';
  }

  const targets: BusinessTarget[] = [
    {
      id: 'bt-1',
      year,
      quarter,
      name: `Doanh thu ${quarter}/${year}`,
      category: 'revenue',
      targetValue: revenueTarget,
      currentValue: revenueActual,
      unit: 'VND',
      status: getStatus(revenueActual, revenueTarget),
    },
    {
      id: 'bt-2',
      year,
      quarter,
      name: `Khach hang moi ${quarter}/${year}`,
      category: 'growth',
      targetValue: growthTarget,
      currentValue: growthActual,
      unit: 'khach hang',
      status: getStatus(growthActual, growthTarget),
    },
    {
      id: 'bt-3',
      year,
      quarter,
      name: `Hieu suat KPI trung binh`,
      category: 'efficiency',
      targetValue: efficiencyTarget,
      currentValue: efficiencyActual,
      unit: '%',
      status: getStatus(efficiencyActual, efficiencyTarget),
    },
    {
      id: 'bt-4',
      year,
      quarter,
      name: `Ty le hoan thanh cong viec`,
      category: 'quality',
      targetValue: qualityTarget,
      currentValue: qualityActual,
      unit: '%',
      status: getStatus(qualityActual, qualityTarget),
    },
    {
      id: 'bt-5',
      year,
      quarter,
      name: `Hai long khach hang`,
      category: 'quality',
      targetValue: satisfactionTarget,
      currentValue: satisfactionActual,
      unit: '%',
      status: getStatus(satisfactionActual, satisfactionTarget),
    },
  ];

  const messages: AgentMessage[] = [
    {
      id: 'msg-ceo-1',
      agentRole: 'ceo',
      agentName: 'AI CEO',
      timestamp: new Date().toISOString(),
      content: `Da thiet lap 5 muc tieu kinh doanh cho ${quarter}/${year}. Doanh thu muc tieu: ${(revenueTarget / 1_000_000_000).toFixed(1)} ty VND, thuc te: ${(revenueActual / 1_000_000_000).toFixed(1)} ty VND. Chi phi nhan su ${(totalSalary / 1_000_000_000).toFixed(1)} ty. Doi ngu ${activeEmployees.length} nhan su tren ${departments.length} phong ban. Task completion: ${qualityActual}% (${doneTasks}/${totalTasks} tasks). Deals trong quy: ${growthActual}.`,
      type: 'decision',
    },
    {
      id: 'msg-ceo-2',
      agentRole: 'ceo',
      agentName: 'AI CEO',
      timestamp: new Date().toISOString(),
      content: targets.filter(t => t.status === 'behind' || t.status === 'at_risk').length > 0
        ? `Canh bao: ${targets.filter(t => t.status === 'behind' || t.status === 'at_risk').map(t => t.name).join(', ')} dang can chu y. Yeu cau HR Director va cac truong phong phan bo lai nguon luc.`
        : `Tat ca muc tieu dang trong tam kiem soat. Tiep tuc duy tri hieu suat hien tai.`,
      type: targets.some(t => t.status === 'behind') ? 'alert' : 'analysis',
    },
  ];

  return { targets, messages };
}
