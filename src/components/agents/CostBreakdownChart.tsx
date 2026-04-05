"use client";

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { CostProjection } from '@/lib/agent-types';

interface CostBreakdownChartProps {
  projections: CostProjection[];
}

export default function CostBreakdownChart({ projections }: CostBreakdownChartProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const data = projections.map(p => ({
    name: p.department.replace('Phòng ', ''),
    'Lương cơ bản': Math.round(p.totalBaseSalary / 1_000_000),
    'Phụ cấp': Math.round(p.totalAllowances / 1_000_000),
    'Bảo hiểm': Math.round(p.totalInsurance / 1_000_000),
    'Thưởng dự kiến': Math.round(p.projectedBonusPool / 1_000_000),
  }));

  if (!mounted) return <div className="h-[300px] bg-slate-50 rounded-lg animate-pulse" />;

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}M`} />
          <Tooltip formatter={(value: number) => [`${value}M VND`, '']} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="Lương cơ bản" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} isAnimationActive={false} />
          <Bar dataKey="Phụ cấp" stackId="a" fill="#8b5cf6" isAnimationActive={false} />
          <Bar dataKey="Bảo hiểm" stackId="a" fill="#f59e0b" isAnimationActive={false} />
          <Bar dataKey="Thưởng dự kiến" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
