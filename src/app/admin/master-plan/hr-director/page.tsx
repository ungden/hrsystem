"use client";

import { useEffect, useState } from "react";
import { buildExecutiveReport, ExecutiveReportData, fmtVND, fmtPct } from "@/lib/report-builder";
import { RefreshCw } from "lucide-react";

export default function HRDirectorReport() {
  const [data, setData] = useState<ExecutiveReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    buildExecutiveReport(2026).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  if (loading || !data) {
    return <div className="p-6 flex items-center justify-center h-[60vh]"><div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" /></div>;
  }

  const { headcount, avgKPI } = data.overview;
  const totalTasks = data.departments.reduce((s, d) => s + d.tasksTotal, 0);
  const totalDone = data.departments.reduce((s, d) => s + d.tasksDone, 0);
  const completionRate = totalTasks > 0 ? (totalDone / totalTasks) * 100 : 0;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="bg-gradient-to-br from-blue-800 via-blue-700 to-indigo-800 px-8 py-8 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/20"><span className="font-bold">TW</span></div>
              <div className="text-xs text-blue-200 tracking-widest uppercase">Teeworld Co. — Phòng Nhân sự</div>
            </div>
            <button onClick={load} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"><RefreshCw size={16} /></button>
          </div>
          <h1 className="text-2xl font-bold mb-1">Báo cáo Nhân sự & Phát triển Tổ chức</h1>
          <p className="text-blue-200">HR Director Report — Năm tài chính {data.year}</p>
          <div className="mt-4 text-xs text-blue-300">Ngày lập: {new Date(data.generatedAt).toLocaleDateString("vi-VN")} | Người lập: AI HR Director Agent</div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 border-b border-slate-100">
          {[
            { label: "Tổng nhân sự", value: `${headcount} NV` },
            { label: "KPI trung bình", value: `${avgKPI}/100` },
            { label: "Tasks hoàn thành", value: `${totalDone}/${totalTasks}` },
            { label: "Tỷ lệ hoàn thành", value: fmtPct(completionRate) },
          ].map((m, i) => (
            <div key={i} className="px-6 py-5 border-r border-slate-100 last:border-0">
              <div className="text-xs text-slate-500 mb-1">{m.label}</div>
              <div className="text-xl font-bold text-slate-800">{m.value}</div>
            </div>
          ))}
        </div>

        <div className="px-8 py-8 space-y-10 text-sm text-slate-700 leading-relaxed">
          <Sec n="I" title="Tổng quan Nhân sự" color="blue">
            <p>
              Teeworld hiện có đội ngũ {headcount} nhân viên đang hoạt động, phân bổ trên {data.departments.length} phòng ban.
              Đây là quy mô phù hợp cho giai đoạn phát triển hiện tại với mục tiêu doanh thu {fmtVND(data.overview.revenueTarget)}/năm,
              tương ứng doanh thu bình quân {fmtVND(Math.round(data.overview.totalRevenue / headcount))}/nhân viên/năm.
            </p>
            <p>
              Điểm KPI trung bình toàn công ty đạt {avgKPI}/100.
              {avgKPI >= 80 ? " Đây là mức xuất sắc, cho thấy đội ngũ có hiệu suất cao." : avgKPI >= 60 ? " Mức khá, có room cải thiện thông qua coaching và training." : " Cần rà soát hệ thống đánh giá và chương trình đào tạo."}
            </p>
          </Sec>

          <Sec n="II" title="Phân tích theo Phòng ban" color="blue">
            <p>Đánh giá hiệu suất chi tiết từng phòng ban:</p>
            <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead><tr className="bg-slate-50">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Phòng ban</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600">SL</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600">KPI</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600">Tasks</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600">Hoàn thành</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600">Đánh giá</th>
                </tr></thead>
                <tbody>
                  {data.departments.map(dept => (
                    <tr key={dept.name} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-medium">{dept.name}</td>
                      <td className="px-4 py-3 text-center">{dept.headcount}</td>
                      <td className={`px-4 py-3 text-center font-medium ${dept.avgKPI >= 80 ? "text-green-700" : dept.avgKPI >= 60 ? "text-amber-700" : dept.avgKPI > 0 ? "text-red-700" : "text-slate-400"}`}>{dept.avgKPI || "—"}</td>
                      <td className="px-4 py-3 text-center">{dept.tasksDone}/{dept.tasksTotal}</td>
                      <td className="px-4 py-3 text-center">{fmtPct(dept.completionRate)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full ${dept.completionRate >= 80 ? "bg-green-50 text-green-700" : dept.completionRate >= 50 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}>
                          {dept.completionRate >= 80 ? "Tốt" : dept.completionRate >= 50 ? "TB" : "Yếu"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(() => {
              const weak = data.departments.filter(d => d.completionRate < 50 && d.tasksTotal > 0);
              return weak.length > 0
                ? <p className="mt-3">Phòng ban cần cải thiện: {weak.map(d => `${d.name} (${fmtPct(d.completionRate)})`).join(", ")}. Đề xuất rà soát workload và quy trình phân công.</p>
                : <p className="mt-3">Tất cả phòng ban đạt tỷ lệ hoàn thành trên 50%.</p>;
            })()}
          </Sec>

          <Sec n="III" title="Nhân sự Xuất sắc" color="blue">
            {data.employees.topPerformers.length > 0 ? (
              <>
                <p>Top performers cần được ghi nhận và giữ chân:</p>
                <div className="mt-3 space-y-2">
                  {data.employees.topPerformers.map((e, i) => (
                    <div key={i} className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                      <span className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">#{i + 1}</span>
                      <div className="flex-1"><span className="font-medium">{e.name}</span> <span className="text-xs text-slate-500">{e.department}</span></div>
                      <span className="font-bold text-green-700">KPI: {e.kpiScore}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-3">Khuyến nghị: Xem xét khen thưởng, đề bạt. Chi phí turnover = 2-3x lương — giữ chân hiệu quả hơn tuyển mới.</p>
              </>
            ) : <p>Chưa có dữ liệu KPI để xếp hạng.</p>}
          </Sec>

          <Sec n="IV" title="Nhân sự Cần Theo dõi" color="blue">
            {data.employees.atRisk.length > 0 ? (
              <>
                <p>Nhân sự có KPI dưới 60 — cần PIP (Performance Improvement Plan):</p>
                <div className="mt-3 space-y-2">
                  {data.employees.atRisk.map((e, i) => (
                    <div key={i} className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                      <span className="w-2 h-2 bg-red-500 rounded-full" />
                      <div className="flex-1"><span className="font-medium">{e.name}</span> <span className="text-xs text-slate-500">{e.department}</span></div>
                      <span className="font-bold text-red-700">KPI: {e.kpiScore}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-3">Đề xuất: PIP 30-60 ngày. Bước 1: 1-on-1 xác định nguyên nhân. Bước 2: Mentor + mục tiêu cải thiện. Bước 3: Review sau 30 ngày.</p>
              </>
            ) : <p>Không có nhân viên KPI dưới 60. Đội ngũ ổn định.</p>}
          </Sec>

          <Sec n="V" title="Năng suất Lao động" color="blue">
            <div className="bg-slate-50 rounded-lg p-4 grid grid-cols-2 gap-4">
              <div><div className="text-xs text-slate-500">DT / nhân viên</div><div className="text-lg font-bold">{fmtVND(Math.round(data.overview.totalRevenue / headcount))}</div></div>
              <div><div className="text-xs text-slate-500">LN / nhân viên</div><div className="text-lg font-bold">{fmtVND(Math.round(data.overview.netProfit / headcount))}</div></div>
              <div><div className="text-xs text-slate-500">Tasks / NV</div><div className="text-lg font-bold">{Math.round(totalTasks / headcount)}</div></div>
              <div><div className="text-xs text-slate-500">Hoàn thành TB</div><div className="text-lg font-bold">{fmtPct(completionRate)}</div></div>
            </div>
          </Sec>

          <Sec n="VI" title="Khuyến nghị" color="blue">
            <p><strong>1. Giữ chân nhân tài:</strong> Review đãi ngộ top performers. Career path rõ ràng.</p>
            <p><strong>2. Training:</strong> Chương trình đào tạo theo phòng ban, focus skill gaps từ KPI.</p>
            <p><strong>3. Engagement:</strong> Team building quarterly, survey engagement hàng tháng. Target retention {">"}90%.</p>
            {data.departments.filter(d => d.headcount === 1).length > 0 && (
              <p><strong>4. Backup plan:</strong> Phòng ban 1 người: {data.departments.filter(d => d.headcount === 1).map(d => d.name).join(", ")} — cần cross-training.</p>
            )}
          </Sec>

          <div className="border-t-2 border-slate-200 pt-8 mt-12 grid grid-cols-2 gap-8">
            <div><div className="text-sm text-slate-500 mb-6">Người lập</div><div className="border-b border-slate-300 w-48 mb-2" /><div className="text-sm font-medium">AI HR Director Agent</div></div>
            <div><div className="text-sm text-slate-500 mb-6">Phê duyệt</div><div className="border-b border-slate-300 w-48 mb-2" /><div className="text-sm font-medium">CEO</div></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Sec({ n, title, color, children }: { n: string; title: string; color: string; children: React.ReactNode }) {
  return (<section><h3 className="text-lg font-bold text-slate-800 mb-3"><span className={`text-${color}-600`}>{n}.</span> {title}</h3><div className="space-y-3">{children}</div></section>);
}
