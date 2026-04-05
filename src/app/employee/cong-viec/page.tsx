"use client";

import { useState, useEffect, useMemo } from 'react';
import { ListChecks, CheckCircle2, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import StatCard from '@/components/StatCard';
import { getEmployees, getTasks, updateTaskStatus } from '@/lib/supabase-data';

const DEMO_EMP_ID = 8;

const statusCols = [
  { key: 'todo', label: 'Chưa làm', color: 'border-slate-300', bg: 'bg-slate-50' },
  { key: 'in_progress', label: 'Đang làm', color: 'border-blue-400', bg: 'bg-blue-50' },
  { key: 'done', label: 'Hoàn thành', color: 'border-green-400', bg: 'bg-green-50' },
];

interface Task {
  id: string; title: string; status: string; priority: string; department: string;
  kpi_metric: string | null; kpi_target: string | null; month_number: number;
  assignee_id: number;
}

export default function MyTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allEmployees, setAllEmployees] = useState<Array<{ id: number; name: string; role: string }>>([]);
  const [selectedEmpId, setSelectedEmpId] = useState(DEMO_EMP_ID);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [emps, allTasks] = await Promise.all([getEmployees(), getTasks()]);
        setAllEmployees(emps);
        setTasks(allTasks.filter((t: Task) => t.assignee_id === selectedEmpId));
      } catch (e) { console.error(e); } finally { setLoading(false); }
    }
    load();
  }, [selectedEmpId]);

  async function moveTask(taskId: string, newStatus: string) {
    await updateTaskStatus(taskId, newStatus);
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
  }

  const done = tasks.filter(t => t.status === 'done').length;
  const inProgress = tasks.filter(t => t.status === 'in_progress').length;
  const todo = tasks.filter(t => t.status === 'todo').length;

  if (loading) {
    return <div className="p-6 flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>;
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="border-b border-slate-200 pb-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Công việc của tôi</h1>
            <p className="text-sm text-slate-500 mt-1">Dữ liệu từ Supabase — {tasks.length} tasks</p>
          </div>
          <select value={selectedEmpId} onChange={e => setSelectedEmpId(Number(e.target.value))}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
            {allEmployees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard icon={ListChecks} label="Tổng tasks" value={tasks.length} color="blue" />
        <StatCard icon={CheckCircle2} label="Hoàn thành" value={done} color="green" />
        <StatCard icon={Clock} label="Đang làm" value={inProgress} color="purple" />
        <StatCard icon={AlertTriangle} label="Chưa làm" value={todo} color="orange" />
      </div>

      {/* Kanban columns */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statusCols.map(col => {
          const colTasks = tasks.filter(t => t.status === col.key);
          return (
            <div key={col.key} className={`rounded-xl border-t-4 ${col.color} ${col.bg} p-3`}>
              <h3 className="text-sm font-bold text-slate-700 mb-3">{col.label} ({colTasks.length})</h3>
              <div className="space-y-2">
                {colTasks.slice(0, 15).map(task => (
                  <div key={task.id} className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm">
                    <p className="text-[12px] font-medium text-slate-800 mb-1.5">{task.title}</p>
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                        task.priority === 'high' ? 'bg-red-100 text-red-700' :
                        task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-500'
                      }`}>{task.priority}</span>
                      {task.kpi_target && <span className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">KH: {task.kpi_target}</span>}
                    </div>
                    {/* Move buttons */}
                    <div className="flex gap-1">
                      {col.key !== 'todo' && (
                        <button onClick={() => moveTask(task.id, col.key === 'done' ? 'in_progress' : 'todo')}
                          className="text-[9px] bg-slate-100 text-slate-600 rounded px-1.5 py-0.5 hover:bg-slate-200">← Lùi</button>
                      )}
                      {col.key !== 'done' && (
                        <button onClick={() => moveTask(task.id, col.key === 'todo' ? 'in_progress' : 'done')}
                          className="text-[9px] bg-blue-100 text-blue-700 rounded px-1.5 py-0.5 hover:bg-blue-200">Tiến →</button>
                      )}
                    </div>
                  </div>
                ))}
                {colTasks.length > 15 && <p className="text-[10px] text-slate-400 text-center">+{colTasks.length - 15} khác</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
