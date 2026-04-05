"use client";

import { useState, useEffect, useMemo } from 'react';
import { DollarSign, Users, TrendingDown, Gift } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import CostBreakdownChart from '@/components/agents/CostBreakdownChart';
import DepartmentCostCard from '@/components/agents/DepartmentCostCard';
import { runFullCoordination } from '@/lib/agents/coordinator';
import { formatCurrency } from '@/lib/mock-data';

export default function CostManagementPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const state = useMemo(() => runFullCoordination(2026, 'Q2'), []);

  const totalCost = state.costProjections.reduce((s, c) => s + c.totalCost, 0);
  const totalHeadcount = state.costProjections.reduce((s, c) => s + c.headcount, 0);
  const totalBonus = state.costProjections.reduce((s, c) => s + c.projectedBonusPool, 0);
  const avgCost = totalHeadcount > 0 ? Math.round(totalCost / totalHeadcount) : 0;

  return (
    <div className="p-6">
      <PageHeader
        title="Quản lý chi phí"
        subtitle="Phân tích chi phí nhân sự và ngân sách theo phòng ban"
        breadcrumbs={[
          { label: 'AI Agents', href: '/admin' },
          { label: 'Quản lý chi phí' },
        ]}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={DollarSign}
          label="Tổng chi phí/tháng"
          value={`${(totalCost / 1_000_000).toFixed(0)}M`}
          color="blue"
        />
        <StatCard
          icon={Users}
          label="Bình quân/người"
          value={`${(avgCost / 1_000_000).toFixed(1)}M`}
          color="purple"
        />
        <StatCard
          icon={Gift}
          label="Quỹ thưởng dự kiến"
          value={`${(totalBonus / 1_000_000).toFixed(0)}M`}
          color="green"
        />
        <StatCard
          icon={TrendingDown}
          label="Tỷ lệ thưởng/lương"
          value={`${Math.round(totalBonus / totalCost * 100)}%`}
          color="orange"
        />
      </div>

      {/* Cost Breakdown Chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <h2 className="text-base font-semibold text-slate-800 mb-4">Chi phí theo phòng ban</h2>
        {mounted && <CostBreakdownChart projections={state.costProjections} />}
      </div>

      {/* Department Cost Cards */}
      <h2 className="text-base font-semibold text-slate-800 mb-3">Chi tiết theo phòng ban</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {state.costProjections
          .sort((a, b) => b.totalCost - a.totalCost)
          .map(p => (
            <DepartmentCostCard key={p.department} projection={p} />
          ))}
      </div>

      {/* Summary Table */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-base font-semibold text-slate-800 mb-4">Tổng hợp chi phí</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <th className="pb-2 pr-3">Phòng ban</th>
                <th className="pb-2 pr-3 text-center">Nhân sự</th>
                <th className="pb-2 pr-3 text-right">Lương CB</th>
                <th className="pb-2 pr-3 text-right">Phụ cấp</th>
                <th className="pb-2 pr-3 text-right">Bảo hiểm</th>
                <th className="pb-2 pr-3 text-right">Thưởng DK</th>
                <th className="pb-2 text-right">Tổng</th>
              </tr>
            </thead>
            <tbody>
              {state.costProjections.map(c => (
                <tr key={c.department} className="border-b border-slate-50">
                  <td className="py-2.5 pr-3 font-medium text-slate-700">{c.department}</td>
                  <td className="py-2.5 pr-3 text-center text-slate-500">{c.headcount}</td>
                  <td className="py-2.5 pr-3 text-right text-slate-700">{formatCurrency(c.totalBaseSalary)}</td>
                  <td className="py-2.5 pr-3 text-right text-slate-500">{formatCurrency(c.totalAllowances)}</td>
                  <td className="py-2.5 pr-3 text-right text-slate-500">{formatCurrency(c.totalInsurance)}</td>
                  <td className="py-2.5 pr-3 text-right text-emerald-600">{formatCurrency(c.projectedBonusPool)}</td>
                  <td className="py-2.5 text-right text-blue-600 font-bold">{formatCurrency(c.totalCost)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-slate-200 font-bold">
                <td className="py-2.5 pr-3 text-slate-800">Tổng cộng</td>
                <td className="py-2.5 pr-3 text-center text-slate-800">{totalHeadcount}</td>
                <td className="py-2.5 pr-3 text-right text-slate-800">{formatCurrency(state.costProjections.reduce((s, c) => s + c.totalBaseSalary, 0))}</td>
                <td className="py-2.5 pr-3 text-right text-slate-800">{formatCurrency(state.costProjections.reduce((s, c) => s + c.totalAllowances, 0))}</td>
                <td className="py-2.5 pr-3 text-right text-slate-800">{formatCurrency(state.costProjections.reduce((s, c) => s + c.totalInsurance, 0))}</td>
                <td className="py-2.5 pr-3 text-right text-emerald-700">{formatCurrency(totalBonus)}</td>
                <td className="py-2.5 text-right text-blue-700">{formatCurrency(totalCost)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
