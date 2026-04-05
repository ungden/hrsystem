"use client";

import { useState, useMemo } from "react";
import {
  CalendarCheck,
  FileBarChart,
  Download,
  Upload,
  FileSpreadsheet,
  Search,
} from "lucide-react";
import {
  generateAttendanceData,
  statusColors,
  statusLabels,
  formatCurrency,
} from "@/lib/mock-data";

import PageHeader from "@/components/PageHeader";

type ViewTab = "chamcong" | "baocao";

const legendItems = [
  { symbol: "✓", label: "Có mặt", color: "text-green-500", bg: "bg-green-50" },
  { symbol: "M", label: "Đi muộn", color: "text-orange-500", bg: "bg-orange-50" },
  { symbol: "X", label: "Vắng mặt", color: "text-red-500", bg: "bg-red-50" },
  { symbol: "½", label: "Nửa ngày", color: "text-yellow-500", bg: "bg-yellow-50" },
  { symbol: "W", label: "Làm từ xa", color: "text-blue-500", bg: "bg-blue-50" },
  { symbol: "-", label: "Nghỉ", color: "text-slate-400", bg: "bg-slate-50" },
];

export default function ChamCongPage() {
  const [month, setMonth] = useState(2);
  const [year, setYear] = useState(2026);
  const [activeTab, setActiveTab] = useState<ViewTab>("chamcong");
  const [search, setSearch] = useState("");

  const attendanceData = useMemo(
    () => generateAttendanceData(year, month),
    [year, month]
  );

  const daysInMonth = new Date(year, month, 0).getDate();
  const dayHeaders = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const filteredData = attendanceData.filter((d) =>
    d.employee.name.toLowerCase().includes(search.toLowerCase())
  );

  const getDayOfWeek = (day: number) => {
    const date = new Date(year, month - 1, day);
    return date.getDay();
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Chấm công"
        subtitle={`Tháng ${month}/${year}`}
        breadcrumbs={[
          { label: "Nhân sự" },
          { label: "Chấm công" },
        ]}
        actions={
          <>
            <button className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
              <FileSpreadsheet size={15} />
              Bảng công tháng
            </button>
            <button className="flex items-center gap-1.5 border border-slate-300 text-slate-600 px-3 py-2 rounded-lg text-sm hover:bg-slate-50 transition-colors">
              <Upload size={15} />
              Import từ máy
            </button>
            <button className="flex items-center gap-1.5 border border-slate-300 text-slate-600 px-3 py-2 rounded-lg text-sm hover:bg-slate-50 transition-colors">
              <Download size={15} />
              Xuất
            </button>
          </>
        }
      />

      {/* Controls */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {/* Month/Year selectors */}
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
          <button
            onClick={() => setActiveTab("chamcong")}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === "chamcong"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <CalendarCheck size={15} />
            Chấm công
          </button>
          <button
            onClick={() => setActiveTab("baocao")}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === "baocao"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <FileBarChart size={15} />
            Báo cáo
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Tìm nhân viên..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Attendance Legend */}
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        {legendItems.map((item) => (
          <div key={item.symbol} className="flex items-center gap-1.5">
            <span
              className={`inline-flex items-center justify-center w-6 h-6 rounded ${item.bg} ${item.color} text-xs font-bold`}
            >
              {item.symbol}
            </span>
            <span className="text-xs text-slate-500">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Attendance Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="table-container overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="sticky left-0 bg-slate-50 z-10 text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider min-w-[180px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                  Nhân viên
                </th>
                {dayHeaders.map((day) => {
                  const dow = getDayOfWeek(day);
                  const isWeekend = dow === 0 || dow === 6;
                  return (
                    <th
                      key={day}
                      className={`text-center px-1 py-3 text-xs font-medium uppercase tracking-wider min-w-[32px] ${
                        isWeekend
                          ? "text-red-400 bg-red-50/50"
                          : "text-slate-500"
                      }`}
                    >
                      {day}
                    </th>
                  );
                })}
                <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-green-50 min-w-[50px]">
                  Công
                </th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-orange-50 min-w-[50px]">
                  Muộn
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider min-w-[110px]">
                  Thực lĩnh
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((row, idx) => (
                <tr
                  key={row.employee.id}
                  className={`border-b border-slate-100 hover:bg-blue-50/30 transition-colors ${
                    idx % 2 === 0 ? "" : "bg-slate-50/30"
                  }`}
                >
                  <td className="sticky left-0 bg-white z-10 px-4 py-2.5 font-medium text-slate-800 whitespace-nowrap shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-semibold flex-shrink-0">
                        {row.employee.name
                          .split(" ")
                          .slice(-1)[0]
                          .charAt(0)}
                      </div>
                      <span className="text-sm">{row.employee.name}</span>
                    </div>
                  </td>
                  {row.days.map((status, dayIdx) => {
                    const dow = getDayOfWeek(dayIdx + 1);
                    const isWeekend = dow === 0 || dow === 6;
                    return (
                      <td
                        key={dayIdx}
                        className={`text-center px-1 py-2.5 ${
                          isWeekend ? "bg-red-50/30" : ""
                        }`}
                      >
                        {status && (
                          <span
                            className={`text-xs font-semibold ${
                              statusColors[status] || "text-slate-400"
                            }`}
                          >
                            {statusLabels[status]}
                          </span>
                        )}
                      </td>
                    );
                  })}
                  <td className="text-center px-3 py-2.5 font-semibold text-green-600 bg-green-50/30">
                    {row.cong}
                  </td>
                  <td className="text-center px-3 py-2.5">
                    {row.muon > 0 ? (
                      <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] rounded-full bg-orange-100 text-orange-600 text-xs font-semibold px-1.5">
                        {row.muon}
                      </span>
                    ) : (
                      <span className="text-slate-300">0</span>
                    )}
                  </td>
                  <td className="text-right px-4 py-2.5 font-medium text-slate-700 whitespace-nowrap">
                    {formatCurrency(row.luong)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
