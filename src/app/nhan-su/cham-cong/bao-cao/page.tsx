"use client";

import { useState, useMemo } from "react";
import {
  CalendarCheck,
  FileBarChart,
  CalendarDays,
  Clock,
  AlertTriangle,
  DollarSign,
} from "lucide-react";
import {
  generateAttendanceData,
  formatCurrency,
} from "@/lib/mock-data";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import DataTable from "@/components/DataTable";

interface AttendanceRow {
  employee: {
    id: string;
    name: string;
    maSo: string;
    phongBan: string;
  };
  cong: number;
  muon: number;
  nghi: number;
  tienPhat: number;
  [key: string]: unknown;
}

export default function BaoCaoChamCongPage() {
  const [month, setMonth] = useState(2);
  const [year, setYear] = useState(2026);

  const attendanceData = useMemo(
    () => generateAttendanceData(year, month),
    [year, month]
  );

  const totalCong = attendanceData.reduce((sum, d) => sum + d.cong, 0);
  const totalNghi = attendanceData.reduce((sum, d) => sum + d.nghi, 0);
  const totalMuon = attendanceData.reduce((sum, d) => sum + d.muon, 0);
  const totalPhat = attendanceData.reduce((sum, d) => sum + d.tienPhat, 0);

  const tableData: AttendanceRow[] = attendanceData.map((d) => ({
    employee: d.employee,
    cong: d.cong,
    muon: d.muon,
    nghi: d.nghi,
    tienPhat: d.tienPhat,
  }));

  const columns = [
    {
      key: "employee",
      label: "Nhân viên",
      align: "left" as const,
      render: (row: AttendanceRow) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-semibold flex-shrink-0">
            {row.employee.name.split(" ").slice(-1)[0].charAt(0)}
          </div>
          <div>
            <p className="font-medium text-slate-800">{row.employee.name}</p>
            <p className="text-xs text-slate-400">{row.employee.phongBan}</p>
          </div>
        </div>
      ),
    },
    {
      key: "maSo",
      label: "Mã số",
      align: "left" as const,
      render: (row: AttendanceRow) => (
        <span className="text-slate-500">{row.employee.maSo}</span>
      ),
    },
    {
      key: "khongDungGio",
      label: "Không đúng giờ",
      align: "center" as const,
      render: (row: AttendanceRow) =>
        row.muon > 0 ? (
          <span className="text-orange-600 font-medium">{row.muon}</span>
        ) : (
          <span className="text-slate-300">0</span>
        ),
    },
    {
      key: "cong",
      label: "Ngày công",
      align: "center" as const,
      sortable: true,
      render: (row: AttendanceRow) =>
        row.muon > 0 ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
            {row.cong}
          </span>
        ) : (
          <span className="font-medium text-slate-700">{row.cong}</span>
        ),
    },
    {
      key: "nghi",
      label: "Ngày nghỉ",
      align: "center" as const,
      sortable: true,
      render: (row: AttendanceRow) => (
        <span className="text-slate-500">{row.nghi}</span>
      ),
    },
    {
      key: "muon",
      label: "Đi muộn",
      align: "center" as const,
      sortable: true,
      render: (row: AttendanceRow) =>
        row.muon > 0 ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
            {row.muon}
          </span>
        ) : (
          <span className="text-slate-300">0</span>
        ),
    },
    {
      key: "tienPhat",
      label: "Tiền phạt",
      align: "right" as const,
      sortable: true,
      render: (row: AttendanceRow) => (
        <span className={`font-medium ${row.tienPhat > 0 ? "text-red-600" : "text-slate-300"}`}>
          {row.tienPhat > 0 ? formatCurrency(row.tienPhat) : "-"}
        </span>
      ),
    },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="Chấm công"
        subtitle={`Báo cáo tháng ${month}/${year}`}
        breadcrumbs={[
          { label: "Nhân sự" },
          { label: "Chấm công", href: "/nhan-su/cham-cong" },
          { label: "Báo cáo" },
        ]}
      />

      {/* Controls */}
      <div className="flex items-center gap-3 mb-6">
        <select
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {[2024, 2025, 2026].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>

        {/* Tabs */}
        <div className="flex bg-slate-100 rounded-lg p-0.5 ml-4">
          <Link
            href="/nhan-su/cham-cong"
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
          >
            <CalendarCheck size={15} />
            Chấm công
          </Link>
          <button
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium bg-white text-slate-900 shadow-sm transition-colors"
          >
            <FileBarChart size={15} />
            Báo cáo
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={CalendarDays}
          label="Tổng ngày công"
          value={Math.round(totalCong)}
          color="blue"
        />
        <StatCard
          icon={Clock}
          label="Ngày nghỉ"
          value={totalNghi}
          color="green"
        />
        <StatCard
          icon={AlertTriangle}
          label="Số lần đi muộn"
          value={totalMuon}
          color="orange"
        />
        <StatCard
          icon={DollarSign}
          label="Tổng tiền phạt"
          value={formatCurrency(totalPhat)}
          color="red"
        />
      </div>

      {/* Data Table */}
      <DataTable<AttendanceRow>
        columns={columns}
        data={tableData}
        pageSize={10}
        searchable
        searchPlaceholder="Tìm nhân viên..."
        searchKey={(item, query) =>
          item.employee.name.toLowerCase().includes(query) ||
          item.employee.maSo.toLowerCase().includes(query)
        }
        emptyMessage="Không tìm thấy nhân viên"
      />
    </div>
  );
}
