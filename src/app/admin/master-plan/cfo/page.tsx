"use client";

import { useEffect, useState } from "react";
import { buildExecutiveReport, ExecutiveReportData, fmtVND, fmtPct } from "@/lib/report-builder";
import { RefreshCw } from "lucide-react";

export default function CFOReport() {
  const [data, setData] = useState<ExecutiveReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    buildExecutiveReport(2026).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  if (loading || !data) {
    return <div className="p-6 flex items-center justify-center h-[60vh]"><div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-600 border-t-transparent" /></div>;
  }

  const { totalRevenue, totalExpenses, netProfit, profitMargin } = data.overview;
  const h = data.financialHealth;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-800 px-8 py-8 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/20">
                <span className="font-bold">TW</span>
              </div>
              <div className="text-xs text-emerald-200 tracking-widest uppercase">Teeworld Co. — Phòng Tài chính</div>
            </div>
            <button onClick={load} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"><RefreshCw size={16} /></button>
          </div>
          <h1 className="text-2xl font-bold mb-1">Báo cáo Tài chính & Dòng tiền</h1>
          <p className="text-emerald-200">CFO Report — Năm tài chính {data.year}</p>
          <div className="mt-4 text-xs text-emerald-300">Ngày lập: {new Date(data.generatedAt).toLocaleDateString("vi-VN")} | Người lập: AI CFO Agent</div>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 border-b border-slate-100">
          {[
            { label: "Tổng doanh thu", value: fmtVND(totalRevenue) },
            { label: "Tổng chi phí", value: fmtVND(totalExpenses) },
            { label: "Lợi nhuận ròng", value: fmtVND(netProfit) },
            { label: "Biên LN ròng", value: fmtPct(profitMargin) },
          ].map((m, i) => (
            <div key={i} className="px-6 py-5 border-r border-slate-100 last:border-0">
              <div className="text-xs text-slate-500 mb-1">{m.label}</div>
              <div className="text-xl font-bold text-slate-800">{m.value}</div>
            </div>
          ))}
        </div>

        {/* Report body */}
        <div className="px-8 py-8 space-y-10 text-sm text-slate-700 leading-relaxed">

          <Section n="I" title="Tổng quan Tài chính">
            <p>
              Năm {data.year}, Teeworld đạt tổng doanh thu {fmtVND(totalRevenue)} với tổng chi phí hoạt động {fmtVND(totalExpenses)}.
              Lợi nhuận sau thuế đạt {fmtVND(netProfit)}, tương ứng biên lợi nhuận ròng {fmtPct(profitMargin)}.
              {profitMargin > 25 ? " Kết quả này phản ánh hiệu quả kiểm soát chi phí tốt và chiến lược giá sản phẩm hợp lý trên các kênh." : profitMargin > 15 ? " Biên lợi nhuận ở mức chấp nhận được, tuy nhiên vẫn có room cải thiện thông qua tối ưu chi phí vận hành." : " Biên lợi nhuận ở mức thấp, cần rà soát khẩn cấp cơ cấu chi phí."}
            </p>
            <p>
              So với mục tiêu doanh thu {fmtVND(data.overview.revenueTarget)}, tiến độ đạt {fmtPct(data.overview.targetAchievement)}.
              {data.overview.targetAchievement >= 100 ? " Công ty đã hoàn thành mục tiêu doanh thu năm." : data.overview.targetAchievement >= 75 ? " Tiến độ khả quan, cần duy trì nhịp độ trong các quý còn lại." : " Cần tăng tốc đáng kể để đạt mục tiêu."}
            </p>
          </Section>

          <Section n="II" title="Kết quả kinh doanh theo Quý">
            <p>Phân tích hiệu quả kinh doanh qua từng quý cho thấy xu hướng tăng trưởng và tính mùa vụ của ngành graphic tees:</p>
            <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead><tr className="bg-slate-50">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Quý</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">Doanh thu</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">Chi phí</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">Lợi nhuận</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">Margin</th>
                </tr></thead>
                <tbody>
                  {data.quarterComparison.map(q => (
                    <tr key={q.quarter} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-medium">{q.quarter}</td>
                      <td className="px-4 py-3 text-right">{fmtVND(q.revenue)}</td>
                      <td className="px-4 py-3 text-right text-slate-500">{fmtVND(q.revenue - q.profit)}</td>
                      <td className={`px-4 py-3 text-right font-medium ${q.profit >= 0 ? "text-green-700" : "text-red-700"}`}>{fmtVND(q.profit)}</td>
                      <td className="px-4 py-3 text-right">{fmtPct(q.margin)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(() => {
              const qs = data.quarterComparison.filter(q => q.revenue > 0);
              if (qs.length < 2) return null;
              const best = qs.reduce((a, b) => a.margin > b.margin ? a : b);
              const worst = qs.reduce((a, b) => a.margin < b.margin ? a : b);
              return <p className="mt-3">Quý có biên lợi nhuận cao nhất: {best.quarter} ({fmtPct(best.margin)}). Quý thấp nhất: {worst.quarter} ({fmtPct(worst.margin)}). Sự chênh lệch này phản ánh mùa vụ tiêu dùng và hiệu quả kiểm soát chi phí trong từng giai đoạn.</p>;
            })()}
          </Section>

          <Section n="III" title="P&L chi tiết theo Tháng">
            <p>Bảng Profit & Loss hàng tháng cho thấy diễn biến doanh thu-chi phí-lợi nhuận xuyên suốt năm tài chính:</p>
            <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead><tr className="bg-slate-50">
                  <th className="text-left px-4 py-2 font-semibold text-slate-600 text-xs">Tháng</th>
                  <th className="text-right px-4 py-2 font-semibold text-slate-600 text-xs">Doanh thu</th>
                  <th className="text-right px-4 py-2 font-semibold text-slate-600 text-xs">Chi phí</th>
                  <th className="text-right px-4 py-2 font-semibold text-slate-600 text-xs">LN sau thuế</th>
                  <th className="text-right px-4 py-2 font-semibold text-slate-600 text-xs">Margin</th>
                </tr></thead>
                <tbody>
                  {data.monthlyPnL.map(m => (
                    <tr key={m.month} className="border-t border-slate-50">
                      <td className="px-4 py-2 font-medium text-slate-700">{m.month}</td>
                      <td className="px-4 py-2 text-right">{fmtVND(m.revenue)}</td>
                      <td className="px-4 py-2 text-right text-slate-500">{fmtVND(m.expenses)}</td>
                      <td className={`px-4 py-2 text-right font-medium ${m.profit >= 0 ? "text-green-700" : "text-red-700"}`}>{fmtVND(m.profit)}</td>
                      <td className="px-4 py-2 text-right text-slate-600">{fmtPct(m.margin)}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-slate-200 font-bold bg-slate-50">
                    <td className="px-4 py-3">Tổng cộng</td>
                    <td className="px-4 py-3 text-right">{fmtVND(totalRevenue)}</td>
                    <td className="px-4 py-3 text-right">{fmtVND(totalExpenses)}</td>
                    <td className={`px-4 py-3 text-right ${netProfit >= 0 ? "text-green-700" : "text-red-700"}`}>{fmtVND(netProfit)}</td>
                    <td className="px-4 py-3 text-right">{fmtPct(profitMargin)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Section>

          <Section n="IV" title="Phân tích Kinh tế Kênh bán">
            <p>Phân tích biên lợi nhuận theo kênh bán hàng — cơ sở cho quyết định phân bổ ngân sách marketing và chiến lược giá:</p>
            <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead><tr className="bg-slate-50">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Kênh</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">Doanh thu</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">Tỷ trọng</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">Margin</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600">Đánh giá</th>
                </tr></thead>
                <tbody>
                  {data.channels.sort((a, b) => b.margin - a.margin).map(ch => (
                    <tr key={ch.name} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-medium">{ch.name}</td>
                      <td className="px-4 py-3 text-right">{fmtVND(ch.revenue)}</td>
                      <td className="px-4 py-3 text-right">{fmtPct(ch.share)}</td>
                      <td className={`px-4 py-3 text-right font-medium ${ch.margin >= 30 ? "text-green-700" : ch.margin >= 20 ? "text-amber-700" : "text-red-700"}`}>{fmtPct(ch.margin)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full ${ch.margin >= 30 ? "bg-green-50 text-green-700" : ch.margin >= 20 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}>
                          {ch.margin >= 30 ? "Hiệu quả" : ch.margin >= 20 ? "Trung bình" : "Cần xem xét"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3">
              {(() => {
                const high = data.channels.filter(c => c.margin >= 30);
                const low = data.channels.filter(c => c.margin < 20);
                let text = "";
                if (high.length > 0) text += `Kênh hiệu quả cao: ${high.map(c => `${c.name} (${fmtPct(c.margin)})`).join(", ")}. Đề xuất tăng phân bổ ngân sách và traffic cho các kênh này. `;
                if (low.length > 0) text += `Kênh cần cải thiện: ${low.map(c => `${c.name} (${fmtPct(c.margin)})`).join(", ")}. Xem xét tái cơ cấu chi phí quảng cáo hoặc điều chỉnh chiến lược giá.`;
                return text;
              })()}
            </p>
          </Section>

          <Section n="V" title="Chỉ số Sức khỏe Tài chính">
            <p>Đánh giá tổng quát sức khỏe tài chính dựa trên các chỉ số chuẩn:</p>
            <div className="mt-4 space-y-4">
              <HealthRow label="Hệ số thanh toán ngắn hạn" value={`${h.currentRatio.toFixed(2)}x`} desc={h.currentRatio >= 2 ? "Thanh khoản rất tốt, có đủ khả năng thanh toán các khoản nợ ngắn hạn" : h.currentRatio >= 1 ? "Thanh khoản đủ, theo dõi dòng tiền hàng tháng" : "Cảnh báo thanh khoản — cần tăng cường quản lý dòng tiền"} status={h.currentRatio >= 1.5 ? "green" : h.currentRatio >= 1 ? "amber" : "red"} />
              <HealthRow label="Tỷ lệ nợ/vốn (D/E)" value={`${h.debtToEquity.toFixed(2)}x`} desc={h.debtToEquity < 0.5 ? "Cơ cấu vốn an toàn, ít phụ thuộc nợ vay" : h.debtToEquity < 1 ? "Mức nợ hợp lý" : "Nợ vay cao, cần lộ trình giảm nợ"} status={h.debtToEquity < 0.5 ? "green" : h.debtToEquity < 1 ? "amber" : "red"} />
              <HealthRow label="Biên LN hoạt động" value={fmtPct(h.operatingMargin)} desc="Hiệu quả hoạt động trước thuế và lãi vay — phản ánh năng lực vận hành cốt lõi" status={h.operatingMargin > 20 ? "green" : h.operatingMargin > 10 ? "amber" : "red"} />
              <HealthRow label="Biên LN ròng" value={fmtPct(h.profitMargin)} desc="Lợi nhuận cuối cùng sau tất cả chi phí — chỉ số quan trọng nhất với nhà đầu tư" status={h.profitMargin > 20 ? "green" : h.profitMargin > 10 ? "amber" : "red"} />
            </div>
          </Section>

          <Section n="VI" title="Khuyến nghị CFO">
            <div className="space-y-3">
              {data.channels.filter(c => c.margin < 20).length > 0 && (
                <p><strong>1. Tái cơ cấu kênh bán:</strong> Giảm chi phí quảng cáo trên các kênh margin thấp ({data.channels.filter(c => c.margin < 20).map(c => c.name).join(", ")}), chuyển ngân sách sang kênh D2C có biên lợi nhuận cao hơn.</p>
              )}
              <p><strong>{data.channels.filter(c => c.margin < 20).length > 0 ? "2" : "1"}. Quản lý dòng tiền:</strong> Duy trì hệ số thanh toán ngắn hạn trên 1.5x, đàm phán kéo dài kỳ thanh toán với nhà cung cấp và rút ngắn kỳ thu tiền từ khách hàng B2B.</p>
              <p><strong>{data.channels.filter(c => c.margin < 20).length > 0 ? "3" : "2"}. Kiểm soát chi phí:</strong> Rà soát lại chi phí nhân sự/doanh thu ({data.overview.headcount} NV), so sánh benchmark ngành và xem xét tự động hóa quy trình để tăng hiệu quả per-employee.</p>
            </div>
          </Section>

          {/* Signature */}
          <div className="border-t-2 border-slate-200 pt-8 mt-12">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <div className="text-sm text-slate-500 mb-6">Người lập</div>
                <div className="border-b border-slate-300 w-48 mb-2" />
                <div className="text-sm font-medium text-slate-800">AI CFO Agent</div>
              </div>
              <div>
                <div className="text-sm text-slate-500 mb-6">Phê duyệt</div>
                <div className="border-b border-slate-300 w-48 mb-2" />
                <div className="text-sm font-medium text-slate-800">CEO / Chủ tịch HĐQT</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-lg font-bold text-slate-800 mb-3"><span className="text-emerald-600">{n}.</span> {title}</h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function HealthRow({ label, value, desc, status }: { label: string; value: string; desc: string; status: "green" | "amber" | "red" }) {
  const colors = { green: "bg-green-50 border-green-200", amber: "bg-amber-50 border-amber-200", red: "bg-red-50 border-red-200" };
  const dots = { green: "bg-green-500", amber: "bg-amber-500", red: "bg-red-500" };
  return (
    <div className={`rounded-lg border p-4 ${colors[status]}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="font-medium text-slate-800 flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${dots[status]}`} />
          {label}
        </span>
        <span className="font-bold text-slate-800">{value}</span>
      </div>
      <p className="text-xs text-slate-600">{desc}</p>
    </div>
  );
}
