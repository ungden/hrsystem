"use client";

import { useMemo } from 'react';
import Link from 'next/link';
import { Building2, Users, TrendingUp, DollarSign } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import ProgressRing from '@/components/agents/ProgressRing';
import DepartmentRadarChart from '@/components/agents/DepartmentRadarChart';
import { runFullCoordination } from '@/lib/agents/coordinator';
import { formatCurrency } from '@/lib/mock-data';
import { deptColors } from '@/lib/department-utils';

export default function DepartmentListPage() {
  const state = useMemo(() => runFullCoordination(2026, 'Q2'), []);
  const depts = state.departmentDetails;

  return (
    <div className="p-6">
      <PageHeader
        title="Phòng ban"
        subtitle="Tổng quan hiệu suất và chi phí theo từng phòng ban"
        breadcrumbs={[
          { label: 'AI Agents', href: '/admin' },
          { label: 'Phòng ban' },
        ]}
      />

      {/* Radar Chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <h2 className="text-base font-semibold text-slate-800 mb-2">So sánh phòng ban</h2>
        <DepartmentRadarChart departments={depts} />
      </div>

      {/* Department Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {depts.map(dept => {
          const colors = deptColors[dept.department] || { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' };
          return (
            <Link key={dept.department} href={`/admin/phong-ban/${dept.slug}`}>
              <div className={`${colors.bg} rounded-xl border ${colors.border} p-5 hover:shadow-md transition-shadow cursor-pointer`}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className={`text-sm font-bold ${colors.text}`}>{dept.department}</h3>
                    <p className="text-[11px] text-slate-500">Trưởng phòng: {dept.headName}</p>
                  </div>
                  <ProgressRing percent={dept.taskCompletion} size={44} strokeWidth={4} color={deptColors[dept.department]?.chart || '#3b82f6'} />
                </div>

                <div className="grid grid-cols-2 gap-2 text-[12px]">
                  <div className="flex items-center gap-1.5">
                    <Users size={12} className="text-slate-400" />
                    <span className="text-slate-600">{dept.headcount} người</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <TrendingUp size={12} className="text-slate-400" />
                    <span className="text-slate-600">KPI: {dept.avgKPI}%</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <DollarSign size={12} className="text-slate-400" />
                    <span className="text-slate-600">{formatCurrency(dept.totalCost)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Building2 size={12} className="text-slate-400" />
                    <span className="text-slate-600">Biên LN: {dept.contributionMargin}%</span>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
