"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Search, Loader2 } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import ProgressRing from '@/components/agents/ProgressRing';
import { getEmployees, getTasks } from '@/lib/supabase-data';

function formatCurrency(n: number) {
  return new Intl.NumberFormat('vi-VN').format(n);
}

interface SupaEmployee {
  id: number;
  name: string;
  role: string;
  department: string;
  email: string;
  phone: string;
  status: string;
  join_date: string;
  base_salary: number;
  manager_id: number | null;
}

interface SupaTask {
  id: string;
  assignee_id: number;
  status: string;
  department: string;
  bonus_amount: number;
}

export default function EmployeeListPage() {
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [employees, setEmployees] = useState<SupaEmployee[]>([]);
  const [tasks, setTasks] = useState<SupaTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [emps, allTasks] = await Promise.all([getEmployees(), getTasks()]);
        setEmployees(emps);
        setTasks(allTasks);
      } catch (e) {
        console.error('Failed to load data:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const activeEmps = employees.filter(e => e.status === 'Đang làm việc');
  const departments = [...new Set(activeEmps.map(e => e.department))];

  const filtered = useMemo(() => {
    let data = activeEmps;
    if (search) {
      const lower = search.toLowerCase();
      data = data.filter(e => e.name.toLowerCase().includes(lower) || e.role.toLowerCase().includes(lower));
    }
    if (deptFilter) data = data.filter(e => e.department === deptFilter);

    return data.map(emp => {
      const empTasks = tasks.filter(t => t.assignee_id === emp.id);
      const doneTasks = empTasks.filter(t => t.status === 'done').length;
      const completionRate = empTasks.length > 0 ? Math.round((doneTasks / empTasks.length) * 100) : 0;
      const totalBonus = empTasks.reduce((s, t) => s + (t.bonus_amount || 0), 0);

      return {
        emp,
        completionRate,
        totalTasks: empTasks.length,
        completedTasks: doneTasks,
        salary: emp.base_salary,
        bonus: totalBonus,
      };
    }).sort((a, b) => b.completionRate - a.completionRate);
  }, [search, deptFilter, activeEmps, tasks]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-3 text-slate-500">Đang tải dữ liệu...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Nhân viên"
        subtitle={`${activeEmps.length} nhân viên đang làm việc — Dữ liệu từ Supabase`}
        breadcrumbs={[
          { label: 'AI Agents', href: '/admin' },
          { label: 'Nhân viên' },
        ]}
      />

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm nhân viên..."
            className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
        </div>
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
          <option value="">Tất cả phòng ban</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {/* Employee Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map(({ emp, completionRate, completedTasks, totalTasks, salary, bonus }) => (
          <Link key={emp.id} href={`/admin/nhan-vien/${emp.id}`}>
            <div className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {emp.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{emp.name}</p>
                  <p className="text-[10px] text-slate-500 truncate">{emp.role} - {emp.department}</p>
                </div>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="bg-blue-100 text-blue-700 text-[10px] font-semibold px-1.5 py-0.5 rounded">{emp.department}</span>
                <ProgressRing percent={completionRate} size={32} strokeWidth={3} color={completionRate >= 80 ? '#10b981' : '#3b82f6'} />
              </div>
              <div className="grid grid-cols-2 gap-1 text-[11px]">
                <div><span className="text-slate-400">Hoàn thành:</span> <span className={`font-medium ${completionRate >= 75 ? 'text-green-600' : 'text-slate-700'}`}>{completionRate}%</span></div>
                <div><span className="text-slate-400">CV:</span> <span className="text-slate-700">{completedTasks}/{totalTasks}</span></div>
                <div><span className="text-slate-400">Lương:</span> <span className="text-slate-700">{(salary / 1_000_000).toFixed(0)}M</span></div>
                <div><span className="text-slate-400">Thưởng:</span> <span className="text-emerald-600">{(bonus / 1_000_000).toFixed(1)}M</span></div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
