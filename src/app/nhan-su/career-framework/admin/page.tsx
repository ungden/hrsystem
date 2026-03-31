"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Layers,
  Users,
  TrendingUp,
  Award,
  DollarSign,
  CheckCircle2,
  XCircle,
  Edit3,
  Save,
  X,
  Plus,
  ArrowLeft,
  History,
  ChevronDown,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";
import {
  careerLevels as initialLevels,
  employees,
  employeeCareers as initialCareers,
  getPerformanceRating,
  formatCurrency,
  CareerLevel,
  CareerTrack,
  EmployeeCareer,
  PerformanceRatingTier,
  AdminAction,
} from "@/lib/mock-data";

type TabKey = "levels" | "assign" | "promotion" | "review" | "salary";

const tabs: { key: TabKey; label: string }[] = [
  { key: "levels", label: "Cấp bậc" },
  { key: "assign", label: "Gán level" },
  { key: "promotion", label: "Xét thăng tiến" },
  { key: "review", label: "Đánh giá" },
  { key: "salary", label: "Điều chỉnh lương" },
];

function now() {
  return new Date().toLocaleString("vi-VN");
}

// ============ INLINE EDIT ROW for levels ============

function LevelEditRow({
  level,
  onSave,
  onCancel,
}: {
  level: CareerLevel;
  onSave: (updated: CareerLevel) => void;
  onCancel: () => void;
}) {
  const [nameVi, setNameVi] = useState(level.nameVi);
  const [min, setMin] = useState(level.salaryBand.min / 1_000_000);
  const [mid, setMid] = useState(level.salaryBand.mid / 1_000_000);
  const [max, setMax] = useState(level.salaryBand.max / 1_000_000);
  const [minTime, setMinTime] = useState(level.minTimeMonths);
  const [kpi, setKpi] = useState(level.requiredKPIPercent);

  const handleSave = () => {
    onSave({
      ...level,
      nameVi,
      salaryBand: { min: min * 1_000_000, mid: mid * 1_000_000, max: max * 1_000_000 },
      minTimeMonths: minTime,
      requiredKPIPercent: kpi,
    });
  };

  return (
    <tr className="bg-blue-50/50">
      <td className="px-4 py-2">
        <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">{level.code}</span>
      </td>
      <td className="px-4 py-2">
        <input value={nameVi} onChange={(e) => setNameVi(e.target.value)}
          className="text-sm border border-slate-200 rounded px-2 py-1 w-full focus:ring-2 focus:ring-blue-500 focus:outline-none" />
      </td>
      <td className="px-4 py-2">
        <input type="number" value={min} onChange={(e) => setMin(+e.target.value)}
          className="text-sm border border-slate-200 rounded px-2 py-1 w-20 text-right focus:ring-2 focus:ring-blue-500 focus:outline-none" />
      </td>
      <td className="px-4 py-2">
        <input type="number" value={mid} onChange={(e) => setMid(+e.target.value)}
          className="text-sm border border-slate-200 rounded px-2 py-1 w-20 text-right focus:ring-2 focus:ring-blue-500 focus:outline-none" />
      </td>
      <td className="px-4 py-2">
        <input type="number" value={max} onChange={(e) => setMax(+e.target.value)}
          className="text-sm border border-slate-200 rounded px-2 py-1 w-20 text-right focus:ring-2 focus:ring-blue-500 focus:outline-none" />
      </td>
      <td className="px-4 py-2">
        <input type="number" value={minTime} onChange={(e) => setMinTime(+e.target.value)}
          className="text-sm border border-slate-200 rounded px-2 py-1 w-16 text-center focus:ring-2 focus:ring-blue-500 focus:outline-none" />
      </td>
      <td className="px-4 py-2">
        <input type="number" value={kpi} onChange={(e) => setKpi(+e.target.value)}
          className="text-sm border border-slate-200 rounded px-2 py-1 w-16 text-center focus:ring-2 focus:ring-blue-500 focus:outline-none" />
      </td>
      <td className="px-4 py-2">
        <div className="flex gap-1">
          <button onClick={handleSave} className="p-1 rounded hover:bg-green-100 text-green-600" title="Lưu">
            <Save size={15} />
          </button>
          <button onClick={onCancel} className="p-1 rounded hover:bg-red-100 text-red-500" title="Hủy">
            <X size={15} />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ============ MAIN PAGE ============

export default function CareerAdminPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("levels");

  // State copies of data that admin can modify
  const [levels, setLevels] = useState<CareerLevel[]>(() => [...initialLevels]);
  const [careers, setCareers] = useState<EmployeeCareer[]>(() => initialCareers.map(c => ({ ...c, performanceHistory: [...c.performanceHistory.map(h => ({ ...h }))] })));
  const [actionsLog, setActionsLog] = useState<AdminAction[]>([]);
  const [showLog, setShowLog] = useState(false);

  // Level edit state
  const [editingLevel, setEditingLevel] = useState<string | null>(null);

  // Assign tab state
  const [assignFilter, setAssignFilter] = useState("");
  const [editingAssign, setEditingAssign] = useState<string | null>(null);
  const [assignLevel, setAssignLevel] = useState("");
  const [assignTrack, setAssignTrack] = useState<CareerTrack>("IC");

  // Promotion tab state
  const [promoFilter, setPromoFilter] = useState<"all" | "eligible" | "not_eligible">("all");

  // Review tab state
  const [reviewPeriod, setReviewPeriod] = useState("Q1/2026");
  const [editingReview, setEditingReview] = useState<string | null>(null);
  const [reviewScore, setReviewScore] = useState(0);

  // Salary tab state
  const [editingSalary, setEditingSalary] = useState<string | null>(null);
  const [newSalary, setNewSalary] = useState(0);

  const activeEmployees = employees.filter(e => e.trangThai !== "da_nghi");
  const activeLevels = levels.filter(l => l.isActive);

  const addLog = useCallback((action: Omit<AdminAction, "id" | "timestamp">) => {
    setActionsLog(prev => [{
      ...action,
      id: `log-${Date.now()}`,
      timestamp: now(),
    }, ...prev]);
  }, []);

  // ============ Level helpers ============
  const getLevelByCode = (code: string) => levels.find(l => l.code === code);

  // Promotion readiness (recomputed from current state)
  const getReadiness = useCallback((employeeId: string) => {
    const career = careers.find(c => c.employeeId === employeeId);
    if (!career) return null;
    const level = getLevelByCode(career.levelCode);
    if (!level) return null;

    const nowDate = new Date(2026, 2, 30);
    const [d, m, y] = career.levelStartDate.split("/").map(Number);
    const levelStart = new Date(y, m - 1, d);
    const timeServed = (nowDate.getFullYear() - levelStart.getFullYear()) * 12 + (nowDate.getMonth() - levelStart.getMonth());
    const timeRequired = level.minTimeMonths;
    const timeReady = timeServed >= timeRequired;

    const recent = career.performanceHistory.slice(-3);
    const avgKPI = recent.length > 0
      ? Math.round(recent.reduce((s, h) => s + h.kpiScore, 0) / recent.length)
      : 0;
    const kpiReady = avgKPI >= level.requiredKPIPercent;
    const rating = getPerformanceRating(avgKPI);
    const nextLevel = level.nextLevel ? getLevelByCode(level.nextLevel) : null;
    const overallReady = timeReady && kpiReady && rating !== "Weak" && rating !== "Poor";

    return { timeServed, timeRequired, timeReady, avgKPI, kpiReady, rating, nextLevel, overallReady };
  }, [careers, levels]);

  // ============ HANDLERS ============

  const handleSaveLevel = useCallback((updated: CareerLevel) => {
    const old = levels.find(l => l.code === updated.code);
    setLevels(prev => prev.map(l => l.code === updated.code ? updated : l));
    setEditingLevel(null);
    addLog({
      type: "level_config",
      description: `Cập nhật cấp bậc ${updated.code} - ${updated.nameVi}`,
      oldValue: old ? `${formatCurrency(old.salaryBand.min)}-${formatCurrency(old.salaryBand.max)}` : "",
      newValue: `${formatCurrency(updated.salaryBand.min)}-${formatCurrency(updated.salaryBand.max)}`,
    });
  }, [levels, addLog]);

  const handleToggleActive = useCallback((code: string) => {
    setLevels(prev => prev.map(l =>
      l.code === code ? { ...l, isActive: !l.isActive } : l
    ));
    const level = levels.find(l => l.code === code);
    addLog({
      type: "level_config",
      description: `${level?.isActive ? "Tắt" : "Bật"} cấp bậc ${code}`,
    });
  }, [levels, addLog]);

  const handleAssignLevel = useCallback((empId: string) => {
    const emp = employees.find(e => e.id === empId);
    const career = careers.find(c => c.employeeId === empId);
    const oldLevel = career?.levelCode || "N/A";
    setCareers(prev => prev.map(c =>
      c.employeeId === empId
        ? { ...c, levelCode: assignLevel, track: assignTrack, levelStartDate: "30/03/2026" }
        : c
    ));
    setEditingAssign(null);
    addLog({
      type: "level_change",
      employeeId: empId,
      employeeName: emp?.name,
      description: `Đổi level ${emp?.name}`,
      oldValue: oldLevel,
      newValue: `${assignLevel} (${assignTrack})`,
    });
  }, [careers, assignLevel, assignTrack, addLog]);

  const handlePromote = useCallback((empId: string) => {
    const career = careers.find(c => c.employeeId === empId);
    if (!career) return;
    const level = getLevelByCode(career.levelCode);
    if (!level?.nextLevel) return;
    const nextLevel = getLevelByCode(level.nextLevel);
    if (!nextLevel) return;
    const emp = employees.find(e => e.id === empId);

    setCareers(prev => prev.map(c =>
      c.employeeId === empId
        ? { ...c, levelCode: nextLevel.code, track: nextLevel.track, levelStartDate: "30/03/2026" }
        : c
    ));
    addLog({
      type: "promotion",
      employeeId: empId,
      employeeName: emp?.name,
      description: `Thăng tiến ${emp?.name}`,
      oldValue: `${level.code} - ${level.nameVi}`,
      newValue: `${nextLevel.code} - ${nextLevel.nameVi}`,
    });
  }, [careers, levels, addLog]);

  const handleSaveReview = useCallback((empId: string) => {
    const emp = employees.find(e => e.id === empId);
    const rating = getPerformanceRating(reviewScore);
    setCareers(prev => prev.map(c => {
      if (c.employeeId !== empId) return c;
      const existing = c.performanceHistory.findIndex(h => h.period === reviewPeriod);
      const newHistory = [...c.performanceHistory];
      const entry = { period: reviewPeriod, kpiScore: reviewScore, rating };
      if (existing >= 0) {
        newHistory[existing] = entry;
      } else {
        newHistory.push(entry);
      }
      return { ...c, performanceHistory: newHistory };
    }));
    setEditingReview(null);
    addLog({
      type: "review",
      employeeId: empId,
      employeeName: emp?.name,
      description: `Đánh giá ${emp?.name} kỳ ${reviewPeriod}`,
      newValue: `KPI: ${reviewScore}% - ${rating}`,
    });
  }, [reviewScore, reviewPeriod, addLog]);

  const handleSaveSalary = useCallback((empId: string) => {
    const emp = employees.find(e => e.id === empId);
    const career = careers.find(c => c.employeeId === empId);
    setCareers(prev => prev.map(c =>
      c.employeeId === empId ? { ...c, currentSalary: newSalary } : c
    ));
    setEditingSalary(null);
    addLog({
      type: "salary_change",
      employeeId: empId,
      employeeName: emp?.name,
      description: `Điều chỉnh lương ${emp?.name}`,
      oldValue: career ? formatCurrency(career.currentSalary) : "",
      newValue: formatCurrency(newSalary),
    });
  }, [careers, newSalary, addLog]);

  // Stats
  const eligibleCount = activeEmployees.filter(e => getReadiness(e.id)?.overallReady).length;

  return (
    <div>
      <PageHeader
        title="Quản lý Career Framework"
        subtitle="Quản lý cấp bậc, thăng tiến, đánh giá và lương"
        breadcrumbs={[
          { label: "Nhân sự", href: "/nhan-su/danh-sach" },
          { label: "Lộ trình nghề nghiệp", href: "/nhan-su/career-framework" },
          { label: "Quản lý" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowLog(!showLog)}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg px-3 py-1.5"
            >
              <History size={14} />
              Lịch sử ({actionsLog.length})
            </button>
            <Link href="/nhan-su/career-framework"
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
              <ArrowLeft size={14} /> Quay lại
            </Link>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Layers} label="Cấp bậc active" value={activeLevels.length} color="blue" />
        <StatCard icon={Users} label="Nhân viên có lộ trình" value={careers.length} color="green" />
        <StatCard icon={TrendingUp} label="Đủ ĐK thăng tiến" value={eligibleCount} color="orange" />
        <StatCard icon={History} label="Thao tác đã thực hiện" value={actionsLog.length} color="purple" />
      </div>

      {/* Action log (collapsible) */}
      {showLog && actionsLog.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 max-h-[300px] overflow-y-auto">
          <h3 className="font-semibold text-slate-800 text-sm mb-3">Lịch sử thao tác</h3>
          <div className="space-y-2">
            {actionsLog.map(a => (
              <div key={a.id} className="flex items-start gap-3 text-xs border-b border-slate-50 pb-2">
                <span className="text-slate-400 whitespace-nowrap">{a.timestamp}</span>
                <span className="text-slate-700">{a.description}</span>
                {a.oldValue && <span className="text-red-400 line-through">{a.oldValue}</span>}
                {a.newValue && <span className="text-green-600 font-medium">{a.newValue}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ============ TAB 1: MANAGE LEVELS ============ */}
      {activeTab === "levels" && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-800">Quản lý cấp bậc</h3>
              <p className="text-xs text-slate-400 mt-0.5">Click vào nút Sửa để chỉnh thông tin. Toggle Active/Inactive để bật tắt cấp bậc.</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-3 text-left">Code</th>
                  <th className="px-4 py-3 text-left">Chức danh</th>
                  <th className="px-4 py-3 text-right">Min (M)</th>
                  <th className="px-4 py-3 text-right">Mid (M)</th>
                  <th className="px-4 py-3 text-right">Max (M)</th>
                  <th className="px-4 py-3 text-center">Thời gian</th>
                  <th className="px-4 py-3 text-center">KPI %</th>
                  <th className="px-4 py-3 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {levels.map(level =>
                  editingLevel === level.code ? (
                    <LevelEditRow
                      key={level.code}
                      level={level}
                      onSave={handleSaveLevel}
                      onCancel={() => setEditingLevel(null)}
                    />
                  ) : (
                    <tr key={level.code} className={`hover:bg-slate-50/50 ${!level.isActive ? "opacity-40" : ""}`}>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${level.isActive ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-400"}`}>
                          {level.code}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-slate-800">{level.nameVi}</p>
                        <p className="text-xs text-slate-400">{level.name} - {level.track === "IC" ? "Chuyên gia" : "Quản lý"}</p>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-slate-600">{level.salaryBand.min / 1_000_000}M</td>
                      <td className="px-4 py-3 text-right text-sm font-medium">{level.salaryBand.mid / 1_000_000}M</td>
                      <td className="px-4 py-3 text-right text-sm text-slate-600">{level.salaryBand.max / 1_000_000}M</td>
                      <td className="px-4 py-3 text-center text-sm">{level.minTimeMonths} tháng</td>
                      <td className="px-4 py-3 text-center text-sm text-blue-600 font-medium">{level.requiredKPIPercent}%</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => setEditingLevel(level.code)}
                            className="p-1.5 rounded hover:bg-blue-50 text-slate-400 hover:text-blue-600" title="Sửa">
                            <Edit3 size={14} />
                          </button>
                          <button onClick={() => handleToggleActive(level.code)}
                            className={`px-2 py-0.5 rounded text-xs font-medium ${level.isActive ? "bg-green-50 text-green-600 hover:bg-green-100" : "bg-slate-100 text-slate-400 hover:bg-slate-200"}`}>
                            {level.isActive ? "Active" : "Off"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============ TAB 2: ASSIGN LEVELS ============ */}
      {activeTab === "assign" && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800">Gán cấp bậc nhân viên</h3>
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                placeholder="Tìm theo tên..."
                value={assignFilter}
                onChange={e => setAssignFilter(e.target.value.toLowerCase())}
                className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 w-60 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-3 text-left">Nhân viên</th>
                  <th className="px-4 py-3 text-left">Phòng ban</th>
                  <th className="px-4 py-3 text-center">Level hiện tại</th>
                  <th className="px-4 py-3 text-center">Track</th>
                  <th className="px-4 py-3 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeEmployees
                  .filter(e => !assignFilter || e.name.toLowerCase().includes(assignFilter))
                  .map(emp => {
                    const career = careers.find(c => c.employeeId === emp.id);
                    const level = career ? getLevelByCode(career.levelCode) : null;
                    const isEditing = editingAssign === emp.id;

                    return (
                      <tr key={emp.id} className={`hover:bg-slate-50/50 ${isEditing ? "bg-blue-50/50" : ""}`}>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-slate-800">{emp.name}</p>
                          <p className="text-xs text-slate-400">{emp.maSo}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{emp.phongBan}</td>
                        <td className="px-4 py-3 text-center">
                          {isEditing ? (
                            <select value={assignLevel} onChange={e => setAssignLevel(e.target.value)}
                              className="text-sm border border-slate-200 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:outline-none">
                              {activeLevels.map(l => (
                                <option key={l.code} value={l.code}>{l.code} - {l.nameVi}</option>
                              ))}
                            </select>
                          ) : (
                            level && <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">{level.code} - {level.nameVi}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isEditing ? (
                            <select value={assignTrack} onChange={e => setAssignTrack(e.target.value as CareerTrack)}
                              className="text-sm border border-slate-200 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:outline-none">
                              <option value="IC">IC</option>
                              <option value="Manager">Manager</option>
                            </select>
                          ) : (
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${career?.track === "IC" ? "bg-purple-50 text-purple-600" : "bg-indigo-50 text-indigo-600"}`}>
                              {career?.track === "IC" ? "Chuyên gia" : "Quản lý"}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isEditing ? (
                            <div className="flex justify-center gap-1">
                              <button onClick={() => handleAssignLevel(emp.id)}
                                className="p-1 rounded hover:bg-green-100 text-green-600"><Save size={15} /></button>
                              <button onClick={() => setEditingAssign(null)}
                                className="p-1 rounded hover:bg-red-100 text-red-500"><X size={15} /></button>
                            </div>
                          ) : (
                            <button onClick={() => {
                              setEditingAssign(emp.id);
                              setAssignLevel(career?.levelCode || "L3");
                              setAssignTrack(career?.track || "IC");
                            }} className="p-1.5 rounded hover:bg-blue-50 text-slate-400 hover:text-blue-600">
                              <Edit3 size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============ TAB 3: PROMOTIONS ============ */}
      {activeTab === "promotion" && (
        <div>
          <div className="flex gap-2 mb-4">
            {(["all", "eligible", "not_eligible"] as const).map(f => (
              <button key={f} onClick={() => setPromoFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  promoFilter === f ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500 hover:text-slate-700"
                }`}>
                {f === "all" ? "Tất cả" : f === "eligible" ? "Đủ ĐK" : "Chưa đủ"}
              </button>
            ))}
          </div>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
                    <th className="px-4 py-3 text-left">Nhân viên</th>
                    <th className="px-4 py-3 text-center">Level</th>
                    <th className="px-4 py-3 text-center">Tiếp theo</th>
                    <th className="px-4 py-3 text-center">Thời gian</th>
                    <th className="px-4 py-3 text-center">KPI TB</th>
                    <th className="px-4 py-3 text-center">Xếp loại</th>
                    <th className="px-4 py-3 text-center">Trạng thái</th>
                    <th className="px-4 py-3 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeEmployees
                    .map(emp => ({ emp, readiness: getReadiness(emp.id) }))
                    .filter(({ readiness }) => {
                      if (promoFilter === "eligible") return readiness?.overallReady;
                      if (promoFilter === "not_eligible") return readiness && !readiness.overallReady;
                      return true;
                    })
                    .sort((a, b) => (b.readiness?.overallReady ? 1 : 0) - (a.readiness?.overallReady ? 1 : 0))
                    .map(({ emp, readiness }) => {
                      const career = careers.find(c => c.employeeId === emp.id);
                      const level = career ? getLevelByCode(career.levelCode) : null;
                      if (!readiness || !level) return null;

                      return (
                        <tr key={emp.id} className={`hover:bg-slate-50/50 ${readiness.overallReady ? "bg-green-50/30" : ""}`}>
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-slate-800">{emp.name}</p>
                            <p className="text-xs text-slate-400">{emp.phongBan}</p>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700">{level.code}</span>
                          </td>
                          <td className="px-4 py-3 text-center text-sm text-slate-600">
                            {readiness.nextLevel ? `${readiness.nextLevel.code} - ${readiness.nextLevel.nameVi}` : "-"}
                          </td>
                          <td className="px-4 py-3 text-center text-sm">
                            <span className={readiness.timeReady ? "text-green-600" : "text-orange-600"}>
                              {readiness.timeServed}/{readiness.timeRequired}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-sm">
                            <span className={readiness.kpiReady ? "text-green-600 font-medium" : "text-orange-600"}>
                              {readiness.avgKPI}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <StatusBadge status={`rating_${readiness.rating.toLowerCase()}`} />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <StatusBadge status={readiness.overallReady ? "du_dieu_kien" : "chua_du_dieu_kien"} />
                          </td>
                          <td className="px-4 py-3 text-center">
                            {readiness.overallReady && readiness.nextLevel && readiness.nextLevel.isActive && (
                              <button onClick={() => handlePromote(emp.id)}
                                className="text-xs bg-green-50 text-green-700 hover:bg-green-100 px-3 py-1.5 rounded-lg font-medium transition-colors">
                                Duyệt
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============ TAB 4: PERFORMANCE REVIEW ============ */}
      {activeTab === "review" && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <label className="text-sm text-slate-600">Kỳ đánh giá:</label>
            <select value={reviewPeriod} onChange={e => setReviewPeriod(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="Q1/2026">Q1/2026</option>
              <option value="Q4/2025">Q4/2025</option>
              <option value="Q3/2025">Q3/2025</option>
              <option value="Q2/2026">Q2/2026</option>
            </select>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
                    <th className="px-4 py-3 text-left">Nhân viên</th>
                    <th className="px-4 py-3 text-center">Level</th>
                    <th className="px-4 py-3 text-center">Điểm KPI</th>
                    <th className="px-4 py-3 text-center">Xếp loại</th>
                    <th className="px-4 py-3 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeEmployees.map(emp => {
                    const career = careers.find(c => c.employeeId === emp.id);
                    const existing = career?.performanceHistory.find(h => h.period === reviewPeriod);
                    const isEditing = editingReview === emp.id;

                    return (
                      <tr key={emp.id} className={`hover:bg-slate-50/50 ${isEditing ? "bg-blue-50/50" : ""}`}>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-slate-800">{emp.name}</p>
                          <p className="text-xs text-slate-400">{emp.phongBan}</p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700">{career?.levelCode}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isEditing ? (
                            <input type="number" min={0} max={100} value={reviewScore}
                              onChange={e => setReviewScore(Math.min(100, Math.max(0, +e.target.value)))}
                              className="text-sm border border-slate-200 rounded px-2 py-1 w-20 text-center focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                          ) : (
                            <span className={`text-sm font-medium ${existing ? (existing.kpiScore >= 70 ? "text-green-600" : "text-orange-600") : "text-slate-300"}`}>
                              {existing ? `${existing.kpiScore}%` : "-"}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isEditing ? (
                            <StatusBadge status={`rating_${getPerformanceRating(reviewScore).toLowerCase()}`} />
                          ) : (
                            existing ? <StatusBadge status={`rating_${existing.rating.toLowerCase()}`} /> : <span className="text-xs text-slate-300">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isEditing ? (
                            <div className="flex justify-center gap-1">
                              <button onClick={() => handleSaveReview(emp.id)}
                                className="p-1 rounded hover:bg-green-100 text-green-600"><Save size={15} /></button>
                              <button onClick={() => setEditingReview(null)}
                                className="p-1 rounded hover:bg-red-100 text-red-500"><X size={15} /></button>
                            </div>
                          ) : (
                            <button onClick={() => {
                              setEditingReview(emp.id);
                              setReviewScore(existing?.kpiScore || 70);
                            }} className="p-1.5 rounded hover:bg-blue-50 text-slate-400 hover:text-blue-600">
                              <Edit3 size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============ TAB 5: SALARY ADJUSTMENT ============ */}
      {activeTab === "salary" && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800">Điều chỉnh lương</h3>
            <p className="text-xs text-slate-400 mt-0.5">Lương mới phải nằm trong khung Min-Max của cấp bậc hiện tại</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-3 text-left">Nhân viên</th>
                  <th className="px-4 py-3 text-center">Level</th>
                  <th className="px-4 py-3 text-right">Lương hiện tại</th>
                  <th className="px-4 py-3 text-center">Khung lương</th>
                  <th className="px-4 py-3 text-center">Vị trí</th>
                  <th className="px-4 py-3 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeEmployees.map(emp => {
                  const career = careers.find(c => c.employeeId === emp.id);
                  const level = career ? getLevelByCode(career.levelCode) : null;
                  if (!career || !level) return null;
                  const isEditing = editingSalary === emp.id;
                  const bandRange = level.salaryBand.max - level.salaryBand.min;
                  const position = bandRange > 0
                    ? Math.round(((career.currentSalary - level.salaryBand.min) / bandRange) * 100)
                    : 50;
                  const isValid = !isEditing || (newSalary >= level.salaryBand.min && newSalary <= level.salaryBand.max);

                  return (
                    <tr key={emp.id} className={`hover:bg-slate-50/50 ${isEditing ? "bg-blue-50/50" : ""}`}>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-slate-800">{emp.name}</p>
                        <p className="text-xs text-slate-400">{emp.phongBan}</p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700">{level.code}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isEditing ? (
                          <div>
                            <input type="number" value={newSalary}
                              onChange={e => setNewSalary(+e.target.value)}
                              step={100000}
                              className={`text-sm border rounded px-2 py-1 w-36 text-right focus:ring-2 focus:outline-none ${
                                isValid ? "border-slate-200 focus:ring-blue-500" : "border-red-300 focus:ring-red-500"
                              }`} />
                            {!isValid && <p className="text-[10px] text-red-500 mt-0.5">Ngoài khung lương</p>}
                          </div>
                        ) : (
                          <span className="text-sm font-medium text-slate-800">{formatCurrency(career.currentSalary)}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-slate-500">
                        {formatCurrency(level.salaryBand.min)} - {formatCurrency(level.salaryBand.max)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="w-20 mx-auto">
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-400 rounded-full" style={{ width: `${Math.max(0, Math.min(100, position))}%` }} />
                          </div>
                          <p className="text-[10px] text-slate-400 text-center mt-0.5">{Math.max(0, Math.min(100, position))}%</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isEditing ? (
                          <div className="flex justify-center gap-1">
                            <button onClick={() => isValid && handleSaveSalary(emp.id)}
                              disabled={!isValid}
                              className={`p-1 rounded ${isValid ? "hover:bg-green-100 text-green-600" : "text-slate-300 cursor-not-allowed"}`}>
                              <Save size={15} />
                            </button>
                            <button onClick={() => setEditingSalary(null)}
                              className="p-1 rounded hover:bg-red-100 text-red-500"><X size={15} /></button>
                          </div>
                        ) : (
                          <button onClick={() => {
                            setEditingSalary(emp.id);
                            setNewSalary(career.currentSalary);
                          }} className="p-1.5 rounded hover:bg-blue-50 text-slate-400 hover:text-blue-600">
                            <Edit3 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
