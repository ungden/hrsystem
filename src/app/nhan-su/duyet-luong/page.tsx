"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Users,
  CheckCircle2,
  Clock,
  DollarSign,
  Download,
  Eye,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";
import DataTable from "@/components/DataTable";
import {
  generateSalaryData,
  formatCurrency,
  SalaryRecord,
  calculateEmployeeScores,
  kanbanTasks,
  employees,
  EmployeeScore,
  kpiTargets,
  calculateKPIBonus,
  getEmployeeKPITargets,
} from "@/lib/mock-data";

type TabKey = "tat_ca" | "moi" | "da_duyet" | "da_thanh_toan";

const tabs: { key: TabKey; label: string }[] = [
  { key: "tat_ca", label: "Tất cả" },
  { key: "moi", label: "Mới" },
  { key: "da_duyet", label: "Đã duyệt" },
  { key: "da_thanh_toan", label: "Đã thanh toán" },
];

export default function DuyetLuongPage() {
  const [month, setMonth] = useState(3);
  const [year, setYear] = useState(2026);
  const [activeTab, setActiveTab] = useState<TabKey>("tat_ca");

  const [salaryData, setSalaryData] = useState<SalaryRecord[]>(() =>
    generateSalaryData()
  );

  const scoresMap = useMemo(() => {
    const scores = calculateEmployeeScores(kanbanTasks);
    const map = new Map<string, EmployeeScore>();
    scores.forEach((s) => map.set(s.employee.id, s));
    return map;
  }, []);

  const bonusMap = useMemo(() => {
    const map = new Map<string, number>();
    employees.forEach((e) => {
      const targets = getEmployeeKPITargets(e.id);
      map.set(e.id, Math.round(calculateKPIBonus(targets)));
    });
    return map;
  }, []);

  const handleApprove = useCallback((employeeId: string) => {
    setSalaryData((prev) =>
      prev.map((row) =>
        row.employee.id === employeeId && row.trangThai === "cho_duyet"
          ? { ...row, trangThai: "da_duyet" as const }
          : row
      )
    );
  }, []);

  const filteredData = useMemo(() => {
    return salaryData.filter((d) => {
      const matchTab =
        activeTab === "tat_ca" ||
        (activeTab === "moi" && d.trangThai === "cho_duyet") ||
        (activeTab === "da_duyet" && d.trangThai === "da_duyet") ||
        (activeTab === "da_thanh_toan" && d.trangThai === "da_thanh_toan");
      return matchTab;
    });
  }, [salaryData, activeTab]);

  const totalAll = salaryData.length;
  const totalApproved = salaryData.filter(
    (d) => d.trangThai === "da_duyet" || d.trangThai === "da_thanh_toan"
  ).length;
  const totalPending = salaryData.filter(
    (d) => d.trangThai === "cho_duyet"
  ).length;
  const totalSalary = salaryData.reduce((sum, d) => sum + d.tongNhan, 0);

  const columns = useMemo(
    () => [
      {
        key: "employee",
        label: "Nhân viên",
        width: "220px",
        render: (row: SalaryRecord) => (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-semibold flex-shrink-0">
              {row.employee.name.split(" ").slice(-1)[0].charAt(0)}
            </div>
            <div>
              <p className="font-medium text-slate-800">
                {row.employee.name}
              </p>
              <p className="text-xs text-slate-400">{row.employee.maSo}</p>
            </div>
          </div>
        ),
      },
      {
        key: "luongCoBan",
        label: "Lương cơ bản",
        align: "right" as const,
        sortable: true,
        render: (row: SalaryRecord) => (
          <span className="text-slate-700">
            {formatCurrency(row.luongCoBan)}
          </span>
        ),
      },
      {
        key: "phuCap",
        label: "Phụ cấp",
        align: "right" as const,
        render: (row: SalaryRecord) => {
          const total =
            row.phuCapAnTrua + row.phuCapXangXe + row.phuCapDienThoai;
          return (
            <span className="text-slate-500">
              +{formatCurrency(total)}
            </span>
          );
        },
      },
      {
        key: "thuong",
        label: "Thưởng",
        align: "right" as const,
        sortable: true,
        render: (row: SalaryRecord) => (
          <span className={row.thuong > 0 ? "text-green-600 font-medium" : "text-slate-500"}>
            {row.thuong > 0 ? `+${formatCurrency(row.thuong)}` : "0"}
          </span>
        ),
      },
      {
        key: "khauTru",
        label: "Khấu trừ",
        align: "right" as const,
        sortable: true,
        render: (row: SalaryRecord) => (
          <span className="text-red-500 font-medium">
            {formatCurrency(row.khauTru)}
          </span>
        ),
      },
      {
        key: "tongNhan",
        label: "Tổng nhận",
        align: "right" as const,
        sortable: true,
        render: (row: SalaryRecord) => (
          <span className="font-bold text-slate-900">
            {formatCurrency(row.tongNhan)}
          </span>
        ),
      },
      {
        key: "diemKPI",
        label: "Điểm KPI",
        align: "center" as const,
        sortable: true,
        render: (row: SalaryRecord) => {
          const score = scoresMap.get(row.employee.id);
          const percent = score?.scorePercent ?? 0;
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
        render: (row: SalaryRecord) => {
          const score = scoresMap.get(row.employee.id);
          const percent = score?.salaryPercent ?? 0;
          const color =
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
                  className={`h-full rounded-full ${color}`}
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
        key: "trangThai",
        label: "Trạng thái",
        align: "center" as const,
        render: (row: SalaryRecord) => (
          <StatusBadge status={row.trangThai} />
        ),
      },
      {
        key: "actions",
        label: "Thao tác",
        align: "center" as const,
        width: "100px",
        render: (row: SalaryRecord) => (
          <div className="flex items-center justify-center gap-1">
            <button className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors">
              <Eye size={15} />
            </button>
            {row.trangThai === "cho_duyet" && (
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
    [handleApprove, scoresMap]
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
              {tab.key === "moi" && totalPending > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center min-w-[20px] h-5 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold px-1.5">
                  {totalPending}
                </span>
              )}
              {tab.key === "da_duyet" && (
                <span className="ml-1.5 inline-flex items-center justify-center min-w-[20px] h-5 rounded-full bg-green-100 text-green-700 text-xs font-semibold px-1.5">
                  {totalApproved}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns as never}
        data={filteredData as unknown as Record<string, unknown>[]}
        pageSize={10}
        searchable
        searchPlaceholder="Tìm theo tên, mã số..."
        searchKey={(item, query) => {
          const row = item as unknown as SalaryRecord;
          return (
            row.employee.name.toLowerCase().includes(query) ||
            row.employee.maSo.toLowerCase().includes(query)
          );
        }}
        emptyMessage="Không có dữ liệu lương"
      />
    </div>
  );
}
