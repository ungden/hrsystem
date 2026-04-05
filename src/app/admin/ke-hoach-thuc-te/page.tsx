"use client";

import { useState, useEffect, useMemo } from 'react';
import { TrendingUp, BarChart3, CheckCircle2, AlertTriangle, Loader2, Target } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import { getEmployees, getTasks, getDailyReports, getTaskSubmissions } from '@/lib/supabase-data';

function formatCurrency(n: number) {
  return new Intl.NumberFormat('vi-VN').format(n);
}

interface PlanVsActualRow {
  task_id: string;
  task_title: string;
  employee_name: string;
  department: string;
  kpi_metric: string;
  kpi_target: string;
  kpi_unit: string;
  actual_value: string | null;
  status: 'exceeded' | 'met' | 'below' | 'missing';
}

interface DeptSummary {
  department: string;
  totalTasks: number;
  tasksWithTarget: number;
  tasksReported: number;
  reportRate: number;
}

export default function PlanVsActualPage() {
  const [rows, setRows] = useState<PlanVsActualRow[]>([]);
  const [deptSummaries, setDeptSummaries] = useState<DeptSummary[]>([]);
  const [reports, setReports] = useState<Array<{ id: string; employee_id: number; status: string; report_date: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [deptFilter, setDeptFilter] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [employees, tasks, allReports] = await Promise.all([
          getEmployees(),
          getTasks(),
          getDailyReports(),
        ]);

        setReports(allReports);
        const empMap = new Map(employees.map((e: { id: number; name: string; department: string }) => [e.id, e]));

        // Load all submissions from all reports
        const allSubs = new Map<string, { actual_value: string; actual_numeric: number | null }>();
        for (const report of allReports) {
          const subs = await getTaskSubmissions(report.id);
          subs.forEach((s: { task_id: string; actual_value: string; actual_numeric: number | null }) => {
            if (s.actual_value) allSubs.set(s.task_id, s);
          });
        }

        // Build plan vs actual rows
        const pvRows: PlanVsActualRow[] = [];
        const deptMap = new Map<string, DeptSummary>();

        tasks.forEach((task: { id: string; title: string; assignee_id: number; department: string; kpi_metric: string | null; kpi_target: string | null; kpi_unit: string | null }) => {
          const emp = empMap.get(task.assignee_id) as { name: string; department: string } | undefined;
          const dept = task.department || emp?.department || '';

          // Track dept summary
          if (!deptMap.has(dept)) {
            deptMap.set(dept, { department: dept, totalTasks: 0, tasksWithTarget: 0, tasksReported: 0, reportRate: 0 });
          }
          const ds = deptMap.get(dept)!;
          ds.totalTasks++;

          if (task.kpi_target) {
            ds.tasksWithTarget++;
            const sub = allSubs.get(task.id);
            if (sub?.actual_value) ds.tasksReported++;

            let status: PlanVsActualRow['status'] = 'missing';
            if (sub?.actual_value) {
              // Simple comparison - actual exists
              status = 'met'; // default to met if reported
              if (sub.actual_numeric !== null) {
                const targetNum = parseFloat(String(task.kpi_target).replace(/[^0-9.]/g, ''));
                if (!isNaN(targetNum) && targetNum > 0) {
                  const ratio = sub.actual_numeric / targetNum;
                  if (ratio >= 1.1) status = 'exceeded';
                  else if (ratio >= 0.9) status = 'met';
                  else status = 'below';
                }
              }
            }

            pvRows.push({
              task_id: task.id,
              task_title: task.title,
              employee_name: emp?.name || `NV #${task.assignee_id}`,
              department: dept,
              kpi_metric: task.kpi_metric || '',
              kpi_target: task.kpi_target || '',
              kpi_unit: task.kpi_unit || '',
              actual_value: sub?.actual_value || null,
              status,
            });
          }
        });

        // Compute report rates
        deptMap.forEach(ds => {
          ds.reportRate = ds.tasksWithTarget > 0 ? Math.round((ds.tasksReported / ds.tasksWithTarget) * 100) : 0;
        });

        setRows(pvRows);
        setDeptSummaries([...deptMap.values()].sort((a, b) => b.totalTasks - a.totalTasks));
      } catch (e) {
        console.error('Failed to load plan vs actual:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const departments = [...new Set(rows.map(r => r.department))];
  const filtered = deptFilter ? rows.filter(r => r.department === deptFilter) : rows;
  const reportedCount = filtered.filter(r => r.actual_value).length;
  const exceededCount = filtered.filter(r => r.status === 'exceeded').length;
  const belowCount = filtered.filter(r => r.status === 'below').length;

  const statusColors = {
    exceeded: 'bg-green-100 text-green-700',
    met: 'bg-blue-100 text-blue-700',
    below: 'bg-red-100 text-red-700',
    missing: 'bg-slate-100 text-slate-500',
  };
  const statusLabels = {
    exceeded: 'Vượt KH',
    met: 'Đạt KH',
    below: 'Dưới KH',
    missing: 'Chưa báo cáo',
  };

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
        subtitle={`So sánh plan vs actual — ${filtered.length} tasks có KPI target`}
        breadcrumbs={[
          { label: 'AI Agents', href: '/admin' },
          { label: 'KH vs Thực tế' },
        ]}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Target} label="Tasks có KPI" value={filtered.length} color="blue" />
        <StatCard icon={BarChart3} label="Đã báo cáo" value={`${reportedCount}/${filtered.length}`} color="purple" />
        <StatCard icon={CheckCircle2} label="Vượt/Đạt KH" value={exceededCount} color="green" />
        <StatCard icon={AlertTriangle} label="Dưới KH" value={belowCount} color="red" />
      </div>

      {/* Department summary bars */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <h2 className="text-base font-semibold text-slate-800 mb-4">Tỷ lệ báo cáo theo phòng ban</h2>
        <div className="space-y-3">
          {deptSummaries.map(ds => (
            <div key={ds.department}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[12px] font-medium text-slate-700">{ds.department}</span>
                <span className="text-[11px] text-slate-500">{ds.tasksReported}/{ds.tasksWithTarget} tasks ({ds.reportRate}%)</span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${ds.reportRate >= 50 ? 'bg-emerald-500' : ds.reportRate > 0 ? 'bg-orange-400' : 'bg-slate-300'}`}
                  style={{ width: `${ds.reportRate}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Variance table */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-800">Chi tiết KH vs TT</h2>
          <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm">
            <option value="">Tất cả PB</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] text-slate-500 uppercase tracking-wider border-b-2 border-slate-200">
                <th className="pb-2 pr-2">Task</th>
                <th className="pb-2 pr-2">NV</th>
                <th className="pb-2 pr-2">KPI Metric</th>
                <th className="pb-2 pr-2 text-center">Kế hoạch</th>
                <th className="pb-2 pr-2 text-center">Thực tế</th>
                <th className="pb-2 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 50).map(row => (
                <tr key={row.task_id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="py-2 pr-2 text-[12px] text-slate-700 font-medium max-w-[200px] truncate">{row.task_title}</td>
                  <td className="py-2 pr-2 text-[11px] text-slate-500">{row.employee_name}</td>
                  <td className="py-2 pr-2 text-[11px] text-slate-500">{row.kpi_metric}</td>
                  <td className="py-2 pr-2 text-center">
                    <span className="text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium">
                      {row.kpi_target} {row.kpi_unit}
                    </span>
                  </td>
                  <td className="py-2 pr-2 text-center">
                    {row.actual_value ? (
                      <span className="text-[11px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-medium">
                        {row.actual_value}
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-300">—</span>
                    )}
                  </td>
                  <td className="py-2 text-center">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusColors[row.status]}`}>
                      {statusLabels[row.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length > 50 && (
            <p className="text-xs text-slate-400 text-center mt-3">Hiển thị 50/{filtered.length} tasks</p>
          )}
        </div>
      </div>
    </div>
  );
}
