"use client";

import { useState, useEffect, useMemo } from 'react';
import { Search, Loader2, CheckCircle2, Clock, AlertTriangle, Calendar } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import ProgressRing from '@/components/agents/ProgressRing';
import { getEmployees, getTasks } from '@/lib/supabase-data';

interface SupaTask {
  id: string;
  title: string;
  assignee_id: number;
  status: string;
  priority: string;
  department: string;
  month_number: number;
  week_number: number | null;
  due_date: string;
  category: string;
  kpi_metric: string | null;
  kpi_target: string | null;
  kpi_unit: string | null;
}

interface EmployeeTaskGroup {
  employeeId: number;
  employeeName: string;
  department: string;
  tasks: SupaTask[];
  completionRate: number;
}

const statusConfig: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
  done: { icon: CheckCircle2, color: 'text-green-500', label: 'Hoàn thành' },
  in_progress: { icon: Clock, color: 'text-blue-500', label: 'Đang làm' },
  review: { icon: AlertTriangle, color: 'text-orange-500', label: 'Review' },
  todo: { icon: Calendar, color: 'text-slate-400', label: 'Chưa làm' },
};

const monthNames = ['', 'T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];

export default function DetailedPlanPage() {
  const [groups, setGroups] = useState<EmployeeTaskGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmpId, setSelectedEmpId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState<number | null>(null);
  const [expandedMonths, setExpandedMonths] = useState<Set<number>>(new Set([4]));

  useEffect(() => {
    async function load() {
      try {
        const [employees, tasks] = await Promise.all([getEmployees(), getTasks()]);
        const activeEmps = employees.filter((e: { status: string }) => e.status === 'Đang làm việc');

        const result: EmployeeTaskGroup[] = activeEmps.map((emp: { id: number; name: string; department: string }) => {
          const empTasks = tasks.filter((t: SupaTask) => t.assignee_id === emp.id);
          const done = empTasks.filter((t: SupaTask) => t.status === 'done').length;
          return {
            employeeId: emp.id,
            employeeName: emp.name,
            department: emp.department,
            tasks: empTasks,
            completionRate: empTasks.length > 0 ? Math.round((done / empTasks.length) * 100) : 0,
          };
        });

        setGroups(result.sort((a, b) => b.tasks.length - a.tasks.length));
        if (result.length > 0) setSelectedEmpId(result[0].employeeId);
      } catch (e) {
        console.error('Failed to load plan data:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const departments = [...new Set(groups.map(g => g.department))];
  const filteredGroups = useMemo(() => {
    let data = groups;
    if (search) {
      const lower = search.toLowerCase();
      data = data.filter(g => g.employeeName.toLowerCase().includes(lower));
    }
    if (deptFilter) data = data.filter(g => g.department === deptFilter);
    return data;
  }, [groups, search, deptFilter]);

  const selectedGroup = groups.find(g => g.employeeId === selectedEmpId);

  // Group selected employee's tasks by month
  const tasksByMonth = useMemo(() => {
    if (!selectedGroup) return new Map<number, SupaTask[]>();
    const map = new Map<number, SupaTask[]>();
    const filtered = monthFilter ? selectedGroup.tasks.filter(t => t.month_number === monthFilter) : selectedGroup.tasks;
    filtered.forEach(t => {
      const m = t.month_number || 0;
      const arr = map.get(m) || [];
      arr.push(t);
      map.set(m, arr);
    });
    return new Map([...map.entries()].sort((a, b) => a[0] - b[0]));
  }, [selectedGroup, monthFilter]);

  const toggleMonth = (m: number) => {
    setExpandedMonths(prev => {
      const next = new Set(prev);
      if (next.has(m)) next.delete(m); else next.add(m);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-3 text-slate-500">Đang tải kế hoạch...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Kế hoạch chi tiết"
        subtitle={`696 tasks phân bổ cho ${groups.length} nhân viên — Dữ liệu từ Supabase`}
        breadcrumbs={[
          { label: 'AI Agents', href: '/admin' },
          { label: 'Kế hoạch chi tiết' },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left: Employee selector */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-slate-200 p-4 sticky top-4">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Chọn nhân viên</h3>
            <div className="space-y-2 mb-3">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm..."
                  className="w-full pl-7 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[12px] focus:outline-none" />
              </div>
              <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-[12px]">
                <option value="">Tất cả PB</option>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="space-y-1 max-h-[500px] overflow-y-auto">
              {filteredGroups.map(g => (
                <button
                  key={g.employeeId}
                  onClick={() => { setSelectedEmpId(g.employeeId); setMonthFilter(null); }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-[12px] transition-colors ${
                    g.employeeId === selectedEmpId
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{g.employeeName}</p>
                      <p className="text-[10px] text-slate-400">{g.department}</p>
                    </div>
                    <ProgressRing percent={g.completionRate} size={24} strokeWidth={2} color={g.completionRate >= 30 ? '#10b981' : '#3b82f6'} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Task Timeline */}
        <div className="lg:col-span-3">
          {selectedGroup ? (
            <>
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-blue-800">
                      {selectedGroup.employeeName} — {selectedGroup.department}
                    </p>
                    <p className="text-xs text-blue-600 mt-0.5">
                      {selectedGroup.tasks.length} tasks | {selectedGroup.tasks.filter(t => t.status === 'done').length} hoàn thành | Tỷ lệ: {selectedGroup.completionRate}%
                    </p>
                  </div>
                  <select value={monthFilter ?? ''} onChange={e => setMonthFilter(e.target.value ? Number(e.target.value) : null)}
                    className="bg-white border border-blue-200 rounded-lg px-2 py-1 text-[12px]">
                    <option value="">Tất cả tháng</option>
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => <option key={m} value={m}>Tháng {m}</option>)}
                  </select>
                </div>
              </div>

              {/* Tasks grouped by month */}
              <div className="space-y-2">
                {[...tasksByMonth.entries()].map(([month, monthTasks]) => {
                  const isExpanded = expandedMonths.has(month);
                  const done = monthTasks.filter(t => t.status === 'done').length;
                  const pct = monthTasks.length > 0 ? Math.round((done / monthTasks.length) * 100) : 0;

                  return (
                    <div key={month}>
                      <button
                        onClick={() => toggleMonth(month)}
                        className="w-full flex items-center gap-3 bg-white rounded-lg border border-slate-200 p-3 hover:bg-slate-50 transition-colors"
                      >
                        <span className="text-[10px] text-slate-400">{isExpanded ? '▼' : '▶'}</span>
                        <div className="flex-1 text-left">
                          <span className="text-sm font-semibold text-slate-700">{monthNames[month]}/2026</span>
                          <span className="text-[11px] text-slate-400 ml-2">{done}/{monthTasks.length} tasks</span>
                        </div>
                        <ProgressRing percent={pct} size={32} strokeWidth={3} color={pct >= 30 ? '#10b981' : '#3b82f6'} />
                      </button>

                      {isExpanded && (
                        <div className="ml-6 mt-1 space-y-1">
                          {monthTasks.map(task => {
                            const cfg = statusConfig[task.status] || statusConfig.todo;
                            const Icon = cfg.icon;
                            return (
                              <div key={task.id} className={`rounded-lg p-2.5 border text-[12px] ${
                                task.status === 'done' ? 'bg-green-50 border-green-100' :
                                task.status === 'in_progress' ? 'bg-blue-50 border-blue-100' :
                                'bg-white border-slate-100'
                              }`}>
                                <div className="flex items-center gap-2">
                                  <Icon size={14} className={cfg.color} />
                                  <span className="flex-1 text-slate-700 font-medium">{task.title}</span>
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                    task.priority === 'high' ? 'bg-red-100 text-red-700' :
                                    task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-slate-100 text-slate-600'
                                  }`}>{task.priority}</span>
                                </div>
                                {(task.kpi_metric || task.kpi_target) && (
                                  <p className="text-[10px] text-slate-400 mt-1 ml-6">
                                    KPI: {task.kpi_metric} | Target: {task.kpi_target} {task.kpi_unit || ''}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-400 text-center py-12">Chọn nhân viên để xem kế hoạch chi tiết.</p>
          )}
        </div>
      </div>
    </div>
  );
}
