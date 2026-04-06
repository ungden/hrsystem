"use client";

import { useState, useEffect, useMemo } from 'react';
import { CheckCircle2, Clock, AlertTriangle, Loader2, LayoutGrid, Calendar as CalendarIcon, List, ChevronLeft, ChevronRight, GripVertical, Target } from 'lucide-react';
import { getEmployees, updateTaskStatus, getTasksWithActuals, type TaskWithActual, type VarianceStatus } from '@/lib/supabase-data';
import { getSelectedEmpId, setSelectedEmpId as persistEmpId } from '@/lib/employee-context';
import { PRIORITY_CONFIG, COLUMN_CONFIG } from '@/lib/career-config';
import VarianceBadge from '@/components/VarianceBadge';
import PlanActualBar from '@/components/PlanActualBar';
import TaskDetailModal from '@/components/TaskDetailModal';

type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';
type ViewMode = 'kanban' | 'calendar' | 'list';
const statusOrder: TaskStatus[] = ['todo', 'in_progress', 'review', 'done'];

function PriorityDot({ priority }: { priority: string }) {
  const colors: Record<string, string> = { urgent: 'bg-red-500', high: 'bg-orange-400', medium: 'bg-blue-400', low: 'bg-slate-300' };
  return <span className={`inline-block w-2 h-2 rounded-full ${colors[priority] || colors.medium}`} />;
}

export default function MyTasksPage() {
  const [tasks, setTasks] = useState<TaskWithActual[]>([]);
  const [allEmployees, setAllEmployees] = useState<Array<{ id: number; name: string; role: string; department: string }>>([]);
  const [selectedEmpId, setSelectedEmpId] = useState(getSelectedEmpId());
  const [currentMonth, setCurrentMonth] = useState(0); // 0 = all months
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<TaskWithActual | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [emps, allTasks] = await Promise.all([
          getEmployees(),
          getTasksWithActuals({ assignee_id: selectedEmpId }),
        ]);
        setAllEmployees(emps);
        setTasks(allTasks);
      } catch (e) { console.error(e); } finally { setLoading(false); }
    }
    load();
  }, [selectedEmpId]);

  async function moveTask(taskId: string, dir: 'left' | 'right') {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const idx = statusOrder.indexOf(task.status as TaskStatus);
    const newIdx = dir === 'right' ? idx + 1 : idx - 1;
    if (newIdx < 0 || newIdx >= statusOrder.length) return;
    const newStatus = statusOrder[newIdx];
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    try { await updateTaskStatus(taskId, newStatus); } catch {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: task.status } : t));
    }
  }

  const filtered = useMemo(() => currentMonth === 0 ? tasks : tasks.filter(t => t.month_number === currentMonth || !t.month_number), [tasks, currentMonth]);
  const done = filtered.filter(t => t.status === 'done').length;
  const inProgress = filtered.filter(t => t.status === 'in_progress' || t.status === 'review').length;
  const todo = filtered.filter(t => t.status === 'todo').length;

  // KPI achievement stats
  const tasksWithKPI = filtered.filter(t => t.kpi_target);
  const kpiAchievement = useMemo(() => {
    if (tasksWithKPI.length === 0) return null;
    let totalTarget = 0, totalActual = 0;
    tasksWithKPI.forEach(t => {
      const tgt = parseFloat(String(t.kpi_target).replace(/[^0-9.]/g, ''));
      if (!isNaN(tgt) && tgt > 0) {
        totalTarget += tgt;
        totalActual += t.actualTotal || 0;
      }
    });
    return totalTarget > 0 ? Math.round((totalActual / totalTarget) * 100) : null;
  }, [filtered]);

  if (loading) {
    return <div className="p-6 flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>;
  }

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Công việc của tôi</h1>
          <p className="text-[11px] text-slate-500 mt-0.5">{filtered.length} tasks {currentMonth > 0 ? `· T${currentMonth}/2026` : '· Tất cả'}</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={selectedEmpId} onChange={e => { const v = Number(e.target.value); setSelectedEmpId(v); persistEmpId(v); }}
            className="text-[11px] bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5">
            {allEmployees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <select value={currentMonth} onChange={e => setCurrentMonth(Number(e.target.value))}
            className="text-[11px] bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5">
            <option value={0}>Tất cả</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>T{m}/2026</option>
            ))}
          </select>
          <div className="flex bg-slate-100 rounded-lg p-0.5">
            {([
              { key: 'kanban' as const, icon: LayoutGrid },
              { key: 'calendar' as const, icon: CalendarIcon },
              { key: 'list' as const, icon: List },
            ]).map(({ key, icon: Icon }) => (
              <button key={key} onClick={() => setViewMode(key)}
                className={`p-1.5 rounded-md transition-colors ${viewMode === key ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
                <Icon className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className={`grid ${kpiAchievement !== null ? 'grid-cols-5' : 'grid-cols-4'} gap-3 mb-5`}>
        <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
          <p className="text-lg font-bold text-slate-800">{filtered.length}</p>
          <p className="text-[10px] text-slate-500">Tổng</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
          <p className="text-lg font-bold text-green-600">{done}</p>
          <p className="text-[10px] text-slate-500">Xong</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
          <p className="text-lg font-bold text-blue-600">{inProgress}</p>
          <p className="text-[10px] text-slate-500">Đang làm</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
          <p className="text-lg font-bold text-orange-500">{todo}</p>
          <p className="text-[10px] text-slate-500">Chờ làm</p>
        </div>
        {kpiAchievement !== null && (
          <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
            <p className={`text-lg font-bold ${kpiAchievement >= 90 ? 'text-green-600' : kpiAchievement >= 70 ? 'text-blue-600' : 'text-red-500'}`}>{kpiAchievement}%</p>
            <p className="text-[10px] text-slate-500">KPI đạt</p>
            <div className="mt-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${kpiAchievement >= 90 ? 'bg-green-500' : kpiAchievement >= 70 ? 'bg-blue-500' : 'bg-red-400'}`} style={{ width: `${Math.min(kpiAchievement, 100)}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Kanban View */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {statusOrder.map(status => {
            const config = COLUMN_CONFIG[status];
            const colTasks = filtered.filter(t => t.status === status);
            return (
              <div key={status} className={`rounded-xl border ${config.bgHeader} min-h-[250px]`}>
                <div className="px-3 py-2 border-b border-slate-200/60 flex items-center justify-between">
                  <span className={`text-xs font-bold ${config.color}`}>{config.label}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/80 ${config.color}`}>{colTasks.length}</span>
                </div>
                <div className="p-2 space-y-2 max-h-[500px] overflow-y-auto">
                  {colTasks.map(task => {
                    const pConfig = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
                    const idx = statusOrder.indexOf(task.status as TaskStatus);
                    return (
                      <div key={task.id} className="bg-white rounded-lg border border-slate-200 p-2.5 shadow-sm hover:shadow-md transition-shadow group cursor-pointer" onClick={() => setSelectedTask(task)}>
                        <div className="flex items-start justify-between gap-1">
                          <p className="text-[12px] font-medium text-slate-800 leading-tight flex-1">{task.title}</p>
                          {task.points > 0 && <span className="text-[9px] font-bold bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full flex-shrink-0">{task.points}đ</span>}
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
                          <div className="flex items-center gap-1">
                            <span className={`text-[9px] px-1.5 py-0.5 rounded ${pConfig.bg} ${pConfig.color}`}>{pConfig.label}</span>
                            {task.kpi_target && <VarianceBadge status={task.varianceStatus} size="xs" />}
                          </div>
                          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={e => { e.stopPropagation(); moveTask(task.id, 'left'); }} disabled={idx === 0}
                              className="p-0.5 rounded hover:bg-slate-100 disabled:opacity-20"><ChevronLeft className="w-3 h-3" /></button>
                            <button onClick={e => { e.stopPropagation(); moveTask(task.id, 'right'); }} disabled={idx === statusOrder.length - 1}
                              className="p-0.5 rounded hover:bg-slate-100 disabled:opacity-20"><ChevronRight className="w-3 h-3" /></button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {colTasks.length === 0 && <p className="text-[11px] text-slate-300 text-center py-6 italic">Trống</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Calendar View */}
      {viewMode === 'calendar' && (() => {
        const year = 2026;
        const firstDay = new Date(year, currentMonth - 1, 1);
        const daysInMonth = new Date(year, currentMonth, 0).getDate();
        const startDow = firstDay.getDay();
        const tasksByDay = new Map<number, TaskWithActual[]>();
        filtered.forEach(t => {
          if (!t.due_date) return;
          const d = new Date(t.due_date);
          if (d.getMonth() + 1 === currentMonth) {
            const day = d.getDate();
            if (!tasksByDay.has(day)) tasksByDay.set(day, []);
            tasksByDay.get(day)!.push(t);
          }
        });
        const today = new Date();
        const isCurrentMonth = today.getMonth() + 1 === currentMonth && today.getFullYear() === year;
        const todayDate = today.getDate();
        return (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
              {['CN','T2','T3','T4','T5','T6','T7'].map(d => (
                <div key={d} className="text-[10px] font-bold text-slate-500 text-center py-2">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {Array.from({ length: startDow }).map((_, i) => <div key={`e${i}`} className="min-h-[70px] border-b border-r border-slate-100 bg-slate-50/30" />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dayTasks = tasksByDay.get(day) || [];
                const isToday = isCurrentMonth && day === todayDate;
                return (
                  <div key={day} className={`min-h-[70px] border-b border-r border-slate-100 p-1 ${isToday ? 'bg-blue-50/50' : ''}`}>
                    <span className={`text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>{day}</span>
                    <div className="space-y-0.5 mt-0.5">
                      {dayTasks.slice(0, 3).map(t => (
                        <div key={t.id} className={`text-[8px] px-1 py-0.5 rounded truncate ${t.status === 'done' ? 'bg-green-100 text-green-700 line-through' : 'bg-blue-100 text-blue-700'}`}>
                          <PriorityDot priority={t.priority} /> {t.title}
                        </div>
                      ))}
                      {dayTasks.length > 3 && <span className="text-[8px] text-slate-400 pl-1">+{dayTasks.length - 3}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {[...filtered].sort((a, b) => statusOrder.indexOf(a.status as TaskStatus) - statusOrder.indexOf(b.status as TaskStatus)).map(task => {
            const pConfig = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
            const colConfig = COLUMN_CONFIG[task.status] || COLUMN_CONFIG.todo;
            const statusBadge: Record<string, string> = { done: 'bg-green-100 text-green-700', in_progress: 'bg-blue-100 text-blue-700', review: 'bg-purple-100 text-purple-700', todo: 'bg-slate-100 text-slate-600' };
            const idx = statusOrder.indexOf(task.status as TaskStatus);
            return (
              <div key={task.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => setSelectedTask(task)}>
                <GripVertical className="w-3 h-3 text-slate-300" />
                <PriorityDot priority={task.priority} />
                <p className={`text-[12px] font-medium flex-1 min-w-0 truncate ${task.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{task.title}</p>
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium ${statusBadge[task.status] || statusBadge.todo}`}>{colConfig.label}</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded ${pConfig.bg} ${pConfig.color}`}>{pConfig.label}</span>
                {task.kpi_target && <VarianceBadge status={task.varianceStatus} size="xs" />}
                {task.due_date && <span className="text-[9px] text-slate-400 w-14 text-right">{new Date(task.due_date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}</span>}
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={e => { e.stopPropagation(); moveTask(task.id, 'left'); }} disabled={idx === 0}
                    className="p-0.5 rounded hover:bg-slate-200 disabled:opacity-20"><ChevronLeft className="w-3.5 h-3.5" /></button>
                  <button onClick={e => { e.stopPropagation(); moveTask(task.id, 'right'); }} disabled={idx === statusOrder.length - 1}
                    className="p-0.5 rounded hover:bg-slate-200 disabled:opacity-20"><ChevronRight className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
          employees={allEmployees.map(e => ({ id: e.id, name: e.name, department: e.department || '' }))}
          onClose={() => setSelectedTask(null)}
          onUpdate={async () => {
            const updatedTasks = await getTasksWithActuals({ assignee_id: selectedEmpId });
            setTasks(updatedTasks);
            setSelectedTask(null);
          }}
        />
      )}
    </div>
  );
}
