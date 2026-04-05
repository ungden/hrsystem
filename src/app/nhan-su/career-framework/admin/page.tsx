"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
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
  Loader2,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";
import { formatCurrency } from "@/lib/format";
import {
  type CareerTrack,
  type PerformanceRatingTier,
  getPerformanceRatingTier,
} from "@/lib/career-config";
import {
  getCareerLevels,
  getEmployees,
  getEmployeeCareers,
  getPerformanceRatings,
  updateCareerLevel,
  updateEmployeeCareer,
  upsertPerformanceRating,
} from "@/lib/supabase-data";

// ============ LOCAL TYPES ============

interface AdminAction {
  id: string;
  type: "promotion" | "level_change" | "salary_change" | "review" | "level_config";
  employeeId?: number;
  employeeName?: string;
  description: string;
  timestamp: string;
  oldValue?: string;
  newValue?: string;
}

interface CareerLevelRow {
  code: string;
  name: string;
  name_vi: string;
  track: CareerTrack;
  is_active: boolean;
  salary_band_min: number;
  salary_band_mid: number;
  salary_band_max: number;
  min_time_months: number;
  required_kpi_percent: number;
  description: string;
  next_level: string | null;
}

interface EmployeeRow {
  id: number;
  name: string;
  department: string;
  role: string;
  base_salary: number;
  status: string;
}

interface EmployeeCareerRow {
  employee_id: number;
  level_code: string;
  track: CareerTrack;
  level_start_date: string;
  current_salary: number;
  promotion_eligible_date: string;
}

interface PerformanceRatingRow {
  employee_id: number;
  period: string;
  kpi_score: number;
  tier: string;
}

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
  level: CareerLevelRow;
  onSave: (updated: CareerLevelRow) => void;
  onCancel: () => void;
}) {
  const [nameVi, setNameVi] = useState(level.name_vi);
  const [min, setMin] = useState(level.salary_band_min / 1_000_000);
  const [mid, setMid] = useState(level.salary_band_mid / 1_000_000);
  const [max, setMax] = useState(level.salary_band_max / 1_000_000);
  const [minTime, setMinTime] = useState(level.min_time_months);
  const [kpi, setKpi] = useState(level.required_kpi_percent);

  const handleSave = () => {
    onSave({
      ...level,
      name_vi: nameVi,
      salary_band_min: min * 1_000_000,
      salary_band_mid: mid * 1_000_000,
      salary_band_max: max * 1_000_000,
      min_time_months: minTime,
      required_kpi_percent: kpi,
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

  // Async-loaded data
  const [levels, setLevels] = useState<CareerLevelRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [careers, setCareers] = useState<EmployeeCareerRow[]>([]);
  const [ratings, setRatings] = useState<PerformanceRatingRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Session-only action log
  const [actionsLog, setActionsLog] = useState<AdminAction[]>([]);
  const [showLog, setShowLog] = useState(false);

  // Level edit state
  const [editingLevel, setEditingLevel] = useState<string | null>(null);

  // Assign tab state
  const [assignFilter, setAssignFilter] = useState("");
  const [editingAssign, setEditingAssign] = useState<number | null>(null);
  const [assignLevel, setAssignLevel] = useState("");
  const [assignTrack, setAssignTrack] = useState<CareerTrack>("IC");

  // Promotion tab state
  const [promoFilter, setPromoFilter] = useState<"all" | "eligible" | "not_eligible">("all");

  // Review tab state
  const [reviewPeriod, setReviewPeriod] = useState("Q1/2026");
  const [editingReview, setEditingReview] = useState<number | null>(null);
  const [reviewScore, setReviewScore] = useState(0);

  // Salary tab state
  const [editingSalary, setEditingSalary] = useState<number | null>(null);
  const [newSalary, setNewSalary] = useState(0);

  // ============ LOAD DATA ============
  useEffect(() => {
    async function loadAll() {
      try {
        const [lvls, emps, cars, rats] = await Promise.all([
          getCareerLevels(),
          getEmployees(),
          getEmployeeCareers(),
          getPerformanceRatings(),
        ]);
        setLevels(lvls);
        setEmployees(emps);
        setCareers(cars);
        setRatings(rats);
      } catch (err) {
        console.error("Failed to load career admin data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, []);

  const activeEmployees = employees.filter(e => e.status === "active");
  const activeLevels = levels.filter(l => l.is_active);

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
  const getReadiness = useCallback((employeeId: number) => {
    const career = careers.find(c => c.employee_id === employeeId);
    if (!career) return null;
    const level = getLevelByCode(career.level_code);
    if (!level) return null;

    const nowDate = new Date();
    const levelStart = new Date(career.level_start_date);
    const timeServed = (nowDate.getFullYear() - levelStart.getFullYear()) * 12 + (nowDate.getMonth() - levelStart.getMonth());
    const timeRequired = level.min_time_months;
    const timeReady = timeServed >= timeRequired;

    const empRatings = ratings.filter(r => r.employee_id === employeeId);
    const recent = empRatings.slice(-3);
    const avgKPI = recent.length > 0
      ? Math.round(recent.reduce((s, h) => s + h.kpi_score, 0) / recent.length)
      : 0;
    const kpiReady = avgKPI >= level.required_kpi_percent;
    const rating = getPerformanceRatingTier(avgKPI);
    const nextLevel = level.next_level ? getLevelByCode(level.next_level) : null;
    const overallReady = timeReady && kpiReady && rating !== "Weak" && rating !== "Poor";

    return { timeServed, timeRequired, timeReady, avgKPI, kpiReady, rating, nextLevel, overallReady };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [careers, levels, ratings]);

  // ============ HANDLERS ============

  const handleSaveLevel = useCallback(async (updated: CareerLevelRow) => {
    const old = levels.find(l => l.code === updated.code);
    try {
      await updateCareerLevel(updated.code, {
        name_vi: updated.name_vi,
        salary_band_min: updated.salary_band_min,
        salary_band_mid: updated.salary_band_mid,
        salary_band_max: updated.salary_band_max,
        min_time_months: updated.min_time_months,
        required_kpi_percent: updated.required_kpi_percent,
      });
      setLevels(prev => prev.map(l => l.code === updated.code ? updated : l));
      setEditingLevel(null);
      addLog({
        type: "level_config",
        description: `Cập nhật cấp bậc ${updated.code} - ${updated.name_vi}`,
        oldValue: old ? `${formatCurrency(old.salary_band_min)}-${formatCurrency(old.salary_band_max)}` : "",
        newValue: `${formatCurrency(updated.salary_band_min)}-${formatCurrency(updated.salary_band_max)}`,
      });
    } catch (err) {
      console.error("Failed to save level:", err);
    }
  }, [levels, addLog]);

  const handleToggleActive = useCallback(async (code: string) => {
    const level = levels.find(l => l.code === code);
    if (!level) return;
    const newActive = !level.is_active;
    try {
      await updateCareerLevel(code, { is_active: newActive });
      setLevels(prev => prev.map(l =>
        l.code === code ? { ...l, is_active: newActive } : l
      ));
      addLog({
        type: "level_config",
        description: `${level.is_active ? "Tắt" : "Bật"} cấp bậc ${code}`,
      });
    } catch (err) {
      console.error("Failed to toggle level:", err);
    }
  }, [levels, addLog]);

  const handleAssignLevel = useCallback(async (empId: number) => {
    const emp = employees.find(e => e.id === empId);
    const career = careers.find(c => c.employee_id === empId);
    const oldLevel = career?.level_code || "N/A";
    const today = new Date().toISOString().split("T")[0];
    try {
      await updateEmployeeCareer(empId, {
        level_code: assignLevel,
        track: assignTrack,
        level_start_date: today,
      });
      setCareers(prev => prev.map(c =>
        c.employee_id === empId
          ? { ...c, level_code: assignLevel, track: assignTrack, level_start_date: today }
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
    } catch (err) {
      console.error("Failed to assign level:", err);
    }
  }, [careers, employees, assignLevel, assignTrack, addLog]);

  const handlePromote = useCallback(async (empId: number) => {
    const career = careers.find(c => c.employee_id === empId);
    if (!career) return;
    const level = getLevelByCode(career.level_code);
    if (!level?.next_level) return;
    const nextLevel = getLevelByCode(level.next_level);
    if (!nextLevel) return;
    const emp = employees.find(e => e.id === empId);
    const today = new Date().toISOString().split("T")[0];

    try {
      await updateEmployeeCareer(empId, {
        level_code: nextLevel.code,
        track: nextLevel.track,
        level_start_date: today,
      });
      setCareers(prev => prev.map(c =>
        c.employee_id === empId
          ? { ...c, level_code: nextLevel.code, track: nextLevel.track, level_start_date: today }
          : c
      ));
      addLog({
        type: "promotion",
        employeeId: empId,
        employeeName: emp?.name,
        description: `Thăng tiến ${emp?.name}`,
        oldValue: `${level.code} - ${level.name_vi}`,
        newValue: `${nextLevel.code} - ${nextLevel.name_vi}`,
      });
    } catch (err) {
      console.error("Failed to promote:", err);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [careers, levels, employees, addLog]);

  const handleSaveReview = useCallback(async (empId: number) => {
    const emp = employees.find(e => e.id === empId);
    const tier = getPerformanceRatingTier(reviewScore);
    try {
      await upsertPerformanceRating({
        employee_id: empId,
        period: reviewPeriod,
        kpi_score: reviewScore,
        tier,
      });
      // Update local ratings state
      setRatings(prev => {
        const idx = prev.findIndex(r => r.employee_id === empId && r.period === reviewPeriod);
        const entry: PerformanceRatingRow = { employee_id: empId, period: reviewPeriod, kpi_score: reviewScore, tier };
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = entry;
          return updated;
        }
        return [...prev, entry];
      });
      setEditingReview(null);
      addLog({
        type: "review",
        employeeId: empId,
        employeeName: emp?.name,
        description: `Đánh giá ${emp?.name} kỳ ${reviewPeriod}`,
        newValue: `KPI: ${reviewScore}% - ${tier}`,
      });
    } catch (err) {
      console.error("Failed to save review:", err);
    }
  }, [employees, reviewScore, reviewPeriod, addLog]);

  const handleSaveSalary = useCallback(async (empId: number) => {
    const emp = employees.find(e => e.id === empId);
    const career = careers.find(c => c.employee_id === empId);
    try {
      await updateEmployeeCareer(empId, { current_salary: newSalary });
      setCareers(prev => prev.map(c =>
        c.employee_id === empId ? { ...c, current_salary: newSalary } : c
      ));
      setEditingSalary(null);
      addLog({
        type: "salary_change",
        employeeId: empId,
        employeeName: emp?.name,
        description: `Điều chỉnh lương ${emp?.name}`,
        oldValue: career ? formatCurrency(career.current_salary) : "",
        newValue: formatCurrency(newSalary),
      });
    } catch (err) {
      console.error("Failed to save salary:", err);
    }
  }, [careers, employees, newSalary, addLog]);

  // Stats
  const eligibleCount = activeEmployees.filter(e => getReadiness(e.id)?.overallReady).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-blue-500" size={32} />
        <span className="ml-3 text-slate-500">Đang tải dữ liệu...</span>
      </div>
    );
  }

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
                    <tr key={level.code} className={`hover:bg-slate-50/50 ${!level.is_active ? "opacity-40" : ""}`}>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${level.is_active ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-400"}`}>
                          {level.code}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-slate-800">{level.name_vi}</p>
                        <p className="text-xs text-slate-400">{level.name} - {level.track === "IC" ? "Chuyên gia" : "Quản lý"}</p>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-slate-600">{level.salary_band_min / 1_000_000}M</td>
                      <td className="px-4 py-3 text-right text-sm font-medium">{level.salary_band_mid / 1_000_000}M</td>
                      <td className="px-4 py-3 text-right text-sm text-slate-600">{level.salary_band_max / 1_000_000}M</td>
                      <td className="px-4 py-3 text-center text-sm">{level.min_time_months} tháng</td>
                      <td className="px-4 py-3 text-center text-sm text-blue-600 font-medium">{level.required_kpi_percent}%</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => setEditingLevel(level.code)}
                            className="p-1.5 rounded hover:bg-blue-50 text-slate-400 hover:text-blue-600" title="Sửa">
                            <Edit3 size={14} />
                          </button>
                          <button onClick={() => handleToggleActive(level.code)}
                            className={`px-2 py-0.5 rounded text-xs font-medium ${level.is_active ? "bg-green-50 text-green-600 hover:bg-green-100" : "bg-slate-100 text-slate-400 hover:bg-slate-200"}`}>
                            {level.is_active ? "Active" : "Off"}
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
                    const career = careers.find(c => c.employee_id === emp.id);
                    const level = career ? getLevelByCode(career.level_code) : null;
                    const isEditing = editingAssign === emp.id;

                    return (
                      <tr key={emp.id} className={`hover:bg-slate-50/50 ${isEditing ? "bg-blue-50/50" : ""}`}>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-slate-800">{emp.name}</p>
                          <p className="text-xs text-slate-400">{emp.role}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{emp.department}</td>
                        <td className="px-4 py-3 text-center">
                          {isEditing ? (
                            <select value={assignLevel} onChange={e => setAssignLevel(e.target.value)}
                              className="text-sm border border-slate-200 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:outline-none">
                              {activeLevels.map(l => (
                                <option key={l.code} value={l.code}>{l.code} - {l.name_vi}</option>
                              ))}
                            </select>
                          ) : (
                            level && <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">{level.code} - {level.name_vi}</span>
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
                              setAssignLevel(career?.level_code || "L3");
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
                      const career = careers.find(c => c.employee_id === emp.id);
                      const level = career ? getLevelByCode(career.level_code) : null;
                      if (!readiness || !level) return null;

                      return (
                        <tr key={emp.id} className={`hover:bg-slate-50/50 ${readiness.overallReady ? "bg-green-50/30" : ""}`}>
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-slate-800">{emp.name}</p>
                            <p className="text-xs text-slate-400">{emp.department}</p>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700">{level.code}</span>
                          </td>
                          <td className="px-4 py-3 text-center text-sm text-slate-600">
                            {readiness.nextLevel ? `${readiness.nextLevel.code} - ${readiness.nextLevel.name_vi}` : "-"}
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
                            {readiness.overallReady && readiness.nextLevel && readiness.nextLevel.is_active && (
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
                    const career = careers.find(c => c.employee_id === emp.id);
                    const existing = ratings.find(r => r.employee_id === emp.id && r.period === reviewPeriod);
                    const isEditing = editingReview === emp.id;

                    return (
                      <tr key={emp.id} className={`hover:bg-slate-50/50 ${isEditing ? "bg-blue-50/50" : ""}`}>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-slate-800">{emp.name}</p>
                          <p className="text-xs text-slate-400">{emp.department}</p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700">{career?.level_code}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isEditing ? (
                            <input type="number" min={0} max={100} value={reviewScore}
                              onChange={e => setReviewScore(Math.min(100, Math.max(0, +e.target.value)))}
                              className="text-sm border border-slate-200 rounded px-2 py-1 w-20 text-center focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                          ) : (
                            <span className={`text-sm font-medium ${existing ? (existing.kpi_score >= 70 ? "text-green-600" : "text-orange-600") : "text-slate-300"}`}>
                              {existing ? `${existing.kpi_score}%` : "-"}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isEditing ? (
                            <StatusBadge status={`rating_${getPerformanceRatingTier(reviewScore).toLowerCase()}`} />
                          ) : (
                            existing ? <StatusBadge status={`rating_${existing.tier.toLowerCase()}`} /> : <span className="text-xs text-slate-300">-</span>
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
                              setReviewScore(existing?.kpi_score || 70);
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
                  const career = careers.find(c => c.employee_id === emp.id);
                  const level = career ? getLevelByCode(career.level_code) : null;
                  if (!career || !level) return null;
                  const isEditing = editingSalary === emp.id;
                  const bandRange = level.salary_band_max - level.salary_band_min;
                  const position = bandRange > 0
                    ? Math.round(((career.current_salary - level.salary_band_min) / bandRange) * 100)
                    : 50;
                  const isValid = !isEditing || (newSalary >= level.salary_band_min && newSalary <= level.salary_band_max);

                  return (
                    <tr key={emp.id} className={`hover:bg-slate-50/50 ${isEditing ? "bg-blue-50/50" : ""}`}>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-slate-800">{emp.name}</p>
                        <p className="text-xs text-slate-400">{emp.department}</p>
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
                          <span className="text-sm font-medium text-slate-800">{formatCurrency(career.current_salary)}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-slate-500">
                        {formatCurrency(level.salary_band_min)} - {formatCurrency(level.salary_band_max)}
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
                            setNewSalary(career.current_salary);
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
