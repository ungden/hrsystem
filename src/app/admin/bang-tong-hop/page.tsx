"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Users, Target, CheckCircle2, Loader2, Filter } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import VarianceBadge from '@/components/VarianceBadge';
import PlanActualBar from '@/components/PlanActualBar';
import { getEmployees, getTasksWithActuals, getDailyReports, getTaskSubmissions, type TaskWithActual, type VarianceStatus } from '@/lib/supabase-data';
import { getSlugFromDept } from '@/lib/department-utils';

interface Employee {
  id: number;
  name: string;
  department: string;
  role: string;
  status: string;
}

interface DailyReport {
  id: string;
  employee_id: number;
  report_date: string;
  status: string;
  submitted_at: string | null;
  reviewed_by: number | null;
}

interface Submission {
  task_id: string;
  actual_value: string;
  actual_numeric: number | null;
  notes: string | null;
}

interface SubmissionRow {
  employee: Employee;
  report: DailyReport;
  task: TaskWithActual;
  submission: Submission;
}

export default function ConsolidatedSummaryPage() {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tasks, setTasks] = useState<TaskWithActual[]>([]);
  const [rows, setRows] = useState<SubmissionRow[]>([]);
  const [filterDept, setFilterDept] = useState('all');
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    async function load() {
      try {
        const [emps, allTasks, reports] = await Promise.all([
          getEmployees(),
          getTasksWithActuals(),
          getDailyReports({}),
        ]);

        const activeEmps = (emps as Employee[]).filter(e => e.status === 'Đang làm việc');
        setEmployees(activeEmps);
        setTasks(allTasks);

        // Build submission rows: for each submitted/approved report, get its submissions
        const submittedReports = (reports as DailyReport[]).filter(r =>
          r.status === 'submitted' || r.status === 'approved'
        );

        const allRows: SubmissionRow[] = [];
        // Fetch submissions for each report (batch)
        for (const report of submittedReports) {
          const subs = await getTaskSubmissions(report.id);
          const emp = activeEmps.find(e => e.id === report.employee_id);
          if (!emp) continue;

          for (const sub of subs as Submission[]) {
            const task = (allTasks as TaskWithActual[]).find(t => t.id === sub.task_id);
            if (!task) continue;

            // Only show if task is assigned to this employee (data integrity)
            if (task.assignee_id !== emp.id) continue;

            allRows.push({ employee: emp, report, task, submission: sub });
          }
        }

        setRows(allRows);
      } catch (err) {
        console.error('Error loading consolidated data:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const departments = useMemo(() => {
    const depts = new Set(employees.map(e => e.department));
    return Array.from(depts).sort();
  }, [employees]);

  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (filterDept !== 'all' && r.employee.department !== filterDept) return false;
      if (filterDate && r.report.report_date !== filterDate) return false;
      if (filterStatus !== 'all' && r.report.status !== filterStatus) return false;
      return true;
    });
  }, [rows, filterDept, filterDate, filterStatus]);

  // Stats
  const uniqueEmployees = new Set(filtered.map(r => r.employee.id)).size;
  const uniqueReports = new Set(filtered.map(r => r.report.id)).size;
  const totalSubmissions = filtered.length;
  const withKPI = filtered.filter(r => r.task.kpi_target);
  const kpiStats = useMemo(() => {
    let tgt = 0, act = 0;
    withKPI.forEach(r => {
      const tv = parseFloat(String(r.task.kpi_target).replace(/[^0-9.]/g, ''));
      if (!isNaN(tv) && tv > 0) {
        tgt += tv;
        act += r.submission.actual_numeric || 0;
      }
    });
    return { target: tgt, actual: act, pct: tgt > 0 ? Math.round((act / tgt) * 100) : 0 };
  }, [filtered]);

  // Group by department for summary
  const deptSummary = useMemo(() => {
    const map = new Map<string, { dept: string; employees: Set<number>; submissions: number; kpiTarget: number; kpiActual: number }>();
    filtered.forEach(r => {
      const d = r.employee.department;
      if (!map.has(d)) map.set(d, { dept: d, employees: new Set(), submissions: 0, kpiTarget: 0, kpiActual: 0 });
      const entry = map.get(d)!;
      entry.employees.add(r.employee.id);
      entry.submissions++;
      if (r.task.kpi_target) {
        const tv = parseFloat(String(r.task.kpi_target).replace(/[^0-9.]/g, ''));
        if (!isNaN(tv) && tv > 0) {
          entry.kpiTarget += tv;
          entry.kpiActual += r.submission.actual_numeric || 0;
        }
      }
    });
    return Array.from(map.values()).sort((a, b) => b.submissions - a.submissions);
  }, [filtered]);

  if (loading) {
    return <div className="p-6 flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Bảng tổng hợp"
        subtitle={`Tất cả dữ liệu submit từ nhân viên — ${rows.length} submissions`}
        breadcrumbs={[
          { label: 'AI Agents', href: '/admin' },
          { label: 'Bảng tổng hợp' },
        ]}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard icon={Users} label="Nhân viên đã submit" value={uniqueEmployees} color="blue" />
        <StatCard icon={CheckCircle2} label="Báo cáo" value={uniqueReports} color="green" />
        <StatCard icon={Target} label="Submissions" value={totalSubmissions} color="purple" />
        <StatCard icon={Target} label="KPI tổng hợp" value={`${kpiStats.pct}%`} color={kpiStats.pct >= 70 ? 'green' : 'orange'} />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={16} className="text-slate-400" />
          <span className="text-sm font-medium text-slate-700">Bộ lọc</span>
        </div>
        <div className="flex flex-wrap gap-3">
          <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
            <option value="all">Tất cả phòng ban</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
            <option value="all">Tất cả trạng thái</option>
            <option value="submitted">Chờ duyệt</option>
            <option value="approved">Đã duyệt</option>
          </select>
          {(filterDept !== 'all' || filterDate || filterStatus !== 'all') && (
            <button onClick={() => { setFilterDept('all'); setFilterDate(''); setFilterStatus('all'); }}
              className="text-xs text-red-500 hover:text-red-700 px-2">Xóa bộ lọc</button>
          )}
        </div>
      </div>

      {/* Department Summary */}
      {deptSummary.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
          <h2 className="text-base font-semibold text-slate-800 mb-3">Tổng hợp theo phòng ban</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {deptSummary.map(d => {
              const kpiPct = d.kpiTarget > 0 ? Math.round((d.kpiActual / d.kpiTarget) * 100) : 0;
              return (
                <Link key={d.dept} href={`/admin/phong-ban/${getSlugFromDept(d.dept)}`}>
                  <div className="bg-slate-50 rounded-lg p-4 hover:bg-blue-50 transition-colors cursor-pointer">
                    <p className="text-sm font-medium text-slate-800">{d.dept}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <div>
                        <p className="text-[10px] text-slate-400">NV submit</p>
                        <p className="text-lg font-bold text-slate-700">{d.employees.size}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400">Submissions</p>
                        <p className="text-lg font-bold text-blue-600">{d.submissions}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400">KPI đạt</p>
                        <p className={`text-lg font-bold ${kpiPct >= 90 ? 'text-green-600' : kpiPct >= 70 ? 'text-blue-600' : 'text-orange-600'}`}>
                          {d.kpiTarget > 0 ? `${kpiPct}%` : '—'}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Detail Table */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-base font-semibold text-slate-800 mb-4">
          Chi tiết submissions ({filtered.length})
        </h2>
        {filtered.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">Chưa có dữ liệu submit nào{filterDept !== 'all' || filterDate ? ' (thử xóa bộ lọc)' : ''}.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <th className="pb-2 pr-3">Nhân viên</th>
                  <th className="pb-2 pr-3">Phòng ban</th>
                  <th className="pb-2 pr-3">Ngày BC</th>
                  <th className="pb-2 pr-3">Task</th>
                  <th className="pb-2 pr-3 text-center">KH</th>
                  <th className="pb-2 pr-3 text-center">TT</th>
                  <th className="pb-2 pr-3 text-center">Đánh giá</th>
                  <th className="pb-2 pr-3">Trạng thái</th>
                  <th className="pb-2">Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 100).map((r, i) => {
                  const targetNum = r.task.kpi_target ? parseFloat(String(r.task.kpi_target).replace(/[^0-9.]/g, '')) : 0;
                  const variance = targetNum > 0 ? (
                    (r.submission.actual_numeric || 0) >= targetNum * 1.1 ? 'exceeded' :
                    (r.submission.actual_numeric || 0) >= targetNum * 0.9 ? 'met' :
                    (r.submission.actual_numeric || 0) >= targetNum * 0.7 ? 'near' : 'below'
                  ) as VarianceStatus : 'missing' as VarianceStatus;
                  return (
                    <tr key={`${r.report.id}-${r.task.id}-${i}`} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="py-2.5 pr-3">
                        <Link href={`/admin/nhan-vien/${r.employee.id}`} className="text-sm font-medium text-blue-600 hover:text-blue-800">
                          {r.employee.name}
                        </Link>
                      </td>
                      <td className="py-2.5 pr-3 text-[12px] text-slate-500">{r.employee.department.replace('Phòng ', '')}</td>
                      <td className="py-2.5 pr-3 text-[12px] text-slate-600">{r.report.report_date}</td>
                      <td className="py-2.5 pr-3">
                        <p className="text-[12px] text-slate-700 max-w-[200px] truncate">{r.task.title}</p>
                        {r.task.kpi_metric && <p className="text-[10px] text-slate-400">{r.task.kpi_metric}</p>}
                      </td>
                      <td className="py-2.5 pr-3 text-center">
                        {r.task.kpi_target ? (
                          <span className="text-[11px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{r.task.kpi_target} {r.task.kpi_unit || ''}</span>
                        ) : <span className="text-[10px] text-slate-300">—</span>}
                      </td>
                      <td className="py-2.5 pr-3 text-center">
                        <span className="text-[11px] font-medium text-slate-700">{r.submission.actual_value || '—'}</span>
                      </td>
                      <td className="py-2.5 pr-3 text-center">
                        {targetNum > 0 ? <VarianceBadge status={variance} size="xs" /> : <span className="text-[10px] text-slate-300">—</span>}
                      </td>
                      <td className="py-2.5 pr-3">
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                          r.report.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {r.report.status === 'approved' ? 'Đã duyệt' : 'Chờ duyệt'}
                        </span>
                      </td>
                      <td className="py-2.5 text-[11px] text-slate-400 max-w-[150px] truncate">{r.submission.notes || ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length > 100 && (
              <p className="text-xs text-slate-400 text-center py-2 mt-2">Hiển thị 100/{filtered.length} dòng. Dùng bộ lọc để xem chi tiết.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
