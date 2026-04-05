"use client";

import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { SalaryProjection } from '@/lib/agent-types';

interface SalaryBreakdownPieProps {
  projection: SalaryProjection;
}

export default function SalaryBreakdownPie({ projection }: SalaryBreakdownPieProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const data = [
    { name: 'Lương cơ bản', value: projection.baseSalary, color: '#3b82f6' },
    { name: 'Phụ cấp', value: projection.allowances, color: '#8b5cf6' },
    { name: 'Thưởng DK', value: projection.projectedBonus, color: '#10b981' },
    { name: 'Bảo hiểm', value: Math.abs(projection.insurance), color: '#f59e0b' },
  ].filter(d => d.value > 0);

  if (!mounted) return <div className="h-[250px] bg-slate-50 rounded-lg animate-pulse" />;

  return (
    <div className="h-[250px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            dataKey="value"
            nameKey="name"
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            labelLine={true}
          >
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number) => [`${new Intl.NumberFormat('vi-VN').format(value)} đ`, '']} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
