"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Target, Percent, DollarSign, CheckCircle2, ChevronLeft, ChevronRight, Calendar, TrendingUp } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import {
  employees,
  CURRENT_USER_ID,
  kanbanTasks as initialKanbanTasks,
  calculateEmployeeScores,
  getEmployeeKPITargets,
  calculateKPIBonus,
  generateMonthlyScores,
  formatCurrency,
  columnConfig,
  priorityConfig,
  getCareerLevel,
  getEmployeeCareer,
  calculatePromotionReadiness,
  type KanbanTask,
  type TaskStatus,
} from "@/lib/mock-data";

const statusOrder: TaskStatus[] = ["todo", "in_progress", "review", "done"];

export default function CongViecCuaToiPage() {
  const [tasks, setTasks] = useState<KanbanTask[]>(
    initialKanbanTasks.filter((t) => t.assigneeId === CURRENT_USER_ID)
  );
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentUser = employees.find((e) => e.id === CURRENT_USER_ID)!;

  // Build a full task list with this user's tasks replaced by local state
  const allTasks = useMemo(() => {
    const otherTasks = initialKanbanTasks.filter((t) => t.assigneeId !== CURRENT_USER_ID);
    return [...otherTasks, ...tasks];
  }, [tasks]);

  const scores = calculateEmployeeScores(allTasks);
  const myScore = scores.find((s) => s.employee.id === CURRENT_USER_ID);
  const totalPoints = myScore?.totalPoints ?? 0;
  const scorePercent = myScore?.scorePercent ?? 0;
  const completedTasks = myScore?.completedTasks ?? 0;
  const totalTasks = myScore?.totalTasks ?? 0;

  const kpiTargets = getEmployeeKPITargets(CURRENT_USER_ID);
  const kpiBonus = calculateKPIBonus(kpiTargets);

  const monthlyScores = generateMonthlyScores(CURRENT_USER_ID);

  const moveTask = (taskId: string, direction: "left" | "right") => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const currentIdx = statusOrder.indexOf(t.status);
        const newIdx = direction === "right" ? currentIdx + 1 : currentIdx - 1;
        if (newIdx < 0 || newIdx >= statusOrder.length) return t;
        return { ...t, status: statusOrder[newIdx] };
      })
    );
  };

  const groupedTasks = statusOrder.map((status) => ({
    status,
    config: columnConfig[status],
    tasks: tasks.filter((t) => t.status === status),
  }));

  return (
    <div>
      <PageHeader
        title="Công việc của tôi"
        breadcrumbs={[{ label: "Nhân sự" }, { label: "Công việc của tôi" }]}
      />

      {/* User identity banner */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold">
              {currentUser.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{currentUser.name}</h2>
              <p className="text-sm text-slate-500">
                {currentUser.phongBan} &middot; {currentUser.chucVu}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {(() => {
              const career = getEmployeeCareer(CURRENT_USER_ID);
              const level = career ? getCareerLevel(career.levelCode) : null;
              const readiness = calculatePromotionReadiness(CURRENT_USER_ID);
              if (!level) return null;
              return (
                <Link href={`/nhan-su/career/${CURRENT_USER_ID}`}
                  className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 rounded-lg px-3 py-2 transition-colors">
                  <TrendingUp size={14} className="text-blue-600" />
                  <div className="text-left">
                    <p className="text-xs font-bold text-blue-700">{level.code} - {level.nameVi}</p>
                    <p className="text-[10px] text-blue-500">
                      {readiness?.overallReady ? "Đủ ĐK thăng tiến" : `KPI: ${readiness?.avgKPIScore || 0}%`}
                    </p>
                  </div>
                </Link>
              );
            })()}
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Calendar className="w-4 h-4" />
              <span>Tháng 3/2026</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={Target}
          label="Điểm hiện tại"
          value={`${totalPoints.toLocaleString()} / 10.000`}
          color="blue"
        />
        <StatCard
          icon={Percent}
          label="% Lương"
          value={`${scorePercent}%`}
          color="green"
        />
        <StatCard
          icon={DollarSign}
          label="Thưởng KPI"
          value={formatCurrency(kpiBonus)}
          color="purple"
        />
        <StatCard
          icon={CheckCircle2}
          label="Hoàn thành"
          value={`${completedTasks}/${totalTasks} task`}
          color="orange"
        />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left column - Task list */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h3 className="text-base font-bold text-slate-900 mb-4">Danh sách công việc</h3>

            <div className="space-y-5">
              {groupedTasks.map(({ status, config, tasks: sectionTasks }) => (
                <div key={status}>
                  {/* Section header */}
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${config.bgHeader} mb-2`}>
                    <span className={`text-sm font-semibold ${config.color}`}>{config.label}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full bg-white/70 ${config.color}`}>
                      {sectionTasks.length}
                    </span>
                  </div>

                  {/* Task items */}
                  {sectionTasks.length === 0 ? (
                    <p className="text-sm text-slate-300 italic pl-3 py-2">Không có công việc</p>
                  ) : (
                    <div className="space-y-2">
                      {sectionTasks.map((task) => {
                        const pConfig = priorityConfig[task.priority];
                        const statusIdx = statusOrder.indexOf(task.status);
                        return (
                          <div
                            key={task.id}
                            className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border border-slate-100 hover:border-slate-200 bg-slate-50/50 transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-800 truncate">{task.title}</p>
                              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${pConfig.bg} ${pConfig.color}`}>
                                  {pConfig.label}
                                </span>
                                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                                  {task.points} điểm
                                </span>
                                <span className="text-[11px] text-slate-400">{task.dueDate}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button
                                onClick={() => moveTask(task.id, "left")}
                                disabled={statusIdx === 0}
                                className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                              >
                                <ChevronLeft className="w-4 h-4 text-slate-500" />
                              </button>
                              <button
                                onClick={() => moveTask(task.id, "right")}
                                disabled={statusIdx === statusOrder.length - 1}
                                className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                              >
                                <ChevronRight className="w-4 h-4 text-slate-500" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Score progress chart */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h3 className="text-base font-bold text-slate-900 mb-4">Tiến độ điểm</h3>
            {mounted ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={monthlyScores}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#94a3b8" }} />
                  <YAxis domain={[0, 10000]} tick={{ fontSize: 12, fill: "#94a3b8" }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                    }}
                    formatter={(value: number, name: string) => [
                      value.toLocaleString(),
                      name === "myScore" ? "Của tôi" : "TB Team",
                    ]}
                  />
                  <Legend
                    formatter={(value: string) => (value === "myScore" ? "Của tôi" : "TB Team")}
                  />
                  <Line
                    type="monotone"
                    dataKey="myScore"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 4, fill: "#3b82f6" }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="teamAvg"
                    stroke="#94a3b8"
                    strokeWidth={2}
                    dot={{ r: 4, fill: "#94a3b8" }}
                    activeDot={{ r: 6 }}
                    strokeDasharray="5 5"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[260px] flex items-center justify-center text-sm text-slate-400">
                Đang tải biểu đồ...
              </div>
            )}
          </div>

          {/* KPI Bonus table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h3 className="text-base font-bold text-slate-900 mb-4">Thưởng KPI</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 pr-2 text-slate-500 font-medium">KPI</th>
                    <th className="text-right py-2 px-2 text-slate-500 font-medium">Mục tiêu</th>
                    <th className="text-right py-2 px-2 text-slate-500 font-medium">Thực tế</th>
                    <th className="text-right py-2 px-2 text-slate-500 font-medium">Vượt</th>
                    <th className="text-right py-2 pl-2 text-slate-500 font-medium">Thưởng</th>
                  </tr>
                </thead>
                <tbody>
                  {kpiTargets.map((t) => {
                    const vuot = t.actualValue - t.targetValue;
                    const isPositive = vuot > 0;
                    let bonus = 0;
                    if (isPositive) {
                      bonus = vuot * t.bonusPercent;
                    }
                    return (
                      <tr key={t.id} className="border-b border-slate-100">
                        <td className="py-2 pr-2 text-slate-700">{t.name}</td>
                        <td className="py-2 px-2 text-right text-slate-600">
                          {t.targetValue.toLocaleString()} {t.unit}
                        </td>
                        <td className="py-2 px-2 text-right text-slate-600">
                          {t.actualValue.toLocaleString()} {t.unit}
                        </td>
                        <td
                          className={`py-2 px-2 text-right font-medium ${
                            isPositive ? "text-green-600" : "text-red-500"
                          }`}
                        >
                          {isPositive ? `+${vuot.toLocaleString()}` : vuot === 0 ? "-" : vuot.toLocaleString()}
                        </td>
                        <td className="py-2 pl-2 text-right text-slate-700">
                          {bonus > 0 ? formatCurrency(bonus) : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-300">
                    <td colSpan={4} className="py-2 text-right font-bold text-slate-800">
                      Tổng thưởng
                    </td>
                    <td className="py-2 pl-2 text-right font-bold text-purple-600">
                      {formatCurrency(kpiBonus)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
