"use client";

import { useMemo } from 'react';
import { Target, Building2, User, CheckCircle2 } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import TargetCascadeTree from '@/components/agents/TargetCascadeTree';
import { runFullCoordination } from '@/lib/agents/coordinator';

export default function TargetCascadePage() {
  const state = useMemo(() => runFullCoordination(2026, 'Q2'), []);

  const completedPlans = state.individualPlans.filter(p => p.status === 'completed').length;
  const totalPlans = state.individualPlans.length;

  return (
    <div className="p-6">
      <PageHeader
        title="Mục tiêu kinh doanh"
        subtitle="Phân rã từ mục tiêu công ty → phòng ban → cá nhân"
        breadcrumbs={[
          { label: 'AI Agents', href: '/admin' },
          { label: 'Mục tiêu kinh doanh' },
        ]}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={Target}
          label="Mục tiêu công ty"
          value={state.businessTargets.length}
          color="orange"
        />
        <StatCard
          icon={Building2}
          label="Mục tiêu phòng ban"
          value={state.departmentGoals.length}
          color="blue"
        />
        <StatCard
          icon={User}
          label="Nhiệm vụ cá nhân"
          value={totalPlans}
          color="purple"
        />
        <StatCard
          icon={CheckCircle2}
          label="Hoàn thành"
          value={`${completedPlans}/${totalPlans}`}
          color="green"
        />
      </div>

      {/* SUM Invariant Verification */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200 p-4 mb-6">
        <p className="text-sm text-blue-800 font-medium">
          Nguyên tắc phân rã: Tổng trọng số mục tiêu phòng ban = 100% mục tiêu công ty.
          Tổng nhiệm vụ cá nhân = 100% mục tiêu phòng ban.
          Nếu mọi nhân viên hoàn thành nhiệm vụ → Mục tiêu công ty đạt được.
        </p>
      </div>

      {/* Target Cascade Tree */}
      <TargetCascadeTree
        targets={state.businessTargets}
        goals={state.departmentGoals}
        plans={state.individualPlans}
      />
    </div>
  );
}
