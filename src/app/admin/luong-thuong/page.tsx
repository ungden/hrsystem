"use client";

import { useState, useEffect } from 'react';
import { DollarSign, Gift, Users, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import SalaryProjectionTable from '@/components/agents/SalaryProjectionTable';
import { runFullCoordination } from '@/lib/agents/coordinator';
import { formatCurrency } from '@/lib/format';

export default function SalaryProjectionPage() {
  const [mounted, setMounted] = useState(false);
  const [state, setState] = useState<any>(null);
  useEffect(() => { setMounted(true); runFullCoordination(2026, 'Q2').then(s => setState(s)); }, []);
  if (!state) return <div className="p-6"><PageHeader title="Lương & Thưởng" subtitle="Đang tải..." breadcrumbs={[]} /><div className="animate-pulse h-96 bg-slate-100 rounded-xl" /></div>;
  const projections = state.salaryProjections;

  const totalSalary = projections.reduce((s: number, p: any) => s + p.projectedTotal, 0);
  const totalBonus = projections.reduce((s: number, p: any) => s + p.projectedBonus, 0);
  const avgPerPerson = projections.length > 0 ? Math.round(totalSalary / projections.length) : 0;
  const maxSalary = Math.max(...projections.map((p: any) => p.projectedTotal));

  // Top 10 by total compensation
  const top10 = [...projections]
    .sort((a: any, b: any) => b.projectedTotal - a.projectedTotal)
    .slice(0, 10)
    .map((p: any) => ({
      name: p.employeeName.split(' ').slice(-2).join(' '),
      'Lương CB': Math.round(p.baseSalary / 1_000_000),
      'Thưởng': Math.round(p.projectedBonus / 1_000_000),
      'Phụ cấp': Math.round(p.allowances / 1_000_000),
    }));

  return (
    <div className="p-6">
      <PageHeader
        title="Dự báo lương thưởng"
        subtitle="Lương cơ bản + thưởng dự kiến theo hiệu suất hoàn thành mục tiêu"
        breadcrumbs={[
          { label: 'AI Agents', href: '/admin' },
          { label: 'Dự báo lương thưởng' },
        ]}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={DollarSign}
          label="Tổng lương thưởng/tháng"
          value={`${(totalSalary / 1_000_000).toFixed(0)}M`}
          color="blue"
        />
        <StatCard
          icon={Gift}
          label="Tổng thưởng dự kiến"
          value={`${(totalBonus / 1_000_000).toFixed(0)}M`}
          color="green"
        />
        <StatCard
          icon={Users}
          label="Bình quân/người"
          value={`${(avgPerPerson / 1_000_000).toFixed(1)}M`}
          color="purple"
        />
        <StatCard
          icon={TrendingUp}
          label="Thu nhập cao nhất"
          value={`${(maxSalary / 1_000_000).toFixed(1)}M`}
          color="orange"
        />
      </div>

      {/* Top 10 Chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <h2 className="text-base font-semibold text-slate-800 mb-4">Top 10 thu nhập dự kiến cao nhất</h2>
        <div className="h-[300px]">
          {mounted && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top10} margin={{ top: 5, right: 20, left: 10, bottom: 5 }} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}M`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                <Tooltip formatter={(value: number) => [`${value}M VND`, '']} />
                <Bar dataKey="Lương CB" stackId="a" fill="#3b82f6" />
                <Bar dataKey="Thưởng" stackId="a" fill="#10b981" />
                <Bar dataKey="Phụ cấp" stackId="a" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Full Table */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-base font-semibold text-slate-800 mb-4">Chi tiết lương thưởng toàn bộ nhân viên</h2>
        <SalaryProjectionTable projections={projections} />
      </div>
    </div>
  );
}
