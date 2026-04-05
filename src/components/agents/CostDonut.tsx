"use client";

import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { CostProjection } from '@/lib/agent-types';

interface CostDonutProps {
  projections: CostProjection[];
}

export default function CostDonut({ projections }: CostDonutProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const totalBase = projections.reduce((s, p) => s + p.totalBaseSalary, 0);
  const totalAllowances = projections.reduce((s, p) => s + p.totalAllowances, 0);
  const totalInsurance = projections.reduce((s, p) => s + p.totalInsurance, 0);
  const totalBonus = projections.reduce((s, p) => s + p.projectedBonusPool, 0);

  const data = [
    { name: 'Lương cơ bản', value: Math.round(totalBase / 1_000_000), color: '#3b82f6' },
    { name: 'Phụ cấp', value: Math.round(totalAllowances / 1_000_000), color: '#8b5cf6' },
    { name: 'Bảo hiểm', value: Math.round(totalInsurance / 1_000_000), color: '#f59e0b' },
    { name: 'Thưởng DK', value: Math.round(totalBonus / 1_000_000), color: '#10b981' },
  ];

  if (!mounted) return <div className="h-[250px] bg-slate-50 rounded-lg animate-pulse" />;

  return (
    <div className="h-[250px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            dataKey="value"
            nameKey="name"
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            labelLine={true}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number) => [`${value}M VND`, '']} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
