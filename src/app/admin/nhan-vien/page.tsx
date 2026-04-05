"use client";

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import ProgressRing from '@/components/agents/ProgressRing';
import { runFullCoordination } from '@/lib/agents/coordinator';
import { employees, employeeCareers, formatCurrency } from '@/lib/mock-data';

export default function EmployeeListPage() {
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const state = useMemo(() => runFullCoordination(2026, 'Q2'), []);

  const activeEmps = employees.filter(e => e.trangThai !== 'da_nghi');
  const departments = [...new Set(activeEmps.map(e => e.phongBan))];

  const filtered = useMemo(() => {
    let data = activeEmps;
    if (search) {
      const lower = search.toLowerCase();
      data = data.filter(e => e.name.toLowerCase().includes(lower) || e.maSo.toLowerCase().includes(lower));
    }
    if (deptFilter) data = data.filter(e => e.phongBan === deptFilter);
    return data.map(emp => {
      const career = employeeCareers.find(c => c.employeeId === emp.id);
      const plans = state.individualPlans.filter(p => p.employeeId === emp.id);
      const completed = plans.filter(p => p.status === 'completed').length;
      const salary = state.salaryProjections.find(s => s.employeeId === emp.id);
      const lastKPI = career?.performanceHistory.slice(-1)[0]?.kpiScore || 0;
      return {
        emp,
        levelCode: career?.levelCode || 'L3',
        kpiScore: lastKPI,
        completionRate: plans.length > 0 ? Math.round((completed / plans.length) * 100) : 0,
        totalTasks: plans.length,
        completedTasks: completed,
        salary: salary?.projectedTotal || 0,
        bonus: salary?.projectedBonus || 0,
      };
    }).sort((a, b) => b.kpiScore - a.kpiScore);
  }, [search, deptFilter, activeEmps, state]);

  return (
    <div className="p-6">
      <PageHeader
        title="Nhân viên"
        subtitle="Chi tiết hiệu suất, mục tiêu và thu nhập từng nhân viên"
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
        {filtered.map(({ emp, levelCode, kpiScore, completionRate, completedTasks, totalTasks, salary, bonus }) => (
          <Link key={emp.id} href={`/admin/nhan-vien/${emp.id}`}>
            <div className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {emp.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{emp.name}</p>
                  <p className="text-[10px] text-slate-500 truncate">{emp.chucVu} - {emp.phongBan.replace('Phòng ', '')}</p>
                </div>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="bg-blue-100 text-blue-700 text-[10px] font-semibold px-1.5 py-0.5 rounded">{levelCode}</span>
                <ProgressRing percent={completionRate} size={32} strokeWidth={3} color={completionRate >= 80 ? '#10b981' : '#3b82f6'} />
              </div>
              <div className="grid grid-cols-2 gap-1 text-[11px]">
                <div><span className="text-slate-400">KPI:</span> <span className={`font-medium ${kpiScore >= 75 ? 'text-green-600' : 'text-slate-700'}`}>{kpiScore}%</span></div>
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
