"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Target,
  Percent,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  TrendingUp,
  Loader2,
  LayoutGrid,
  List,
  GripVertical,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { PRIORITY_CONFIG, COLUMN_CONFIG } from "@/lib/career-config";
import {
  getEmployees,
  updateTaskStatus,
  getEmployeePointStats,
  calculatePromotionReadiness,
  getEmployeeCareer,
  getCareerLevel,
  getTasksWithActuals,
  type TaskWithActual,
} from "@/lib/supabase-data";
import TaskDetailModal from "@/components/TaskDetailModal";
import { getSelectedEmpId, setSelectedEmpId as persistEmpId } from '@/lib/employee-context';
import VarianceBadge from '@/components/VarianceBadge';
import PlanActualBar from '@/components/PlanActualBar';

type TaskStatus = "todo" | "in_progress" | "review" | "done";
type ViewMode = "kanban" | "calendar" | "list";
const statusOrder: TaskStatus[] = ["todo", "in_progress", "review", "done"];

type Task = TaskWithActual;

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

// ─── Priority dot ───
function PriorityDot({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    urgent: 'bg-red-500', high: 'bg-orange-400', medium: 'bg-blue-400', low: 'bg-slate-300',
  };
  return <span className={`inline-block w-2 h-2 rounded-full ${colors[priority] || colors.medium}`} />;
}

// ─── Compact task card (used in Kanban + Calendar) ───
function TaskCard({ task, onMove, onSelect }: { task: Task; onMove: (id: string, dir: "left" | "right") => void; onSelect?: (task: Task) => void }) {
  const pConfig = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const statusIdx = statusOrder.indexOf(task.status as TaskStatus);
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-2.5 shadow-sm hover:shadow-md transition-shadow group cursor-pointer" onClick={() => onSelect?.(task)}>
      <div className="flex items-start justify-between gap-1">
        <p className="text-[12px] font-medium text-slate-800 leading-tight flex-1">{task.title}</p>
        {task.points > 0 && (
          <span className="text-[9px] font-bold bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full flex-shrink-0">
            {task.points}đ
          </span>
        )}
      </div>
      {task.kpi_target && (
        <div className="mt-1.5">
          <PlanActualBar
            target={parseFloat(String(task.kpi_target).replace(/[^0-9.]/g, '')) || 0}
            actual={task.actualTotal}
            status={task.varianceStatus}
          />
        </div>
      )}
      <div className="flex items-center justify-between mt-1.5">
        <div className="flex items-center gap-1.5">
          <span className={`text-[9px] px-1.5 py-0.5 rounded ${pConfig.bg} ${pConfig.color}`}>
            {pConfig.label}
          </span>
          {task.kpi_target && <VarianceBadge status={task.varianceStatus} size="xs" />}
        </div>
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={e => { e.stopPropagation(); onMove(task.id, "left"); }} disabled={statusIdx === 0}
            className="p-0.5 rounded hover:bg-slate-100 disabled:opacity-20"><ChevronLeft className="w-3 h-3" /></button>
          <button onClick={e => { e.stopPropagation(); onMove(task.id, "right"); }} disabled={statusIdx === statusOrder.length - 1}
            className="p-0.5 rounded hover:bg-slate-100 disabled:opacity-20"><ChevronRight className="w-3 h-3" /></button>
        </div>
      </div>
    </div>
  );
}

// ─── Kanban View ───
function KanbanView({ tasks, onMove, onSelect }: { tasks: Task[]; onMove: (id: string, dir: "left" | "right") => void; onSelect?: (task: Task) => void }) {
  const columns = statusOrder.map(status => ({
    status,
    config: COLUMN_CONFIG[status],
    tasks: tasks.filter(t => t.status === status),
  }));

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {columns.map(({ status, config, tasks: colTasks }) => (
        <div key={status} className={`rounded-xl border ${config.bgHeader} min-h-[300px]`}>
          <div className="px-3 py-2.5 border-b border-slate-200/60">
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold ${config.color}`}>{config.label}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/80 ${config.color}`}>
                {colTasks.length}
              </span>
            </div>
          </div>
          <div className="p-2 space-y-2 max-h-[600px] overflow-y-auto">
            {colTasks.map(task => (
              <TaskCard key={task.id} task={task} onMove={onMove} onSelect={onSelect} />
            ))}
            {colTasks.length === 0 && (
              <p className="text-[11px] text-slate-300 text-center py-8 italic">Trống</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Calendar View ───
function CalendarView({ tasks, month, year, onMove, onSelect }: {
  tasks: Task[]; month: number; year: number;
  onMove: (id: string, dir: "left" | "right") => void;
  onSelect?: (task: Task) => void;
}) {
  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const startDow = firstDay.getDay(); // 0=Sun

  // Group tasks by day of month (from due_date)
  const tasksByDay = useMemo(() => {
    const map = new Map<number, Task[]>();
    tasks.forEach(t => {
      if (!t.due_date) return;
      const d = new Date(t.due_date);
      if (d.getMonth() + 1 === month && d.getFullYear() === year) {
        const day = d.getDate();
        if (!map.has(day)) map.set(day, []);
        map.get(day)!.push(t);
      }
    });
    return map;
  }, [tasks, month, year]);

  // Tasks without due_date
  const noDueDateTasks = tasks.filter(t => {
    if (!t.due_date) return true;
    const d = new Date(t.due_date);
    return d.getMonth() + 1 !== month || d.getFullYear() !== year;
  });

  const today = new Date();
  const isCurrentMonth = today.getMonth() + 1 === month && today.getFullYear() === year;
  const todayDate = today.getDate();

  const weekdays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

  return (
    <div>
      {/* Calendar grid */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
          {weekdays.map(d => (
            <div key={d} className="text-[10px] font-bold text-slate-500 text-center py-2">{d}</div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7">
          {/* Empty cells before first day */}
          {Array.from({ length: startDow }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[80px] border-b border-r border-slate-100 bg-slate-50/30" />
          ))}

          {/* Day cells */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dayTasks = tasksByDay.get(day) || [];
            const isToday = isCurrentMonth && day === todayDate;
            const isPast = isCurrentMonth && day < todayDate;

            return (
              <div key={day} className={`min-h-[80px] border-b border-r border-slate-100 p-1 ${isToday ? 'bg-blue-50/50' : isPast ? 'bg-slate-50/30' : ''}`}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className={`text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full ${
                    isToday ? 'bg-blue-600 text-white' : 'text-slate-500'
                  }`}>
                    {day}
                  </span>
                  {dayTasks.length > 0 && (
                    <span className="text-[8px] font-bold text-slate-400">{dayTasks.length}</span>
                  )}
                </div>
                <div className="space-y-0.5">
                  {dayTasks.slice(0, 3).map(task => {
                    const statusColors: Record<string, string> = {
                      done: 'bg-green-100 text-green-700 line-through',
                      in_progress: 'bg-blue-100 text-blue-700',
                      review: 'bg-purple-100 text-purple-700',
                      todo: 'bg-slate-100 text-slate-600',
                    };
                    return (
                      <div key={task.id}
                        className={`text-[9px] px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80 ${statusColors[task.status] || statusColors.todo}`}
                        title={`${task.title} (${task.points}đ)`}
                        onClick={() => onSelect?.(task)}
                      >
                        <PriorityDot priority={task.priority} /> {task.title}
                      </div>
                    );
                  })}
                  {dayTasks.length > 3 && (
                    <span className="text-[8px] text-slate-400 pl-1">+{dayTasks.length - 3}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tasks without due date */}
      {noDueDateTasks.length > 0 && (
        <div className="mt-4 bg-white rounded-xl border border-slate-200 p-3">
          <h4 className="text-xs font-bold text-slate-500 mb-2">Chưa có deadline ({noDueDateTasks.length})</h4>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {noDueDateTasks.slice(0, 12).map(task => (
              <TaskCard key={task.id} task={task} onMove={onMove} onSelect={onSelect} />
            ))}
          </div>
          {noDueDateTasks.length > 12 && (
            <p className="text-[10px] text-slate-400 text-center mt-2">+{noDueDateTasks.length - 12} tasks khác</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Compact List View ───
function ListView({ tasks, onMove, onSelect }: { tasks: Task[]; onMove: (id: string, dir: "left" | "right") => void; onSelect?: (task: Task) => void }) {
  const [sortBy, setSortBy] = useState<'status' | 'priority' | 'points'>('status');

  const sorted = useMemo(() => {
    const copy = [...tasks];
    if (sortBy === 'status') {
      copy.sort((a, b) => statusOrder.indexOf(a.status as TaskStatus) - statusOrder.indexOf(b.status as TaskStatus));
    } else if (sortBy === 'priority') {
      const pOrder = ['urgent', 'high', 'medium', 'low'];
      copy.sort((a, b) => pOrder.indexOf(a.priority) - pOrder.indexOf(b.priority));
    } else {
      copy.sort((a, b) => (b.points || 0) - (a.points || 0));
    }
    return copy;
  }, [tasks, sortBy]);

  const statusBadge: Record<string, string> = {
    done: 'bg-green-100 text-green-700',
    in_progress: 'bg-blue-100 text-blue-700',
    review: 'bg-purple-100 text-purple-700',
    todo: 'bg-slate-100 text-slate-600',
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200">
      {/* Sort bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100 bg-slate-50/50">
        <span className="text-[10px] text-slate-400 font-medium">Sắp xếp:</span>
        {(['status', 'priority', 'points'] as const).map(key => (
          <button key={key} onClick={() => setSortBy(key)}
            className={`text-[10px] px-2 py-1 rounded-full font-medium transition-colors ${
              sortBy === key ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-100'
            }`}>
            {key === 'status' ? 'Trạng thái' : key === 'priority' ? 'Ưu tiên' : 'Điểm'}
          </button>
        ))}
        <span className="ml-auto text-[10px] text-slate-400">{tasks.length} tasks</span>
      </div>

      {/* Task rows */}
      <div className="divide-y divide-slate-100">
        {sorted.map(task => {
          const pConfig = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
          const colConfig = COLUMN_CONFIG[task.status] || COLUMN_CONFIG.todo;
          const statusIdx = statusOrder.indexOf(task.status as TaskStatus);
          return (
            <div key={task.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => onSelect?.(task)}>
              <GripVertical className="w-3 h-3 text-slate-300 flex-shrink-0" />
              <PriorityDot priority={task.priority} />
              <p className={`text-[12px] font-medium flex-1 min-w-0 truncate ${task.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                {task.title}
              </p>
              <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${statusBadge[task.status] || statusBadge.todo}`}>
                {colConfig.label}
              </span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded flex-shrink-0 ${pConfig.bg} ${pConfig.color}`}>
                {pConfig.label}
              </span>
              {task.kpi_target && <VarianceBadge status={task.varianceStatus} size="xs" />}
              {task.points > 0 && (
                <span className="text-[9px] font-bold text-yellow-600 w-8 text-right flex-shrink-0">{task.points}đ</span>
              )}
              {task.due_date && (
                <span className="text-[9px] text-slate-400 w-16 text-right flex-shrink-0">
                  {new Date(task.due_date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                </span>
              )}
              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <button onClick={e => { e.stopPropagation(); onMove(task.id, "left"); }} disabled={statusIdx === 0}
                  className="p-0.5 rounded hover:bg-slate-200 disabled:opacity-20"><ChevronLeft className="w-3.5 h-3.5" /></button>
                <button onClick={e => { e.stopPropagation(); onMove(task.id, "right"); }} disabled={statusIdx === statusOrder.length - 1}
                  className="p-0.5 rounded hover:bg-slate-200 disabled:opacity-20"><ChevronRight className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Page ───
export default function CongViecCuaToiPage() {
  const [tasks, setTasks] = useState<TaskWithActual[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState(getSelectedEmpId());
  const [currentMonth, setCurrentMonth] = useState(0); // 0 = all months
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [loading, setLoading] = useState(true);
  const [pointStats, setPointStats] = useState({ totalPoints: 0, earnedPoints: 0, taskCount: 0 });
  const [careerInfo, setCareerInfo] = useState<CareerInfo | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskWithActual | null>(null);

  const currentEmployee = allEmployees.find((e) => e.id === selectedEmpId);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [emps, empTasks, stats] = await Promise.all([
          getEmployees(),
          getTasksWithActuals({ assignee_id: selectedEmpId }),
          getEmployeePointStats(selectedEmpId, currentMonth || undefined),
        ]);
        setAllEmployees(emps);
        setTasks(empTasks);
        setPointStats(stats);

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
          } else setCareerInfo(null);
        } else setCareerInfo(null);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [selectedEmpId, currentMonth]);

  // Client-side filter by month (0 = show all)
  const filtered = useMemo(() =>
    currentMonth === 0 ? tasks : tasks.filter(t => t.month_number === currentMonth || !t.month_number),
    [tasks, currentMonth]
  );

  const completedTasks = filtered.filter((t) => t.status === "done").length;
  const totalTasks = filtered.length;
  const scorePercent = pointStats.totalPoints > 0
    ? Math.min(Math.round((pointStats.earnedPoints / pointStats.totalPoints) * 100), 100)
    : 0;
  const inProgress = filtered.filter(t => t.status === 'in_progress' || t.status === 'review').length;

  const moveTask = async (taskId: string, direction: "left" | "right") => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const currentIdx = statusOrder.indexOf(task.status as TaskStatus);
    const newIdx = direction === "right" ? currentIdx + 1 : currentIdx - 1;
    if (newIdx < 0 || newIdx >= statusOrder.length) return;
    const newStatus = statusOrder[newIdx];

    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
    try {
      await updateTaskStatus(taskId, newStatus);
      const stats = await getEmployeePointStats(selectedEmpId, currentMonth || undefined);
      setPointStats(stats);
    } catch (e) {
      console.error(e);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: task.status } : t)));
    }
  };

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

      {/* Top bar: employee + filters + view toggle */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          {/* Left: employee info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold">
              {currentEmployee?.name?.charAt(0) ?? "?"}
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">{currentEmployee?.name ?? "---"}</h2>
              <p className="text-[11px] text-slate-500">{currentEmployee?.department} &middot; {currentEmployee?.role}</p>
            </div>
            {careerInfo && (
              <Link href={`/nhan-su/career/${selectedEmpId}`}
                className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 rounded-lg px-2.5 py-1.5 transition-colors ml-2">
                <TrendingUp size={12} className="text-blue-600" />
                <span className="text-[10px] font-bold text-blue-700">{careerInfo.levelCode}</span>
              </Link>
            )}
          </div>

          {/* Right: controls */}
          <div className="flex items-center gap-2">
            <select value={selectedEmpId}
              onChange={(e) => { const id = Number(e.target.value); setSelectedEmpId(id); persistEmpId(id); }}
              className="text-[11px] border border-slate-200 rounded-lg px-2 py-1.5 bg-white">
              {allEmployees.filter(e => e.status === "Đang làm việc").map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>

            <select value={currentMonth} onChange={(e) => setCurrentMonth(Number(e.target.value))}
              className="text-[11px] border border-slate-200 rounded-lg px-2 py-1.5 bg-white">
              <option value={0}>Tất cả</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>T{m}/2026</option>
              ))}
            </select>

            {/* View mode toggle */}
            <div className="flex bg-slate-100 rounded-lg p-0.5">
              {([
                { key: 'kanban' as const, icon: LayoutGrid, label: 'Kanban' },
                { key: 'calendar' as const, icon: CalendarIcon, label: 'Lịch' },
                { key: 'list' as const, icon: List, label: 'Danh sách' },
              ]).map(({ key, icon: Icon, label }) => (
                <button key={key} onClick={() => setViewMode(key)}
                  title={label}
                  className={`p-1.5 rounded-md transition-colors ${
                    viewMode === key ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'
                  }`}>
                  <Icon className="w-3.5 h-3.5" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick stats bar */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
          <p className="text-lg font-bold text-blue-600">{scorePercent}%</p>
          <p className="text-[10px] text-slate-500">Điểm đạt</p>
          <div className="mt-1.5 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${scorePercent}%` }} />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
          <p className="text-lg font-bold text-green-600">{completedTasks}/{totalTasks}</p>
          <p className="text-[10px] text-slate-500">Hoàn thành</p>
          <div className="mt-1.5 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: totalTasks > 0 ? `${Math.round(completedTasks / totalTasks * 100)}%` : '0%' }} />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
          <p className="text-lg font-bold text-amber-600">{inProgress}</p>
          <p className="text-[10px] text-slate-500">Đang làm</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
          <p className="text-lg font-bold text-slate-800">{pointStats.earnedPoints.toLocaleString()}</p>
          <p className="text-[10px] text-slate-500">/{pointStats.totalPoints.toLocaleString()} điểm</p>
        </div>
      </div>

      {/* View content */}
      {viewMode === "kanban" && <KanbanView tasks={filtered} onMove={moveTask} onSelect={setSelectedTask} />}
      {viewMode === "calendar" && currentMonth > 0 && <CalendarView tasks={filtered} month={currentMonth} year={2026} onMove={moveTask} onSelect={setSelectedTask} />}
      {viewMode === "calendar" && currentMonth === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <CalendarIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">Chọn tháng cụ thể để xem lịch</p>
        </div>
      )}
      {viewMode === "list" && <ListView tasks={filtered} onMove={moveTask} onSelect={setSelectedTask} />}

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={{
            id: selectedTask.id,
            title: selectedTask.title,
            description: selectedTask.description,
            status: selectedTask.status,
            priority: selectedTask.priority,
            assignee_id: selectedTask.assignee_id,
            due_date: selectedTask.due_date,
            points: selectedTask.points,
            category: selectedTask.category,
            department: selectedTask.department,
            links: selectedTask.links,
          }}
          employees={allEmployees.map(e => ({ id: e.id, name: e.name, department: e.department }))}
          onClose={() => setSelectedTask(null)}
          onUpdate={async () => {
            const [updatedTasks, stats] = await Promise.all([
              getTasksWithActuals({ assignee_id: selectedEmpId }),
              getEmployeePointStats(selectedEmpId, currentMonth || undefined),
            ]);
            setTasks(updatedTasks);
            setPointStats(stats);
            setSelectedTask(null);
          }}
        />
      )}
    </div>
  );
}
