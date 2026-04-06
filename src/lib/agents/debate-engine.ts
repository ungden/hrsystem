/**
 * Debate Engine — CEO asks data-specific questions, agents defend with real numbers.
 * No LLM needed — templates parameterized with actual business data.
 */
import { AgentCoordinationState, AgentRole } from '../agent-types';
import { AgentProposal, CEOStrategy, DebateMessage, ReviewCriteria } from './workflow-types';
import { formatCurrency } from '../format';

let debateCounter = 0;

function genDebateId(): string {
  return `debate-${++debateCounter}`;
}

// ============ CEO QUESTION GENERATION ============

export function generateCEOQuestion(
  proposal: AgentProposal,
  criteria: ReviewCriteria,
  strategy: CEOStrategy,
  state: AgentCoordinationState,
  round: number,
): DebateMessage {
  // Find weakest criterion to question about
  const weakest = findWeakest(criteria);
  const question = buildQuestion(weakest, proposal, strategy, state);

  return {
    id: genDebateId(),
    from: 'ceo',
    to: proposal.agentRole,
    content: question.content,
    type: 'question',
    dataPoints: question.dataPoints,
    timestamp: new Date().toISOString(),
    round,
  };
}

// ============ AGENT DEFENSE GENERATION ============

export function generateAgentDefense(
  proposal: AgentProposal,
  question: DebateMessage,
  strategy: CEOStrategy,
  state: AgentCoordinationState,
  round: number,
): DebateMessage {
  const defense = buildDefense(proposal.agentRole, proposal, question, strategy, state);

  return {
    id: genDebateId(),
    from: proposal.agentRole,
    to: 'ceo',
    content: defense.content,
    type: 'defense',
    dataPoints: defense.dataPoints,
    timestamp: new Date().toISOString(),
    round,
  };
}

// ============ QUESTION BUILDERS ============

interface QContent {
  content: string;
  dataPoints: string[];
}

function findWeakest(criteria: ReviewCriteria): string {
  const entries: [string, number][] = [
    ['budget', criteria.budgetAlignment],
    ['target', criteria.targetAlignment],
    ['headcount', criteria.headcountImpact],
    ['risk', criteria.riskLevel],
    ['data', criteria.dataQuality],
  ];
  return entries.sort((a, b) => a[1] - b[1])[0][0];
}

function buildQuestion(
  weakArea: string,
  proposal: AgentProposal,
  strategy: CEOStrategy,
  state: AgentCoordinationState,
): QContent {
  const { financialHealth, costProjections } = state;
  const totalCost = costProjections.reduce((s, c) => s + c.totalCost, 0);

  switch (weakArea) {
    case 'budget': {
      const pct = Math.round(proposal.estimatedCost / strategy.budgetCeiling * 100);
      return {
        content: `Chi phí đề xuất ${formatCurrency(proposal.estimatedCost)}d chiếm ${pct}% ngân sách (trần: ${formatCurrency(strategy.budgetCeiling)}d). ` +
          `Hiện biên LN ${financialHealth.profitMargin}%. Bạn có thể giảm chi phí hoặc chia giai đoạn không?`,
        dataPoints: [`Chi phí: ${formatCurrency(proposal.estimatedCost)}d`, `Ngân sách: ${formatCurrency(strategy.budgetCeiling)}d`, `LN: ${financialHealth.profitMargin}%`],
      };
    }

    case 'target': {
      const focusLabel = { growth: 'tăng trưởng', cost_reduction: 'cắt giảm chi phí', efficiency: 'hiệu suất', quality: 'chất lượng' }[strategy.focus];
      return {
        content: `Chiến lược Q này là ${focusLabel}. Đề xuất "${proposal.title}" đóng góp cụ thể bao nhiêu % vào mục tiêu ${focusLabel}? ` +
          `Cần số liệu cụ thể.`,
        dataPoints: [`Focus: ${focusLabel}`, `Đề xuất: ${proposal.title}`],
      };
    }

    case 'headcount': {
      const headcount = costProjections.reduce((s, c) => s + c.headcount, 0);
      return {
        content: `Hiện tại ${headcount} NV, trần ${strategy.headcountCeiling}. ` +
          `Đề xuất có cần thêm người không? Nếu có, chi phí tuyển dụng + lương bao nhiêu?`,
        dataPoints: [`Headcount: ${headcount}`, `Trần: ${strategy.headcountCeiling}`],
      };
    }

    case 'risk': {
      return {
        content: `Đề xuất có ${proposal.actions.length} hành động thực thi. ` +
          `Nếu 1 hành động thất bại, ảnh hưởng gì đến các hành động còn lại? ` +
          `Phương án dự phòng là gì?`,
        dataPoints: [`Số hành động: ${proposal.actions.length}`],
      };
    }

    case 'data':
    default: {
      const emptyMetrics = proposal.metrics.filter(m => m.current === 0);
      return {
        content: `${emptyMetrics.length}/${proposal.metrics.length} chỉ số chưa có dữ liệu thực tế (giá trị = 0). ` +
          `Bạn đang dựa trên dữ liệu gì để đề xuất? Có thể cung cấp số liệu cụ thể hơn không?`,
        dataPoints: [`Metrics có data: ${proposal.metrics.length - emptyMetrics.length}/${proposal.metrics.length}`],
      };
    }
  }
}

// ============ DEFENSE BUILDERS ============

function buildDefense(
  agentRole: AgentRole,
  proposal: AgentProposal,
  question: DebateMessage,
  strategy: CEOStrategy,
  state: AgentCoordinationState,
): QContent {
  switch (agentRole) {
    case 'hr_director':
      return buildHRDefense(proposal, question, state);
    case 'finance':
      return buildCFODefense(proposal, question, state);
    case 'dept_manager':
      return buildDeptDefense(proposal, question, state);
    case 'performance_coach':
      return buildCoachDefense(proposal, question, state);
    case 'channel_optimizer':
      return buildChannelDefense(proposal, question, state);
    case 'inventory_planner':
      return buildInventoryDefense(proposal, question, state);
    case 'collection_director':
      return buildCollectionDefense(proposal, question, state);
    case 'market_research':
      return buildMarketResearchDefense(proposal, question, state);
    case 'strategy':
      return buildStrategyDefense(proposal, question, state);
    default:
      return { content: `Đã tiếp nhận ý kiến CEO. Sẽ điều chỉnh đề xuất.`, dataPoints: [] };
  }
}

function buildHRDefense(proposal: AgentProposal, question: DebateMessage, state: AgentCoordinationState): QContent {
  const { individualPlans, costProjections } = state;
  const atRisk = individualPlans.filter(p => p.status === 'at_risk');
  const headcount = costProjections.reduce((s, c) => s + c.headcount, 0);
  const avgSalary = costProjections.reduce((s, c) => s + c.totalBaseSalary, 0) / Math.max(headcount, 1);
  const turnoverCost = Math.round(avgSalary * 2); // Industry standard: 2x salary

  const topRisk = atRisk.slice(0, 3).map(p => `${p.employeeName} (${p.taskTitle})`);

  return {
    content: `Hiện ${atRisk.length} NV rủi ro: ${topRisk.join(', ')}. ` +
      `Nếu mất 1 NV, chi phí thay thế = ${formatCurrency(turnoverCost)}d (2x lương TB). ` +
      `Chi phí đề xuất chỉ ${formatCurrency(proposal.estimatedCost)}d = ${Math.round(proposal.estimatedCost / turnoverCost * 100)}% chi phí mất 1 NV. ` +
      `Đầu tư này giúp giữ chân ${atRisk.length} NV đang gặp khó khăn.`,
    dataPoints: [
      `NV rủi ro: ${atRisk.length}`,
      `Chi phí turnover: ${formatCurrency(turnoverCost)}d/NV`,
      `Chi phí đề xuất: ${formatCurrency(proposal.estimatedCost)}d`,
    ],
  };
}

function buildCFODefense(proposal: AgentProposal, question: DebateMessage, state: AgentCoordinationState): QContent {
  const { financialHealth, financials } = state;
  const is = financials.incomeStatements;
  const last3Rev = is.slice(-3).reduce((s, m) => s + m.doanhThu.tongDoanhThu, 0);
  const last3Profit = is.slice(-3).reduce((s, m) => s + m.loiNhuanSauThue, 0);
  const margin3m = Math.round(last3Profit / last3Rev * 100);

  return {
    content: `3 tháng gần nhất: DT ${formatCurrency(last3Rev)}d, LN ${formatCurrency(last3Profit)}d (margin ${margin3m}%). ` +
      `Burn rate: ${formatCurrency(financialHealth.burnRate)}d/tháng. ` +
      `Runway: ${Math.round(financials.balanceSheet.data.taiSanNganHan.tienMat / financialHealth.burnRate)} tháng. ` +
      `Đề xuất cắt giảm nhằm tăng margin từ ${financialHealth.profitMargin}% lên ${financialHealth.profitMargin + 3}%. ` +
      `Không ảnh hưởng doanh thu vì chỉ tối ưu chi phí vận hành.`,
    dataPoints: [
      `DT 3T: ${formatCurrency(last3Rev)}d`,
      `LN 3T: ${formatCurrency(last3Profit)}d`,
      `Burn rate: ${formatCurrency(financialHealth.burnRate)}d`,
    ],
  };
}

function buildDeptDefense(proposal: AgentProposal, question: DebateMessage, state: AgentCoordinationState): QContent {
  const { individualPlans } = state;
  const completed = individualPlans.filter(p => p.status === 'completed').length;
  const total = individualPlans.length;
  const rate = Math.round(completed / Math.max(total, 1) * 100);
  const notStarted = individualPlans.filter(p => p.status === 'not_started').length;

  return {
    content: `Tỷ lệ hoàn thành hiện tại: ${rate}% (${completed}/${total}). ` +
      `Còn ${notStarted} task chưa bắt đầu. ` +
      `Tăng priority ${proposal.actions.length} task sẽ đẩy nhanh tiến độ. ` +
      `Không phát sinh chi phí, chỉ thay đổi thứ tự ưu tiên.`,
    dataPoints: [
      `Hoàn thành: ${completed}/${total} (${rate}%)`,
      `Chưa bắt đầu: ${notStarted}`,
      `Actions: ${proposal.actions.length}`,
    ],
  };
}

function buildCoachDefense(proposal: AgentProposal, question: DebateMessage, state: AgentCoordinationState): QContent {
  const { individualPlans } = state;
  const atRisk = individualPlans.filter(p => p.status === 'at_risk');
  const topPerformers = individualPlans.filter(p => p.status === 'completed' && p.targetValue > 0 && (p.currentValue / p.targetValue) > 1.1);

  return {
    content: `${atRisk.length} NV đang at_risk — nếu không can thiệp, dự báo ${Math.round(atRisk.length * 0.4)} NV sẽ miss deadline. ` +
      `Reminder sớm giúp tăng 20-30% khả năng hoàn thành (kinh nghiệm thực tế). ` +
      `${topPerformers.length} NV vượt KPI 110%+ xứng đáng được ghi nhận để giữ chân. ` +
      `Chi phí coaching chỉ ${formatCurrency(proposal.estimatedCost)}d — rất thấp so với rủi ro.`,
    dataPoints: [
      `At risk: ${atRisk.length}`,
      `Dự báo miss: ${Math.round(atRisk.length * 0.4)}`,
      `Top performers: ${topPerformers.length}`,
    ],
  };
}

function buildChannelDefense(proposal: AgentProposal, question: DebateMessage, state: AgentCoordinationState): QContent {
  const { channelAnalysis } = state;
  const highMargin = channelAnalysis?.filter(c => c.margin_pct >= 35) || [];
  const lowROAS = channelAnalysis?.filter(c => c.roas > 0 && c.roas < 4) || [];
  const totalRev = channelAnalysis?.reduce((s, c) => s + c.revenue, 0) || 0;

  return {
    content: `Kênh margin cao (>35%): ${highMargin.map(c => `${c.channel} ${c.margin_pct}%`).join(', ')}. ` +
      `${lowROAS.length > 0 ? `Kênh ROAS thấp: ${lowROAS.map(c => `${c.channel} ${c.roas}x`).join(', ')}. ` : ''}` +
      `Chuyển 20% budget từ Shopee (margin 18.5%) sang Website (margin 40.9%) = tăng LN ${formatCurrency(Math.round(totalRev * 0.03))}d. ` +
      `Đây là tối ưu, không tăng tổng chi phí.`,
    dataPoints: [
      `Margin Website: 40.9%`,
      `Margin Shopee: 18.5%`,
      `Tổng DT: ${formatCurrency(totalRev)}d`,
    ],
  };
}

function buildInventoryDefense(proposal: AgentProposal, question: DebateMessage, state: AgentCoordinationState): QContent {
  const { stockAlerts, inventoryForecasts } = state;
  const critical = stockAlerts?.filter(a => a.status === 'critical') || [];
  const forecast = inventoryForecasts?.[0];

  return {
    content: `${critical.length} item ĐANG hết hàng — nếu không nhập, mất ${formatCurrency(Math.round((forecast?.demandUnits || 0) * 270_000 * 0.1))}d DT (10% đơn hàng bị hủy). ` +
      `Chi phí nhập hàng: ${formatCurrency(proposal.estimatedCost)}d. ` +
      `ROI dự kiến: ${Math.round((forecast?.demandUnits || 0) * 270_000 / Math.max(proposal.estimatedCost, 1) * 100) / 100}x. ` +
      `Có thể chia 2 đợt nhập để giảm rủi ro tồn kho.`,
    dataPoints: [
      `Hết hàng: ${critical.length} items`,
      `DT mất nếu hết hàng: ~10%`,
      `Chi phí nhập: ${formatCurrency(proposal.estimatedCost)}d`,
    ],
  };
}

function buildCollectionDefense(proposal: AgentProposal, question: DebateMessage, state: AgentCoordinationState): QContent {
  const { collectionPlans } = state;
  const currentMonth = new Date().getMonth() + 1;
  const current = collectionPlans?.find(p => p.month === currentMonth);
  const totalSKU = collectionPlans?.reduce((s, p) => s + p.targetSKUs, 0) || 0;

  return {
    content: `BST "${current?.name || 'N/A'}" cần ${current?.targetSKUs || 0} SKU. ` +
      `Chi phí/mẫu: ~50K (AI tools Banana Pro 2) — rẻ hơn 95% so với thuê designer (1-2M/mẫu). ` +
      `Tổng ${totalSKU} SKU/năm = ${formatCurrency(totalSKU * 50_000)}d vs ${formatCurrency(totalSKU * 1_500_000)}d (designer). ` +
      `Tiết kiệm ${formatCurrency(totalSKU * 1_450_000)}d/năm.`,
    dataPoints: [
      `Chi phí/mẫu AI: 50K`,
      `Chi phí/mẫu designer: 1.5M`,
      `Tiết kiệm/năm: ${formatCurrency(totalSKU * 1_450_000)}d`,
    ],
  };
}

function buildMarketResearchDefense(proposal: AgentProposal, question: DebateMessage, state: AgentCoordinationState): QContent {
  const { marketResearch, channelAnalysis } = state;
  const opportunities = marketResearch?.opportunities || [];
  const threats = marketResearch?.threats || [];
  const totalOpportunity = opportunities.reduce((s, o) => s + o.potentialRevenue, 0);
  const highThreats = threats.filter(t => t.severity === 'high' || t.severity === 'critical');
  const totalRev = channelAnalysis?.reduce((s, c) => s + c.revenue, 0) || 0;

  return {
    content: `Dữ liệu KHÔNG phải ý kiến — đây là benchmark thực tế thị trường. ` +
      `${opportunities.length} cơ hội tổng ${formatCurrency(totalOpportunity)}d: ` +
      `${opportunities.slice(0, 2).map(o => `${o.title} (${formatCurrency(o.potentialRevenue)}d, ${o.difficulty})`).join('; ')}. ` +
      `${highThreats.length} mối đe dọa cao: ${highThreats.slice(0, 2).map(t => t.title).join(', ')}. ` +
      `Nếu không hành động theo trend, đối thủ sẽ chiếm thị phần. DT hiện tại ${formatCurrency(totalRev)}d/tháng — ` +
      `cơ hội ${formatCurrency(totalOpportunity)}d = tăng ${Math.round(totalOpportunity / Math.max(totalRev * 12, 1) * 100)}% DT.`,
    dataPoints: [
      `Cơ hội: ${formatCurrency(totalOpportunity)}d`,
      `Mối đe dọa cao: ${highThreats.length}`,
      `DT/tháng hiện tại: ${formatCurrency(totalRev)}d`,
    ],
  };
}

function buildStrategyDefense(proposal: AgentProposal, question: DebateMessage, state: AgentCoordinationState): QContent {
  const { strategyReport, financialHealth, businessTargets, individualPlans } = state;
  const assessment = strategyReport?.strategicAssessment;
  const blindSpots = strategyReport?.blindSpots || [];
  const revTarget = businessTargets.find(t => t.category === 'revenue');
  const revPct = revTarget ? Math.round(revTarget.currentValue / revTarget.targetValue * 100) : 0;
  const atRisk = individualPlans.filter(p => p.status === 'at_risk').length;

  return {
    content: `Tôi không tô hồng — đó là nhiệm vụ. Score ${assessment?.score || 0}/100 dựa trên: ` +
      `DT đạt ${revPct}% mục tiêu, margin ${financialHealth.profitMargin}%, ${atRisk} NV rủi ro. ` +
      `${blindSpots.length} blind spots CEO CHƯA thấy: ${blindSpots.slice(0, 2).map(b => b.area).join(', ')}. ` +
      `Bỏ qua lời khuyên này = ${blindSpots[0]?.risk || 'rủi ro không lường trước'}. ` +
      `Chi phí đề xuất: 0đ. Chi phí BỎ QUA: mất thị phần cho đối thủ đang scale nhanh hơn.`,
    dataPoints: [
      `Score: ${assessment?.score || 0}/100`,
      `DT vs target: ${revPct}%`,
      `Blind spots: ${blindSpots.length}`,
      `NV rủi ro: ${atRisk}`,
    ],
  };
}
