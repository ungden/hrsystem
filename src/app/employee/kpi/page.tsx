"use client";

import { useState, useEffect } from 'react';
import { Target, TrendingUp, CheckCircle2, Loader2 } from 'lucide-react';
import StatCard from '@/components/StatCard';
import ProgressRing from '@/components/agents/ProgressRing';
import { getEmployees, getTasks, getKPIs } from '@/lib/supabase-data';
import { getSelectedEmpId, setSelectedEmpId as persistEmpId } from '@/lib/employee-context';

export default function MyKPIPage() {
  const [employee, setEmployee] = useState<{ id: number; name: string; role: string; department: string } | null>(null);
  const [tasks, setTasks] = useState<Array<{ id: string; title: string; status: string; kpi_metric: string | null; kpi_target: string | null; kpi_unit: string | null; month_number: number }>>([]);
  const [kpis, setKPIs] = useState<Array<{ id: number; title: string; target: number; current: number; progress: number; status: string; department: string }>>([]);
  const [allEmployees, setAllEmployees] = useState<Array<{ id: number; name: string; department: string }>>([]);
  const [selectedEmpId, setSelectedEmpId] = useState(getSelectedEmpId());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [emps, allTasks, allKPIs] = await Promise.all([getEmployees(), getTasks(), getKPIs()]);
        setAllEmployees(emps);
        const emp = emps.find((e: { id: number }) => e.id === selectedEmpId);
        setEmployee(emp || null);
        setTasks(allTasks.filter((t: { assignee_id: number }) => t.assignee_id === selectedEmpId));
        setKPIs(allKPIs.filter((k: { department: string }) => k.department === emp?.department));
      } catch (e) { console.error(e); } finally { setLoading(false); }
    }
    load();
  }, [selectedEmpId]);

  if (loading) {
    return <div className="p-6 flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>;
  }

  const done = tasks.filter(t => t.status === 'done').length;
  const rate = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;
  const tasksWithKPI = tasks.filter(t => t.kpi_metric);

  // Group by month
  const byMonth = new Map<number, typeof tasks>();
  tasks.forEach(t => {
    const m = t.month_number || 0;
    const arr = byMonth.get(m) || [];
    arr.push(t);
    byMonth.set(m, arr);
  });

  return (
    <div className="p-4 sm:p-6">
      <div className="border-b border-slate-200 pb-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">KPI & Mục tiêu</h1>
            <p className="text-sm text-slate-500 mt-1">Dữ liệu từ Supabase — {tasks.length} tasks, {kpis.length} KPIs phòng ban</p>
          </div>
          <select value={selectedEmpId} onChange={e => { persistEmpId(Number(e.target.value)); setSelectedEmpId(Number(e.target.value)); }}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
            {allEmployees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard icon={Target} label="Tasks có KPI" value={tasksWithKPI.length} color="blue" />
        <StatCard icon={CheckCircle2} label="Hoàn thành" value={`${done}/${tasks.length}`} color="green" />
        <StatCard icon={TrendingUp} label="Tỷ lệ" value={`${rate}%`} color="purple" />
        <StatCard icon={Target} label="KPIs PB" value={kpis.length} color="orange" />
      </div>

      {/* Department KPIs */}
      {kpis.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 mb-6">
          <h2 className="text-base font-semibold text-slate-800 mb-4">KPI Phòng {employee?.department}</h2>
          <div className="space-y-3">
            {kpis.map(kpi => {
              const pct = kpi.target > 0 ? Math.round((kpi.current / kpi.target) * 100) : 0;
              return (
                <div key={kpi.id} className="flex items-center gap-3">
                  <ProgressRing percent={pct} size={36} strokeWidth={3} color={pct >= 80 ? '#10b981' : '#3b82f6'} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-slate-800 truncate">{kpi.title}</p>
                    <div className="flex gap-3 text-[11px] text-slate-500">
                      <span>Target: {new Intl.NumberFormat('vi-VN').format(kpi.target)}</span>
                      <span>Hiện tại: {new Intl.NumberFormat('vi-VN').format(kpi.current)}</span>
                    </div>
                  </div>
                  <span className={`text-[11px] font-bold ${pct >= 80 ? 'text-green-600' : pct >= 50 ? 'text-blue-600' : 'text-orange-600'}`}>{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tasks with KPI targets */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 mb-6">
        <h2 className="text-base font-semibold text-slate-800 mb-4">Tasks có KPI Target ({tasksWithKPI.length})</h2>
        <div className="space-y-2">
          {tasksWithKPI.map(task => (
            <div key={task.id} className={`rounded-lg border p-3 ${task.status === 'done' ? 'bg-green-50/50 border-green-200' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${task.status === 'done' ? 'bg-green-500' : 'bg-slate-300'}`} />
                <p className="text-[12px] font-medium text-slate-800 flex-1">{task.title}</p>
              </div>
              <div className="flex gap-2 mt-1 ml-4">
                <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">KH: {task.kpi_target} {task.kpi_unit || ''}</span>
                <span className="text-[10px] text-slate-400">{task.kpi_metric}</span>
              </div>
            </div>
          ))}
          {tasksWithKPI.length === 0 && <p className="text-sm text-slate-400 text-center py-4">Chưa có task nào có KPI target.</p>}
        </div>
      </div>

      {/* Monthly breakdown */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5">
        <h2 className="text-base font-semibold text-slate-800 mb-4">Tiến độ theo tháng</h2>
        <div className="space-y-2">
          {[...byMonth.entries()].sort((a, b) => a[0] - b[0]).map(([month, monthTasks]) => {
            const d = monthTasks.filter(t => t.status === 'done').length;
            const p = monthTasks.length > 0 ? Math.round((d / monthTasks.length) * 100) : 0;
            return (
              <div key={month} className="flex items-center gap-3">
                <span className="text-[12px] font-medium text-slate-600 w-16">T{month}/2026</span>
                <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${p >= 30 ? 'bg-emerald-500' : 'bg-blue-400'}`} style={{ width: `${p}%` }} />
                </div>
                <span className="text-[11px] text-slate-500 w-20 text-right">{d}/{monthTasks.length} ({p}%)</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
