/**
 * CEO Review Engine — Scores each agent proposal on 5 criteria (0-20 each).
 * ≥75 → approved, 50-74 → needs_debate, <50 → rejected
 */
import { AgentCoordinationState } from '../agent-types';
import { AgentProposal, CEOStrategy, ReviewCriteria, ReviewVerdict } from './workflow-types';
import { formatCurrency } from '../format';

export interface ReviewResult {
  proposal: AgentProposal;
  criteria: ReviewCriteria;
  totalScore: number;
  verdict: ReviewVerdict;
  notes: string;
}

export function reviewProposal(
  proposal: AgentProposal,
  strategy: CEOStrategy,
  state: AgentCoordinationState,
): ReviewResult {
  const criteria = scoreCriteria(proposal, strategy, state);
  const totalScore = criteria.budgetAlignment + criteria.targetAlignment +
    criteria.headcountImpact + criteria.riskLevel + criteria.dataQuality;

  let verdict: ReviewVerdict = 'approved';
  if (totalScore < 50) verdict = 'rejected';
  else if (totalScore < 75) verdict = 'needs_debate';

  const notes = generateReviewNotes(proposal, criteria, verdict, strategy);

  return {
    proposal: {
      ...proposal,
      reviewScore: totalScore,
      reviewNotes: notes,
      reviewCriteria: criteria,
      status: verdict === 'approved' ? 'approved' : verdict === 'rejected' ? 'rejected' : 'needs_revision',
    },
    criteria,
    totalScore,
    verdict,
    notes,
  };
}

function scoreCriteria(
  proposal: AgentProposal,
  strategy: CEOStrategy,
  state: AgentCoordinationState,
): ReviewCriteria {
  return {
    budgetAlignment: scoreBudget(proposal, strategy),
    targetAlignment: scoreTarget(proposal, strategy, state),
    headcountImpact: scoreHeadcount(proposal, strategy),
    riskLevel: scoreRisk(proposal),
    dataQuality: scoreDataQuality(proposal),
  };
}

function scoreBudget(proposal: AgentProposal, strategy: CEOStrategy): number {
  if (proposal.estimatedCost === 0) return 18; // No cost = good
  const ratio = proposal.estimatedCost / strategy.budgetCeiling;
  if (ratio <= 0.05) return 20; // <5% of budget
  if (ratio <= 0.10) return 17;
  if (ratio <= 0.20) return 14;
  if (ratio <= 0.30) return 10;
  if (ratio <= 0.50) return 6;
  return 3; // >50% of budget
}

function scoreTarget(proposal: AgentProposal, strategy: CEOStrategy, state: AgentCoordinationState): number {
  // Check if proposal aligns with CEO's focus
  const focusKeywords: Record<string, string[]> = {
    growth: ['doanh thu', 'tăng', 'revenue', 'DT', 'kênh', 'BST', 'SKU'],
    cost_reduction: ['chi phí', 'giảm', 'cắt', 'tiết kiệm', 'optimize'],
    efficiency: ['hiệu suất', 'hoàn thành', 'KPI', 'rủi ro', 'priority'],
    quality: ['chất lượng', 'promotion', 'xuất sắc', 'customer'],
  };

  const keywords = focusKeywords[strategy.focus] || [];
  const content = `${proposal.title} ${proposal.summary} ${proposal.estimatedImpact}`.toLowerCase();
  const matches = keywords.filter(kw => content.includes(kw.toLowerCase())).length;

  if (matches >= 3) return 20;
  if (matches >= 2) return 16;
  if (matches >= 1) return 12;
  return 8; // Not directly aligned but may be useful
}

function scoreHeadcount(proposal: AgentProposal, strategy: CEOStrategy): number {
  // Most proposals don't change headcount
  const headcountMetric = proposal.metrics.find(m => m.name.includes('nhân sự') || m.name.includes('người'));
  if (!headcountMetric) return 16; // No headcount impact

  const change = headcountMetric.target - headcountMetric.current;
  if (change <= 0) return 18; // Reducing or same
  if (change <= 2 && headcountMetric.target <= strategy.headcountCeiling) return 15;
  if (headcountMetric.target > strategy.headcountCeiling) return 5; // Exceeds ceiling
  return 12;
}

function scoreRisk(proposal: AgentProposal): number {
  const actionCount = proposal.actions.length;
  if (actionCount === 0) return 18; // No actions = low risk (but also low impact)
  if (actionCount <= 2) return 17;
  if (actionCount <= 5) return 14;
  if (actionCount <= 8) return 10;
  return 6; // Too many actions = high risk
}

function scoreDataQuality(proposal: AgentProposal): number {
  // Check if metrics have real data (non-zero current values)
  const metricsWithData = proposal.metrics.filter(m => m.current > 0);
  const ratio = metricsWithData.length / Math.max(proposal.metrics.length, 1);

  if (ratio >= 0.8) return 19;
  if (ratio >= 0.6) return 15;
  if (ratio >= 0.4) return 11;
  if (ratio >= 0.2) return 7;
  return 4; // Very little real data
}

function generateReviewNotes(
  proposal: AgentProposal,
  criteria: ReviewCriteria,
  verdict: ReviewVerdict,
  strategy: CEOStrategy,
): string {
  const weakest = findWeakestCriterion(criteria);
  const focusLabel = {
    growth: 'TĂNG TRƯỞNG',
    cost_reduction: 'CẮT GIẢM CHI PHÍ',
    efficiency: 'HIỆU SUẤT',
    quality: 'CHẤT LƯỢNG',
  }[strategy.focus];

  if (verdict === 'approved') {
    return `Đề xuất phù hợp chiến lược ${focusLabel}. ` +
      `Chi phí ${formatCurrency(proposal.estimatedCost)}đ trong ngân sách. DUYỆT.`;
  }

  if (verdict === 'rejected') {
    return `Đề xuất không đủ điều kiện. Điểm yếu: ${weakest.name} (${weakest.score}/20). ` +
      `${getWeakReason(weakest.key, proposal, strategy)}. TỪ CHỐI.`;
  }

  // needs_debate
  return `Đề xuất cần làm rõ. Điểm yếu: ${weakest.name} (${weakest.score}/20). ` +
    `${getWeakReason(weakest.key, proposal, strategy)}. CEO muốn thảo luận.`;
}

function findWeakestCriterion(criteria: ReviewCriteria): { key: string; name: string; score: number } {
  const entries: [string, string, number][] = [
    ['budgetAlignment', 'Ngân sách', criteria.budgetAlignment],
    ['targetAlignment', 'Mục tiêu', criteria.targetAlignment],
    ['headcountImpact', 'Nhân sự', criteria.headcountImpact],
    ['riskLevel', 'Rủi ro', criteria.riskLevel],
    ['dataQuality', 'Dữ liệu', criteria.dataQuality],
  ];
  const sorted = entries.sort((a, b) => a[2] - b[2]);
  return { key: sorted[0][0], name: sorted[0][1], score: sorted[0][2] };
}

function getWeakReason(key: string, proposal: AgentProposal, strategy: CEOStrategy): string {
  switch (key) {
    case 'budgetAlignment':
      return `Chi phí ${formatCurrency(proposal.estimatedCost)}đ, ngân sách tối đa ${formatCurrency(strategy.budgetCeiling)}đ`;
    case 'targetAlignment':
      return `Chưa rõ đề xuất đóng góp gì vào mục tiêu ${strategy.focus}`;
    case 'headcountImpact':
      return `Ảnh hưởng nhân sự vượt trần ${strategy.headcountCeiling} người`;
    case 'riskLevel':
      return `${proposal.actions.length} hành động đồng thời — rủi ro cao`;
    case 'dataQuality':
      return `Thiếu dữ liệu thực tế để đánh giá`;
    default:
      return '';
  }
}

// ============ RE-REVIEW AFTER DEBATE ============

export function reReviewProposal(
  proposal: AgentProposal,
  debateRounds: number,
  strategy: CEOStrategy,
  state: AgentCoordinationState,
): ReviewResult {
  // After debate, give a slight score boost (agent defended their position)
  const result = reviewProposal(proposal, strategy, state);
  const boost = debateRounds * 5; // +5 per debate round
  const newScore = Math.min(result.totalScore + boost, 100);

  let newVerdict: ReviewVerdict = 'approved';
  if (newScore < 50) newVerdict = 'rejected';
  else if (newScore < 75) newVerdict = 'rejected'; // After debate, no more debate — decide

  const notes = newVerdict === 'approved'
    ? `Sau ${debateRounds} vòng thảo luận, CEO đồng ý. Điểm: ${newScore}/100. DUYỆT.`
    : `Sau ${debateRounds} vòng thảo luận, CEO vẫn không hài lòng. Điểm: ${newScore}/100. TỪ CHỐI.`;

  return {
    ...result,
    totalScore: newScore,
    verdict: newVerdict,
    notes,
    proposal: { ...result.proposal, reviewScore: newScore, reviewNotes: notes, status: newVerdict === 'approved' ? 'approved' : 'rejected' },
  };
}
