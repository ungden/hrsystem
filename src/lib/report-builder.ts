/**
 * Executive Report Data Builder
 *
 * Pulls real Supabase data and computes narrative-ready sections
 * for board/investor-grade reports.
 */

import {
  getEmployees,
  getEmployeeCareers,
  getDeals,
  getTasks,
  getChannelEconomics,
  getMonthlyPnL,
  getProducts,
  getOrders,
  getInventory,
  getPerformanceRatings,
  getMasterPlans,
} from './supabase-data';
import { generateIncomeStatements, generateBalanceSheet, calculateFinancialHealth } from './financial-data';

// ============ TYPES ============

export interface ExecutiveReportData {
  generatedAt: string;
  year: number;

  // Business overview
  overview: {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    profitMargin: number;
    revenueTarget: number;
    targetAchievement: number;
    headcount: number;
    activeProducts: number;
    totalOrders: number;
    totalDeals: number;
    avgKPI: number;
  };

  // Monthly P&L trend
  monthlyPnL: {
    month: string;
    revenue: number;
    expenses: number;
    profit: number;
    margin: number;
  }[];

  // Channel analysis
  channels: {
    name: string;
    revenue: number;
    share: number;
    margin: number;
    orders: number;
  }[];

  // Department performance
  departments: {
    name: string;
    headcount: number;
    avgKPI: number;
    tasksDone: number;
    tasksTotal: number;
    completionRate: number;
    totalCost: number;
  }[];

  // Top performers & risks
  employees: {
    topPerformers: { name: string; department: string; kpiScore: number }[];
    atRisk: { name: string; department: string; kpiScore: number }[];
  };

  // Pipeline / Deals
  pipeline: {
    stage: string;
    count: number;
    totalValue: number;
  }[];

  // Inventory health
  inventory: {
    totalItems: number;
    totalValue: number;
    lowStock: number;
    criticalStock: number;
  };

  // Financial health ratios
  financialHealth: {
    currentRatio: number;
    debtToEquity: number;
    profitMargin: number;
    operatingMargin: number;
    burnRate: number;
  };

  // Master plan progress
  masterPlanProgress: {
    total: number;
    completed: number;
    inProgress: number;
    atRisk: number;
    planned: number;
  };

  // Quarter comparison
  quarterComparison: {
    quarter: string;
    revenue: number;
    profit: number;
    margin: number;
  }[];
}

// ============ BUILDER ============

export async function buildExecutiveReport(year: number = 2026): Promise<ExecutiveReportData> {
  // Parallel data fetch
  const [
    employees,
    careers,
    deals,
    tasks,
    channels,
    pnlData,
    products,
    orders,
    inventory,
    ratings,
    masterPlans,
    incomeStatements,
  ] = await Promise.all([
    getEmployees(),
    getEmployeeCareers(),
    getDeals(),
    getTasks(),
    getChannelEconomics(),
    getMonthlyPnL(),
    getProducts(),
    getOrders(),
    getInventory(),
    getPerformanceRatings(),
    getMasterPlans({ year }),
    generateIncomeStatements(),
  ]);

  // Balance sheet + health
  const balanceSheet = await generateBalanceSheet(incomeStatements);
  const financialHealth = calculateFinancialHealth(incomeStatements, balanceSheet);

  // Active employees
  const activeEmps = employees.filter((e: { status: string }) => e.status === 'Đang làm việc');

  // ---- Monthly P&L ----
  const monthlyPnL = incomeStatements.map((m) => ({
    month: m.month,
    revenue: m.doanhThu.tongDoanhThu,
    expenses: m.chiPhi.tongChiPhi,
    profit: m.loiNhuanSauThue,
    margin: m.doanhThu.tongDoanhThu > 0 ? (m.loiNhuanSauThue / m.doanhThu.tongDoanhThu) * 100 : 0,
  }));

  const totalRevenue = monthlyPnL.reduce((s, m) => s + m.revenue, 0);
  const totalExpenses = monthlyPnL.reduce((s, m) => s + m.expenses, 0);
  const netProfit = monthlyPnL.reduce((s, m) => s + m.profit, 0);

  // Revenue target from master plan
  const revPlan = masterPlans.find((p: { role: string; title: string }) => p.role === 'ceo' && p.title?.includes('Doanh thu'));
  const revenueTarget = revPlan?.target_value || 20_000_000_000;

  // ---- Channel analysis ----
  // channel_economics table: channel, revenue_share (%), margin_pct (%), profit_per_unit
  // Revenue per channel = totalRevenue * share/100
  const channelData = channels.map((ch: { channel: string; revenue_share: number; margin_pct: string | number; profit_per_unit: number }) => {
    const share = ch.revenue_share || 0;
    const margin = typeof ch.margin_pct === 'string' ? parseFloat(ch.margin_pct) : (ch.margin_pct || 0);
    return {
      name: ch.channel || 'Unknown',
      revenue: Math.round(totalRevenue * share / 100),
      share,
      margin,
      orders: 0,
    };
  });

  // Enrich with order counts
  const ordersByChannel: Record<string, number> = {};
  orders.forEach((o: { channel: string }) => {
    const ch = o.channel || 'Unknown';
    ordersByChannel[ch] = (ordersByChannel[ch] || 0) + 1;
  });
  channelData.forEach((ch: { name: string; orders: number }) => {
    ch.orders = ordersByChannel[ch.name] || 0;
  });

  // ---- Department performance ----
  const deptMap: Record<string, { headcount: number; kpiScores: number[]; done: number; total: number; cost: number }> = {};
  activeEmps.forEach((emp: { department: string; base_salary?: number }) => {
    const dept = emp.department || 'Khác';
    if (!deptMap[dept]) deptMap[dept] = { headcount: 0, kpiScores: [], done: 0, total: 0, cost: 0 };
    deptMap[dept].headcount++;
    const career = careers.find((c: { employee_id: number }) => c.employee_id === emp.base_salary);
    if (career) deptMap[dept].cost += career.current_salary || 0;
  });

  // KPI scores
  ratings.forEach((r: { employee_id: number; kpi_score: number }) => {
    const emp = activeEmps.find((e: { id: number }) => e.id === r.employee_id);
    if (emp) {
      const dept = emp.department || 'Khác';
      if (deptMap[dept]) deptMap[dept].kpiScores.push(r.kpi_score || 0);
    }
  });

  // Task stats
  tasks.forEach((t: { department: string; status: string }) => {
    const dept = t.department || 'Khác';
    if (!deptMap[dept]) deptMap[dept] = { headcount: 0, kpiScores: [], done: 0, total: 0, cost: 0 };
    deptMap[dept].total++;
    if (t.status === 'done') deptMap[dept].done++;
  });

  const departments = Object.entries(deptMap).map(([name, d]) => ({
    name,
    headcount: d.headcount,
    avgKPI: d.kpiScores.length > 0 ? Math.round(d.kpiScores.reduce((a, b) => a + b, 0) / d.kpiScores.length) : 0,
    tasksDone: d.done,
    tasksTotal: d.total,
    completionRate: d.total > 0 ? Math.round((d.done / d.total) * 100) : 0,
    totalCost: d.cost,
  })).sort((a, b) => b.headcount - a.headcount);

  // ---- KPI scores for top/risk ----
  const empKPIs: { name: string; department: string; kpiScore: number }[] = [];
  ratings.forEach((r: { employee_id: number; kpi_score: number }) => {
    const emp = activeEmps.find((e: { id: number }) => e.id === r.employee_id);
    if (emp) {
      empKPIs.push({ name: emp.name, department: emp.department, kpiScore: r.kpi_score || 0 });
    }
  });
  empKPIs.sort((a, b) => b.kpiScore - a.kpiScore);
  const topPerformers = empKPIs.slice(0, 5);
  const atRisk = empKPIs.filter(e => e.kpiScore < 60).slice(0, 5);

  const avgKPI = empKPIs.length > 0 ? Math.round(empKPIs.reduce((s, e) => s + e.kpiScore, 0) / empKPIs.length) : 0;

  // ---- Pipeline ----
  const pipelineMap: Record<string, { count: number; value: number }> = {};
  deals.forEach((d: { stage: string; amount: number }) => {
    const stage = d.stage || 'Unknown';
    if (!pipelineMap[stage]) pipelineMap[stage] = { count: 0, value: 0 };
    pipelineMap[stage].count++;
    pipelineMap[stage].value += d.amount || 0;
  });
  const pipeline = Object.entries(pipelineMap).map(([stage, d]) => ({
    stage,
    count: d.count,
    totalValue: d.value,
  }));

  // ---- Inventory ----
  const invItems = inventory || [];
  const totalInvValue = invItems.reduce((s: number, i: { stock_quantity: number; unit_cost: number }) => s + (i.stock_quantity || 0) * (i.unit_cost || 0), 0);
  const lowStock = invItems.filter((i: { stock_quantity: number; min_stock: number }) => i.stock_quantity <= (i.min_stock || 10) && i.stock_quantity > 0).length;
  const criticalStock = invItems.filter((i: { stock_quantity: number }) => i.stock_quantity <= 0).length;

  // ---- Master plan progress ----
  const masterOnly = masterPlans.filter((p: { plan_type: string }) => p.plan_type === 'master');
  const masterPlanProgress = {
    total: masterOnly.length,
    completed: masterOnly.filter((p: { status: string }) => p.status === 'completed').length,
    inProgress: masterOnly.filter((p: { status: string }) => p.status === 'in_progress').length,
    atRisk: masterOnly.filter((p: { status: string }) => p.status === 'at_risk').length,
    planned: masterOnly.filter((p: { status: string }) => p.status === 'planned').length,
  };

  // ---- Quarter comparison ----
  // Month format from incomeStatements: "T1/2026", "T2/2026", etc.
  const quarterMonths: Record<string, string[]> = {
    'Q1': ['T1/', 'T2/', 'T3/'],
    'Q2': ['T4/', 'T5/', 'T6/'],
    'Q3': ['T7/', 'T8/', 'T9/'],
    'Q4': ['T10/', 'T11/', 'T12/'],
  };
  const quarterComparison = Object.entries(quarterMonths).map(([q, prefixes]) => {
    const qData = monthlyPnL.filter(m => prefixes.some(p => m.month.startsWith(p)));
    const rev = qData.reduce((s, m) => s + m.revenue, 0);
    const prof = qData.reduce((s, m) => s + m.profit, 0);
    return {
      quarter: q,
      revenue: rev,
      profit: prof,
      margin: rev > 0 ? (prof / rev) * 100 : 0,
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    year,
    overview: {
      totalRevenue,
      totalExpenses,
      netProfit,
      profitMargin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0,
      revenueTarget,
      targetAchievement: revenueTarget > 0 ? (totalRevenue / revenueTarget) * 100 : 0,
      headcount: activeEmps.length,
      activeProducts: (products || []).filter((p: { status: string }) => p.status === 'active').length,
      totalOrders: orders.length,
      totalDeals: deals.length,
      avgKPI,
    },
    monthlyPnL,
    channels: channelData,
    departments,
    employees: { topPerformers, atRisk },
    pipeline,
    inventory: {
      totalItems: invItems.length,
      totalValue: totalInvValue,
      lowStock,
      criticalStock,
    },
    financialHealth: {
      currentRatio: financialHealth.currentRatio,
      debtToEquity: financialHealth.debtToEquity,
      profitMargin: financialHealth.profitMargin,
      operatingMargin: financialHealth.operatingMargin,
      burnRate: financialHealth.burnRate,
    },
    masterPlanProgress,
    quarterComparison,
  };
}

// ============ FORMAT HELPERS ============

export function fmtVND(val: number): string {
  if (Math.abs(val) >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(1)} tỷ`;
  if (Math.abs(val) >= 1_000_000) return `${(val / 1_000_000).toFixed(0)}M`;
  if (Math.abs(val) >= 1_000) return `${(val / 1_000).toFixed(0)}K`;
  return val.toLocaleString('vi-VN');
}

export function fmtPct(val: number): string {
  return `${val.toFixed(1)}%`;
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
