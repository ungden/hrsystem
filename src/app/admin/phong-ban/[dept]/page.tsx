"use client";

import { useMemo } from 'react';
import { use } from 'react';
import Link from 'next/link';
import { Users, TrendingUp, DollarSign, Target } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import DepartmentKanbanBoard from '@/components/agents/DepartmentKanbanBoard';
import ProgressRing from '@/components/agents/ProgressRing';
import { runFullCoordination } from '@/lib/agents/coordinator';
import { getDeptFromSlug } from '@/lib/department-utils';
import { employees, employeeCareers, formatCurrency } from '@/lib/mock-data';

export default function DepartmentDetailPage({ params }: { params: Promise<{ dept: string }> }) {
  const { dept: slug } = use(params);
  const deptName = getDeptFromSlug(slug) || '';
  const state = useMemo(() => runFullCoordination(2026, 'Q2'), []);

  const deptDetail = state.departmentDetails.find(d => d.slug === slug);
  const deptEmployees = employees.filter(e => e.phongBan === deptName && e.trangThai !== 'da_nghi');
  const deptPlans = state.individualPlans.filter(p => deptEmployees.some(e => e.id === p.employeeId));
  const deptGoals = state.departmentGoals.filter(g => g.department === deptName);
  const deptCost = state.costProjections.find(c => c.department === deptName);

  if (!deptDetail) {
    return <div className="p-6"><p className="text-slate-500">Không tìm thấy phòng ban.</p></div>;
  }

  // Employee ranking by task completion
  const empRanking = deptEmployees.map(emp => {
    const empPlans = deptPlans.filter(p => p.employeeId === emp.id);
    const completed = empPlans.filter(p => p.status === 'completed').length;
    const career = employeeCareers.find(c => c.employeeId === emp.id);
    const lastKPI = career?.performanceHistory.slice(-1)[0]?.kpiScore || 0;
    const salary = state.salaryProjections.find(s => s.employeeId === emp.id);
    return {
      emp,
      completedTasks: completed,
      totalTasks: empPlans.length,
      completionRate: empPlans.length > 0 ? Math.round((completed / empPlans.length) * 100) : 0,
      kpiScore: lastKPI,
      salary: salary?.projectedTotal || 0,
    };
  }).sort((a, b) => b.completionRate - a.completionRate);

  return (
    <div className="p-6">
      <PageHeader
        title={deptName}
        subtitle={`Trưởng phòng: ${deptDetail.headName} | ${deptDetail.headcount} nhân sự`}
        breadcrumbs={[
          { label: 'AI Agents', href: '/admin' },
          { label: 'Phòng ban', href: '/admin/phong-ban' },
          { label: deptName },
        ]}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Users} label="Nhân sự" value={deptDetail.headcount} color="blue" />
        <StatCard icon={TrendingUp} label="KPI trung bình" value={`${deptDetail.avgKPI}%`} color="green" />
        <StatCard icon={Target} label="Hoàn thành CV" value={`${deptDetail.taskCompletion}%`} color="purple" />
        <StatCard icon={DollarSign} label="Chi phí/tháng" value={`${(deptDetail.totalCost / 1_000_000).toFixed(0)}M`} color="orange" />
      </div>

      {/* KPI Metrics */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <h2 className="text-base font-semibold text-slate-800 mb-3">Mục tiêu phòng ban</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {deptGoals.slice(0, 6).map(g => {
            const pct = g.targetValue > 0 ? Math.round(g.currentValue / g.targetValue * 100) : 0;
            return (
              <div key={g.id} className="flex items-center gap-3 bg-slate-50 rounded-lg p-3">
                <ProgressRing percent={pct} size={40} strokeWidth={4} color={pct >= 80 ? '#10b981' : pct >= 60 ? '#3b82f6' : '#f59e0b'} />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-slate-700 truncate">{g.name.split(':').pop()?.trim()}</p>
                  <p className="text-[10px] text-slate-500">Trọng số: {g.weight}%</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Kanban */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <h2 className="text-base font-semibold text-slate-800 mb-4">Bảng Kanban - Nhiệm vụ phòng ban</h2>
        <DepartmentKanbanBoard plans={deptPlans} />
      </div>

      {/* Employee Ranking */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-base font-semibold text-slate-800 mb-4">Bảng xếp hạng nhân viên</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <th className="pb-2 pr-3">#</th>
                <th className="pb-2 pr-3">Nhân viên</th>
                <th className="pb-2 pr-3">Level</th>
                <th className="pb-2 pr-3 text-center">KPI</th>
                <th className="pb-2 pr-3 text-center">CV hoàn thành</th>
                <th className="pb-2 pr-3 text-right">Thu nhập DK</th>
                <th className="pb-2 text-right">Tiến độ</th>
              </tr>
            </thead>
            <tbody>
              {empRanking.map((r, i) => (
                <tr key={r.emp.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="py-2.5 pr-3 text-sm font-bold text-slate-400">{i + 1}</td>
                  <td className="py-2.5 pr-3">
                    <Link href={`/admin/nhan-vien/${r.emp.id}`} className="text-sm font-medium text-blue-600 hover:text-blue-800">
                      {r.emp.name}
                    </Link>
                    <p className="text-[10px] text-slate-400">{r.emp.chucVu}</p>
                  </td>
                  <td className="py-2.5 pr-3">
                    <span className="bg-blue-100 text-blue-700 text-[10px] font-semibold px-1.5 py-0.5 rounded">{r.emp.levelCode}</span>
                  </td>
                  <td className="py-2.5 pr-3 text-center">
                    <span className={`text-sm font-medium ${r.kpiScore >= 75 ? 'text-green-600' : r.kpiScore >= 55 ? 'text-blue-600' : 'text-orange-600'}`}>
                      {r.kpiScore}%
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 text-center text-sm text-slate-600">{r.completedTasks}/{r.totalTasks}</td>
                  <td className="py-2.5 pr-3 text-right text-sm text-slate-700">{formatCurrency(r.salary)}</td>
                  <td className="py-2.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${r.completionRate >= 80 ? 'bg-green-500' : r.completionRate >= 50 ? 'bg-blue-500' : 'bg-orange-500'}`} style={{ width: `${r.completionRate}%` }} />
                      </div>
                      <span className="text-[11px] text-slate-500 w-8">{r.completionRate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
