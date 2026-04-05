"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Users,
  CheckCircle2,
  Clock,
  DollarSign,
  Download,
  Eye,
  Loader2,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";
import DataTable from "@/components/DataTable";
import { formatCurrency } from "@/lib/format";
import {
  getEmployees,
  getPayrolls,
  calculateEmployeeScores,
} from "@/lib/supabase-data";

// ---- Types ----

interface Employee {
  id: number;
  name: string;
  department: string;
  role: string;
  base_salary: number;
  status: string;
}

interface PayrollRecord {
  employee_id: number;
  month: string;
  base_salary: number;
  allowances: number;
  bonus: number;
  deductions: number;
  total: number;
  status: string;
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

interface SalaryRow {
  employee: Employee;
  baseSalary: number;
  allowances: number;
  bonus: number;
  deductions: number;
  netPay: number;
  status: string;
  scorePercent: number;
  salaryPercent: number;
}

type TabKey = "tat_ca" | "cho_duyet" | "da_duyet" | "da_thanh_toan";

const tabs: { key: TabKey; label: string }[] = [
  { key: "tat_ca", label: "Tất cả" },
  { key: "cho_duyet", label: "Chờ duyệt" },
  { key: "da_duyet", label: "Đã duyệt" },
  { key: "da_thanh_toan", label: "Đã thanh toán" },
];

const ALL_DEPARTMENTS = [
  "Tất cả",
  "Kinh doanh",
  "Marketing",
  "Thiết kế",
  "Kho vận",
  "IT",
];

export default function DuyetLuongPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [activeTab, setActiveTab] = useState<TabKey>("tat_ca");
  const [department, setDepartment] = useState("Tất cả");

  const [loading, setLoading] = useState(true);
  const [salaryRows, setSalaryRows] = useState<SalaryRow[]>([]);

  // --- Fetch data whenever month/year changes ---
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const monthStr = `${String(month).padStart(2, "0")}/${year}`;

        const [employees, payrolls, scores] = await Promise.all([
          getEmployees() as Promise<Employee[]>,
          getPayrolls(monthStr) as Promise<PayrollRecord[]>,
          calculateEmployeeScores(month) as Promise<EmployeeScore[]>,
        ]);

        if (cancelled) return;

        const empMap = new Map<number, Employee>();
        employees.forEach((e) => empMap.set(e.id, e));

        const scoreMap = new Map<number, EmployeeScore>();
        scores.forEach((s) => scoreMap.set(s.employee.id, s));

        // Build salary rows from payroll data
        const rows: SalaryRow[] = payrolls.map((p) => {
          const emp = empMap.get(p.employee_id);
          const score = scoreMap.get(p.employee_id);
          return {
            employee: emp || {
              id: p.employee_id,
              name: `NV #${p.employee_id}`,
              department: "",
              role: "",
              base_salary: p.base_salary,
              status: "active",
            },
            baseSalary: p.base_salary,
            allowances: p.allowances,
            bonus: p.bonus,
            deductions: p.deductions,
            netPay: p.total,
            status: p.status || "cho_duyet",
            scorePercent: score?.scorePercent ?? 0,
            salaryPercent: score?.salaryPercent ?? 0,
          };
        });

        // If no payroll entries yet, generate rows from active employees
        if (rows.length === 0) {
          const fallbackRows: SalaryRow[] = employees
            .filter((e) => e.status === "active")
            .map((emp) => {
              const score = scoreMap.get(emp.id);
              const bonusFromScore = score
                ? Math.round((score.scorePercent / 100) * emp.base_salary * 0.1)
                : 0;
              return {
                employee: emp,
                baseSalary: emp.base_salary,
                allowances: 0,
                bonus: bonusFromScore,
                deductions: 0,
                netPay: emp.base_salary + bonusFromScore,
                status: "cho_duyet",
                scorePercent: score?.scorePercent ?? 0,
                salaryPercent: score?.salaryPercent ?? 0,
              };
            });
          setSalaryRows(fallbackRows);
        } else {
          setSalaryRows(rows);
        }
      } catch (err) {
        console.error("Failed to load salary data:", err);
        setSalaryRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [month, year]);

  // --- Approve handler ---
  const handleApprove = useCallback((employeeId: number) => {
    setSalaryRows((prev) =>
      prev.map((row) =>
        row.employee.id === employeeId && row.status === "cho_duyet"
          ? { ...row, status: "da_duyet" }
          : row
      )
    );
  }, []);

  // --- Filtering ---
  const filteredData = useMemo(() => {
    return salaryRows.filter((d) => {
      const matchTab =
        activeTab === "tat_ca" || d.status === activeTab;
      const matchDept =
        department === "Tất cả" || d.employee.department === department;
      return matchTab && matchDept;
    });
  }, [salaryRows, activeTab, department]);

  // --- Stats ---
  const totalAll = salaryRows.length;
  const totalApproved = salaryRows.filter(
    (d) => d.status === "da_duyet" || d.status === "da_thanh_toan"
  ).length;
  const totalPending = salaryRows.filter(
    (d) => d.status === "cho_duyet"
  ).length;
  const totalSalary = salaryRows.reduce((sum, d) => sum + d.netPay, 0);

  // --- Table columns ---
  const columns = useMemo(
    () => [
      {
        key: "employee",
        label: "Nhân viên",
        width: "220px",
        render: (row: SalaryRow) => (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-semibold flex-shrink-0">
              {row.employee.name.split(" ").slice(-1)[0].charAt(0)}
            </div>
            <div>
              <p className="font-medium text-slate-800">
                {row.employee.name}
              </p>
              <p className="text-xs text-slate-400">{row.employee.department}</p>
            </div>
          </div>
        ),
      },
      {
        key: "baseSalary",
        label: "Lương cơ bản",
        align: "right" as const,
        sortable: true,
        render: (row: SalaryRow) => (
          <span className="text-slate-700">
            {formatCurrency(row.baseSalary)}
          </span>
        ),
      },
      {
        key: "allowances",
        label: "Phụ cấp",
        align: "right" as const,
        render: (row: SalaryRow) => (
          <span className="text-slate-500">
            +{formatCurrency(row.allowances)}
          </span>
        ),
      },
      {
        key: "bonus",
        label: "Thưởng",
        align: "right" as const,
        sortable: true,
        render: (row: SalaryRow) => (
          <span className={row.bonus > 0 ? "text-green-600 font-medium" : "text-slate-500"}>
            {row.bonus > 0 ? `+${formatCurrency(row.bonus)}` : "0"}
          </span>
        ),
      },
      {
        key: "deductions",
        label: "Khấu trừ",
        align: "right" as const,
        sortable: true,
        render: (row: SalaryRow) => (
          <span className="text-red-500 font-medium">
            {row.deductions > 0 ? `-${formatCurrency(row.deductions)}` : "0"}
          </span>
        ),
      },
      {
        key: "netPay",
        label: "Tổng nhận",
        align: "right" as const,
        sortable: true,
        render: (row: SalaryRow) => (
          <span className="font-bold text-slate-900">
            {formatCurrency(row.netPay)}
          </span>
        ),
      },
      {
        key: "scorePercent",
        label: "Điểm KPI",
        align: "center" as const,
        sortable: true,
        render: (row: SalaryRow) => {
          const percent = row.scorePercent;
          const color =
            percent >= 80
              ? "text-green-600"
              : percent >= 50
                ? "text-orange-500"
                : "text-red-500";
          return <span className={`font-semibold ${color}`}>{percent}%</span>;
        },
      },
      {
        key: "salaryPercent",
        label: "% Lương",
        align: "center" as const,
        render: (row: SalaryRow) => {
          const percent = row.salaryPercent;
          const barColor =
            percent >= 80
              ? "bg-green-500"
              : percent >= 50
                ? "bg-orange-400"
                : "bg-red-500";
          const textColor =
            percent >= 80
              ? "text-green-600"
              : percent >= 50
                ? "text-orange-500"
                : "text-red-500";
          return (
            <div className="flex items-center justify-center gap-2">
              <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden inline-block">
                <div
                  className={`h-full rounded-full ${barColor}`}
                  style={{ width: `${percent}%` }}
                />
              </div>
              <span className={`text-xs font-medium ${textColor}`}>
                {percent}%
              </span>
            </div>
          );
        },
      },
      {
        key: "status",
        label: "Trạng thái",
        align: "center" as const,
        render: (row: SalaryRow) => (
          <StatusBadge status={row.status} />
        ),
      },
      {
        key: "actions",
        label: "Thao tác",
        align: "center" as const,
        width: "100px",
        render: (row: SalaryRow) => (
          <div className="flex items-center justify-center gap-1">
            <button className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors">
              <Eye size={15} />
            </button>
            {row.status === "cho_duyet" && (
              <button
                onClick={() => handleApprove(row.employee.id)}
                className="p-1.5 rounded-md hover:bg-green-50 text-slate-400 hover:text-green-600 transition-colors"
                title="Duyệt lương"
              >
                <CheckCircle2 size={15} />
              </button>
            )}
          </div>
        ),
      },
    ],
    [handleApprove]
  );

  return (
    <div className="p-6">
      <PageHeader
        title="Duyệt lương"
        subtitle={`Tháng ${month}/${year}`}
        breadcrumbs={[
          { label: "Nhân sự" },
          { label: "Duyệt lương" },
        ]}
        actions={
          <>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  Tháng {i + 1}
                </option>
              ))}
            </select>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {[2024, 2025, 2026].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {ALL_DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <button className="flex items-center gap-1.5 border border-slate-200 text-slate-600 px-3 py-2 rounded-lg text-sm hover:bg-slate-50 transition-colors">
              <Download size={15} />
              Xuất báo cáo
            </button>
          </>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={Users}
          label="Tổng số"
          value={totalAll}
          color="blue"
        />
        <StatCard
          icon={CheckCircle2}
          label="Đã duyệt"
          value={totalApproved}
          color="green"
        />
        <StatCard
          icon={Clock}
          label="Chờ duyệt"
          value={totalPending}
          color="orange"
        />
        <StatCard
          icon={DollarSign}
          label="Tổng lương"
          value={formatCurrency(totalSalary)}
          color="purple"
        />
      </div>

      {/* Tabs */}
      <div className="mb-4">
        <div className="inline-flex bg-slate-100 rounded-lg p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label}
              {tab.key === "cho_duyet" && totalPending > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center min-w-[20px] h-5 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold px-1.5">
                  {totalPending}
                </span>
              )}
              {tab.key === "da_duyet" && totalApproved > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center min-w-[20px] h-5 rounded-full bg-green-100 text-green-700 text-xs font-semibold px-1.5">
                  {totalApproved}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Loading or Data Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-blue-500" />
          <span className="ml-3 text-slate-500 text-sm">Đang tải dữ liệu lương...</span>
        </div>
      ) : (
        <DataTable
          columns={columns as never}
          data={filteredData as unknown as Record<string, unknown>[]}
          pageSize={10}
          searchable
          searchPlaceholder="Tìm theo tên, phòng ban..."
          searchKey={(item, query) => {
            const row = item as unknown as SalaryRow;
            return (
              row.employee.name.toLowerCase().includes(query) ||
              row.employee.department.toLowerCase().includes(query)
            );
          }}
          emptyMessage="Không có dữ liệu lương"
        />
      )}
    </div>
  );
}
