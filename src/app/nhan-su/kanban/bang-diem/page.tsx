"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Users, BarChart3, Award, AlertTriangle } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import DataTable from "@/components/DataTable";
import StatusBadge from "@/components/StatusBadge";
import {
  employees,
  calculateEmployeeScores,
  kanbanTasks,
  departments,
  EmployeeScore,
} from "@/lib/mock-data";

export default function BangDiemPage() {
  const [filterDepartment, setFilterDepartment] = useState("");

  const scores = useMemo(
    () => calculateEmployeeScores(kanbanTasks),
    []
  );

  const filteredScores = useMemo(() => {
    if (!filterDepartment) return scores;
    return scores.filter((s) => s.employee.phongBan === filterDepartment);
  }, [scores, filterDepartment]);

  const totalEmployees = filteredScores.length;
  const avgScore =
    totalEmployees > 0
      ? Math.round(
          filteredScores.reduce((sum, s) => sum + s.scorePercent, 0) / totalEmployees
        )
      : 0;
  const passCount = filteredScores.filter((s) => s.scorePercent >= 80).length;
  const failCount = filteredScores.filter((s) => s.scorePercent < 80).length;

  const getScoreColor = (percent: number) => {
    if (percent >= 80) return "text-green-600";
    if (percent >= 50) return "text-orange-500";
    return "text-red-500";
  };

  const getBarColor = (percent: number) => {
    if (percent >= 80) return "bg-green-500";
    if (percent >= 50) return "bg-orange-400";
    return "bg-red-500";
  };

  const columns = useMemo(
    () => [
      {
        key: "employee",
        label: "Nhân viên",
        width: "220px",
        render: (row: EmployeeScore) => (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-semibold flex-shrink-0">
              {row.employee.name.split(" ").slice(-1)[0].charAt(0)}
            </div>
            <div>
              <p className="font-medium text-slate-800">
                {row.employee.name}
              </p>
              <p className="text-xs text-slate-400">{row.employee.phongBan}</p>
            </div>
          </div>
        ),
      },
      {
        key: "tasks",
        label: "Task",
        align: "center" as const,
        render: (row: EmployeeScore) => (
          <span className="text-slate-700">
            {row.completedTasks}/{row.totalTasks}
          </span>
        ),
      },
      {
        key: "totalPoints",
        label: "Điểm",
        align: "center" as const,
        sortable: true,
        render: (row: EmployeeScore) => (
          <span className="font-bold text-slate-800">{row.totalPoints.toLocaleString()} / 10.000</span>
        ),
      },
      {
        key: "progress",
        label: "Tiến độ",
        width: "160px",
        render: (row: EmployeeScore) => (
          <div className="w-full">
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className={`h-full rounded-full ${getBarColor(row.scorePercent)} transition-all`}
                style={{ width: `${row.scorePercent}%` }}
              />
            </div>
          </div>
        ),
      },
      {
        key: "scorePercent",
        label: "Tỷ lệ %",
        align: "center" as const,
        sortable: true,
        render: (row: EmployeeScore) => (
          <span className={`font-semibold ${getScoreColor(row.scorePercent)}`}>
            {row.scorePercent}%
          </span>
        ),
      },
      {
        key: "salaryPercent",
        label: "% Lương",
        align: "center" as const,
        render: (row: EmployeeScore) => (
          <span className={`font-semibold ${getScoreColor(row.salaryPercent)}`}>
            {row.salaryPercent}%
          </span>
        ),
      },
      {
        key: "status",
        label: "Trạng thái",
        align: "center" as const,
        render: (row: EmployeeScore) => (
          <StatusBadge
            status={row.scorePercent >= 80 ? "du_diem" : "chua_du"}
          />
        ),
      },
    ],
    []
  );

  return (
    <div className="p-6">
      <PageHeader
        title="Bảng điểm KPI"
        breadcrumbs={[
          { label: "Nhân sự" },
          { label: "Giao việc", href: "/nhan-su/kanban" },
          { label: "Bảng điểm" },
        ]}
      />

      {/* Tab switcher */}
      <div className="mb-6 flex items-center gap-4">
        <div className="inline-flex bg-slate-100 rounded-lg p-1">
          <Link
            href="/nhan-su/kanban"
            className="px-4 py-2 rounded-md text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
          >
            Kanban board
          </Link>
          <span className="px-4 py-2 rounded-md text-sm font-medium bg-white text-slate-900 shadow-sm">
            Bảng điểm
          </span>
        </div>

        <select
          value={filterDepartment}
          onChange={(e) => setFilterDepartment(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Tất cả phòng ban</option>
          {departments.map((dept) => (
            <option key={dept} value={dept}>
              {dept}
            </option>
          ))}
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={Users}
          label="Tổng nhân viên"
          value={totalEmployees}
          color="blue"
        />
        <StatCard
          icon={BarChart3}
          label="Điểm trung bình"
          value={`${avgScore}%`}
          color="green"
        />
        <StatCard
          icon={Award}
          label="Đủ điểm ≥80"
          value={passCount}
          color="purple"
        />
        <StatCard
          icon={AlertTriangle}
          label="Chưa đủ <80"
          value={failCount}
          color="red"
        />
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={filteredScores as unknown as Record<string, unknown>[]}
        pageSize={10}
        searchable
        searchPlaceholder="Tìm theo tên nhân viên..."
        searchKey={(item, query) => {
          const row = item as unknown as EmployeeScore;
          return row.employee.name.toLowerCase().includes(query);
        }}
        emptyMessage="Không có dữ liệu bảng điểm"
      />
    </div>
  );
}
