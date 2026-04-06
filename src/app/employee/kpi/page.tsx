"use client";

import { useState, useEffect, useMemo } from 'react';
import { Target, TrendingUp, CheckCircle2, Loader2 } from 'lucide-react';
import StatCard from '@/components/StatCard';
import ProgressRing from '@/components/agents/ProgressRing';
import VarianceBadge from '@/components/VarianceBadge';
import PlanActualBar from '@/components/PlanActualBar';
import { getEmployees, getKPIs, getTasksWithActuals, type TaskWithActual } from '@/lib/supabase-data';
import { getSelectedEmpId, setSelectedEmpId as persistEmpId } from '@/lib/employee-context';

export default function MyKPIPage() {
  const [employee, setEmployee] = useState<{ id: number; name: string; role: string; department: string } | null>(null);
  const [tasks, setTasks] = useState<TaskWithActual[]>([]);
  const [kpis, setKPIs] = useState<Array<{ id: number; title: string; target: number; current: number; progress: number; status: string; department: string }>>([]);
  const [allEmployees, setAllEmployees] = useState<Array<{ id: number; name: string; department: string }>>([]);
  const [selectedEmpId, setSelectedEmpId] = useState(getSelectedEmpId());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [emps, allTasks, allKPIs] = await Promise.all([
          getEmployees(),
          getTasksWithActuals({ assignee_id: selectedEmpId }),
          getKPIs(),
        ]);
        setAllEmployees(emps);
        const emp = emps.find((e: { id: number }) => e.id === selectedEmpId);
        setEmployee(emp || null);
        setTasks(allTasks);
        setKPIs(allKPIs.filter((k: { department: string }) => k.department === emp?.department));
      } catch (e) { console.error(e); } finally { setLoading(false); }
    }
    load();
  }, [selectedEmpId]);

  // All hooks must be called before any early return
  const done = tasks.filter(t => t.status === 'done').length;
  const rate = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;
  const tasksWithKPI = tasks.filter(t => t.kpi_metric);

  const kpiAchievement = useMemo(() => {
    let totalTarget = 0, totalActual = 0;
    tasksWithKPI.forEach(t => {
      const tgt = parseFloat(String(t.kpi_target).replace(/[^0-9.]/g, ''));
      if (!isNaN(tgt) && tgt > 0) {
        totalTarget += tgt;
        totalActual += t.actualTotal || 0;
      }
    });
    return totalTarget > 0 ? Math.round((totalActual / totalTarget) * 100) : 0;
  }, [tasks]);

  const byMonth = useMemo(() => {
    const map = new Map<number, TaskWithActual[]>();
    tasks.forEach(t => {
      const m = t.month_number || 0;
      const arr = map.get(m) || [];
      arr.push(t);
      map.set(m, arr);
    });
    return map;
  }, [tasks]);

  if (loading) {
    return <div className="p-6 flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>;
  }

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

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <StatCard icon={Target} label="Tasks có KPI" value={tasksWithKPI.length} color="blue" />
        <StatCard icon={CheckCircle2} label="Hoàn thành" value={`${done}/${tasks.length}`} color="green" />
        <StatCard icon={TrendingUp} label="Tỷ lệ xong" value={`${rate}%`} color="purple" />
        <StatCard icon={TrendingUp} label="KPI đạt" value={`${kpiAchievement}%`} color={kpiAchievement >= 90 ? 'green' : kpiAchievement >= 70 ? 'blue' : 'red'} />
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
          {tasksWithKPI.map(task => {
            const targetNum = parseFloat(String(task.kpi_target).replace(/[^0-9.]/g, '')) || 0;
            return (
              <div key={task.id} className={`rounded-lg border p-3 ${task.status === 'done' ? 'bg-green-50/50 border-green-200' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${task.status === 'done' ? 'bg-green-500' : 'bg-slate-300'}`} />
                  <p className="text-[12px] font-medium text-slate-800 flex-1">{task.title}</p>
                  <VarianceBadge status={task.varianceStatus} size="xs" />
                </div>
                <div className="flex gap-2 mt-1.5 ml-4 items-center">
                  <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">KH: {task.kpi_target} {task.kpi_unit || ''}</span>
                  {task.actualTotal !== null && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">TT: {task.actualTotal} {task.kpi_unit || ''}</span>
                  )}
                  <span className="text-[10px] text-slate-400">{task.kpi_metric}</span>
                </div>
                {targetNum > 0 && (
                  <div className="ml-4 mt-1.5 max-w-[250px]">
                    <PlanActualBar target={targetNum} actual={task.actualTotal} status={task.varianceStatus} />
                  </div>
                )}
              </div>
            );
          })}
          {tasksWithKPI.length === 0 && <p className="text-sm text-slate-400 text-center py-4">Chưa có task nào có KPI target.</p>}
        </div>
      </div>

      {/* Monthly breakdown */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5">
        <h2 className="text-base font-semibold text-slate-800 mb-4">Tiến độ theo tháng</h2>
        <div className="space-y-3">
          {[...byMonth.entries()].sort((a, b) => a[0] - b[0]).map(([month, monthTasks]) => {
            const d = monthTasks.filter(t => t.status === 'done').length;
            const completionPct = monthTasks.length > 0 ? Math.round((d / monthTasks.length) * 100) : 0;
            // KPI achievement for this month
            const monthKPI = monthTasks.filter(t => t.kpi_target);
            let kpiPct = 0;
            if (monthKPI.length > 0) {
              let tgt = 0, act = 0;
              monthKPI.forEach(t => {
                const tv = parseFloat(String(t.kpi_target).replace(/[^0-9.]/g, ''));
                if (!isNaN(tv) && tv > 0) { tgt += tv; act += t.actualTotal || 0; }
              });
              kpiPct = tgt > 0 ? Math.round((act / tgt) * 100) : 0;
            }
            return (
              <div key={month}>
                <div className="flex items-center gap-3">
                  <span className="text-[12px] font-medium text-slate-600 w-16">{month > 0 ? `T${month}/2026` : 'Khác'}</span>
                  <div className="flex-1">
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${completionPct >= 50 ? 'bg-emerald-500' : 'bg-blue-400'}`} style={{ width: `${completionPct}%` }} />
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500 w-24 text-right">{d}/{monthTasks.length} xong ({completionPct}%)</span>
                </div>
                {monthKPI.length > 0 && (
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="w-16" />
                    <div className="flex-1">
                      <div className="h-1.5 bg-slate-50 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${kpiPct >= 90 ? 'bg-green-400' : kpiPct >= 70 ? 'bg-blue-400' : 'bg-orange-400'}`} style={{ width: `${Math.min(kpiPct, 100)}%` }} />
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 w-24 text-right">KPI: {kpiPct}%</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
