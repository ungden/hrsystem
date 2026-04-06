/**
 * Proposal Generators — Each non-CEO agent generates a data-driven proposal
 * for CEO review. Proposals include metrics, actions, and cost estimates.
 */
import { AgentCoordinationState } from '../agent-types';
import { AgentProposal, CEOStrategy, ProposalAction } from './workflow-types';
import { formatCurrency } from '../format';

function genId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}`;
}

// ============ PROPOSAL REVISION ============

/**
 * Revise a rejected proposal to address CEO feedback.
 * Reduces cost by 30-50%, simplifies actions, adjusts scope.
 * Returns a new proposal with the same ID but improved numbers.
 */
export function reviseProposal(
  original: AgentProposal,
  rejectionReason: string,
  revision: number, // 1, 2, 3...
): AgentProposal {
  const costReduction = 0.3 + revision * 0.15; // 45%, 60%, 75%...
  const newCost = Math.round(original.estimatedCost * (1 - Math.min(costReduction, 0.8)));

  // Keep only the most important actions (reduce scope)
  const maxActions = Math.max(1, original.actions.length - revision);
  const trimmedActions = original.actions.slice(0, maxActions);

  // Add revision note to summary
  const revisionNote = revision === 1
    ? `[Chỉnh sửa lần 1] Giảm chi phí ${Math.round(costReduction * 100)}%, thu hẹp phạm vi.`
    : `[Chỉnh sửa lần ${revision}] Giảm thêm chi phí, tập trung hành động quan trọng nhất.`;

  return {
    ...original,
    estimatedCost: newCost,
    actions: trimmedActions,
    summary: `${revisionNote} ${original.summary}`,
    estimatedImpact: `${original.estimatedImpact} (phạm vi điều chỉnh lần ${revision})`,
    status: 'submitted',
    reviewScore: undefined,
    reviewNotes: undefined,
    reviewCriteria: undefined,
  };
}

// ============ CEO STRATEGY GENERATION ============

export function generateCEOStrategy(state: AgentCoordinationState): CEOStrategy {
  const { businessTargets, financialHealth, costProjections, individualPlans } = state;

  const revTarget = businessTargets.find(t => t.category === 'revenue');
  const revPct = revTarget ? Math.round(revTarget.currentValue / revTarget.targetValue * 100) : 0;
  const totalCost = costProjections.reduce((s, c) => s + c.totalCost, 0);
  const headcount = costProjections.reduce((s, c) => s + c.headcount, 0);
  const atRisk = individualPlans.filter(p => p.status === 'at_risk').length;
  const completionRate = individualPlans.length > 0
    ? Math.round(individualPlans.filter(p => p.status === 'completed').length / individualPlans.length * 100) : 0;

  // Determine focus based on data
  let focus: CEOStrategy['focus'] = 'growth';
  if (financialHealth.profitMargin < 10) focus = 'cost_reduction';
  else if (completionRate < 50 || atRisk > 3) focus = 'efficiency';
  else if (revPct >= 90) focus = 'quality';

  const focusLabels = {
    growth: 'TĂNG TRƯỞNG',
    cost_reduction: 'CẮT GIẢM CHI PHÍ',
    efficiency: 'NÂNG CAO HIỆU SUẤT',
    quality: 'NÂNG CAO CHẤT LƯỢNG',
  };

  return {
    focus,
    rationale: `Tình hình: DT đạt ${revPct}% mục tiêu, biên LN ${financialHealth.profitMargin}%, ` +
      `${atRisk} NV rủi ro, hoàn thành ${completionRate}%. ` +
      `Chiến lược: ${focusLabels[focus]}.`,
    budgetCeiling: Math.round(totalCost * 1.1), // max 10% increase
    revenueTarget: revTarget?.targetValue || 5_000_000_000,
    headcountCeiling: headcount + 2, // max +2 headcount
    priorities: generatePriorities(focus, state),
  };
}

function generatePriorities(focus: CEOStrategy['focus'], state: AgentCoordinationState): string[] {
  switch (focus) {
    case 'growth':
      return [
        'Tăng doanh thu kênh margin cao (Website, FB/IG)',
        'Đẩy mạnh BST mới và bestsellers',
        'Mở rộng B2B partnerships',
      ];
    case 'cost_reduction':
      return [
        'Giảm chi phí kênh ROAS thấp (Shopee)',
        'Tối ưu hóa tồn kho, giảm dead stock',
        'Cắt giảm chi phí vận hành không cần thiết',
      ];
    case 'efficiency':
      return [
        'Giải quyết NV quá tải, cân bằng công việc',
        'Tăng tỷ lệ hoàn thành KPI',
        'Tự động hóa quy trình lặp lại',
      ];
    case 'quality':
      return [
        'Nâng cấp chất lượng sản phẩm',
        'Cải thiện customer satisfaction',
        'Phát triển nhân sự, promotion ready',
      ];
  }
}

// ============ HR DIRECTOR PROPOSAL ============

export function generateHRProposal(state: AgentCoordinationState, strategy: CEOStrategy): AgentProposal {
  const { individualPlans, costProjections } = state;
  const headcount = costProjections.reduce((s, c) => s + c.headcount, 0);
  const atRisk = individualPlans.filter(p => p.status === 'at_risk');
  const completed = individualPlans.filter(p => p.status === 'completed');

  // Find overloaded departments
  const deptWorkload: Record<string, { total: number; atRisk: number; count: number }> = {};
  individualPlans.forEach(p => {
    const dept = costProjections.find(c => c.headcount > 0)?.department || 'Unknown';
    if (!deptWorkload[dept]) deptWorkload[dept] = { total: 0, atRisk: 0, count: 0 };
    deptWorkload[dept].total += p.points;
    deptWorkload[dept].count++;
    if (p.status === 'at_risk') deptWorkload[dept].atRisk++;
  });

  const actions: ProposalAction[] = [];
  const overloadedEmps = atRisk.slice(0, 3);

  overloadedEmps.forEach(emp => {
    actions.push({
      skillFn: 'coachSendReminder',
      params: { employeeId: Number(emp.employeeId), message: `Cần hỗ trợ: ${emp.taskTitle} đang at_risk` },
      description: `Gửi reminder cho ${emp.employeeName} về task "${emp.taskTitle}"`,
    });
  });

  // Recommend promotion for top performers
  const topPerformers = completed.filter(p => (p.currentValue / p.targetValue) > 1.1).slice(0, 2);
  topPerformers.forEach(p => {
    actions.push({
      skillFn: 'coachRecommendPromotion',
      params: { employeeId: Number(p.employeeId), reason: `Vượt KPI: ${Math.round(p.currentValue / p.targetValue * 100)}%` },
      description: `Đề xuất promotion cho ${p.employeeName}`,
    });
  });

  const totalSalary = costProjections.reduce((s, c) => s + c.totalBaseSalary, 0);

  return {
    id: genId('HR'),
    agentRole: 'hr_director',
    title: 'Kế hoạch Nhân sự Q2/2026',
    summary: `Quản lý ${headcount} NV, ${atRisk.length} NV rủi ro, ${completed.length} NV hoàn thành. ` +
      `Đề xuất: Hỗ trợ ${overloadedEmps.length} NV quá tải, promotion ${topPerformers.length} NV xuất sắc.`,
    metrics: [
      { name: 'Tổng nhân sự', current: headcount, target: strategy.headcountCeiling, unit: 'người' },
      { name: 'NV rủi ro', current: atRisk.length, target: 0, unit: 'người' },
      { name: 'Tỷ lệ hoàn thành', current: Math.round(completed.length / Math.max(individualPlans.length, 1) * 100), target: 80, unit: '%' },
    ],
    actions,
    estimatedCost: Math.round(totalSalary * 0.02), // 2% for training/support
    estimatedImpact: `Giảm ${overloadedEmps.length} NV rủi ro, tăng hiệu suất 10-15%`,
    status: 'submitted',
  };
}

// ============ CFO PROPOSAL ============

export function generateCFOProposal(state: AgentCoordinationState, strategy: CEOStrategy): AgentProposal {
  const { costProjections, financialHealth, financials } = state;
  const totalCost = costProjections.reduce((s, c) => s + c.totalCost, 0);
  const is = financials.incomeStatements;
  const lastMonth = is[is.length - 1];
  const totalRev = is.reduce((s, m) => s + m.doanhThu.tongDoanhThu, 0);
  const totalProfit = is.reduce((s, m) => s + m.loiNhuanSauThue, 0);

  // Find high-cost departments
  const sortedDepts = [...costProjections].sort((a, b) => b.totalCost - a.totalCost);
  const highestCostDept = sortedDepts[0];

  const actions: ProposalAction[] = [];

  // Budget optimization actions
  if (financialHealth.profitMargin < 15) {
    actions.push({
      skillFn: 'ceoAdjustTarget',
      params: { planId: 'cost-control', newTarget: Math.round(totalCost * 0.95), reason: 'Cắt giảm 5% chi phí để tăng margin' },
      description: `Đề xuất cắt giảm 5% tổng chi phí (tiết kiệm ${formatCurrency(Math.round(totalCost * 0.05))})`,
    });
  }

  return {
    id: genId('CFO'),
    agentRole: 'finance',
    title: 'Kế hoạch Tài chính Q2/2026',
    summary: `DT 12T: ${formatCurrency(totalRev)}đ, LN: ${formatCurrency(totalProfit)}đ (${financialHealth.profitMargin}%). ` +
      `Chi phí NS/T: ${formatCurrency(totalCost)}đ. PB chi phí cao nhất: ${highestCostDept?.department} (${formatCurrency(highestCostDept?.totalCost || 0)}đ).`,
    metrics: [
      { name: 'Biên LN ròng', current: financialHealth.profitMargin, target: 20, unit: '%' },
      { name: 'Doanh thu/tháng', current: Math.round(lastMonth?.doanhThu.tongDoanhThu || 0), target: Math.round(strategy.revenueTarget / 3), unit: 'VND' },
      { name: 'Chi phí NS/T', current: totalCost, target: strategy.budgetCeiling, unit: 'VND' },
      { name: 'Burn rate', current: financialHealth.burnRate, target: Math.round(financialHealth.burnRate * 0.9), unit: 'VND/tháng' },
    ],
    actions,
    estimatedCost: 0, // CFO doesn't spend, they optimize
    estimatedImpact: `Tăng margin lên ${Math.min(financialHealth.profitMargin + 3, 25)}%, tiết kiệm ${formatCurrency(Math.round(totalCost * 0.05))}`,
    status: 'submitted',
  };
}

// ============ DEPT MANAGER PROPOSAL ============

export function generateDeptManagerProposal(state: AgentCoordinationState, strategy: CEOStrategy): AgentProposal {
  const { individualPlans, departmentGoals } = state;
  const currentMonth = new Date().getMonth() + 1;

  const notStarted = individualPlans.filter(p => p.status === 'not_started');
  const inProgress = individualPlans.filter(p => p.status === 'in_progress');
  const completed = individualPlans.filter(p => p.status === 'completed');

  const actions: ProposalAction[] = [];

  // Create tasks for employees without current month tasks
  const empWithoutTasks = new Set<string>();
  const empWithTasks = new Set(individualPlans.map(p => p.employeeId));

  // Prioritize high-value not-started tasks
  notStarted.slice(0, 5).forEach(p => {
    actions.push({
      skillFn: 'deptUpdatePriority',
      params: { taskId: p.id, newPriority: 'high' },
      description: `Tăng priority "${p.taskTitle}" của ${p.employeeName}`,
    });
  });

  return {
    id: genId('DEPT'),
    agentRole: 'dept_manager',
    title: `Kế hoạch Vận hành T${currentMonth}/2026`,
    summary: `${individualPlans.length} nhiệm vụ: ${completed.length} xong, ${inProgress.length} đang làm, ${notStarted.length} chưa bắt đầu. ` +
      `Đề xuất: Tăng priority ${Math.min(notStarted.length, 5)} task quan trọng.`,
    metrics: [
      { name: 'Tổng nhiệm vụ', current: individualPlans.length, target: individualPlans.length, unit: 'task' },
      { name: 'Hoàn thành', current: completed.length, target: individualPlans.length, unit: 'task' },
      { name: 'Chưa bắt đầu', current: notStarted.length, target: 0, unit: 'task' },
      { name: 'Tỷ lệ hoàn thành', current: Math.round(completed.length / Math.max(individualPlans.length, 1) * 100), target: 85, unit: '%' },
    ],
    actions,
    estimatedCost: 0,
    estimatedImpact: `Đẩy nhanh ${Math.min(notStarted.length, 5)} task, tăng tỷ lệ hoàn thành lên ${Math.round((completed.length + Math.min(notStarted.length, 5)) / Math.max(individualPlans.length, 1) * 100)}%`,
    status: 'submitted',
  };
}

// ============ PERFORMANCE COACH PROPOSAL ============

export function generateCoachProposal(state: AgentCoordinationState, strategy: CEOStrategy): AgentProposal {
  const { individualPlans } = state;
  const atRisk = individualPlans.filter(p => p.status === 'at_risk');
  const completed = individualPlans.filter(p => p.status === 'completed');

  // Top performers: >110% achievement
  const topPerformers = completed.filter(p => p.targetValue > 0 && (p.currentValue / p.targetValue) > 1.1);
  // Struggling: at_risk + low completion
  const struggling = atRisk.filter(p => p.targetValue > 0 && (p.currentValue / p.targetValue) < 0.3);

  const actions: ProposalAction[] = [];

  // Reminders for struggling employees
  struggling.slice(0, 3).forEach(p => {
    actions.push({
      skillFn: 'coachSendReminder',
      params: { employeeId: Number(p.employeeId), message: `KPI "${p.taskTitle}" mới đạt ${Math.round(p.currentValue / p.targetValue * 100)}%. Cần hỗ trợ?` },
      description: `Reminder cho ${p.employeeName}: KPI thấp`,
    });
  });

  // Promotion for top
  topPerformers.slice(0, 2).forEach(p => {
    actions.push({
      skillFn: 'coachRecommendPromotion',
      params: { employeeId: Number(p.employeeId), reason: `Vượt KPI ${Math.round(p.currentValue / p.targetValue * 100)}%` },
      description: `Đề xuất promotion: ${p.employeeName}`,
    });
  });

  return {
    id: genId('COACH'),
    agentRole: 'performance_coach',
    title: 'Kế hoạch Hiệu suất & Phát triển',
    summary: `${atRisk.length} NV rủi ro, ${topPerformers.length} NV xuất sắc (>110% KPI). ` +
      `Đề xuất: Coaching ${struggling.length} NV yếu, promotion ${Math.min(topPerformers.length, 2)} NV giỏi.`,
    metrics: [
      { name: 'NV rủi ro', current: atRisk.length, target: 0, unit: 'người' },
      { name: 'NV xuất sắc', current: topPerformers.length, target: 5, unit: 'người' },
      { name: 'KPI TB', current: Math.round(completed.reduce((s, p) => s + (p.targetValue > 0 ? p.currentValue / p.targetValue * 100 : 0), 0) / Math.max(completed.length, 1)), target: 100, unit: '%' },
    ],
    actions,
    estimatedCost: Math.round(struggling.length * 500_000), // coaching cost estimate
    estimatedImpact: `Giảm ${struggling.length} NV yếu, tăng KPI TB lên 85%+`,
    status: 'submitted',
  };
}

// ============ CHANNEL OPTIMIZER PROPOSAL ============

export function generateChannelProposal(state: AgentCoordinationState, strategy: CEOStrategy): AgentProposal {
  const { channelAnalysis } = state;
  if (!channelAnalysis || channelAnalysis.length === 0) {
    return {
      id: genId('CH'),
      agentRole: 'channel_optimizer',
      title: 'Kế hoạch Kênh bán hàng',
      summary: 'Chưa có dữ liệu kênh bán hàng.',
      metrics: [],
      actions: [],
      estimatedCost: 0,
      estimatedImpact: 'N/A',
      status: 'submitted',
    };
  }

  const highMargin = channelAnalysis.filter(c => c.margin_pct >= 35);
  const lowROAS = channelAnalysis.filter(c => c.roas > 0 && c.roas < 4);
  const totalRev = channelAnalysis.reduce((s, c) => s + c.revenue, 0);
  const totalAds = channelAnalysis.reduce((s, c) => s + c.adSpend, 0);

  const actions: ProposalAction[] = [];

  // Recommend shifting budget from low-margin to high-margin
  const increaseChannels = channelAnalysis.filter(c => c.recommendation === 'increase');
  const decreaseChannels = channelAnalysis.filter(c => c.recommendation === 'decrease');

  return {
    id: genId('CH'),
    agentRole: 'channel_optimizer',
    title: 'Kế hoạch Tối ưu Kênh bán',
    summary: `5 kênh, DT: ${formatCurrency(totalRev)}đ. Margin cao: ${highMargin.map(c => c.channel).join(', ')}. ` +
      `${lowROAS.length > 0 ? `ROAS thấp: ${lowROAS.map(c => `${c.channel} (${c.roas}x)`).join(', ')}. ` : ''}` +
      `Đề xuất: Tăng ${increaseChannels.map(c => c.channel).join(', ') || 'giữ nguyên'}. ${decreaseChannels.length > 0 ? `Giảm ${decreaseChannels.map(c => c.channel).join(', ')}.` : ''}`,
    metrics: [
      { name: 'Tổng DT kênh', current: totalRev, target: Math.round(strategy.revenueTarget / 3), unit: 'VND' },
      { name: 'Tổng ads budget', current: totalAds, target: Math.round(totalAds * 0.9), unit: 'VND' },
      { name: 'Kênh margin >35%', current: highMargin.length, target: 3, unit: 'kênh' },
      { name: 'Kênh ROAS <4x', current: lowROAS.length, target: 0, unit: 'kênh' },
    ],
    actions,
    estimatedCost: totalAds,
    estimatedImpact: `Tăng DT kênh margin cao 15%, giảm ads kênh ROAS thấp 20%`,
    status: 'submitted',
  };
}

// ============ INVENTORY PLANNER PROPOSAL ============

export function generateInventoryProposal(state: AgentCoordinationState, strategy: CEOStrategy): AgentProposal {
  const { stockAlerts, inventoryForecasts } = state;

  const critical = stockAlerts?.filter(a => a.status === 'critical') || [];
  const low = stockAlerts?.filter(a => a.status === 'low') || [];
  const dead = stockAlerts?.filter(a => a.status === 'dead') || [];
  const forecast = inventoryForecasts?.[0];

  const actions: ProposalAction[] = [];

  // Restock critical items
  critical.forEach(item => {
    actions.push({
      skillFn: 'inventoryUpdateStock',
      params: { itemId: 0, newStock: item.minStock * 2 },
      description: `Nhập hàng gấp: ${item.itemName} (hiện: ${item.currentStock}, cần: ${item.minStock * 2})`,
    });
  });

  const productionCost = forecast
    ? forecast.productionBatches * 500 * (45_000 + 30_000) // Gildan + DTG per shirt
    : 0;

  return {
    id: genId('INV'),
    agentRole: 'inventory_planner',
    title: 'Kế hoạch Kho & Sản xuất',
    summary: `${critical.length} item hết hàng, ${low.length} sắp hết, ${dead.length} tồn cao. ` +
      `Dự báo: cần ${forecast?.demandUnits || 0} áo, sản xuất ${forecast?.productionBatches || 0} lô. ` +
      `Đề xuất: Nhập hàng gấp ${critical.length} items, clear stock ${dead.length} items.`,
    metrics: [
      { name: 'Item hết hàng', current: critical.length, target: 0, unit: 'item' },
      { name: 'Item sắp hết', current: low.length, target: 0, unit: 'item' },
      { name: 'Item tồn cao', current: dead.length, target: 0, unit: 'item' },
      { name: 'Nhu cầu tháng', current: forecast?.demandUnits || 0, target: forecast?.demandUnits || 0, unit: 'áo' },
    ],
    actions,
    estimatedCost: productionCost,
    estimatedImpact: `Đảm bảo cung ứng ${forecast?.demandUnits || 0} áo, không hết hàng`,
    status: 'submitted',
  };
}

// ============ COLLECTION DIRECTOR PROPOSAL ============

export function generateCollectionProposal(state: AgentCoordinationState, strategy: CEOStrategy): AgentProposal {
  const { collectionPlans } = state;
  const currentMonth = new Date().getMonth() + 1;

  const currentBST = collectionPlans?.find(p => p.month === currentMonth);
  const nextBST = collectionPlans?.find(p => p.month === currentMonth + 1);
  const totalSKU = collectionPlans?.reduce((s, p) => s + p.targetSKUs, 0) || 0;

  return {
    id: genId('BST'),
    agentRole: 'collection_director',
    title: `Kế hoạch BST T${currentMonth}-T${currentMonth + 1}/2026`,
    summary: `BST hiện tại: "${currentBST?.name || 'N/A'}" (${currentBST?.targetSKUs || 0} SKU). ` +
      `BST kế tiếp: "${nextBST?.name || 'N/A'}" (${nextBST?.status || 'planned'}). ` +
      `Đề xuất: Hoàn thiện BST hiện tại, bắt đầu thiết kế BST tiếp theo.`,
    metrics: [
      { name: 'SKU BST hiện tại', current: currentBST?.topSellers || 0, target: currentBST?.targetSKUs || 0, unit: 'SKU' },
      { name: 'BST kế tiếp', current: nextBST?.status === 'in_design' ? 50 : 0, target: 100, unit: '% thiết kế' },
      { name: 'Tổng SKU/năm', current: totalSKU, target: 340, unit: 'SKU' },
    ],
    actions: [],
    estimatedCost: (currentBST?.targetSKUs || 0) * 50_000, // ~50K per design (AI tools)
    estimatedImpact: `Launch ${currentBST?.targetSKUs || 0} SKU đúng lịch, chuẩn bị ${nextBST?.targetSKUs || 0} SKU cho tháng sau`,
    status: 'submitted',
  };
}

// ============ MARKET RESEARCH PROPOSAL ============

export function generateMarketResearchProposal(state: AgentCoordinationState, strategy: CEOStrategy): AgentProposal {
  const { marketResearch } = state;
  if (!marketResearch) {
    return {
      id: genId('MR'),
      agentRole: 'market_research',
      title: 'Nghiên cứu Thị trường',
      summary: 'Chưa có dữ liệu nghiên cứu thị trường.',
      metrics: [],
      actions: [],
      estimatedCost: 0,
      estimatedImpact: 'N/A',
      status: 'submitted',
    };
  }

  const { marketOverview, competitorAnalysis, opportunities, threats, trendAlerts } = marketResearch;
  const highThreats = threats.filter(t => t.severity === 'high' || t.severity === 'critical');
  const actNowTrends = trendAlerts.filter(t => t.urgency === 'act_now');
  const totalOpportunityRevenue = opportunities.reduce((s, o) => s + o.potentialRevenue, 0);

  const actions: ProposalAction[] = [];

  // Recommend acting on urgent trends
  actNowTrends.forEach(trend => {
    actions.push({
      skillFn: 'ceoAdjustTarget',
      params: { planId: 'market-action', newTarget: 0, reason: trend.recommendation },
      description: `Hành động ngay: ${trend.trend.substring(0, 60)}...`,
    });
  });

  return {
    id: genId('MR'),
    agentRole: 'market_research',
    title: 'Báo cáo Thị trường & Cơ hội Q2/2026',
    summary: `Thị trường: ${marketOverview.totalMarketSize > 0 ? formatCurrency(marketOverview.totalMarketSize) + 'đ' : 'đang phân tích'}. ` +
      `Teeworld chiếm ${marketOverview.teeworldMarketShare.toFixed(2)}% — ${marketOverview.positionVsCompetitors}. ` +
      `${opportunities.length} cơ hội (${formatCurrency(totalOpportunityRevenue)}đ potential). ` +
      `${highThreats.length} mối đe dọa cao. ${actNowTrends.length} trend cần hành động NGAY.`,
    metrics: [
      { name: 'Thị phần Teeworld', current: Math.round(marketOverview.teeworldMarketShare * 100) / 100, target: 1, unit: '%' },
      { name: 'Cơ hội DT tiềm năng', current: totalOpportunityRevenue, target: totalOpportunityRevenue, unit: 'VND' },
      { name: 'Đối thủ theo dõi', current: competitorAnalysis.length, target: competitorAnalysis.length, unit: 'đối thủ' },
      { name: 'Mối đe dọa cao', current: highThreats.length, target: 0, unit: 'threats' },
    ],
    actions,
    estimatedCost: 0, // Research doesn't cost, it informs
    estimatedImpact: `Unlock ${formatCurrency(totalOpportunityRevenue)}đ cơ hội DT tiềm năng, giảm ${highThreats.length} rủi ro thị trường`,
    status: 'submitted',
  };
}

// ============ STRATEGY ADVISOR PROPOSAL ============

export function generateStrategyProposal(state: AgentCoordinationState, strategy: CEOStrategy): AgentProposal {
  const { strategyReport } = state;
  if (!strategyReport) {
    return {
      id: genId('STR'),
      agentRole: 'strategy',
      title: 'Tư vấn Chiến lược',
      summary: 'Chưa có báo cáo chiến lược.',
      metrics: [],
      actions: [],
      estimatedCost: 0,
      estimatedImpact: 'N/A',
      status: 'submitted',
    };
  }

  const { strategicAssessment, criticalDecisions, blindSpots, quarterPriorities, ceoChallenge } = strategyReport;
  const highImpactDecisions = criticalDecisions.filter(d => d.impact === 'high');

  const actions: ProposalAction[] = [];

  // Top priority actions from quarter priorities
  quarterPriorities.slice(0, 3).forEach(p => {
    actions.push({
      skillFn: 'ceoAdjustTarget',
      params: { planId: `strategy-p${p.rank}`, newTarget: 0, reason: `${p.title}: ${p.why}` },
      description: `Ưu tiên #${p.rank}: ${p.title} (${p.owner})`,
    });
  });

  return {
    id: genId('STR'),
    agentRole: 'strategy',
    title: 'Tư vấn Chiến lược CEO — Thẳng thắn',
    summary: `Đánh giá tổng thể: ${strategicAssessment.overallHealth.toUpperCase()} (${strategicAssessment.score}/100). ` +
      `Điểm mạnh: ${strategicAssessment.topStrength}. Điểm yếu: ${strategicAssessment.topWeakness}. ` +
      `${blindSpots.length} blind spots CEO cần biết. ${highImpactDecisions.length} quyết định quan trọng cần ra ngay.`,
    metrics: [
      { name: 'Sức khỏe chiến lược', current: strategicAssessment.score, target: 80, unit: '/100' },
      { name: 'Blind spots', current: blindSpots.length, target: 0, unit: 'vấn đề' },
      { name: 'Quyết định cần ra', current: highImpactDecisions.length, target: 0, unit: 'QĐ' },
      { name: 'Ưu tiên quý', current: quarterPriorities.length, target: quarterPriorities.length, unit: 'items' },
    ],
    actions,
    estimatedCost: 0,
    estimatedImpact: `CEO CHALLENGE: ${ceoChallenge.substring(0, 100)}...`,
    status: 'submitted',
  };
}

// ============ GENERATE ALL PROPOSALS ============

export function generateAllProposals(state: AgentCoordinationState, strategy: CEOStrategy): AgentProposal[] {
  return [
    generateHRProposal(state, strategy),
    generateCFOProposal(state, strategy),
    generateDeptManagerProposal(state, strategy),
    generateCoachProposal(state, strategy),
    generateChannelProposal(state, strategy),
    generateInventoryProposal(state, strategy),
    generateCollectionProposal(state, strategy),
    generateMarketResearchProposal(state, strategy),
    generateStrategyProposal(state, strategy),
  ];
}
