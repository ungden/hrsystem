"use client";

import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { IncomeStatementMonth } from '@/lib/financial-types';

interface DeptContributionAreaProps {
  statements: IncomeStatementMonth[];
}

export default function DeptContributionArea({ statements }: DeptContributionAreaProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const data = statements.map(m => ({
    month: m.month,
    'Kinh doanh': Math.round(m.doanhThu.kinhdoanh / 1_000_000),
    'Marketing': Math.round(m.doanhThu.marketing / 1_000_000),
    'CNTT': Math.round(m.doanhThu.cntt / 1_000_000),
    'Khác': Math.round(m.doanhThu.khac / 1_000_000),
  }));

  if (!mounted) return <div className="h-[280px] bg-slate-50 rounded-lg animate-pulse" />;

  return (
    <div className="h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="month" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v}M`} />
          <Tooltip formatter={(v: number) => [`${v}M VND`, '']} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Area type="monotone" dataKey="Kinh doanh" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} />
          <Area type="monotone" dataKey="Marketing" stackId="1" stroke="#ec4899" fill="#ec4899" fillOpacity={0.6} />
          <Area type="monotone" dataKey="CNTT" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
          <Area type="monotone" dataKey="Khác" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
