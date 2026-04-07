"use client";

import { useEffect, useState } from "react";
import { buildExecutiveReport, ExecutiveReportData, fmtVND, fmtPct } from "@/lib/report-builder";
import { RefreshCw } from "lucide-react";

export default function CoachReport() {
  const [data, setData] = useState<ExecutiveReportData | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { buildExecutiveReport(2026).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false)); }, []);

  if (loading || !data) return <div className="p-6 flex items-center justify-center h-[60vh]"><div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-600 border-t-transparent" /></div>;

  const { headcount, avgKPI } = data.overview;
  const { topPerformers, atRisk } = data.employees;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="bg-gradient-to-br from-cyan-800 via-cyan-700 to-teal-800 px-8 py-8 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/20"><span className="font-bold">TW</span></div>
              <div className="text-xs text-cyan-200 tracking-widest uppercase">Teeworld Co. — Performance Coaching</div>
            </div>
            <button onClick={() => { setLoading(true); buildExecutiveReport(2026).then(d => { setData(d); setLoading(false); }); }} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"><RefreshCw size={16} /></button>
          </div>
          <h1 className="text-2xl font-bold mb-1">Báo cáo Hiệu suất & Coaching</h1>
          <p className="text-cyan-200">AI Coach Report — Năm {data.year}</p>
          <div className="mt-4 text-xs text-cyan-300">Ngày lập: {new Date(data.generatedAt).toLocaleDateString("vi-VN")} | Người lập: AI Performance Coach</div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 border-b border-slate-100">
          {[
            { label: "Nhân sự", value: `${headcount} NV` },
            { label: "KPI trung bình", value: `${avgKPI}/100` },
            { label: "Top performers", value: `${topPerformers.length}` },
            { label: "Cần coaching", value: `${atRisk.length}` },
          ].map((m, i) => (
            <div key={i} className="px-6 py-5 border-r border-slate-100 last:border-0">
              <div className="text-xs text-slate-500 mb-1">{m.label}</div>
              <div className="text-xl font-bold text-slate-800">{m.value}</div>
            </div>
          ))}
        </div>

        <div className="px-8 py-8 space-y-10 text-sm text-slate-700 leading-relaxed">

          <Sec n="I" title="Đánh giá Tổng thể Hiệu suất">
            <p>
              Với đội ngũ {headcount} nhân viên, điểm KPI trung bình toàn công ty đạt {avgKPI}/100.
              {avgKPI >= 80 ? " Đây là mức hiệu suất cao — đội ngũ đang phát huy tốt năng lực. Tuy nhiên, cần đảm bảo hệ thống đánh giá KPI đủ challenging để tránh điểm KPI bị inflate." :
               avgKPI >= 60 ? " Mức hiệu suất trung bình khá. Phân tích chi tiết cho thấy sự chênh lệch đáng kể giữa các cá nhân và phòng ban — đây là cơ hội để coaching cải thiện." :
               " Mức hiệu suất chung thấp. Cần đánh giá lại: (1) hệ thống KPI có phù hợp thực tế không, (2) nhân viên có được training đủ không, (3) workload có hợp lý không."}
            </p>
            <p>
              Tỷ lệ phân bổ: {topPerformers.length} nhân sự xuất sắc (top), {atRisk.length} nhân sự cần coaching (dưới 60).
              {atRisk.length === 0 ? " Không có nhân sự nào dưới ngưỡng cảnh báo — một tín hiệu tích cực." : ` ${atRisk.length} nhân sự cần can thiệp ngay — mỗi tháng chậm trễ là 1 tháng mất năng suất.`}
            </p>
          </Sec>

          <Sec n="II" title="Phân tích Top Performers">
            {topPerformers.length > 0 ? (
              <>
                <p>
                  Những nhân sự xuất sắc dưới đây đang tạo ra giá trị vượt trội cho tổ chức.
                  Nghiên cứu cho thấy top 20% nhân viên thường đóng góp 80% kết quả. Việc mất 1 top performer
                  tương đương mất 2-3 nhân sự trung bình cộng thêm chi phí tuyển dụng + onboarding (ước tính 3-6 tháng lương).
                </p>
                <div className="mt-3 space-y-2">
                  {topPerformers.map((e, i) => (
                    <div key={i} className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg px-4 py-4">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">#{i + 1}</span>
                        <div className="flex-1">
                          <span className="font-semibold text-slate-800">{e.name}</span>
                          <span className="text-xs text-slate-500 ml-2">{e.department}</span>
                        </div>
                        <span className="text-lg font-bold text-green-700">{e.kpiScore}</span>
                      </div>
                      <p className="text-xs text-slate-600 ml-11">
                        {e.kpiScore >= 90 ? "Xuất sắc. Xem xét đề bạt team lead hoặc giao thêm dự án chiến lược." :
                         e.kpiScore >= 80 ? "Giỏi. Mentor cho junior, tham gia cross-functional projects." :
                         "Tốt. Tiếp tục phát triển và tạo cơ hội growth."}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="mt-3"><strong>Action plan cho top performers:</strong> 1) Review compensation — đảm bảo competitive. 2) Giao stretch goals — thách thức phát triển. 3) Visibility — giới thiệu thành tích trước toàn công ty. 4) Career path — thảo luận lộ trình thăng tiến 6-12 tháng.</p>
              </>
            ) : <p>Chưa có dữ liệu KPI để xếp hạng. Cần triển khai đánh giá KPI cho tất cả nhân viên.</p>}
          </Sec>

          <Sec n="III" title="Nhân sự Cần Coaching Khẩn cấp">
            {atRisk.length > 0 ? (
              <>
                <p>
                  Phát hiện {atRisk.length} nhân sự có KPI dưới ngưỡng 60 — mức yêu cầu can thiệp coaching ngay.
                  Nếu không can thiệp, 70% trường hợp sẽ tiếp tục giảm hiệu suất trong 3 tháng tiếp theo (theo thống kê industry benchmark).
                </p>
                <div className="mt-3 space-y-2">
                  {atRisk.map((e, i) => (
                    <div key={i} className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-lg px-4 py-4">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                        <div className="flex-1">
                          <span className="font-semibold text-slate-800">{e.name}</span>
                          <span className="text-xs text-slate-500 ml-2">{e.department}</span>
                        </div>
                        <span className="text-lg font-bold text-red-700">{e.kpiScore}</span>
                      </div>
                      <p className="text-xs text-slate-600 ml-6">
                        {e.kpiScore < 40 ? "Critical — cần 1-on-1 ngay trong tuần này. Xem xét chuyển vị trí nếu sau 30 ngày không cải thiện." :
                         "Warning — lên PIP 30 ngày với mục tiêu cụ thể, mentor assigned, check-in hàng tuần."}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="mt-4"><strong>Performance Improvement Protocol:</strong></p>
                <div className="mt-2 bg-slate-50 rounded-lg p-4 space-y-2">
                  <p><strong>Tuần 1:</strong> 1-on-1 diagnostic — xác định root cause (skill? motivation? personal? workload?)</p>
                  <p><strong>Tuần 2-3:</strong> Implement PIP — mục tiêu SMART, mentor assigned, daily check-in</p>
                  <p><strong>Tuần 4:</strong> First review — nếu cải thiện {">"}20% → tiếp tục support. Nếu không → escalate to HR.</p>
                  <p><strong>Tuần 6-8:</strong> Final assessment — quyết định retain/reposition/offboard.</p>
                </div>
              </>
            ) : (
              <p>Không có nhân viên nào dưới ngưỡng 60. Tổ chức đang hoạt động ổn định. Tiếp tục monitoring hàng tháng và focus vào phát triển top performers.</p>
            )}
          </Sec>

          <Sec n="IV" title="Hiệu suất theo Phòng ban">
            <p>So sánh KPI trung bình và completion rate giữa các phòng ban để xác định best practices và areas for improvement:</p>
            <div className="mt-4 space-y-3">
              {data.departments.filter(d => d.tasksTotal > 0).map(dept => {
                const health = dept.completionRate >= 80 && dept.avgKPI >= 70 ? "green" : dept.completionRate >= 50 ? "amber" : "red";
                const colors = { green: "bg-green-50 border-green-200", amber: "bg-amber-50 border-amber-200", red: "bg-red-50 border-red-200" };
                return (
                  <div key={dept.name} className={`rounded-lg border p-4 ${colors[health]}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-slate-800">{dept.name}</span>
                      <span className="text-xs text-slate-500">{dept.headcount} NV</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                      <div><span className="text-slate-500">KPI TB:</span> <span className="font-bold">{dept.avgKPI || "—"}</span></div>
                      <div><span className="text-slate-500">Tasks:</span> <span className="font-bold">{dept.tasksDone}/{dept.tasksTotal}</span></div>
                      <div><span className="text-slate-500">Hoàn thành:</span> <span className="font-bold">{fmtPct(dept.completionRate)}</span></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Sec>

          <Sec n="V" title="Khuyến nghị Coach">
            <p><strong>1. Hệ thống hóa coaching:</strong> Mỗi manager phải 1-on-1 với team member ít nhất 2x/tháng. Log coaching notes vào hệ thống.</p>
            <p><strong>2. Peer learning:</strong> Ghép cặp top performers với at-risk employees. Cross-department mentoring cho broader perspective.</p>
            <p><strong>3. Recognition program:</strong> Công bố &quot;Employee of the Month&quot; với tiêu chí rõ ràng. Public recognition tạo positive reinforcement loop.</p>
            <p><strong>4. Data-driven coaching:</strong> Sử dụng KPI trends (không chỉ snapshot) để xác định trajectory — nhân viên đang improve hay decline?</p>
          </Sec>

          <div className="border-t-2 border-slate-200 pt-8 mt-12 grid grid-cols-2 gap-8">
            <div><div className="text-sm text-slate-500 mb-6">Người lập</div><div className="border-b border-slate-300 w-48 mb-2" /><div className="text-sm font-medium">AI Performance Coach</div></div>
            <div><div className="text-sm text-slate-500 mb-6">Phê duyệt</div><div className="border-b border-slate-300 w-48 mb-2" /><div className="text-sm font-medium">CEO</div></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Sec({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (<section><h3 className="text-lg font-bold text-slate-800 mb-3"><span className="text-cyan-600">{n}.</span> {title}</h3><div className="space-y-3">{children}</div></section>);
}
