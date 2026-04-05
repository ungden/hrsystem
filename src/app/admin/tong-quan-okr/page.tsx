"use client";

import { useMemo } from 'react';
import Link from 'next/link';
import { Target, Building2, Users, CheckCircle2, AlertTriangle } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import TargetCascadeTree from '@/components/agents/TargetCascadeTree';
import { runFullCoordination } from '@/lib/agents/coordinator';
import { employees } from '@/lib/mock-data';
import { getSlugFromDept } from '@/lib/department-utils';

export default function OKRTreePage() {
  const state = useMemo(() => runFullCoordination(2026, 'Q2'), []);

  const completedPlans = state.individualPlans.filter(p => p.status === 'completed').length;
  const atRiskPlans = state.individualPlans.filter(p => p.status === 'at_risk').length;
  const totalPlans = state.individualPlans.length;

  // Department summary
  const deptSummary = state.departmentDetails.map(d => {
    const deptPlans = state.individualPlans.filter(p => {
      const emp = employees.find(e => e.id === p.employeeId);
      return emp?.phongBan === d.department;
    });
    const completed = deptPlans.filter(p => p.status === 'completed').length;
    return { ...d, planCount: deptPlans.length, completedCount: completed };
  });

  return (
    <div className="p-6">
      <PageHeader
        title="Tổng quan OKR"
        subtitle="Objectives & Key Results - Từ mục tiêu công ty đến nhiệm vụ cá nhân"
        breadcrumbs={[
          { label: 'AI Agents', href: '/admin' },
          { label: 'Tổng quan OKR' },
        ]}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Target} label="Mục tiêu công ty" value={state.businessTargets.length} color="orange" />
        <StatCard icon={Building2} label="Mục tiêu phòng ban" value={state.departmentGoals.length} color="blue" />
        <StatCard icon={CheckCircle2} label="Nhiệm vụ hoàn thành" value={`${completedPlans}/${totalPlans}`} color="green" />
        <StatCard icon={AlertTriangle} label="Nhiệm vụ rủi ro" value={atRiskPlans} color="red" />
      </div>

      {/* Department Quick View */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <h2 className="text-base font-semibold text-slate-800 mb-3">Tổng quan theo phòng ban</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {deptSummary.map(d => (
            <Link key={d.department} href={`/admin/phong-ban/${d.slug}`}>
              <div className="bg-slate-50 rounded-lg p-3 text-center hover:bg-blue-50 transition-colors cursor-pointer">
                <p className="text-xl font-bold text-slate-800">{d.taskCompletion}%</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{d.department.replace('Phòng ', '')}</p>
                <p className="text-[10px] text-slate-400">{d.completedCount}/{d.planCount} CV</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* SUM Invariant */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200 p-4 mb-6">
        <p className="text-sm text-blue-800 font-medium">
          Nguyên tắc OKR: Tổng trọng số phòng ban = 100% mục tiêu công ty.
          Tổng nhiệm vụ cá nhân = 100% mục tiêu phòng ban.
          Nếu mọi nhân viên hoàn thành → Mục tiêu công ty đạt được.
        </p>
      </div>

      {/* Full OKR Tree */}
      <TargetCascadeTree
        targets={state.businessTargets}
        goals={state.departmentGoals}
        plans={state.individualPlans}
      />
    </div>
  );
}
