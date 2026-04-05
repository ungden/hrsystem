"use client";

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { BusinessTarget, CostProjection } from '@/lib/agent-types';

interface RevenueVsCostChartProps {
  targets: BusinessTarget[];
  costs: CostProjection[];
}

export default function RevenueVsCostChart({ targets, costs }: RevenueVsCostChartProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const revenueTarget = targets.find(t => t.category === 'revenue');
  const totalCost = costs.reduce((s, c) => s + c.totalCost, 0);
  const totalBase = costs.reduce((s, c) => s + c.totalBaseSalary, 0);
  const totalBonus = costs.reduce((s, c) => s + c.projectedBonusPool, 0);

  const data = [
    {
      name: 'Doanh thu MT',
      value: Math.round((revenueTarget?.targetValue || 0) / 1_000_000),
      fill: '#10b981',
    },
    {
      name: 'Doanh thu HT',
      value: Math.round((revenueTarget?.currentValue || 0) / 1_000_000),
      fill: '#3b82f6',
    },
    {
      name: 'Chi phí NS',
      value: Math.round(totalCost / 1_000_000),
      fill: '#f59e0b',
    },
    {
      name: 'Lương CB',
      value: Math.round(totalBase / 1_000_000),
      fill: '#8b5cf6',
    },
    {
      name: 'Thưởng DK',
      value: Math.round(totalBonus / 1_000_000),
      fill: '#ec4899',
    },
  ];

  if (!mounted) return <div className="h-[300px] bg-slate-50 rounded-lg animate-pulse" />;

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}M`} />
          <Tooltip formatter={(value: number) => [`${value}M VND`, '']} />
          <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]}>
            {data.map((entry, index) => (
              <rect key={index} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
