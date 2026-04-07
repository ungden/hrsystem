"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Loader2,
  Users,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  ShieldAlert,
  Award,
  UserX,
  Building2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { getEmployees, getTasks, calculateEmployeeScores } from "@/lib/supabase-data";
import { estimateBonus } from "@/lib/jd-kpi-framework";

// ──────────────────────── Types ────────────────────────

interface Employee {
  id: number;
  name: string;
  role: string;
  department: string;
  email: string;
  phone: string;
  status: string;
  join_date: string;
  base_salary: number;
  manager_id: number | null;
}

interface Task {
  id: string;
  assignee_id: number;
  status: string;
  department: string;
  points: number;
  bonus_amount: number;
  month_number: number;
}

interface EmployeeScore {
  employee: { id: number; name: string; department: string; role: string; base_salary: number };
  totalPoints: number;
  maxPoints: number;
  completedTasks: number;
  totalTasks: number;
  scorePercent: number;
  salaryPercent: number;
}

interface EnrichedEmployee {
  employee: { id: number; name: string; department: string; role: string; base_salary: number };
  completedTasks: number;
  totalTasks: number;
  completionRate: number;
  kpiScore: number;
  bonusTier: string;
  bonusAmount: number;
  status: "Xuat sac" | "Tot" | "Can cai thien" | "Yeu";
  statusLabel: string;
}

interface HRAlert {
  type: "danger" | "warning" | "success" | "info";
  icon: typeof AlertTriangle;
  message: string;
  employee?: string;
}

interface DepartmentAnalysis {
  name: string;
  members: EnrichedEmployee[];
  avgKpi: number;
  completionRate: number;
  recommendation: string;
}

// ──────────────────────── Helpers ────────────────────────

function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString("vi-VN");
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(-2)
    .join("")
    .toUpperCase();
}

function getStatusFromKpi(kpiScore: number): EnrichedEmployee["status"] {
  if (kpiScore >= 85) return "Xuat sac";
  if (kpiScore >= 65) return "Tot";
  if (kpiScore >= 40) return "Can cai thien";
  return "Yeu";
}

function getStatusLabel(status: EnrichedEmployee["status"]): string {
  switch (status) {
    case "Xuat sac":
      return "Xuất sắc";
    case "Tot":
      return "Tốt";
    case "Can cai thien":
      return "Cần cải thiện";
    case "Yeu":
      return "Yếu";
  }
}

function getStatusColor(status: EnrichedEmployee["status"]): string {
  switch (status) {
    case "Xuat sac":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "Tot":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "Can cai thien":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "Yeu":
      return "bg-red-100 text-red-700 border-red-200";
  }
}

function getAvatarGradient(department: string): string {
  const map: Record<string, string> = {
    Marketing: "from-violet-500 to-purple-600",
    Sales: "from-blue-500 to-indigo-600",
    "Vận hành": "from-teal-500 to-emerald-600",
    "Kế toán": "from-amber-500 to-orange-600",
    "Ban Giám đốc": "from-rose-500 to-red-600",
    "Thiết kế": "from-pink-500 to-fuchsia-600",
    "Kho vận": "from-cyan-500 to-teal-600",
    "Kinh doanh": "from-blue-500 to-indigo-600",
  };
  return map[department] || "from-slate-500 to-slate-700";
}

function getCurrentMonth(): number {
  return new Date().getMonth() + 1;
}

function buildAlerts(enriched: EnrichedEmployee[]): HRAlert[] {
  const alerts: HRAlert[] = [];

  // Employees with 0 tasks done
  enriched
    .filter((e) => e.completedTasks === 0 && e.totalTasks > 0)
    .forEach((e) => {
      alerts.push({
        type: "danger",
        icon: UserX,
        message: `${e.employee.name} chưa hoàn thành task nào tháng này (0/${e.totalTasks}). Cần họp 1-1 gấp.`,
        employee: e.employee.name,
      });
    });

  // Employees with < 50% completion
  enriched
    .filter((e) => e.completionRate > 0 && e.completionRate < 50 && e.completedTasks > 0)
    .forEach((e) => {
      alerts.push({
        type: "warning",
        icon: AlertTriangle,
        message: `${e.employee.name} đang tụt lại với ${e.completionRate}% hoàn thành (${e.completedTasks}/${e.totalTasks}). Cần coaching và hỗ trợ.`,
        employee: e.employee.name,
      });
    });

  // Exceeding targets
  enriched
    .filter((e) => e.kpiScore >= 85)
    .forEach((e) => {
      alerts.push({
        type: "success",
        icon: Award,
        message: `${e.employee.name} đang hoạt động xuất sắc (KPI: ${e.kpiScore}%). Xem xét thưởng và ghi nhận.`,
        employee: e.employee.name,
      });
    });

  // Department with lowest completion
  const depts = [...new Set(enriched.map((e) => e.employee.department))];
  if (depts.length > 1) {
    const deptStats = depts.map((dept) => {
      const members = enriched.filter((e) => e.employee.department === dept);
      const avg = members.reduce((s, m) => s + m.completionRate, 0) / members.length;
      return { dept, avg };
    });
    const worst = deptStats.sort((a, b) => a.avg - b.avg)[0];
    if (worst && worst.avg < 60) {
      alerts.push({
        type: "info",
        icon: Building2,
        message: `Phòng ${worst.dept} có tỷ lệ hoàn thành thấp nhất (${Math.round(worst.avg)}%). Cần tăng cường nguồn lực hoặc review quy trình.`,
      });
    }
  }

  return alerts;
}

function buildDeptAnalysis(enriched: EnrichedEmployee[]): DepartmentAnalysis[] {
  const depts = [...new Set(enriched.map((e) => e.employee.department))];
  return depts
    .map((name) => {
      const members = enriched.filter((e) => e.employee.department === name);
      const avgKpi = Math.round(members.reduce((s, m) => s + m.kpiScore, 0) / members.length);
      const completionRate = Math.round(
        members.reduce((s, m) => s + m.completionRate, 0) / members.length
      );

      let recommendation = "";
      if (avgKpi >= 85) {
        recommendation = "Phòng ban hoạt động xuất sắc. Xem xét thưởng tập thể và nhân rộng mô hình.";
      } else if (avgKpi >= 65) {
        recommendation = "Hiệu suất tốt. Tập trung vào 1-2 thành viên cần cải thiện để nâng toàn phòng.";
      } else if (avgKpi >= 40) {
        recommendation = "Cần review lại quy trình và phân bổ công việc. Xem xét đào tạo bổ sung.";
      } else {
        recommendation = "Cảnh báo: Phòng ban cần can thiệp gấp. Họp với lead để xác định nguyên nhân gốc.";
      }

      return { name, members, avgKpi, completionRate, recommendation };
    })
    .sort((a, b) => b.avgKpi - a.avgKpi);
}

// ──────────────────────── Components ────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600 border-blue-200",
    green: "bg-emerald-50 text-emerald-600 border-emerald-200",
    amber: "bg-amber-50 text-amber-600 border-amber-200",
    red: "bg-red-50 text-red-600 border-red-200",
  };
  const iconBg: Record<string, string> = {
    blue: "bg-blue-100",
    green: "bg-emerald-100",
    amber: "bg-amber-100",
    red: "bg-red-100",
  };

  return (
    <div className={`rounded-xl border p-5 ${colorMap[color]}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-lg ${iconBg[color]} flex items-center justify-center`}>
          <Icon size={20} />
        </div>
        <span className="text-sm font-medium text-slate-600">{label}</span>
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      {sub && <p className="text-sm text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

function ProgressBar({ percent, size = "md" }: { percent: number; size?: "sm" | "md" }) {
  const height = size === "sm" ? "h-1.5" : "h-2.5";
  const color =
    percent >= 80
      ? "bg-emerald-500"
      : percent >= 60
        ? "bg-blue-500"
        : percent >= 40
          ? "bg-amber-500"
          : "bg-red-500";

  return (
    <div className={`w-full bg-slate-200 rounded-full ${height}`}>
      <div
        className={`${color} ${height} rounded-full transition-all duration-500`}
        style={{ width: `${Math.min(percent, 100)}%` }}
      />
    </div>
  );
}

function AlertCard({ alert }: { alert: HRAlert }) {
  const Icon = alert.icon;
  const colorMap = {
    danger: "border-red-200 bg-red-50",
    warning: "border-amber-200 bg-amber-50",
    success: "border-emerald-200 bg-emerald-50",
    info: "border-blue-200 bg-blue-50",
  };
  const iconColor = {
    danger: "text-red-500",
    warning: "text-amber-500",
    success: "text-emerald-500",
    info: "text-blue-500",
  };

  return (
    <div className={`flex items-start gap-3 p-4 rounded-lg border ${colorMap[alert.type]}`}>
      <Icon size={20} className={`flex-shrink-0 mt-0.5 ${iconColor[alert.type]}`} />
      <p className="text-sm text-slate-700 leading-relaxed">{alert.message}</p>
    </div>
  );
}

// ──────────────────────── Main Page ────────────────────────

export default function HRAgentPage() {
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scores, setScores] = useState<EmployeeScore[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [expandedDept, setExpandedDept] = useState<string | null>(null);

  const currentMonth = getCurrentMonth();

  useEffect(() => {
    async function load() {
      try {
        const [scoreData, taskData] = await Promise.all([
          calculateEmployeeScores(currentMonth),
          getTasks({ month_number: currentMonth }),
        ]);
        setScores(scoreData as EmployeeScore[]);
        setAllTasks(taskData as Task[]);
      } catch (e) {
        console.error("Failed to load HR data:", e);
        setError("Không thể tải dữ liệu. Vui lòng thử lại.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [currentMonth]);

  // Enrich employee data
  const enriched: EnrichedEmployee[] = useMemo(() => {
    return scores.map((s) => {
      const completionRate =
        s.totalTasks > 0 ? Math.round((s.completedTasks / s.totalTasks) * 100) : 0;
      const kpiScore = s.scorePercent;
      const bonus = estimateBonus(s.employee.base_salary, kpiScore);
      const status = getStatusFromKpi(kpiScore);

      return {
        employee: s.employee,
        completedTasks: s.completedTasks,
        totalTasks: s.totalTasks,
        completionRate,
        kpiScore,
        bonusTier: bonus.tier,
        bonusAmount: bonus.amount,
        status,
        statusLabel: getStatusLabel(status),
      };
    });
  }, [scores]);

  // Departments list
  const departments = useMemo(() => {
    return [...new Set(enriched.map((e) => e.employee.department))].sort();
  }, [enriched]);

  // Filtered employees
  const filtered = useMemo(() => {
    let data = enriched;
    if (search) {
      const lower = search.toLowerCase();
      data = data.filter(
        (e) =>
          e.employee.name.toLowerCase().includes(lower) ||
          e.employee.role.toLowerCase().includes(lower)
      );
    }
    if (deptFilter) {
      data = data.filter((e) => e.employee.department === deptFilter);
    }
    return data.sort((a, b) => b.kpiScore - a.kpiScore);
  }, [enriched, search, deptFilter]);

  // Stats
  const stats = useMemo(() => {
    const totalActive = enriched.length;
    const totalDone = enriched.reduce((s, e) => s + e.completedTasks, 0);
    const totalAll = enriched.reduce((s, e) => s + e.totalTasks, 0);
    const avgCompletion =
      enriched.length > 0
        ? Math.round(enriched.reduce((s, e) => s + e.completionRate, 0) / enriched.length)
        : 0;
    const alertCount = enriched.filter((e) => e.status === "Yeu" || e.status === "Can cai thien").length;

    return { totalActive, totalDone, totalAll, avgCompletion, alertCount };
  }, [enriched]);

  // Alerts
  const alerts = useMemo(() => buildAlerts(enriched), [enriched]);

  // Department analysis
  const deptAnalysis = useMemo(() => buildDeptAnalysis(enriched), [enriched]);

  // ──────── Loading state ────────
  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[500px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-3 text-base text-slate-500">Đang tải dữ liệu HR Agent...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[500px]">
        <div className="text-center">
          <ShieldAlert className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-base text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <PageHeader
        title="Quản lý Nhân sự — HR Agent"
        subtitle="Phân tích chuyên sâu, cảnh báo và đề xuất tối ưu nhân sự"
        breadcrumbs={[
          { label: "AI Agents", href: "/admin" },
          { label: "HR Agent" },
        ]}
      />

      {/* ═══════ Section 1: Stats Cards ═══════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={Users}
          label="Tổng nhân viên"
          value={stats.totalActive}
          sub="Đang hoạt động"
          color="blue"
        />
        <StatCard
          icon={CheckCircle2}
          label="Tasks hoàn thành"
          value={`${stats.totalDone}/${stats.totalAll}`}
          sub={`Thang ${currentMonth}`}
          color="green"
        />
        <StatCard
          icon={TrendingUp}
          label="Tỷ lệ hoàn thành TB"
          value={`${stats.avgCompletion}%`}
          sub="Trung bình tất cả NV"
          color="amber"
        />
        <StatCard
          icon={AlertTriangle}
          label="Cảnh báo"
          value={stats.alertCount}
          sub="NV cần hỗ trợ"
          color="red"
        />
      </div>

      {/* ═══════ Section 2: Employee Table ═══════ */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Bảng nhân sự chi tiết</h2>

        {/* Filters */}
        <div className="flex gap-3 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm nhân viên..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">Tất cả phòng ban</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">
                    Nhân viên
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600">
                    Vai trò
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-600 min-w-[160px]">
                    Tasks
                  </th>
                  <th className="text-center px-4 py-3 text-sm font-semibold text-slate-600">
                    Điểm KPI
                  </th>
                  <th className="text-right px-4 py-3 text-sm font-semibold text-slate-600">
                    Thưởng dự kiến
                  </th>
                  <th className="text-center px-4 py-3 text-sm font-semibold text-slate-600">
                    Trạng thái
                  </th>
                  <th className="text-center px-4 py-3 text-sm font-semibold text-slate-600">
                    Canh bao
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((item) => (
                  <tr
                    key={item.employee.id}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    {/* Employee name + avatar + department */}
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/nhan-vien/${item.employee.id}`}
                        className="flex items-center gap-3 group"
                      >
                        <div
                          className={`w-9 h-9 rounded-full bg-gradient-to-br ${getAvatarGradient(
                            item.employee.department
                          )} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}
                        >
                          {getInitials(item.employee.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800 group-hover:text-blue-600 truncate">
                            {item.employee.name}
                          </p>
                          <p className="text-sm text-slate-400 truncate">
                            {item.employee.department}
                          </p>
                        </div>
                      </Link>
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3">
                      <p className="text-sm text-slate-600 truncate max-w-[200px]">
                        {item.employee.role}
                      </p>
                    </td>

                    {/* Tasks with progress bar */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <ProgressBar percent={item.completionRate} size="sm" />
                        </div>
                        <span className="text-sm text-slate-600 whitespace-nowrap">
                          {item.completedTasks}/{item.totalTasks}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400 mt-0.5">{item.completionRate}%</p>
                    </td>

                    {/* KPI score */}
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`text-base font-bold ${
                          item.kpiScore >= 85
                            ? "text-emerald-600"
                            : item.kpiScore >= 65
                              ? "text-blue-600"
                              : item.kpiScore >= 40
                                ? "text-amber-600"
                                : "text-red-600"
                        }`}
                      >
                        {item.kpiScore}
                      </span>
                    </td>

                    {/* Bonus */}
                    <td className="px-4 py-3 text-right">
                      <p className="text-sm font-medium text-slate-800">
                        {formatCurrency(item.bonusAmount)}
                      </p>
                      <p className="text-sm text-slate-400">{item.bonusTier}</p>
                    </td>

                    {/* Status badge */}
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-sm font-medium border ${getStatusColor(
                          item.status
                        )}`}
                      >
                        {item.statusLabel}
                      </span>
                    </td>

                    {/* Alert icon */}
                    <td className="px-4 py-3 text-center">
                      {item.status === "Yeu" && (
                        <ShieldAlert size={18} className="text-red-500 mx-auto" />
                      )}
                      {item.status === "Can cai thien" && (
                        <AlertTriangle size={18} className="text-amber-500 mx-auto" />
                      )}
                      {item.status === "Xuat sac" && (
                        <Award size={18} className="text-emerald-500 mx-auto" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-12 text-base text-slate-400">
              Khong tim thay nhan vien nao phu hop.
            </div>
          )}
        </div>
      </div>

      {/* ═══════ Section 3: HR Agent Alerts ═══════ */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Cảnh báo HR Agent</h2>
        <p className="text-sm text-slate-500 mb-4">
          Phan tich tu dong dua tren du lieu thuc te thang {currentMonth}
        </p>

        {alerts.length > 0 ? (
          <div className="space-y-3">
            {alerts.map((alert, i) => (
              <AlertCard key={i} alert={alert} />
            ))}
          </div>
        ) : (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6 text-center">
            <CheckCircle2 size={28} className="text-emerald-500 mx-auto mb-2" />
            <p className="text-base text-slate-600">
              Không có cảnh báo nào. Tất cả nhân viên đang hoạt động tốt.
            </p>
          </div>
        )}
      </div>

      {/* ═══════ Section 4: Department Analysis ═══════ */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Phân tích theo phòng ban</h2>

        <div className="space-y-4">
          {deptAnalysis.map((dept) => {
            const isExpanded = expandedDept === dept.name;

            return (
              <div
                key={dept.name}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden"
              >
                {/* Department header */}
                <button
                  onClick={() => setExpandedDept(isExpanded ? null : dept.name)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                      <Building2 size={20} className="text-slate-600" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-base font-semibold text-slate-800">{dept.name}</h3>
                      <p className="text-sm text-slate-400">
                        {dept.members.length} thanh vien
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm text-slate-400">KPI TB</p>
                      <p
                        className={`text-base font-bold ${
                          dept.avgKpi >= 85
                            ? "text-emerald-600"
                            : dept.avgKpi >= 65
                              ? "text-blue-600"
                              : dept.avgKpi >= 40
                                ? "text-amber-600"
                                : "text-red-600"
                        }`}
                      >
                        {dept.avgKpi}%
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-400">Hoàn thành</p>
                      <p className="text-base font-bold text-slate-700">{dept.completionRate}%</p>
                    </div>
                    {isExpanded ? (
                      <ChevronUp size={20} className="text-slate-400" />
                    ) : (
                      <ChevronDown size={20} className="text-slate-400" />
                    )}
                  </div>
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="border-t border-slate-200 px-5 py-4">
                    {/* Recommendation */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                      <p className="text-sm text-slate-700">
                        <span className="font-semibold text-blue-700">HR Agent: </span>
                        {dept.recommendation}
                      </p>
                    </div>

                    {/* Members mini stats */}
                    <div className="space-y-2">
                      {dept.members
                        .sort((a, b) => b.kpiScore - a.kpiScore)
                        .map((m) => (
                          <Link
                            key={m.employee.id}
                            href={`/admin/nhan-vien/${m.employee.id}`}
                            className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 transition-colors group"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarGradient(
                                  m.employee.department
                                )} flex items-center justify-center text-white text-sm font-bold`}
                              >
                                {getInitials(m.employee.name)}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-700 group-hover:text-blue-600">
                                  {m.employee.name}
                                </p>
                                <p className="text-sm text-slate-400">{m.employee.role}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="w-24">
                                <ProgressBar percent={m.completionRate} size="sm" />
                              </div>
                              <span className="text-sm text-slate-500 w-16 text-right">
                                {m.completedTasks}/{m.totalTasks}
                              </span>
                              <span
                                className={`text-sm font-bold w-10 text-right ${
                                  m.kpiScore >= 85
                                    ? "text-emerald-600"
                                    : m.kpiScore >= 65
                                      ? "text-blue-600"
                                      : m.kpiScore >= 40
                                        ? "text-amber-600"
                                        : "text-red-600"
                                }`}
                              >
                                {m.kpiScore}
                              </span>
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-sm font-medium border ${getStatusColor(
                                  m.status
                                )} w-[110px] text-center`}
                              >
                                {m.statusLabel}
                              </span>
                            </div>
                          </Link>
                        ))}
                    </div>
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
