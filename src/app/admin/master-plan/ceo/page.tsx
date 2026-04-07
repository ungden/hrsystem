"use client";

import { useEffect, useState } from "react";
import { buildExecutiveReport, ExecutiveReportData, fmtVND, fmtPct } from "@/lib/report-builder";
import { Printer, Download, RefreshCw } from "lucide-react";

// ============ NARRATIVE HELPERS ============

function revenueNarrative(d: ExecutiveReportData): string {
  const { totalRevenue, revenueTarget, targetAchievement, netProfit, profitMargin } = d.overview;
  const achieveStr = targetAchievement >= 100 ? "vượt" : targetAchievement >= 80 ? "đạt" : "chưa đạt";
  const gap = totalRevenue - revenueTarget;
  const gapStr = gap >= 0 ? `vượt ${fmtVND(gap)}` : `thiếu ${fmtVND(Math.abs(gap))}`;

  return `Trong năm tài chính ${d.year}, Teeworld ghi nhận tổng doanh thu ${fmtVND(totalRevenue)}, ${achieveStr} ${fmtPct(targetAchievement)} so với mục tiêu ${fmtVND(revenueTarget)} (${gapStr}). Lợi nhuận sau thuế đạt ${fmtVND(netProfit)}, tương ứng biên lợi nhuận ròng ${fmtPct(profitMargin)}. ${profitMargin > 25 ? "Đây là mức biên lợi nhuận tốt, cho thấy hiệu quả kiểm soát chi phí và chiến lược giá hợp lý." : profitMargin > 15 ? "Biên lợi nhuận ở mức trung bình, cần cải thiện thêm qua tối ưu chi phí vận hành và tăng tỷ trọng kênh margin cao." : "Biên lợi nhuận ở mức thấp, cần khẩn trương rà soát cơ cấu chi phí và chiến lược định giá."}`;
}

function channelNarrative(d: ExecutiveReportData): string {
  const sorted = [...d.channels].sort((a, b) => b.revenue - a.revenue);
  if (sorted.length === 0) return "Chưa có dữ liệu kênh bán hàng.";
  const top = sorted[0];
  const highMargin = sorted.filter(c => c.margin > 30);
  const lowMargin = sorted.filter(c => c.margin < 20);

  let text = `Hệ thống phân phối đa kênh hiện gồm ${sorted.length} kênh hoạt động. `;
  text += `Kênh dẫn đầu doanh thu là ${top.name} với ${fmtVND(top.revenue)} (chiếm ${fmtPct(top.share)} tổng doanh thu, margin ${fmtPct(top.margin)}). `;

  if (highMargin.length > 0) {
    text += `Các kênh có biên lợi nhuận cao (>30%): ${highMargin.map(c => `${c.name} (${fmtPct(c.margin)})`).join(", ")}. `;
  }
  if (lowMargin.length > 0) {
    text += `Cần lưu ý các kênh margin thấp (<20%): ${lowMargin.map(c => `${c.name} (${fmtPct(c.margin)})`).join(", ")} — xem xét tối ưu hoặc giảm phân bổ ngân sách. `;
  }

  text += `\n\nKhuyến nghị chiến lược: Tập trung đẩy mạnh traffic về các kênh margin cao (đặc biệt D2C), duy trì sự hiện diện trên marketplace nhưng kiểm soát chi phí quảng cáo chặt chẽ, và phát triển kênh B2B đồng phục như nguồn doanh thu ổn định.`;
  return text;
}

function hrNarrative(d: ExecutiveReportData): string {
  const { headcount, avgKPI } = d.overview;
  const { topPerformers, atRisk } = d.employees;
  const totalTasks = d.departments.reduce((s, dept) => s + dept.tasksTotal, 0);
  const totalDone = d.departments.reduce((s, dept) => s + dept.tasksDone, 0);
  const completionRate = totalTasks > 0 ? (totalDone / totalTasks) * 100 : 0;

  let text = `Tổng nhân sự hiện tại: ${headcount} nhân viên đang hoạt động. Điểm KPI trung bình toàn công ty: ${avgKPI}/100. Tỷ lệ hoàn thành công việc chung: ${fmtPct(completionRate)} (${totalDone}/${totalTasks} tasks).`;

  if (topPerformers.length > 0) {
    text += `\n\nNhân sự xuất sắc: ${topPerformers.map(e => `${e.name} (${e.department}, KPI: ${e.kpiScore})`).join("; ")}. Đề xuất xem xét khen thưởng, thăng chức, hoặc giao thêm trách nhiệm để giữ chân nhân tài.`;
  }

  if (atRisk.length > 0) {
    text += `\n\nNhân sự cần theo dõi: ${atRisk.map(e => `${e.name} (${e.department}, KPI: ${e.kpiScore})`).join("; ")}. Cần lên kế hoạch coaching cá nhân, xác định nguyên nhân gốc rễ (workload, skill gap, hay động lực), và đặt mục tiêu cải thiện trong 30-60 ngày.`;
  }

  return text;
}

function financialHealthNarrative(d: ExecutiveReportData): string {
  const h = d.financialHealth;
  let text = `Phân tích sức khỏe tài chính dựa trên các chỉ số thanh khoản và hiệu quả:\n\n`;
  text += `• Hệ số thanh toán ngắn hạn (Current Ratio): ${h.currentRatio.toFixed(2)}x — ${h.currentRatio >= 2 ? "Rất tốt, thanh khoản dồi dào" : h.currentRatio >= 1.5 ? "Tốt, đủ khả năng thanh toán" : h.currentRatio >= 1 ? "Chấp nhận được nhưng cần theo dõi" : "Cảnh báo: có thể gặp khó khăn thanh toán ngắn hạn"}.\n`;
  text += `• Tỷ lệ nợ/vốn chủ (D/E Ratio): ${h.debtToEquity.toFixed(2)}x — ${h.debtToEquity < 0.5 ? "An toàn, ít phụ thuộc nợ vay" : h.debtToEquity < 1 ? "Hợp lý" : "Cao, cần giảm nợ"}.\n`;
  text += `• Biên lợi nhuận ròng: ${fmtPct(h.profitMargin)} — ${h.profitMargin > 25 ? "Xuất sắc" : h.profitMargin > 15 ? "Tốt" : "Cần cải thiện"}.\n`;
  text += `• Biên lợi nhuận hoạt động: ${fmtPct(h.operatingMargin)} — phản ánh hiệu quả vận hành trước thuế và lãi vay.\n`;
  text += `• Burn rate hàng tháng: ${fmtVND(h.burnRate)} — ${h.burnRate > 0 ? "dòng tiền dương" : "cần theo dõi dòng tiền ra"}.`;
  return text;
}

function quarterNarrative(d: ExecutiveReportData): string {
  const quarters = d.quarterComparison.filter(q => q.revenue > 0);
  if (quarters.length === 0) return "Chưa có dữ liệu quý.";

  const best = quarters.reduce((a, b) => a.revenue > b.revenue ? a : b);
  const worst = quarters.reduce((a, b) => a.revenue < b.revenue ? a : b);

  let text = `So sánh hiệu quả kinh doanh theo quý:\n\n`;
  quarters.forEach(q => {
    text += `${q.quarter}: Doanh thu ${fmtVND(q.revenue)}, lợi nhuận ${fmtVND(q.profit)} (margin ${fmtPct(q.margin)})\n`;
  });
  text += `\nQuý đạt kết quả tốt nhất: ${best.quarter} với doanh thu ${fmtVND(best.revenue)}. `;
  if (best.quarter !== worst.quarter) {
    text += `Quý thấp nhất: ${worst.quarter} với doanh thu ${fmtVND(worst.revenue)}. `;
    const ratio = best.revenue / worst.revenue;
    if (ratio > 1.5) {
      text += `Chênh lệch giữa quý cao nhất và thấp nhất là ${ratio.toFixed(1)}x — cho thấy tính mùa vụ rõ rệt. Cần xây dựng chiến lược điều tiết doanh thu, đẩy mạnh marketing pre-season và các chương trình flash sale trong quý thấp điểm.`;
    }
  }
  return text;
}

function pipelineNarrative(d: ExecutiveReportData): string {
  if (d.pipeline.length === 0) return "Chưa có dữ liệu pipeline.";

  const totalValue = d.pipeline.reduce((s, p) => s + p.totalValue, 0);
  const totalDeals = d.pipeline.reduce((s, p) => s + p.count, 0);

  let text = `Pipeline bán hàng hiện có tổng cộng ${totalDeals} deals với giá trị ${fmtVND(totalValue)}.\n\n`;
  d.pipeline.forEach(p => {
    text += `• ${p.stage}: ${p.count} deals — ${fmtVND(p.totalValue)}\n`;
  });

  const closing = d.pipeline.find(p => p.stage.toLowerCase().includes('chốt') || p.stage.toLowerCase().includes('close'));
  if (closing) {
    text += `\nCơ hội chốt gần nhất: ${closing.count} deals trị giá ${fmtVND(closing.totalValue)}. Cần ưu tiên follow-up và đề xuất ưu đãi để tăng tỷ lệ chuyển đổi.`;
  }
  return text;
}

function masterPlanNarrative(d: ExecutiveReportData): string {
  const mp = d.masterPlanProgress;
  const completionRate = mp.total > 0 ? (mp.completed / mp.total) * 100 : 0;

  let text = `Tổng số mục tiêu chiến lược (Master Plan): ${mp.total} mục tiêu.\n\n`;
  text += `• Hoàn thành: ${mp.completed} (${fmtPct(completionRate)})\n`;
  text += `• Đang thực hiện: ${mp.inProgress}\n`;
  text += `• Kế hoạch (chưa bắt đầu): ${mp.planned}\n`;
  text += `• Rủi ro: ${mp.atRisk}\n`;

  if (mp.atRisk > 0) {
    text += `\nCảnh báo: ${mp.atRisk} mục tiêu đang ở trạng thái rủi ro. Cần rà soát ngay các mục tiêu này, xác định nguyên nhân chậm trễ và phân bổ lại nguồn lực nếu cần.`;
  }

  if (completionRate < 30 && mp.total > 5) {
    text += `\nTiến độ tổng thể (${fmtPct(completionRate)}) ở mức thấp. Đề xuất CEO review lại ưu tiên, tập trung nguồn lực vào 3-5 mục tiêu quan trọng nhất thay vì dàn trải.`;
  }

  return text;
}

function executiveSummaryNarrative(d: ExecutiveReportData): string {
  const { totalRevenue, netProfit, profitMargin, targetAchievement, headcount } = d.overview;
  const totalTasks = d.departments.reduce((s, dept) => s + dept.tasksTotal, 0);
  const totalDone = d.departments.reduce((s, dept) => s + dept.tasksDone, 0);
  const completionRate = totalTasks > 0 ? (totalDone / totalTasks) * 100 : 0;

  let verdict = "";
  if (targetAchievement >= 100 && profitMargin > 25) {
    verdict = "Công ty đang hoạt động vượt kỳ vọng trên cả doanh thu và lợi nhuận. Đề xuất tái đầu tư lợi nhuận vượt vào mở rộng kênh phân phối và phát triển sản phẩm mới.";
  } else if (targetAchievement >= 80 && profitMargin > 15) {
    verdict = "Công ty đang trên đà đạt mục tiêu. Cần duy trì nhịp độ hiện tại và tập trung vào các kênh có biên lợi nhuận cao để cải thiện bottom line.";
  } else if (targetAchievement >= 60) {
    verdict = "Kết quả kinh doanh ở mức trung bình, cần đánh giá lại chiến lược kênh bán hàng và cơ cấu chi phí. Đặc biệt cần xem xét các kênh đang âm margin.";
  } else {
    verdict = "Kết quả kinh doanh dưới kỳ vọng. Đề xuất CEO triệu tập họp khẩn cấp để rà soát chiến lược, cắt giảm chi phí không hiệu quả, và tập trung vào quick wins.";
  }

  return `Kính gửi Hội đồng Quản trị,\n\nBáo cáo tổng hợp tình hình hoạt động kinh doanh Teeworld năm ${d.year}.\n\nTeeworld hiện vận hành với đội ngũ ${headcount} nhân viên, đạt doanh thu lũy kế ${fmtVND(totalRevenue)} (${fmtPct(targetAchievement)} mục tiêu), lợi nhuận ròng ${fmtVND(netProfit)} (margin ${fmtPct(profitMargin)}). Tiến độ công việc toàn công ty: ${fmtPct(completionRate)} hoàn thành (${totalDone}/${totalTasks} đầu việc).\n\n${verdict}`;
}

function recommendationsNarrative(d: ExecutiveReportData): string {
  const recs: string[] = [];
  let idx = 1;

  // Revenue
  if (d.overview.targetAchievement < 100) {
    recs.push(`${idx}. Tăng tốc doanh thu: Hiện đạt ${fmtPct(d.overview.targetAchievement)} mục tiêu. Cần đẩy mạnh marketing trên kênh D2C (margin cao nhất), triển khai flash sale theo BST, và mở rộng pipeline B2B.`);
    idx++;
  }

  // Low margin channels
  const lowChannels = d.channels.filter(c => c.margin < 20 && c.revenue > 0);
  if (lowChannels.length > 0) {
    recs.push(`${idx}. Tối ưu kênh bán: ${lowChannels.map(c => c.name).join(", ")} đang có margin dưới 20%. Xem xét giảm chi phí quảng cáo, tăng giá bán, hoặc chuyển budget sang kênh hiệu quả hơn.`);
    idx++;
  }

  // At-risk employees
  if (d.employees.atRisk.length > 0) {
    recs.push(`${idx}. Nhân sự cần can thiệp: ${d.employees.atRisk.length} nhân viên có KPI dưới 60. Đề xuất triển khai Performance Improvement Plan (PIP) trong 30 ngày kèm coaching 1-on-1.`);
    idx++;
  }

  // Master plan risks
  if (d.masterPlanProgress.atRisk > 0) {
    recs.push(`${idx}. Mục tiêu chiến lược rủi ro: ${d.masterPlanProgress.atRisk} mục tiêu đang ở trạng thái cảnh báo. Cần CEO trực tiếp rà soát và phân bổ lại nguồn lực.`);
    idx++;
  }

  // Inventory
  if (d.inventory.criticalStock > 0) {
    recs.push(`${idx}. Cảnh báo tồn kho: ${d.inventory.criticalStock} sản phẩm hết hàng, ${d.inventory.lowStock} sản phẩm sắp hết. Cần đặt hàng bổ sung ngay để tránh mất doanh thu.`);
    idx++;
  }

  if (recs.length === 0) {
    recs.push("Không có khuyến nghị khẩn cấp tại thời điểm này. Tiếp tục duy trì chiến lược hiện tại và theo dõi các chỉ số hàng tuần.");
  }

  return recs.join("\n\n");
}

// ============ PAGE COMPONENT ============

export default function CEOMasterPlanReport() {
  const [data, setData] = useState<ExecutiveReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    buildExecutiveReport(2026).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  if (loading || !data) {
    return (
      <div className="p-6 flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-600 border-t-transparent mx-auto" />
          <p className="text-sm text-slate-500 mt-3">Đang tổng hợp dữ liệu báo cáo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Report Header */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {/* Cover */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 px-8 py-10 text-white">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center border border-white/20">
                <span className="font-bold text-lg">TW</span>
              </div>
              <div>
                <div className="text-xs text-slate-300 tracking-widest uppercase">Teeworld Co.</div>
                <div className="text-xs text-slate-400">Graphic Tees & Lifestyle</div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => window.print()} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors" title="In báo cáo">
                <Printer size={16} />
              </button>
              <button onClick={load} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors" title="Làm mới">
                <RefreshCw size={16} />
              </button>
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2">Báo cáo Điều hành Tổng hợp</h1>
          <p className="text-slate-300 text-lg">CEO Master Plan — Năm tài chính {data.year}</p>
          <div className="mt-6 flex items-center gap-6 text-sm text-slate-300">
            <span>Ngày lập: {new Date(data.generatedAt).toLocaleDateString("vi-VN")}</span>
            <span>Phân loại: MẬT</span>
            <span>Người lập: AI CEO Agent</span>
          </div>
        </div>

        {/* Key Metrics Banner */}
        <div className="grid grid-cols-2 md:grid-cols-4 border-b border-slate-100">
          {[
            { label: "Doanh thu YTD", value: fmtVND(data.overview.totalRevenue), sub: `${fmtPct(data.overview.targetAchievement)} mục tiêu` },
            { label: "Lợi nhuận ròng", value: fmtVND(data.overview.netProfit), sub: `Margin ${fmtPct(data.overview.profitMargin)}` },
            { label: "Nhân sự", value: `${data.overview.headcount} NV`, sub: `KPI TB: ${data.overview.avgKPI}/100` },
            { label: "Pipeline", value: fmtVND(data.pipeline.reduce((s, p) => s + p.totalValue, 0)), sub: `${data.overview.totalDeals} deals` },
          ].map((m, i) => (
            <div key={i} className="px-6 py-5 border-r border-slate-100 last:border-0">
              <div className="text-xs text-slate-500 mb-1">{m.label}</div>
              <div className="text-xl font-bold text-slate-800">{m.value}</div>
              <div className="text-xs text-slate-400 mt-0.5">{m.sub}</div>
            </div>
          ))}
        </div>

        {/* Report Body */}
        <div className="px-8 py-8 space-y-10 report-body">

          {/* 1. Executive Summary */}
          <ReportSection number="I" title="Tóm tắt Điều hành">
            <p className="whitespace-pre-line">{executiveSummaryNarrative(data)}</p>
          </ReportSection>

          {/* 2. Revenue & Profitability */}
          <ReportSection number="II" title="Doanh thu & Lợi nhuận">
            <p>{revenueNarrative(data)}</p>

            {/* Monthly chart */}
            <div className="mt-6 bg-slate-50 rounded-xl p-5">
              <h4 className="text-sm font-semibold text-slate-700 mb-4">Biểu đồ P&L theo tháng</h4>
              <div className="space-y-2">
                {data.monthlyPnL.map(m => {
                  const maxRev = Math.max(...data.monthlyPnL.map(x => x.revenue));
                  return (
                    <div key={m.month} className="flex items-center gap-3 text-xs">
                      <span className="w-8 text-slate-500 font-medium">{m.month}</span>
                      <div className="flex-1 flex gap-1">
                        <div className="h-5 bg-blue-500 rounded-sm" style={{ width: `${(m.revenue / maxRev) * 100}%` }} title={`DT: ${fmtVND(m.revenue)}`} />
                      </div>
                      <span className="w-16 text-right text-slate-700 font-medium">{fmtVND(m.revenue)}</span>
                      <span className={`w-14 text-right font-medium ${m.profit >= 0 ? "text-green-600" : "text-red-600"}`}>{fmtVND(m.profit)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 mt-3 text-[11px] text-slate-400">
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-500 rounded-sm inline-block" /> Doanh thu</span>
                <span>Cột phải: Lợi nhuận sau thuế</span>
              </div>
            </div>
          </ReportSection>

          {/* 3. Quarter Analysis */}
          <ReportSection number="III" title="Phân tích theo Quý">
            <p className="whitespace-pre-line">{quarterNarrative(data)}</p>

            {/* Quarter table */}
            <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Quý</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">Doanh thu</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">Lợi nhuận</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {data.quarterComparison.map(q => (
                    <tr key={q.quarter} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-medium text-slate-800">{q.quarter}/{data.year}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{fmtVND(q.revenue)}</td>
                      <td className={`px-4 py-3 text-right font-medium ${q.profit >= 0 ? "text-green-700" : "text-red-700"}`}>{fmtVND(q.profit)}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{fmtPct(q.margin)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ReportSection>

          {/* 4. Channel Analysis */}
          <ReportSection number="IV" title="Phân tích Kênh phân phối">
            <p className="whitespace-pre-line">{channelNarrative(data)}</p>

            {/* Channel table */}
            <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">Kênh</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">Doanh thu</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">Tỷ trọng</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {data.channels.sort((a, b) => b.revenue - a.revenue).map(ch => (
                    <tr key={ch.name} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-medium text-slate-800">{ch.name}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{fmtVND(ch.revenue)}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{fmtPct(ch.share)}</td>
                      <td className={`px-4 py-3 text-right font-medium ${ch.margin >= 30 ? "text-green-700" : ch.margin >= 20 ? "text-amber-700" : "text-red-700"}`}>
                        {fmtPct(ch.margin)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ReportSection>

          {/* 5. HR & Performance */}
          <ReportSection number="V" title="Nhân sự & Hiệu suất">
            <p className="whitespace-pre-line">{hrNarrative(data)}</p>

            {/* Department table */}
            {data.departments.length > 0 && (
              <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Phòng ban</th>
                      <th className="text-center px-4 py-3 font-semibold text-slate-600">SL</th>
                      <th className="text-center px-4 py-3 font-semibold text-slate-600">KPI TB</th>
                      <th className="text-center px-4 py-3 font-semibold text-slate-600">Tasks</th>
                      <th className="text-center px-4 py-3 font-semibold text-slate-600">Hoàn thành</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.departments.map(dept => (
                      <tr key={dept.name} className="border-t border-slate-100">
                        <td className="px-4 py-3 font-medium text-slate-800">{dept.name}</td>
                        <td className="px-4 py-3 text-center text-slate-700">{dept.headcount}</td>
                        <td className={`px-4 py-3 text-center font-medium ${dept.avgKPI >= 80 ? "text-green-700" : dept.avgKPI >= 60 ? "text-amber-700" : "text-red-700"}`}>
                          {dept.avgKPI || "—"}
                        </td>
                        <td className="px-4 py-3 text-center text-slate-600">{dept.tasksDone}/{dept.tasksTotal}</td>
                        <td className={`px-4 py-3 text-center font-medium ${dept.completionRate >= 80 ? "text-green-700" : dept.completionRate >= 50 ? "text-amber-700" : "text-red-700"}`}>
                          {fmtPct(dept.completionRate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ReportSection>

          {/* 6. Pipeline */}
          <ReportSection number="VI" title="Pipeline & Bán hàng">
            <p className="whitespace-pre-line">{pipelineNarrative(data)}</p>
          </ReportSection>

          {/* 7. Financial Health */}
          <ReportSection number="VII" title="Sức khỏe Tài chính">
            <p className="whitespace-pre-line">{financialHealthNarrative(data)}</p>
          </ReportSection>

          {/* 8. Master Plan Progress */}
          <ReportSection number="VIII" title="Tiến độ Chiến lược (Master Plan)">
            <p className="whitespace-pre-line">{masterPlanNarrative(data)}</p>
          </ReportSection>

          {/* 9. Recommendations */}
          <ReportSection number="IX" title="Khuyến nghị & Hành động tiếp theo">
            <p className="whitespace-pre-line">{recommendationsNarrative(data)}</p>
          </ReportSection>

          {/* Signature */}
          <div className="border-t-2 border-slate-200 pt-8 mt-12">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <div className="text-sm text-slate-500 mb-6">Người lập báo cáo</div>
                <div className="border-b border-slate-300 w-48 mb-2" />
                <div className="text-sm font-medium text-slate-800">AI CEO Agent</div>
                <div className="text-xs text-slate-500">Teeworld AI Agents System</div>
              </div>
              <div>
                <div className="text-sm text-slate-500 mb-6">Phê duyệt</div>
                <div className="border-b border-slate-300 w-48 mb-2" />
                <div className="text-sm font-medium text-slate-800">CEO / Chủ tịch HĐQT</div>
                <div className="text-xs text-slate-500">Teeworld Co.</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          aside, nav, button, .md\\:ml-\\[260px\\] { margin-left: 0 !important; }
          aside { display: none !important; }
          .report-body { font-size: 11pt; }
        }
      `}</style>
    </div>
  );
}

// ============ REPORT SECTION COMPONENT ============

function ReportSection({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
        <span className="text-blue-600">{number}.</span> {title}
      </h3>
      <div className="text-sm text-slate-700 leading-relaxed space-y-3">
        {children}
      </div>
    </section>
  );
}
