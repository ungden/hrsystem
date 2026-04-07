/**
 * AI Assistant Agent — Tổng hợp tất cả output từ 10 agents thành báo cáo
 * dễ đọc cho CEO/Owner.
 *
 * KHÔNG phân tích thêm. Chỉ REWRITE + FORMAT lại thông tin sẵn có thành:
 * 1. BÁO CÁO TỔNG QUAN (executive summary)
 * 2. BÁO CÁO THỊ TRƯỜNG & CẠNH TRANH
 * 3. BÁO CÁO TÀI CHÍNH & KÊNH BÁN
 * 4. BÁO CÁO NHÂN SỰ & HIỆU SUẤT
 * 5. BÁO CÁO VẬN HÀNH & SẢN PHẨM
 * 6. BÁO CÁO CHIẾN LƯỢC & HÀNH ĐỘNG
 */

import { AgentCoordinationState, AgentMessage } from '../agent-types';
import { formatCurrency } from '../format';

export interface AssistantReport {
  reports: AgentMessage[];
}

export function runAssistantAgent(state: AgentCoordinationState): AssistantReport {
  const ts = new Date().toISOString();
  const reports: AgentMessage[] = [];

  // ============ 1. BÁO CÁO TỔNG QUAN ============
  reports.push({
    id: 'rpt-exec-summary',
    agentRole: 'assistant',
    agentName: 'AI Assistant',
    timestamp: ts,
    content: buildExecutiveSummary(state),
    type: 'analysis',
  });

  // ============ 2. BÁO CÁO THỊ TRƯỜNG & CẠNH TRANH ============
  reports.push({
    id: 'rpt-market',
    agentRole: 'assistant',
    agentName: 'AI Assistant',
    timestamp: ts,
    content: buildMarketReport(state),
    type: 'analysis',
  });

  // ============ 3. BÁO CÁO TÀI CHÍNH & KÊNH BÁN ============
  reports.push({
    id: 'rpt-finance',
    agentRole: 'assistant',
    agentName: 'AI Assistant',
    timestamp: ts,
    content: buildFinanceReport(state),
    type: 'analysis',
  });

  // ============ 4. BÁO CÁO NHÂN SỰ & HIỆU SUẤT ============
  reports.push({
    id: 'rpt-hr',
    agentRole: 'assistant',
    agentName: 'AI Assistant',
    timestamp: ts,
    content: buildHRReport(state),
    type: 'analysis',
  });

  // ============ 5. BÁO CÁO VẬN HÀNH & SẢN PHẨM ============
  reports.push({
    id: 'rpt-operations',
    agentRole: 'assistant',
    agentName: 'AI Assistant',
    timestamp: ts,
    content: buildOperationsReport(state),
    type: 'analysis',
  });

  // ============ 6. BÁO CÁO CHIẾN LƯỢC & HÀNH ĐỘNG ============
  reports.push({
    id: 'rpt-strategy',
    agentRole: 'assistant',
    agentName: 'AI Assistant',
    timestamp: ts,
    content: buildStrategyReport(state),
    type: 'recommendation',
  });

  return { reports };
}

// ================================================================
// REPORT BUILDERS
// ================================================================

function buildExecutiveSummary(state: AgentCoordinationState): string {
  const { businessTargets, financialHealth, individualPlans, costProjections,
    channelAnalysis, marketResearch, strategyReport } = state;
  const { year, quarter } = state.currentQuarter;

  const revTarget = businessTargets.find(t => t.category === 'revenue');
  const revPct = revTarget ? Math.round(revTarget.currentValue / revTarget.targetValue * 100) : 0;
  const headcount = costProjections.reduce((s, c) => s + c.headcount, 0);
  const totalCost = costProjections.reduce((s, c) => s + c.totalCost, 0);
  const completed = individualPlans.filter(p => p.status === 'completed').length;
  const atRisk = individualPlans.filter(p => p.status === 'at_risk').length;
  const completionRate = individualPlans.length > 0 ? Math.round(completed / individualPlans.length * 100) : 0;
  const highMargin = channelAnalysis.filter(c => c.margin_pct >= 35);
  const health = strategyReport?.strategicAssessment;

  const lines: string[] = [
    `=== BÁO CÁO TỔNG QUAN ${quarter}/${year} ===`,
    '',
    `Sức khỏe doanh nghiệp: ${health?.overallHealth?.toUpperCase() || 'N/A'} (${health?.score || 0}/100)`,
    `${health?.oneLineSummary || ''}`,
    '',
    `DOANH THU: ${formatCurrency(revTarget?.currentValue || 0)}đ / ${formatCurrency(revTarget?.targetValue || 0)}đ (${revPct}%)`,
    `BIÊN LỢI NHUẬN: ${financialHealth.profitMargin}%`,
    `NHÂN SỰ: ${headcount} người | Chi phí NS: ${formatCurrency(totalCost)}đ/tháng`,
    `CÔNG VIỆC: ${completionRate}% hoàn thành (${completed}/${individualPlans.length}) | ${atRisk} NV rủi ro`,
    `KÊNH BÁN: ${highMargin.length} kênh margin >35% | Top: ${highMargin[0]?.channel || 'N/A'} (${highMargin[0]?.margin_pct || 0}%)`,
    `THỊ PHẦN: ${marketResearch?.marketOverview.teeworldMarketShare.toFixed(2) || '?'}% thị trường graphic tees VN`,
  ];

  // Traffic light summary
  const issues: string[] = [];
  if (revPct < 80) issues.push(`DT mới đạt ${revPct}% target`);
  if (atRisk > 2) issues.push(`${atRisk} NV đang at_risk`);
  if (financialHealth.profitMargin < 15) issues.push(`Margin ${financialHealth.profitMargin}% thấp`);
  if (completionRate < 50) issues.push(`Task completion chỉ ${completionRate}%`);

  if (issues.length > 0) {
    lines.push('', `CẦN CHÚ Ý: ${issues.join(' | ')}`);
  } else {
    lines.push('', `TÌNH HÌNH ỔN ĐỊNH — tiếp tục theo kế hoạch.`);
  }

  return lines.join('\n');
}

function buildMarketReport(state: AgentCoordinationState): string {
  const { marketResearch } = state;
  if (!marketResearch) return '=== BÁO CÁO THỊ TRƯỜNG ===\n\nChưa có dữ liệu nghiên cứu thị trường.';

  const { marketOverview, competitorAnalysis, trendAlerts, opportunities, threats } = marketResearch;
  const urgentTrends = trendAlerts.filter(t => t.urgency === 'act_now');
  const highThreats = threats.filter(t => t.severity === 'high' || t.severity === 'critical');
  const totalOpp = opportunities.reduce((s, o) => s + o.potentialRevenue, 0);

  const lines: string[] = [
    `=== BÁO CÁO THỊ TRƯỜNG & CẠNH TRANH ===`,
    '',
    `Quy mô thị trường graphic tees VN: ~${(marketOverview.totalMarketSize / 1e12).toFixed(1)} nghìn tỷ (+${(marketOverview.growthRate * 100)}%/năm)`,
    `Thị phần Teeworld: ${marketOverview.teeworldMarketShare.toFixed(2)}% — ${marketOverview.positionVsCompetitors}`,
    '',
    `ĐỐI THỦ CHÍNH:`,
  ];

  competitorAnalysis.slice(0, 4).forEach((c, i) => {
    lines.push(`  ${i + 1}. ${c.name} (${formatCurrency(c.revenue)}đ) — Mạnh: ${c.keyAdvantage} | Yếu: ${c.keyWeakness} | Mức đe dọa: ${c.threatLevel}`);
  });

  if (urgentTrends.length > 0) {
    lines.push('', `TREND CẦN HÀNH ĐỘNG NGAY:`);
    urgentTrends.forEach((t, i) => {
      lines.push(`  ${i + 1}. ${t.trend}`);
      lines.push(`     → ${t.recommendation}`);
    });
  }

  if (opportunities.length > 0) {
    lines.push('', `CƠ HỘI (tổng ${formatCurrency(totalOpp)}đ tiềm năng):`);
    opportunities.forEach((o, i) => {
      lines.push(`  ${i + 1}. ${o.title} — ${formatCurrency(o.potentialRevenue)}đ (${o.difficulty}, ${o.timeframe})`);
    });
  }

  if (highThreats.length > 0) {
    lines.push('', `MỐI ĐE DỌA CAO:`);
    highThreats.forEach((t, i) => {
      lines.push(`  ${i + 1}. ${t.title} (${t.severity}, xác suất ${t.probability}%)`);
      lines.push(`     → Phòng ngừa: ${t.mitigation.split('.')[0]}.`);
    });
  }

  return lines.join('\n');
}

function buildFinanceReport(state: AgentCoordinationState): string {
  const { financialHealth, costProjections, channelAnalysis, financials, businessTargets } = state;
  const is = financials.incomeStatements;
  const lastMonth = is[is.length - 1];
  const totalCost = costProjections.reduce((s, c) => s + c.totalCost, 0);
  const headcount = costProjections.reduce((s, c) => s + c.headcount, 0);
  const revTarget = businessTargets.find(t => t.category === 'revenue');

  const lines: string[] = [
    `=== BÁO CÁO TÀI CHÍNH & KÊNH BÁN ===`,
    '',
    `Doanh thu tháng gần nhất: ${formatCurrency(lastMonth?.doanhThu.tongDoanhThu || 0)}đ`,
    `Lợi nhuận sau thuế: ${formatCurrency(lastMonth?.loiNhuanSauThue || 0)}đ`,
    `Biên lợi nhuận ròng: ${financialHealth.profitMargin}%`,
    `Burn rate: ${formatCurrency(financialHealth.burnRate)}đ/tháng`,
    `Chi phí nhân sự: ${formatCurrency(totalCost)}đ/tháng (${headcount} người)`,
    `DT/người/năm: ${formatCurrency(Math.round((revTarget?.targetValue || 0) / Math.max(headcount, 1)))}đ`,
    '',
    `HIỆU QUẢ KÊNH BÁN:`,
  ];

  // Sort channels by margin
  const sorted = [...channelAnalysis].sort((a, b) => b.margin_pct - a.margin_pct);
  sorted.forEach(c => {
    const status = c.margin_pct >= 35 ? '✅' : c.margin_pct >= 25 ? '⚠️' : '❌';
    lines.push(`  ${status} ${c.channel}: DT ${formatCurrency(c.revenue)}đ | Margin ${c.margin_pct}% | ROAS ${c.roas}x | ${c.recommendation.toUpperCase()}`);
  });

  // Cost breakdown by dept
  lines.push('', `CHI PHÍ THEO PHÒNG BAN:`);
  const sortedDepts = [...costProjections].sort((a, b) => b.totalCost - a.totalCost);
  sortedDepts.forEach(d => {
    lines.push(`  ${d.department}: ${formatCurrency(d.totalCost)}đ (${d.headcount} NV)`);
  });

  return lines.join('\n');
}

function buildHRReport(state: AgentCoordinationState): string {
  const { individualPlans, costProjections, salaryProjections } = state;
  const headcount = costProjections.reduce((s, c) => s + c.headcount, 0);
  const completed = individualPlans.filter(p => p.status === 'completed');
  const inProgress = individualPlans.filter(p => p.status === 'in_progress');
  const atRisk = individualPlans.filter(p => p.status === 'at_risk');
  const notStarted = individualPlans.filter(p => p.status === 'not_started');
  const completionRate = individualPlans.length > 0 ? Math.round(completed.length / individualPlans.length * 100) : 0;

  const lines: string[] = [
    `=== BÁO CÁO NHÂN SỰ & HIỆU SUẤT ===`,
    '',
    `Tổng nhân sự: ${headcount} người`,
    `Tỷ lệ hoàn thành công việc: ${completionRate}%`,
    `  Hoàn thành: ${completed.length} | Đang làm: ${inProgress.length} | Chưa bắt đầu: ${notStarted.length} | Rủi ro: ${atRisk.length}`,
  ];

  // At-risk employees
  if (atRisk.length > 0) {
    lines.push('', `NHÂN VIÊN CẦN HỖ TRỢ (${atRisk.length} người):`);
    // Group by employee
    const empRisk = new Map<string, { name: string; tasks: string[]; points: number }>();
    atRisk.forEach(p => {
      const existing = empRisk.get(p.employeeId);
      if (existing) {
        existing.tasks.push(p.taskTitle);
        existing.points += p.points;
      } else {
        empRisk.set(p.employeeId, { name: p.employeeName, tasks: [p.taskTitle], points: p.points });
      }
    });
    empRisk.forEach(emp => {
      lines.push(`  ⚠️ ${emp.name}: ${emp.tasks.length} tasks at_risk (${emp.points} điểm)`);
    });
  }

  // Top performers
  const stars = completed.filter(p => p.targetValue > 0 && (p.currentValue / p.targetValue) > 1.1);
  if (stars.length > 0) {
    const starEmps = new Map<string, { name: string; count: number }>();
    stars.forEach(p => {
      const existing = starEmps.get(p.employeeId);
      if (existing) existing.count++;
      else starEmps.set(p.employeeId, { name: p.employeeName, count: 1 });
    });
    lines.push('', `NHÂN VIÊN XUẤT SẮC:`);
    starEmps.forEach(emp => {
      lines.push(`  ⭐ ${emp.name}: vượt KPI ${emp.count} tasks`);
    });
  }

  // Salary overview
  if (salaryProjections.length > 0) {
    const totalSalary = salaryProjections.reduce((s, p) => s + p.projectedTotal, 0);
    const avgSalary = Math.round(totalSalary / salaryProjections.length);
    lines.push('', `LƯƠNG THƯỞNG DỰ KIẾN:`);
    lines.push(`  Tổng: ${formatCurrency(totalSalary)}đ/tháng | TB: ${formatCurrency(avgSalary)}đ/người`);
  }

  return lines.join('\n');
}

function buildOperationsReport(state: AgentCoordinationState): string {
  const { collectionPlans, inventoryForecasts, stockAlerts, departmentGoals } = state;
  const currentMonth = new Date().getMonth() + 1;

  const currentBST = collectionPlans.find(p => p.month === currentMonth);
  const nextBST = collectionPlans.find(p => p.month === currentMonth + 1);
  const forecast = inventoryForecasts[0];
  const criticalStock = stockAlerts?.filter(a => a.status === 'critical') || [];
  const lowStock = stockAlerts?.filter(a => a.status === 'low') || [];
  const totalSKU = collectionPlans.reduce((s, p) => s + p.targetSKUs, 0);

  const lines: string[] = [
    `=== BÁO CÁO VẬN HÀNH & SẢN PHẨM ===`,
    '',
    `BST HIỆN TẠI (T${currentMonth}): "${currentBST?.name || 'N/A'}"`,
    `  Theme: ${currentBST?.theme || 'N/A'}`,
    `  Target: ${currentBST?.targetSKUs || 0} SKU | Status: ${currentBST?.status || 'N/A'}`,
    '',
    `BST KẾ TIẾP (T${currentMonth + 1}): "${nextBST?.name || 'N/A'}"`,
    `  Theme: ${nextBST?.theme || 'N/A'}`,
    `  Status: ${nextBST?.status || 'planned'}`,
    '',
    `Tổng kế hoạch: ${totalSKU} SKU/năm (12 BST)`,
  ];

  if (forecast) {
    lines.push(
      '',
      `DỰ BÁO SẢN XUẤT T${forecast.month}:`,
      `  Nhu cầu: ${forecast.demandUnits.toLocaleString()} áo`,
      `  Sản xuất: ${forecast.productionBatches} lô`,
      `  Tồn kho hiện tại: ${forecast.currentStock.toLocaleString()} áo`,
      `  Cần nhập thêm: ${forecast.reorderNeeded ? 'CÓ' : 'Không'}`,
    );
  }

  if (criticalStock.length > 0 || lowStock.length > 0) {
    lines.push('', `CẢNH BÁO TỒN KHO:`);
    criticalStock.forEach(a => lines.push(`  🔴 ${a.itemName}: HẾT HÀNG (${a.currentStock}/${a.minStock})`));
    lowStock.forEach(a => lines.push(`  🟡 ${a.itemName}: sắp hết (${a.currentStock}/${a.minStock})`));
  } else {
    lines.push('', `Tồn kho: Ổn định, không có cảnh báo.`);
  }

  // Department goals summary
  const deptMap = new Map<string, { total: number; completed: number }>();
  departmentGoals.forEach(g => {
    const existing = deptMap.get(g.department);
    const pct = g.targetValue > 0 ? Math.round(g.currentValue / g.targetValue * 100) : 0;
    if (existing) { existing.total++; if (pct >= 80) existing.completed++; }
    else deptMap.set(g.department, { total: 1, completed: pct >= 80 ? 1 : 0 });
  });
  if (deptMap.size > 0) {
    lines.push('', `TIẾN ĐỘ PHÒNG BAN:`);
    deptMap.forEach((v, k) => {
      lines.push(`  ${k}: ${v.completed}/${v.total} mục tiêu đạt ≥80%`);
    });
  }

  return lines.join('\n');
}

function buildStrategyReport(state: AgentCoordinationState): string {
  const { strategyReport, marketResearch } = state;
  if (!strategyReport) return '=== BÁO CÁO CHIẾN LƯỢC ===\n\nChưa có báo cáo chiến lược.';

  const { strategicAssessment, criticalDecisions, blindSpots, quarterPriorities, ceoChallenge } = strategyReport;

  const lines: string[] = [
    `=== BÁO CÁO CHIẾN LƯỢC & HÀNH ĐỘNG ===`,
    '',
    `Đánh giá: ${strategicAssessment.overallHealth.toUpperCase()} (${strategicAssessment.score}/100)`,
    `Điểm mạnh: ${strategicAssessment.topStrength}`,
    `Điểm yếu: ${strategicAssessment.topWeakness}`,
  ];

  // Top priorities
  if (quarterPriorities.length > 0) {
    lines.push('', `ƯU TIÊN HÀNH ĐỘNG:`);
    quarterPriorities.forEach(p => {
      lines.push(`  #${p.rank}. ${p.title}`);
      lines.push(`     Lý do: ${p.why}`);
      lines.push(`     KPI: ${p.metric}`);
      lines.push(`     Phụ trách: ${p.owner}`);
    });
  }

  // Critical decisions
  if (criticalDecisions.length > 0) {
    lines.push('', `QUYẾT ĐỊNH CẦN RA:`);
    criticalDecisions.forEach((d, i) => {
      lines.push(`  ${i + 1}. ${d.question} (${d.impact} impact, deadline: ${d.deadline})`);
      d.options.forEach(o => {
        const tag = o.recommendation ? '→ ĐỀ XUẤT' : '  Phương án';
        lines.push(`     ${tag}: ${o.name}`);
        lines.push(`       Pro: ${o.pros.split('.')[0]}.`);
        lines.push(`       Con: ${o.cons.split('.')[0]}.`);
      });
    });
  }

  // Blind spots
  if (blindSpots.length > 0) {
    lines.push('', `BLIND SPOTS (vấn đề chưa ai để ý):`);
    blindSpots.forEach((b, i) => {
      lines.push(`  ${i + 1}. ${b.area}`);
      lines.push(`     Rủi ro: ${b.risk.split('.')[0]}.`);
      lines.push(`     Hành động: ${b.whatToDoNow.split('.')[0]}.`);
    });
  }

  // CEO Challenge
  if (ceoChallenge) {
    lines.push('', `--- LỜI KHUYÊN THẲNG THẮN ---`);
    // Extract just the numbered items without the header
    const challengeLines = ceoChallenge.split('\n').filter(l => l.trim().length > 0);
    challengeLines.forEach(l => lines.push(l));
  }

  return lines.join('\n');
}
