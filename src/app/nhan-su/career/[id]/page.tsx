"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Target,
  Clock,
  TrendingUp,
  DollarSign,
  CheckCircle2,
  XCircle,
  Award,
  Info,
  ChevronDown,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";
import {
  employees,
  getCareerLevel,
  getEmployeeCareer,
  calculatePromotionReadiness,
  careerLevels,
  formatCurrency,
  performanceRatings,
  PerformanceRatingTier,
} from "@/lib/mock-data";

function getRatingStatus(tier: PerformanceRatingTier): string {
  return `rating_${tier.toLowerCase()}`;
}

function InfoTip({ id, expanded, onToggle, children }: {
  id: string;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  children: React.ReactNode;
}) {
  const isOpen = expanded.has(id);
  return (
    <div className="mt-3">
      <button
        onClick={() => onToggle(id)}
        className="flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-700 transition-colors"
      >
        <Info size={14} />
        <span>{isOpen ? "Ẩn hướng dẫn" : "Xem hướng dẫn"}</span>
        <ChevronDown size={12} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && (
        <div className="mt-2 bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700 leading-relaxed">
          {children}
        </div>
      )}
    </div>
  );
}

export default function EmployeeCareerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [expandedTips, setExpandedTips] = useState<Set<string>>(new Set());
  const toggleTip = (tipId: string) => {
    setExpandedTips((prev) => {
      const next = new Set(prev);
      if (next.has(tipId)) next.delete(tipId);
      else next.add(tipId);
      return next;
    });
  };

  const employee = employees.find((e) => e.id === id);
  const career = getEmployeeCareer(id);
  const level = career ? getCareerLevel(career.levelCode) : null;
  const readiness = calculatePromotionReadiness(id);
  const activeLevels = careerLevels.filter((l) => l.isActive);

  if (!employee) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-slate-500">Không tìm thấy nhân viên</p>
        <Link href="/nhan-su/career-framework" className="text-blue-600 hover:underline mt-2 text-sm">
          Quay lại
        </Link>
      </div>
    );
  }

  if (!career || !level) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <Award size={28} className="text-slate-400" />
        </div>
        <p className="text-slate-700 font-medium text-lg">{employee.name}</p>
        <p className="text-slate-500 text-sm mt-1">
          {employee.trangThai === "da_nghi"
            ? "Nhân viên đã nghỉ việc - không có dữ liệu lộ trình"
            : "Chưa có dữ liệu lộ trình nghề nghiệp"}
        </p>
        <Link href="/nhan-su/career-framework" className="text-blue-600 hover:underline mt-3 text-sm">
          Quay lại lộ trình nghề nghiệp
        </Link>
      </div>
    );
  }

  const chartData = career.performanceHistory.map((h) => ({
    period: h.period,
    kpiScore: h.kpiScore,
    threshold: level.requiredKPIPercent,
  }));

  return (
    <div>
      <PageHeader
        title={employee.name}
        subtitle={`${level.code} - ${level.nameVi} | ${career.track === "IC" ? "Chuyên gia (IC)" : "Quản lý (Manager)"}`}
        breadcrumbs={[
          { label: "Nhân sự", href: "/nhan-su/danh-sach" },
          { label: "Lộ trình nghề nghiệp", href: "/nhan-su/career-framework" },
          { label: employee.name },
        ]}
        actions={
          <Link
            href="/nhan-su/career-framework"
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            <ArrowLeft size={16} />
            Quay lại
          </Link>
        }
      />

      {/* Employee info bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-lg font-bold shadow-md">
            {employee.name.split(" ").pop()?.charAt(0)}
          </div>
          <div className="flex-1 min-w-[200px]">
            <h2 className="text-lg font-bold text-slate-800">{employee.name}</h2>
            <p className="text-sm text-slate-500">{employee.maSo} - {employee.phongBan}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700">
              {level.code} - {level.nameVi}
            </span>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
              career.track === "IC"
                ? "bg-purple-50 text-purple-600"
                : "bg-indigo-50 text-indigo-600"
            }`}>
              {career.track === "IC" ? "Chuyên gia (IC)" : "Quản lý (Manager)"}
            </span>
            {readiness && (
              <span className="text-xs text-slate-500">
                <Clock size={12} className="inline mr-1" />
                {readiness.timeServed} tháng tại cấp bậc
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={Target}
          label="Điểm KPI trung bình"
          value={readiness ? `${readiness.avgKPIScore}%` : "N/A"}
          color="blue"
        />
        <StatCard
          icon={Award}
          label="Xếp loại hiệu suất"
          value={readiness ? performanceRatings.find((r) => r.tier === readiness.currentRating)?.label || "" : "N/A"}
          color={readiness?.currentRating === "Top" || readiness?.currentRating === "Strong" ? "green" : readiness?.currentRating === "Good" ? "blue" : "orange"}
        />
        <StatCard
          icon={DollarSign}
          label="Vị trí trong khung lương"
          value={readiness ? `${readiness.salaryPosition}%` : "N/A"}
          color="purple"
        />
        <StatCard
          icon={TrendingUp}
          label="Trạng thái thăng tiến"
          value={readiness?.overallReady ? "Đủ ĐK" : "Chưa đủ"}
          color={readiness?.overallReady ? "green" : "orange"}
        />
      </div>

      {/* Promotion Readiness Panel */}
      {readiness && (
        <div className={`bg-white rounded-xl border-2 ${
          !readiness.nextLevel || !readiness.nextLevel.isActive
            ? "border-blue-300"
            : readiness.overallReady ? "border-green-300" : "border-orange-300"
        } p-5 mb-6`}>
          <div className="flex items-center gap-3 mb-4">
            {!readiness.nextLevel || !readiness.nextLevel.isActive ? (
              <Award size={24} className="text-blue-500" />
            ) : readiness.overallReady ? (
              <CheckCircle2 size={24} className="text-green-500" />
            ) : (
              <Clock size={24} className="text-orange-500" />
            )}
            <div>
              <h3 className="font-bold text-slate-800 text-lg">
                {!readiness.nextLevel || !readiness.nextLevel.isActive
                  ? "Cấp bậc cao nhất đang áp dụng"
                  : readiness.overallReady
                  ? "Đủ điều kiện xét thăng tiến"
                  : "Chưa đủ điều kiện thăng tiến"}
              </h3>
              {readiness.nextLevel && readiness.nextLevel.isActive && (
                <p className="text-sm text-slate-500">
                  Cấp bậc tiếp theo: {readiness.nextLevel.code} - {readiness.nextLevel.nameVi}
                </p>
              )}
              {readiness.nextLevel && !readiness.nextLevel.isActive && (
                <p className="text-sm text-slate-500">
                  Bạn đã đạt cấp bậc cao nhất trong hệ thống hiện tại. Lương vẫn có thể tăng trong khung.
                </p>
              )}
            </div>
          </div>

          {/* Criteria checklist - only show if there's an active next level */}
          {readiness.nextLevel && readiness.nextLevel.isActive && (
          <div className="space-y-4">
            {/* Time at level */}
            <div className="flex items-start gap-3">
              {readiness.timeReady ? (
                <CheckCircle2 size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
              ) : (
                <XCircle size={18} className="text-orange-500 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-slate-700">
                    Thời gian tại cấp bậc
                  </span>
                  <span className="text-sm text-slate-500">
                    {readiness.timeServed}/{readiness.timeRequired} tháng
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      readiness.timeReady ? "bg-green-400" : "bg-orange-400"
                    }`}
                    style={{
                      width: `${Math.min((readiness.timeServed / readiness.timeRequired) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* KPI Score */}
            <div className="flex items-start gap-3">
              {readiness.kpiReady ? (
                <CheckCircle2 size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
              ) : (
                <XCircle size={18} className="text-orange-500 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-slate-700">
                    Điểm KPI trung bình (yêu cầu {">="} {level.requiredKPIPercent}%)
                  </span>
                  <span className="text-sm text-slate-500">
                    {readiness.avgKPIScore}%
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      readiness.kpiReady ? "bg-green-400" : "bg-orange-400"
                    }`}
                    style={{
                      width: `${Math.min(readiness.avgKPIScore, 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Performance Rating */}
            <div className="flex items-start gap-3">
              {readiness.currentRating !== "Weak" && readiness.currentRating !== "Poor" ? (
                <CheckCircle2 size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
              ) : (
                <XCircle size={18} className="text-orange-500 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">
                    Xếp loại hiệu suất (yêu cầu Tốt trở lên)
                  </span>
                  <StatusBadge status={getRatingStatus(readiness.currentRating)} />
                </div>
              </div>
            </div>
          </div>
          )}

          <InfoTip id="promotion" expanded={expandedTips} onToggle={toggleTip}>
            <p className="mb-1.5"><strong>3 tiêu chí thăng tiến:</strong></p>
            <ul className="space-y-1 list-disc list-inside">
              <li><strong>Thời gian:</strong> Mỗi cấp có thời gian tối thiểu phải ở trước khi được xét. Ví dụ: L3→L4 cần ít nhất 18 tháng.</li>
              <li><strong>Điểm KPI:</strong> Trung bình 3 quý gần nhất phải đạt mức yêu cầu. Hoàn thành task đúng hạn và đạt KPI phòng ban sẽ giúp tăng điểm.</li>
              <li><strong>Xếp loại:</strong> Phải đạt mức "Tốt" (Good) trở lên. Xếp loại được tính từ điểm KPI trung bình.</li>
            </ul>
            <p className="mt-1.5">Đủ cả 3 tiêu chí = đủ điều kiện xét, nhưng thăng tiến thực tế được xét <strong>1 năm/lần</strong> và cần phê duyệt quản lý.</p>
          </InfoTip>

          {/* Missing criteria banner */}
          {readiness.missingCriteria.length > 0 && (
            <div className="mt-4 bg-orange-50 border border-orange-200 rounded-lg p-3">
              <p className="text-sm font-medium text-orange-800 mb-1">Cần hoàn thiện:</p>
              <ul className="space-y-1">
                {readiness.missingCriteria.map((criteria, i) => (
                  <li key={i} className="text-sm text-orange-600 flex items-start gap-1.5">
                    <span className="text-orange-400 mt-0.5">-</span>
                    {criteria}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Salary Band Position */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <h3 className="font-semibold text-slate-800 mb-4">Vị trí trong khung lương</h3>
        <div className="space-y-4">
          {/* Current level band */}
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>{formatCurrency(level.salaryBand.min)}</span>
              <span className="font-medium text-slate-700">{level.code} - {level.nameVi}</span>
              <span>{formatCurrency(level.salaryBand.max)}</span>
            </div>
            <div className="relative h-6 bg-gradient-to-r from-blue-100 via-blue-200 to-blue-300 rounded-full overflow-visible">
              {/* Mid marker */}
              <div
                className="absolute top-0 h-full w-px bg-blue-400"
                style={{ left: "50%" }}
              />
              {/* Current salary marker */}
              <div
                className="absolute top-1/2 w-5 h-5 rounded-full bg-blue-600 border-2 border-white shadow-md"
                style={{
                  left: `${readiness ? readiness.salaryPosition : 50}%`,
                  transform: "translate(-50%, -50%)",
                }}
              />
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] text-slate-400">Min</span>
              <span className="text-xs font-medium text-blue-600">
                Lương hiện tại: {formatCurrency(career.currentSalary)}
              </span>
              <span className="text-[10px] text-slate-400">Max</span>
            </div>
          </div>

          <InfoTip id="salary" expanded={expandedTips} onToggle={toggleTip}>
            <p><strong>Min:</strong> Mức lương khởi điểm khi mới vào cấp bậc. <strong>Mid:</strong> Mức lương trung bình cho người có kinh nghiệm tại cấp bậc. <strong>Max:</strong> Mức lương tối đa - nếu đã đạt Max, cần thăng cấp để tăng tiếp.</p>
            <p className="mt-1.5">Bạn có thể được tăng lương mỗi 6 tháng mà không cần thăng cấp, miễn là chưa vượt Max. Ví dụ: ở L5 nhiều năm, lương vẫn có thể tăng từ 25M lên 40M.</p>
          </InfoTip>

          {/* Next level band (faded) */}
          {readiness?.nextLevel && (
            <div className="opacity-50">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>{formatCurrency(readiness.nextLevel.salaryBand.min)}</span>
                <span>{readiness.nextLevel.code} - {readiness.nextLevel.nameVi} (cấp tiếp theo)</span>
                <span>{formatCurrency(readiness.nextLevel.salaryBand.max)}</span>
              </div>
              <div className="h-4 bg-gradient-to-r from-green-50 via-green-100 to-green-200 rounded-full" />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Performance History Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800">Lịch sử điểm KPI</h3>
          <InfoTip id="kpi" expanded={expandedTips} onToggle={toggleTip}>
            <p><strong>Đường nét đứt cam</strong> là mức KPI tối thiểu yêu cầu cho cấp bậc hiện tại. Điểm phải ở trên đường này để đủ điều kiện thăng tiến.</p>
            <p className="mt-1">Điểm KPI được tính từ: task hoàn thành trên Kanban (điểm task) + KPI phòng ban (doanh số, báo cáo, v.v.). Xem chi tiết ở tab "Công việc của tôi".</p>
          </InfoTip>
          <div className="h-[250px] mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0" }} />
                <ReferenceLine
                  y={level.requiredKPIPercent}
                  stroke="#f97316"
                  strokeDasharray="5 5"
                  label={{ value: `Yêu cầu: ${level.requiredKPIPercent}%`, position: "right", fontSize: 10, fill: "#f97316" }}
                />
                <Line
                  type="monotone"
                  dataKey="kpiScore"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: "#3b82f6", r: 4 }}
                  name="Điểm KPI"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Performance Rating History Table */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Lịch sử xếp loại</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-2.5 text-left">Kỳ</th>
                  <th className="px-4 py-2.5 text-center">Điểm KPI</th>
                  <th className="px-4 py-2.5 text-center">Xếp loại</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {career.performanceHistory.map((h, i) => (
                  <tr key={i} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 text-sm text-slate-700 font-medium">{h.period}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-sm font-bold ${
                        h.kpiScore >= level.requiredKPIPercent
                          ? "text-green-600"
                          : "text-orange-600"
                      }`}>
                        {h.kpiScore}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={getRatingStatus(h.rating)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Career Path Stepper */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-800">Lộ trình phát triển</h3>
        <InfoTip id="career_path" expanded={expandedTips} onToggle={toggleTip}>
          <p><strong>IC (Chuyên gia):</strong> Phát triển chuyên môn sâu - không cần quản lý người để tăng lương. Phù hợp với người giỏi kỹ thuật/nghiệp vụ.</p>
          <p className="mt-1"><strong>Manager (Quản lý):</strong> Quản lý team, chịu trách nhiệm KPI nhóm. Hai track có mức lương tương đương - bạn chọn hướng phù hợp với thế mạnh.</p>
          <p className="mt-1">Vòng tròn <span className="text-green-600 font-medium">xanh lá</span> = đã qua, <span className="text-blue-600 font-medium">xanh dương</span> = hiện tại, <span className="text-slate-400">xám</span> = sắp tới.</p>
        </InfoTip>
        <div className="flex items-center justify-between overflow-x-auto pb-2 mt-4">
          {activeLevels.map((l, i) => {
            const isCurrent = l.code === career.levelCode;
            const isPast = activeLevels.findIndex((al) => al.code === career.levelCode) > i;
            const isFuture = !isCurrent && !isPast;

            return (
              <div key={l.code} className="flex items-center">
                <div className="flex flex-col items-center min-w-[90px]">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                      isCurrent
                        ? "bg-blue-500 border-blue-600 text-white shadow-lg scale-110"
                        : isPast
                        ? "bg-green-100 border-green-400 text-green-700"
                        : "bg-slate-100 border-slate-300 text-slate-400"
                    }`}
                  >
                    {isPast ? (
                      <CheckCircle2 size={20} />
                    ) : (
                      <span className="text-sm font-bold">{l.code}</span>
                    )}
                  </div>
                  <p
                    className={`text-xs mt-2 text-center font-medium ${
                      isCurrent ? "text-blue-700" : isPast ? "text-green-600" : "text-slate-400"
                    }`}
                  >
                    {l.nameVi}
                  </p>
                  {isCurrent && (
                    <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full mt-1 font-medium">
                      Hiện tại
                    </span>
                  )}
                </div>
                {i < activeLevels.length - 1 && (
                  <div className="mx-1">
                    <div
                      className={`w-8 h-0.5 ${
                        isPast ? "bg-green-400" : "bg-slate-200"
                      }`}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
