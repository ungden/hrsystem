"use client";

import { useEffect, useState } from "react";
import { buildExecutiveReport, ExecutiveReportData, fmtVND, fmtPct } from "@/lib/report-builder";
import { RefreshCw } from "lucide-react";

export default function OperationsReport() {
  const [data, setData] = useState<ExecutiveReportData | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { buildExecutiveReport(2026).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false)); }, []);

  if (loading || !data) return <div className="p-6 flex items-center justify-center h-[60vh]"><div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-600 border-t-transparent" /></div>;

  const totalTasks = data.departments.reduce((s, d) => s + d.tasksTotal, 0);
  const totalDone = data.departments.reduce((s, d) => s + d.tasksDone, 0);
  const completionRate = totalTasks > 0 ? (totalDone / totalTasks) * 100 : 0;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 px-8 py-8 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/20"><span className="font-bold">TW</span></div>
              <div className="text-xs text-slate-300 tracking-widest uppercase">Teeworld Co. — Vận hành & Sản xuất</div>
            </div>
            <button onClick={() => { setLoading(true); buildExecutiveReport(2026).then(d => { setData(d); setLoading(false); }); }} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"><RefreshCw size={16} /></button>
          </div>
          <h1 className="text-2xl font-bold mb-1">Báo cáo Vận hành & Sản xuất</h1>
          <p className="text-slate-300">Operations Manager Report — Năm {data.year}</p>
          <div className="mt-4 text-xs text-slate-400">Ngày lập: {new Date(data.generatedAt).toLocaleDateString("vi-VN")} | Người lập: AI Operations Agent</div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 border-b border-slate-100">
          {[
            { label: "Tasks hoàn thành", value: `${totalDone}/${totalTasks}` },
            { label: "Tỷ lệ", value: fmtPct(completionRate) },
            { label: "Tồn kho", value: `${data.inventory.totalItems} items` },
            { label: "Sản phẩm active", value: `${data.overview.activeProducts}` },
          ].map((m, i) => (
            <div key={i} className="px-6 py-5 border-r border-slate-100 last:border-0">
              <div className="text-xs text-slate-500 mb-1">{m.label}</div>
              <div className="text-xl font-bold text-slate-800">{m.value}</div>
            </div>
          ))}
        </div>

        <div className="px-8 py-8 space-y-10 text-sm text-slate-700 leading-relaxed">

          <Sec n="I" title="Tổng quan Vận hành">
            <p>
              Hệ thống vận hành Teeworld hiện quản lý {totalTasks} đầu việc trên {data.departments.length} phòng ban,
              với tỷ lệ hoàn thành tổng thể {fmtPct(completionRate)}.
              Tồn kho: {data.inventory.totalItems} mặt hàng nguyên vật liệu + thành phẩm, tổng giá trị {fmtVND(data.inventory.totalValue)}.
              Sản phẩm đang bán: {data.overview.activeProducts} SKU.
            </p>
            <p>
              {completionRate >= 80 ? "Hiệu suất vận hành tốt — hệ thống đang chạy ổn định." :
               completionRate >= 50 ? "Hiệu suất vận hành trung bình — cần rà soát quy trình và bottleneck." :
               "Hiệu suất vận hành thấp — cần cải tổ quy trình, xem xét tự động hóa, và phân công lại workload."}
            </p>
          </Sec>

          <Sec n="II" title="Tiến độ công việc theo Phòng ban">
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead><tr className="bg-slate-50">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Phòng ban</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600">SL NV</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600">Done</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600">Total</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600">%</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600">Tasks/NV</th>
                </tr></thead>
                <tbody>
                  {data.departments.map(dept => (
                    <tr key={dept.name} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-medium">{dept.name}</td>
                      <td className="px-4 py-3 text-center">{dept.headcount}</td>
                      <td className="px-4 py-3 text-center text-green-700">{dept.tasksDone}</td>
                      <td className="px-4 py-3 text-center">{dept.tasksTotal}</td>
                      <td className={`px-4 py-3 text-center font-medium ${dept.completionRate >= 80 ? "text-green-700" : dept.completionRate >= 50 ? "text-amber-700" : "text-red-700"}`}>{fmtPct(dept.completionRate)}</td>
                      <td className="px-4 py-3 text-center">{dept.headcount > 0 ? Math.round(dept.tasksTotal / dept.headcount) : 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(() => {
              const overloaded = data.departments.filter(d => d.headcount > 0 && d.tasksTotal / d.headcount > 80);
              return overloaded.length > 0 ? <p className="mt-3">Phòng ban quá tải ({">"}80 tasks/NV): {overloaded.map(d => `${d.name} (${Math.round(d.tasksTotal / d.headcount)} tasks/NV)`).join(", ")}. Cần cân nhắc tuyển thêm hoặc tái phân bổ.</p> : null;
            })()}
          </Sec>

          <Sec n="III" title="Tồn kho & Chuỗi cung ứng">
            <p>
              Hệ thống tồn kho hiện quản lý {data.inventory.totalItems} mặt hàng với tổng giá trị {fmtVND(data.inventory.totalValue)}.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className={`rounded-lg p-4 border ${data.inventory.criticalStock > 0 ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`}>
                <div className="text-xs text-slate-500 mb-1">Hết hàng (critical)</div>
                <div className={`text-2xl font-bold ${data.inventory.criticalStock > 0 ? "text-red-700" : "text-green-700"}`}>{data.inventory.criticalStock}</div>
                {data.inventory.criticalStock > 0 && <div className="text-xs text-red-600 mt-1">Đặt hàng ngay!</div>}
              </div>
              <div className={`rounded-lg p-4 border ${data.inventory.lowStock > 0 ? "bg-amber-50 border-amber-200" : "bg-green-50 border-green-200"}`}>
                <div className="text-xs text-slate-500 mb-1">Sắp hết (low)</div>
                <div className={`text-2xl font-bold ${data.inventory.lowStock > 0 ? "text-amber-700" : "text-green-700"}`}>{data.inventory.lowStock}</div>
                {data.inventory.lowStock > 0 && <div className="text-xs text-amber-600 mt-1">Lên kế hoạch đặt hàng</div>}
              </div>
            </div>
            {(data.inventory.criticalStock > 0 || data.inventory.lowStock > 0) && (
              <p className="mt-3">
                Cảnh báo tồn kho: {data.inventory.criticalStock > 0 ? `${data.inventory.criticalStock} sản phẩm đã hết hàng — mỗi ngày delay = mất doanh thu.` : ""}
                {data.inventory.lowStock > 0 ? ` ${data.inventory.lowStock} sản phẩm sắp hết — cần đặt hàng bổ sung trong tuần.` : ""}
                Lead time trung bình nhà cung cấp: 7-14 ngày. Đặt hàng trước khi stock về 0.
              </p>
            )}
          </Sec>

          <Sec n="IV" title="Khuyến nghị Operations">
            <p><strong>1. Quy trình sản xuất:</strong> Tối ưu lead time từ thiết kế → in → giao hàng. Mục tiêu: 7 ngày cho reprint, 14 ngày cho BST mới.</p>
            <p><strong>2. Inventory management:</strong> Thiết lập reorder point tự động cho top 20 best sellers. Không để hết hàng best seller.</p>
            <p><strong>3. Automation:</strong> Tự động hóa các tác vụ lặp lại — order processing, inventory tracking, daily reporting. Tiết kiệm ước tính 2-3 giờ/ngày/nhân viên.</p>
            <p><strong>4. Quality control:</strong> QC 100% trước khi giao hàng. Tỷ lệ return target {"<"}1%. Tracking lỗi theo nhà in để negotiate lại hợp đồng.</p>
          </Sec>

          <div className="border-t-2 border-slate-200 pt-8 mt-12 grid grid-cols-2 gap-8">
            <div><div className="text-sm text-slate-500 mb-6">Người lập</div><div className="border-b border-slate-300 w-48 mb-2" /><div className="text-sm font-medium">AI Operations Agent</div></div>
            <div><div className="text-sm text-slate-500 mb-6">Phê duyệt</div><div className="border-b border-slate-300 w-48 mb-2" /><div className="text-sm font-medium">CEO</div></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Sec({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (<section><h3 className="text-lg font-bold text-slate-800 mb-3"><span className="text-slate-600">{n}.</span> {title}</h3><div className="space-y-3">{children}</div></section>);
}
