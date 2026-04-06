import { BusinessTarget, AgentMessage, ChannelAnalysis, QuarterPeriod } from '../agent-types';
import { MarketResearchReport } from './market-research-agent';
import { getEmployees, getEmployeeCareers, getMasterPlans, getMonthlyPnL, getDeals, getPerformanceRatings, getTasksWithActuals, type TaskWithActual } from '@/lib/supabase-data';

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

/** Market intelligence gathered in Phase 1, informing CEO decisions */
export interface MarketIntelligence {
  marketResearch: MarketResearchReport;
  channelAnalysis: ChannelAnalysis[];
}

export async function runCEOAgent(year: number, quarter: QuarterPeriod, intel?: MarketIntelligence): Promise<{
  targets: BusinessTarget[];
  messages: AgentMessage[];
}> {
  const [employees, employeeCareers, pnlData, deals, allRatings, allTasks, masterPlans] = await Promise.all([
    getEmployees(),
    getEmployeeCareers(),
    getMonthlyPnL(),
    getDeals(),
    getPerformanceRatings(),
    getTasksWithActuals(),
    getMasterPlans({ role: 'ceo', year }),
  ]);

  const activeEmployees = employees.filter((e: { status: string }) => e.status === 'Đang làm việc');
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

  // ---- 4. Quality: real task completion rate (done/total) + KPI achievement from submissions ----
  const quarterTasks = (allTasks as TaskWithActual[]).filter(t =>
    monthNums.includes(t.month_number || 0));
  const totalTasks = quarterTasks.length;
  const doneTasks = quarterTasks.filter(t => t.status === 'done').length;

  // KPI achievement from real submissions (KH vs TT)
  const kpiTasks = quarterTasks.filter(t => t.kpi_target);
  let kpiTargetSum = 0, kpiActualSum = 0;
  kpiTasks.forEach(t => {
    const tgt = parseFloat(String(t.kpi_target).replace(/[^0-9.]/g, ''));
    if (!isNaN(tgt) && tgt > 0) {
      kpiTargetSum += tgt;
      kpiActualSum += t.actualTotal || 0;
    }
  });
  const kpiAchievementPct = kpiTargetSum > 0 ? Math.round((kpiActualSum / kpiTargetSum) * 100) : 0;
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
      name: `Khách hàng mới ${quarter}/${year}`,
      category: 'growth',
      targetValue: growthTarget,
      currentValue: growthActual,
      unit: 'khách hàng',
      status: getStatus(growthActual, growthTarget),
    },
    {
      id: 'bt-3',
      year,
      quarter,
      name: `Hiệu suất KPI trung bình`,
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
      name: `Tỷ lệ hoàn thành công việc`,
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
      name: `Hài lòng khách hàng`,
      category: 'quality',
      targetValue: satisfactionTarget,
      currentValue: satisfactionActual,
      unit: '%',
      status: getStatus(satisfactionActual, satisfactionTarget),
    },
  ];

  // ---- Market Intelligence Context (if available from Phase 1) ----
  let marketContext = '';
  if (intel) {
    const { marketResearch: mr, channelAnalysis: ch } = intel;
    const highMargin = ch.filter(c => c.margin_pct >= 35);
    const lowMargin = ch.filter(c => c.margin_pct < 25);
    const topCompetitor = mr.competitorAnalysis[0];
    const urgentTrends = mr.trendAlerts.filter(t => t.urgency === 'act_now');

    marketContext = ` | THỊ TRƯỜNG: Graphic tees VN ~${(mr.marketOverview.totalMarketSize / 1e12).toFixed(1)} nghìn tỷ, Teeworld chiếm ${mr.marketOverview.teeworldMarketShare.toFixed(2)}%. ` +
      `Kênh margin cao: ${highMargin.map(c => `${c.channel} (${c.margin_pct}%)`).join(', ')}. ` +
      `${lowMargin.length > 0 ? `Kênh lỗ/margin thấp: ${lowMargin.map(c => `${c.channel} (${c.margin_pct}%)`).join(', ')}. ` : ''}` +
      `Đối thủ lớn nhất: ${topCompetitor?.name || 'N/A'} (${topCompetitor ? (topCompetitor.revenue / 1e9).toFixed(0) + ' tỷ' : '?'}). ` +
      `${urgentTrends.length} trend cần hành động ngay.`;
  }

  const messages: AgentMessage[] = [
    {
      id: 'msg-ceo-1',
      agentRole: 'ceo',
      agentName: 'AI CEO',
      timestamp: new Date().toISOString(),
      content: `[${quarter}/${year}] 5 mục tiêu KD. DT: ${(revenueTarget / 1e9).toFixed(1)} tỷ (thực: ${(revenueActual / 1e9).toFixed(1)} tỷ). ` +
        `NS: ${activeEmployees.length} NV / ${departments.length} PB, lương ${(totalSalary / 1e9).toFixed(1)} tỷ. ` +
        `Tasks: ${qualityActual}% (${doneTasks}/${totalTasks}). KPI submissions: ${kpiAchievementPct}% (${kpiTasks.length} tasks). ` +
        `Deals: ${growthActual}.${marketContext}`,
      type: 'decision',
    },
    {
      id: 'msg-ceo-2',
      agentRole: 'ceo',
      agentName: 'AI CEO',
      timestamp: new Date().toISOString(),
      content: targets.filter(t => t.status === 'behind' || t.status === 'at_risk').length > 0
        ? `CẢNH BÁO: ${targets.filter(t => t.status === 'behind' || t.status === 'at_risk').map(t => `${t.name} (${Math.round(t.currentValue / t.targetValue * 100)}%)`).join(', ')} đang cần chú ý. ` +
          `${intel ? `Dựa trên data thị trường, tập trung nguồn lực vào kênh margin cao (Website/FB). Giảm phụ thuộc sàn TMĐT.` : 'Yêu cầu HR Director và các trưởng phòng phân bổ lại nguồn lực.'}`
        : `Tất cả mục tiêu đang trong tầm kiểm soát. ${intel ? 'Thị trường ủng hộ chiến lược D2C hiện tại.' : 'Tiếp tục duy trì hiệu suất.'}`,
      type: targets.some(t => t.status === 'behind') ? 'alert' : 'analysis',
    },
  ];

  return { targets, messages };
}
