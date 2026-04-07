"use client";

import { useEffect, useState } from "react";
import { buildExecutiveReport, ExecutiveReportData, fmtVND, fmtPct } from "@/lib/report-builder";
import { RefreshCw } from "lucide-react";

export default function MarketingReport() {
  const [data, setData] = useState<ExecutiveReportData | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { buildExecutiveReport(2026).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false)); }, []);

  if (loading || !data) return <div className="p-6 flex items-center justify-center h-[60vh]"><div className="animate-spin rounded-full h-8 w-8 border-2 border-pink-600 border-t-transparent" /></div>;

  const topChannel = data.channels.length > 0 ? [...data.channels].sort((a, b) => b.revenue - a.revenue)[0] : null;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="bg-gradient-to-br from-pink-800 via-rose-700 to-pink-800 px-8 py-8 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/20"><span className="font-bold">TW</span></div>
              <div className="text-xs text-pink-200 tracking-widest uppercase">Teeworld Co. — Marketing & Brand</div>
            </div>
            <button onClick={() => { setLoading(true); buildExecutiveReport(2026).then(d => { setData(d); setLoading(false); }); }} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"><RefreshCw size={16} /></button>
          </div>
          <h1 className="text-2xl font-bold mb-1">Báo cáo Marketing & Kênh phân phối</h1>
          <p className="text-pink-200">Marketing Manager Report — Năm {data.year}</p>
          <div className="mt-4 text-xs text-pink-300">Ngày lập: {new Date(data.generatedAt).toLocaleDateString("vi-VN")} | Người lập: AI Marketing Agent</div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 border-b border-slate-100">
          {[
            { label: "Số kênh bán", value: `${data.channels.length}` },
            { label: "Tổng doanh thu", value: fmtVND(data.overview.totalRevenue) },
            { label: "Kênh dẫn đầu", value: topChannel?.name || "—" },
            { label: "Margin cao nhất", value: topChannel ? fmtPct(Math.max(...data.channels.map(c => c.margin))) : "—" },
          ].map((m, i) => (
            <div key={i} className="px-6 py-5 border-r border-slate-100 last:border-0">
              <div className="text-xs text-slate-500 mb-1">{m.label}</div>
              <div className="text-xl font-bold text-slate-800">{m.value}</div>
            </div>
          ))}
        </div>

        <div className="px-8 py-8 space-y-10 text-sm text-slate-700 leading-relaxed">

          <Sec n="I" title="Chiến lược Kênh phân phối">
            <p>
              Teeworld vận hành hệ thống phân phối đa kênh (omnichannel) với {data.channels.length} kênh bán hàng.
              Chiến lược tổng thể là tối đa hóa doanh thu trên kênh D2C (margin cao) đồng thời duy trì sự hiện diện trên marketplace để tiếp cận khách hàng mới.
              Tổng doanh thu năm {data.year}: {fmtVND(data.overview.totalRevenue)}, đạt {fmtPct(data.overview.targetAchievement)} mục tiêu.
            </p>
          </Sec>

          <Sec n="II" title="Phân tích chi tiết từng Kênh">
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead><tr className="bg-slate-50">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Kênh</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">Doanh thu</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">Tỷ trọng</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">Margin</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Nhận xét</th>
                </tr></thead>
                <tbody>
                  {data.channels.sort((a, b) => b.revenue - a.revenue).map(ch => (
                    <tr key={ch.name} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-medium">{ch.name}</td>
                      <td className="px-4 py-3 text-right">{fmtVND(ch.revenue)}</td>
                      <td className="px-4 py-3 text-right">{fmtPct(ch.share)}</td>
                      <td className={`px-4 py-3 text-right font-medium ${ch.margin >= 30 ? "text-green-700" : ch.margin >= 20 ? "text-amber-700" : "text-red-700"}`}>{fmtPct(ch.margin)}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {ch.margin >= 35 ? "Hiệu quả cao — tăng đầu tư" : ch.margin >= 20 ? "Ổn định — duy trì" : "Margin thấp — xem xét giảm chi phí hoặc rút lui"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Channel margin visual */}
            <div className="mt-4 bg-slate-50 rounded-xl p-5">
              <h4 className="text-xs font-semibold text-slate-600 mb-3 uppercase tracking-wider">Biên lợi nhuận theo kênh</h4>
              {data.channels.sort((a, b) => b.margin - a.margin).map(ch => (
                <div key={ch.name} className="flex items-center gap-3 mb-2">
                  <span className="w-32 text-xs text-slate-600 truncate">{ch.name}</span>
                  <div className="flex-1 h-5 bg-slate-200 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${ch.margin >= 30 ? "bg-green-500" : ch.margin >= 20 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${Math.max(2, Math.min(100, ch.margin * 2))}%` }} />
                  </div>
                  <span className={`w-14 text-right text-xs font-bold ${ch.margin >= 30 ? "text-green-700" : ch.margin >= 20 ? "text-amber-700" : "text-red-700"}`}>{fmtPct(ch.margin)}</span>
                </div>
              ))}
            </div>
          </Sec>

          <Sec n="III" title="Chiến lược Brand — Teeworld DNA">
            <p>
              Teeworld xây dựng thương hiệu trên 3 trụ cột chính: <strong>Saigonese</strong> (văn hóa Sài Gòn retro-modern),
              <strong> Quote Tees</strong> (áo quote vui vẻ, viral — &quot;Không Được Đánh Khách Hàng&quot;),
              và <strong>Texture Teeworld Studio</strong> (chất liệu premium, thiết kế riêng).
              Sub-brand <strong>Happy Sunday</strong> phục vụ phân khúc lifestyle/du lịch — đang có tiềm năng mở rộng thành dòng sản phẩm độc lập.
            </p>
            <p>
              Lợi thế cạnh tranh: Tốc độ ra mẫu 7 ngày (so với 30+ ngày đối thủ), khả năng viral qua content quote,
              và cộng đồng khách hàng trung thành Saigonese. Đây là moat khó copy — đối thủ có thể copy mẫu nhưng không copy được brand DNA.
            </p>
          </Sec>

          <Sec n="IV" title="Khuyến nghị Marketing">
            <p><strong>1. Đẩy mạnh D2C:</strong> Website có margin cao nhất — tăng budget Google/Meta Ads chuyển traffic về website, giảm phụ thuộc marketplace.</p>
            <p><strong>2. Content Strategy:</strong> Quote tees có khả năng viral tự nhiên — xây dựng pipeline quote mới hàng tuần, tận dụng UGC (user generated content) từ khách hàng.</p>
            <p><strong>3. Happy Sunday expansion:</strong> Phát triển Happy Sunday thành sub-brand mạnh hơn — collab với travel influencer, ra BST theo destination.</p>
            {data.channels.filter(c => c.margin < 20).length > 0 && (
              <p><strong>4. Tối ưu marketplace:</strong> Các kênh {data.channels.filter(c => c.margin < 20).map(c => c.name).join(", ")} margin thấp — chỉ đẩy best sellers, giảm quảng cáo, sử dụng như kênh awareness hơn là revenue.</p>
            )}
          </Sec>

          <div className="border-t-2 border-slate-200 pt-8 mt-12 grid grid-cols-2 gap-8">
            <div><div className="text-sm text-slate-500 mb-6">Người lập</div><div className="border-b border-slate-300 w-48 mb-2" /><div className="text-sm font-medium">AI Marketing Agent</div></div>
            <div><div className="text-sm text-slate-500 mb-6">Phê duyệt</div><div className="border-b border-slate-300 w-48 mb-2" /><div className="text-sm font-medium">CEO</div></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Sec({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (<section><h3 className="text-lg font-bold text-slate-800 mb-3"><span className="text-pink-600">{n}.</span> {title}</h3><div className="space-y-3">{children}</div></section>);
}
