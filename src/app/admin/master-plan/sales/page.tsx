"use client";

import { useEffect, useState } from "react";
import { buildExecutiveReport, ExecutiveReportData, fmtVND, fmtPct } from "@/lib/report-builder";
import { RefreshCw } from "lucide-react";

export default function SalesReport() {
  const [data, setData] = useState<ExecutiveReportData | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { buildExecutiveReport(2026).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false)); }, []);

  if (loading || !data) return <div className="p-6 flex items-center justify-center h-[60vh]"><div className="animate-spin rounded-full h-8 w-8 border-2 border-amber-600 border-t-transparent" /></div>;

  const totalPipelineValue = data.pipeline.reduce((s, p) => s + p.totalValue, 0);
  const totalDeals = data.pipeline.reduce((s, p) => s + p.count, 0);

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="bg-gradient-to-br from-amber-800 via-orange-700 to-amber-800 px-8 py-8 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/20"><span className="font-bold">TW</span></div>
              <div className="text-xs text-amber-200 tracking-widest uppercase">Teeworld Co. — Phòng Kinh doanh</div>
            </div>
            <button onClick={() => { setLoading(true); buildExecutiveReport(2026).then(d => { setData(d); setLoading(false); }); }} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"><RefreshCw size={16} /></button>
          </div>
          <h1 className="text-2xl font-bold mb-1">Báo cáo Kinh doanh & Pipeline</h1>
          <p className="text-amber-200">Sales Manager Report — Năm {data.year}</p>
          <div className="mt-4 text-xs text-amber-300">Ngày lập: {new Date(data.generatedAt).toLocaleDateString("vi-VN")} | Người lập: AI Sales Agent</div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 border-b border-slate-100">
          {[
            { label: "Doanh thu YTD", value: fmtVND(data.overview.totalRevenue) },
            { label: "Pipeline", value: fmtVND(totalPipelineValue) },
            { label: "Tổng deals", value: `${totalDeals}` },
            { label: "Đơn hàng", value: `${data.overview.totalOrders}` },
          ].map((m, i) => (
            <div key={i} className="px-6 py-5 border-r border-slate-100 last:border-0">
              <div className="text-xs text-slate-500 mb-1">{m.label}</div>
              <div className="text-xl font-bold text-slate-800">{m.value}</div>
            </div>
          ))}
        </div>

        <div className="px-8 py-8 space-y-10 text-sm text-slate-700 leading-relaxed">

          <Sec n="I" title="Tổng quan Kinh doanh">
            <p>
              Năm {data.year}, Teeworld đạt doanh thu lũy kế {fmtVND(data.overview.totalRevenue)}, tương ứng {fmtPct(data.overview.targetAchievement)} mục tiêu {fmtVND(data.overview.revenueTarget)}.
              Tổng số đơn hàng: {data.overview.totalOrders}. Pipeline hiện tại: {totalDeals} deals với tổng giá trị {fmtVND(totalPipelineValue)}.
            </p>
            <p>
              {data.overview.targetAchievement >= 100
                ? "Kết quả xuất sắc — đã vượt mục tiêu doanh thu năm. Đề xuất đặt mục tiêu stretch cho các quý còn lại."
                : data.overview.targetAchievement >= 75
                ? "Tiến độ tốt. Pipeline hiện tại đủ để cover gap nếu tỷ lệ chuyển đổi đạt trên 30%."
                : "Cần tăng tốc. Phân tích pipeline và win rate để xác định bottleneck."}
            </p>
          </Sec>

          <Sec n="II" title="Pipeline chi tiết">
            <p>Phân tích pipeline bán hàng theo từng giai đoạn, từ lead generation đến chốt deal:</p>
            {data.pipeline.length > 0 ? (
              <>
                <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-slate-50">
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Giai đoạn</th>
                      <th className="text-center px-4 py-3 font-semibold text-slate-600">Số deals</th>
                      <th className="text-right px-4 py-3 font-semibold text-slate-600">Giá trị</th>
                      <th className="text-right px-4 py-3 font-semibold text-slate-600">% Pipeline</th>
                    </tr></thead>
                    <tbody>
                      {data.pipeline.map(p => (
                        <tr key={p.stage} className="border-t border-slate-100">
                          <td className="px-4 py-3 font-medium">{p.stage}</td>
                          <td className="px-4 py-3 text-center">{p.count}</td>
                          <td className="px-4 py-3 text-right">{fmtVND(p.totalValue)}</td>
                          <td className="px-4 py-3 text-right">{totalPipelineValue > 0 ? fmtPct((p.totalValue / totalPipelineValue) * 100) : "0%"}</td>
                        </tr>
                      ))}
                      <tr className="border-t-2 border-slate-200 font-bold bg-slate-50">
                        <td className="px-4 py-3">Tổng</td>
                        <td className="px-4 py-3 text-center">{totalDeals}</td>
                        <td className="px-4 py-3 text-right">{fmtVND(totalPipelineValue)}</td>
                        <td className="px-4 py-3 text-right">100%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                {/* Funnel visualization */}
                <div className="mt-4 bg-slate-50 rounded-xl p-5">
                  <h4 className="text-xs font-semibold text-slate-600 mb-3 uppercase tracking-wider">Sales Funnel</h4>
                  {data.pipeline.map((p, i) => {
                    const width = totalPipelineValue > 0 ? Math.max(20, (p.totalValue / totalPipelineValue) * 100) : 50;
                    return (
                      <div key={p.stage} className="flex items-center gap-3 mb-2">
                        <span className="w-28 text-xs text-slate-600 truncate">{p.stage}</span>
                        <div className="flex-1">
                          <div className="h-6 bg-amber-500 rounded" style={{ width: `${width}%`, opacity: 1 - i * 0.15 }} />
                        </div>
                        <span className="w-20 text-right text-xs font-medium">{p.count} deals</span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : <p>Chưa có dữ liệu pipeline. Cần nhập deals vào hệ thống CRM.</p>}
          </Sec>

          <Sec n="III" title="Doanh thu theo Quý">
            <p>Xu hướng doanh thu cho thấy tính mùa vụ của ngành graphic tees:</p>
            <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead><tr className="bg-slate-50">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Quý</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">Doanh thu</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">Lợi nhuận</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">Margin</th>
                </tr></thead>
                <tbody>
                  {data.quarterComparison.map(q => (
                    <tr key={q.quarter} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-medium">{q.quarter}</td>
                      <td className="px-4 py-3 text-right">{fmtVND(q.revenue)}</td>
                      <td className={`px-4 py-3 text-right ${q.profit >= 0 ? "text-green-700" : "text-red-700"}`}>{fmtVND(q.profit)}</td>
                      <td className="px-4 py-3 text-right">{fmtPct(q.margin)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Sec>

          <Sec n="IV" title="Khuyến nghị Sales">
            <p><strong>1. Pipeline velocity:</strong> Tăng tốc chuyển đổi deals từ &quot;Đàm phán&quot; sang &quot;Chốt sale&quot; bằng ưu đãi có thời hạn và follow-up trong 48h.</p>
            <p><strong>2. B2B expansion:</strong> Đồng phục doanh nghiệp margin {fmtPct(data.channels.find(c => c.name.includes('B2B'))?.margin || 30)} — mở rộng outreach đến SME và startups.</p>
            <p><strong>3. Seasonal planning:</strong> Chuẩn bị inventory và campaign cho các mùa cao điểm (Tết, Back to School, Q4 holiday).</p>
            <p><strong>4. Upsell strategy:</strong> Triển khai bundle deals (mua 3 tặng 1) và cross-sell phụ kiện (túi, mũ) từ BST Happy Sunday.</p>
          </Sec>

          <div className="border-t-2 border-slate-200 pt-8 mt-12 grid grid-cols-2 gap-8">
            <div><div className="text-sm text-slate-500 mb-6">Người lập</div><div className="border-b border-slate-300 w-48 mb-2" /><div className="text-sm font-medium">AI Sales Agent</div></div>
            <div><div className="text-sm text-slate-500 mb-6">Phê duyệt</div><div className="border-b border-slate-300 w-48 mb-2" /><div className="text-sm font-medium">CEO</div></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Sec({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (<section><h3 className="text-lg font-bold text-slate-800 mb-3"><span className="text-amber-600">{n}.</span> {title}</h3><div className="space-y-3">{children}</div></section>);
}
