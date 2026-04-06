"use client";

import { useState, useEffect, useMemo } from 'react';
import { TrendingUp, BarChart3, CheckCircle2, AlertTriangle, Loader2, Target } from 'lucide-react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import VarianceBadge from '@/components/VarianceBadge';
import { getEmployees, getTasksWithActuals, type TaskWithActual, type VarianceStatus } from '@/lib/supabase-data';
import { getSlugFromDept } from '@/lib/department-utils';

interface DeptSummary {
  department: string;
  totalTasks: number;
  tasksWithTarget: number;
  tasksReported: number;
  reportRate: number;
  kpiAchievement: number;
}

const varianceColors: Record<VarianceStatus, string> = {
  exceeded: '#10b981', met: '#3b82f6', near: '#f59e0b', below: '#ef4444', missing: '#94a3b8',
};

export default function PlanVsActualPage() {
  const [tasks, setTasks] = useState<TaskWithActual[]>([]);
  const [employees, setEmployees] = useState<Array<{ id: number; name: string; department: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [deptFilter, setDeptFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState(0); // 0 = all

  useEffect(() => {
    async function load() {
      try {
        const [emps, allTasks] = await Promise.all([
          getEmployees(),
          getTasksWithActuals(), // Single efficient fetch — no N+1
        ]);
        setEmployees(emps);
        setTasks(allTasks);
      } catch (e) {
        console.error('Failed to load plan vs actual:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const empMap = useMemo(() => new Map(employees.map(e => [e.id, e])), [employees]);

  // Filter tasks with KPI targets
  const kpiTasks = useMemo(() => {
    let result = tasks.filter(t => t.kpi_target);
    if (deptFilter) result = result.filter(t => t.department === deptFilter);
    if (monthFilter > 0) result = result.filter(t => t.month_number === monthFilter || !t.month_number);
    return result;
  }, [tasks, deptFilter, monthFilter]);

  // Department summaries
  const deptSummaries = useMemo(() => {
    const deptMap = new Map<string, DeptSummary>();
    const allKPI = tasks.filter(t => t.kpi_target);

    allKPI.forEach(task => {
      const dept = task.department || '';
      if (!deptMap.has(dept)) {
        deptMap.set(dept, { department: dept, totalTasks: 0, tasksWithTarget: 0, tasksReported: 0, reportRate: 0, kpiAchievement: 0 });
      }
      const ds = deptMap.get(dept)!;
      ds.totalTasks++;
      ds.tasksWithTarget++;
      if (task.actualTotal !== null) ds.tasksReported++;
    });

    deptMap.forEach(ds => {
      ds.reportRate = ds.tasksWithTarget > 0 ? Math.round((ds.tasksReported / ds.tasksWithTarget) * 100) : 0;
      // KPI achievement
      const deptTasks = allKPI.filter(t => t.department === ds.department);
      let tgt = 0, act = 0;
      deptTasks.forEach(t => {
        const tv = parseFloat(String(t.kpi_target).replace(/[^0-9.]/g, ''));
        if (!isNaN(tv) && tv > 0) { tgt += tv; act += t.actualTotal || 0; }
      });
      ds.kpiAchievement = tgt > 0 ? Math.round((act / tgt) * 100) : 0;
    });

    return [...deptMap.values()].sort((a, b) => b.totalTasks - a.totalTasks);
  }, [tasks]);

  // Stats
  const reportedCount = kpiTasks.filter(r => r.actualTotal !== null).length;
  const exceededCount = kpiTasks.filter(r => r.varianceStatus === 'exceeded').length;
  const metCount = kpiTasks.filter(r => r.varianceStatus === 'met').length;
  const belowCount = kpiTasks.filter(r => r.varianceStatus === 'below' || r.varianceStatus === 'near').length;
  const missingCount = kpiTasks.filter(r => r.varianceStatus === 'missing').length;

  // Pie chart data
  const pieData = [
    { name: 'Vượt KH', value: exceededCount, color: varianceColors.exceeded },
    { name: 'Đạt KH', value: metCount, color: varianceColors.met },
    { name: 'Dưới KH', value: belowCount, color: varianceColors.below },
    { name: 'Chưa BC', value: missingCount, color: varianceColors.missing },
  ].filter(d => d.value > 0);

  // Bar chart: dept KPI achievement
  const barData = deptSummaries.map(ds => ({
    name: ds.department,
    achievement: ds.kpiAchievement,
    reportRate: ds.reportRate,
  }));

  const departments = [...new Set(tasks.map(t => t.department).filter(Boolean))];

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-3 text-slate-500">Đang phân tích KH vs TT...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Kế hoạch vs Thực tế"
        subtitle={`So sánh plan vs actual — ${kpiTasks.length} tasks có KPI target`}
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'KH vs Thực tế' },
        ]}
      />

      {/* Filters */}
      <div className="flex items-center gap-2 mb-5">
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
          className="text-[11px] bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
          <option value="">Tất cả PB</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={monthFilter} onChange={e => setMonthFilter(Number(e.target.value))}
          className="text-[11px] bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
          <option value={0}>Tất cả tháng</option>
          {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
            <option key={m} value={m}>T{m}/2026</option>
          ))}
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <StatCard icon={Target} label="Tasks có KPI" value={kpiTasks.length} color="blue" />
        <StatCard icon={BarChart3} label="Đã báo cáo" value={`${reportedCount}/${kpiTasks.length}`} color="purple" />
        <StatCard icon={CheckCircle2} label="Vượt KH" value={exceededCount} color="green" />
        <StatCard icon={TrendingUp} label="Đạt KH" value={metCount} color="blue" />
        <StatCard icon={AlertTriangle} label="Dưới KH" value={belowCount} color="red" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Bar: KPI Achievement per department */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-800 mb-3">KPI Achievement theo PB</h3>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical">
                <XAxis type="number" domain={[0, 'auto']} tick={{ fontSize: 10 }} tickFormatter={v => `${v}%`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Bar dataKey="achievement" name="KPI %" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                  {barData.map((entry, i) => (
                    <Cell key={i} fill={entry.achievement >= 90 ? '#10b981' : entry.achievement >= 70 ? '#3b82f6' : '#f59e0b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie: variance distribution */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-800 mb-3">Phân bổ kết quả</h3>
          <div className="h-[200px] flex items-center">
            <div className="w-1/2 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={70} innerRadius={40} isAnimationActive={false}>
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-1/2 space-y-2 pl-2">
              {pieData.map(d => (
                <div key={d.name} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-[11px] text-slate-600">{d.name}</span>
                  <span className="text-[11px] font-bold text-slate-800 ml-auto">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Department summary bars */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-slate-800 mb-4">Tỷ lệ báo cáo & KPI theo phòng ban</h2>
        <div className="space-y-4">
          {deptSummaries.map(ds => {
            const slug = getSlugFromDept(ds.department);
            return (
              <div key={ds.department}>
                <div className="flex items-center justify-between mb-1">
                  <Link href={`/admin/phong-ban/${slug}`} className="text-[12px] font-medium text-blue-700 hover:underline">
                    {ds.department}
                  </Link>
                  <div className="flex gap-3">
                    <span className="text-[10px] text-slate-500">BC: {ds.tasksReported}/{ds.tasksWithTarget} ({ds.reportRate}%)</span>
                    <span className={`text-[10px] font-bold ${ds.kpiAchievement >= 90 ? 'text-green-600' : ds.kpiAchievement >= 70 ? 'text-blue-600' : 'text-orange-600'}`}>
                      KPI: {ds.kpiAchievement}%
                    </span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden" title="Tỷ lệ báo cáo">
                    <div
                      className={`h-full rounded-full transition-all ${ds.reportRate >= 50 ? 'bg-emerald-500' : ds.reportRate > 0 ? 'bg-orange-400' : 'bg-slate-300'}`}
                      style={{ width: `${ds.reportRate}%` }}
                    />
                  </div>
                  <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden" title="KPI Achievement">
                    <div
                      className={`h-full rounded-full transition-all ${ds.kpiAchievement >= 90 ? 'bg-green-500' : ds.kpiAchievement >= 70 ? 'bg-blue-500' : 'bg-orange-400'}`}
                      style={{ width: `${Math.min(ds.kpiAchievement, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="flex gap-1 mt-0.5">
                  <span className="flex-1 text-[8px] text-slate-400 text-center">Báo cáo</span>
                  <span className="flex-1 text-[8px] text-slate-400 text-center">KPI</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Variance table */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-800">Chi tiết KH vs TT ({kpiTasks.length})</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] text-slate-500 uppercase tracking-wider border-b-2 border-slate-200">
                <th className="pb-2 pr-2">Task</th>
                <th className="pb-2 pr-2">NV</th>
                <th className="pb-2 pr-2">PB</th>
                <th className="pb-2 pr-2">KPI Metric</th>
                <th className="pb-2 pr-2 text-center">Kế hoạch</th>
                <th className="pb-2 pr-2 text-center">Thực tế</th>
                <th className="pb-2 pr-2 text-center">Variance</th>
                <th className="pb-2 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {kpiTasks.slice(0, 100).map(task => {
                const emp = empMap.get(task.assignee_id);
                const targetNum = parseFloat(String(task.kpi_target).replace(/[^0-9.]/g, ''));
                const variancePct = targetNum > 0 && task.actualTotal !== null
                  ? Math.round(((task.actualTotal - targetNum) / targetNum) * 100)
                  : null;

                return (
                  <tr key={task.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="py-2 pr-2 text-[12px] text-slate-700 font-medium max-w-[200px] truncate">{task.title}</td>
                    <td className="py-2 pr-2 text-[11px] text-slate-500">{emp?.name || `#${task.assignee_id}`}</td>
                    <td className="py-2 pr-2 text-[10px] text-slate-400">{task.department}</td>
                    <td className="py-2 pr-2 text-[11px] text-slate-500">{task.kpi_metric}</td>
                    <td className="py-2 pr-2 text-center">
                      <span className="text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium">
                        {task.kpi_target} {task.kpi_unit || ''}
                      </span>
                    </td>
                    <td className="py-2 pr-2 text-center">
                      {task.actualTotal !== null ? (
                        <span className="text-[11px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-medium">
                          {task.actualTotal} {task.kpi_unit || ''}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-300">—</span>
                      )}
                    </td>
                    <td className="py-2 pr-2 text-center">
                      {variancePct !== null ? (
                        <span className={`text-[11px] font-bold ${variancePct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {variancePct > 0 ? '+' : ''}{variancePct}%
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-300">—</span>
                      )}
                    </td>
                    <td className="py-2 text-center">
                      <VarianceBadge status={task.varianceStatus} size="xs" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {kpiTasks.length > 100 && (
            <p className="text-xs text-slate-400 text-center mt-3">Hiển thị 100/{kpiTasks.length} tasks</p>
          )}
        </div>
      </div>
    </div>
  );
}
