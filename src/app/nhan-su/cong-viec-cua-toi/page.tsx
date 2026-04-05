"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Target,
  Percent,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Calendar,
  TrendingUp,
  Loader2,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import { formatCurrency } from "@/lib/format";
import { PRIORITY_CONFIG, COLUMN_CONFIG } from "@/lib/career-config";
import {
  getEmployees,
  getTasks,
  updateTaskStatus,
  getEmployeePointStats,
  calculatePromotionReadiness,
  getEmployeeCareer,
  getCareerLevel,
} from "@/lib/supabase-data";

const DEMO_EMP_ID = 8;

type TaskStatus = "todo" | "in_progress" | "review" | "done";
const statusOrder: TaskStatus[] = ["todo", "in_progress", "review", "done"];

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  points: number;
  category: string;
  due_date: string;
  assignee_id: number;
  department: string;
}

interface Employee {
  id: number;
  name: string;
  department: string;
  role: string;
  base_salary: number;
  status: string;
}

interface CareerInfo {
  levelCode: string;
  levelNameVi: string;
  overallReady: boolean;
  avgKPIScore: number;
}

export default function CongViecCuaToiPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState(DEMO_EMP_ID);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(true);
  const [pointStats, setPointStats] = useState({ totalPoints: 0, earnedPoints: 0, taskCount: 0 });
  const [careerInfo, setCareerInfo] = useState<CareerInfo | null>(null);

  const currentEmployee = allEmployees.find((e) => e.id === selectedEmpId);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [emps, empTasks, stats] = await Promise.all([
          getEmployees(),
          getTasks({ assignee_id: selectedEmpId, month_number: currentMonth }),
          getEmployeePointStats(selectedEmpId, currentMonth),
        ]);
        setAllEmployees(emps);
        setTasks(empTasks);
        setPointStats(stats);

        // Load career info
        const [career, readiness] = await Promise.all([
          getEmployeeCareer(selectedEmpId),
          calculatePromotionReadiness(selectedEmpId),
        ]);
        if (career) {
          const level = await getCareerLevel(career.level_code);
          if (level) {
            setCareerInfo({
              levelCode: level.code,
              levelNameVi: level.name_vi,
              overallReady: readiness?.overallReady ?? false,
              avgKPIScore: readiness?.avgKPIScore ?? 0,
            });
          } else {
            setCareerInfo(null);
          }
        } else {
          setCareerInfo(null);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [selectedEmpId, currentMonth]);

  const completedTasks = tasks.filter((t) => t.status === "done").length;
  const totalTasks = tasks.length;
  const scorePercent =
    pointStats.totalPoints > 0
      ? Math.min(Math.round((pointStats.earnedPoints / pointStats.totalPoints) * 100), 100)
      : 0;

  const moveTask = async (taskId: string, direction: "left" | "right") => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const currentIdx = statusOrder.indexOf(task.status as TaskStatus);
    const newIdx = direction === "right" ? currentIdx + 1 : currentIdx - 1;
    if (newIdx < 0 || newIdx >= statusOrder.length) return;
    const newStatus = statusOrder[newIdx];

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

    try {
      await updateTaskStatus(taskId, newStatus);
      // Refresh point stats after status change
      const stats = await getEmployeePointStats(selectedEmpId, currentMonth);
      setPointStats(stats);
    } catch (e) {
      console.error(e);
      // Revert on error
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: task.status } : t))
      );
    }
  };

  const groupedTasks = statusOrder.map((status) => ({
    status,
    config: COLUMN_CONFIG[status],
    tasks: tasks.filter((t) => t.status === status),
  }));

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Công việc của tôi"
        breadcrumbs={[{ label: "Nhân sự" }, { label: "Công việc của tôi" }]}
      />

      {/* User identity banner */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold">
              {currentEmployee?.name?.charAt(0) ?? "?"}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {currentEmployee?.name ?? "---"}
              </h2>
              <p className="text-sm text-slate-500">
                {currentEmployee?.department ?? ""} &middot;{" "}
                {currentEmployee?.role ?? ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Employee selector */}
            <select
              value={selectedEmpId}
              onChange={(e) => setSelectedEmpId(Number(e.target.value))}
              className="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {allEmployees
                .filter((e) => e.status === "active")
                .map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} - {emp.department}
                  </option>
                ))}
            </select>

            {/* Career badge */}
            {careerInfo && (
              <Link
                href={`/nhan-su/career/${selectedEmpId}`}
                className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 rounded-lg px-3 py-2 transition-colors"
              >
                <TrendingUp size={14} className="text-blue-600" />
                <div className="text-left">
                  <p className="text-xs font-bold text-blue-700">
                    {careerInfo.levelCode} - {careerInfo.levelNameVi}
                  </p>
                  <p className="text-[10px] text-blue-500">
                    {careerInfo.overallReady
                      ? "Đủ ĐK thăng tiến"
                      : `KPI: ${careerInfo.avgKPIScore}%`}
                  </p>
                </div>
              </Link>
            )}

            {/* Month filter */}
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Calendar className="w-4 h-4" />
              <select
                value={currentMonth}
                onChange={(e) => setCurrentMonth(Number(e.target.value))}
                className="border border-slate-300 rounded-lg px-2 py-1.5 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    Tháng {m}/2026
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={Target}
          label="Điểm đạt được"
          value={`${pointStats.earnedPoints.toLocaleString()} / ${pointStats.totalPoints.toLocaleString()}`}
          color="blue"
        />
        <StatCard
          icon={Percent}
          label="% Hoàn thành điểm"
          value={`${scorePercent}%`}
          color="green"
        />
        <StatCard
          icon={CheckCircle2}
          label="Hoàn thành"
          value={`${completedTasks}/${totalTasks} task`}
          color="orange"
        />
        <StatCard
          icon={Target}
          label="Tổng điểm tháng"
          value={formatCurrency(pointStats.totalPoints)}
          color="purple"
        />
      </div>

      {/* Task list */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <h3 className="text-base font-bold text-slate-900 mb-4">
          Danh sách công việc &mdash; Tháng {currentMonth}
        </h3>

        <div className="space-y-5">
          {groupedTasks.map(({ status, config, tasks: sectionTasks }) => (
            <div key={status}>
              {/* Section header */}
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${config.bgHeader} mb-2`}
              >
                <span className={`text-sm font-semibold ${config.color}`}>
                  {config.label}
                </span>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full bg-white/70 ${config.color}`}
                >
                  {sectionTasks.length}
                </span>
              </div>

              {/* Task items */}
              {sectionTasks.length === 0 ? (
                <p className="text-sm text-slate-300 italic pl-3 py-2">
                  Không có công việc
                </p>
              ) : (
                <div className="space-y-2">
                  {sectionTasks.map((task) => {
                    const pConfig =
                      PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
                    const statusIdx = statusOrder.indexOf(
                      task.status as TaskStatus
                    );
                    return (
                      <div
                        key={task.id}
                        className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border border-slate-100 hover:border-slate-200 bg-slate-50/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">
                            {task.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span
                              className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${pConfig.bg} ${pConfig.color}`}
                            >
                              {pConfig.label}
                            </span>
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                              {task.points} điểm
                            </span>
                            {task.category && (
                              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600">
                                {task.category}
                              </span>
                            )}
                            <span className="text-[11px] text-slate-400">
                              {task.due_date}
                            </span>
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
  );
}
