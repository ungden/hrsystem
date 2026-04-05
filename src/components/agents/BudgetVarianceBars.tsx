"use client";

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { IncomeStatementMonth } from '@/lib/financial-types';

interface BudgetVarianceBarsProps {
  statements: IncomeStatementMonth[];
}

export default function BudgetVarianceBars({ statements }: BudgetVarianceBarsProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const data = statements.slice(-6).map(m => ({
    month: m.month,
    'DT thực tế': Math.round(m.doanhThu.tongDoanhThu / 1_000_000),
    'DT ngân sách': Math.round(m.nganSachDoanhThu / 1_000_000),
    'CP thực tế': Math.round(m.chiPhi.tongChiPhi / 1_000_000),
    'CP ngân sách': Math.round(m.nganSachChiPhi / 1_000_000),
  }));

  if (!mounted) return <div className="h-[280px] bg-slate-50 rounded-lg animate-pulse" />;

  return (
    <div className="h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="month" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v}M`} />
          <Tooltip formatter={(v: number) => [`${v}M VND`, '']} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Bar dataKey="DT thực tế" fill="#10b981" radius={[3, 3, 0, 0]} />
          <Bar dataKey="DT ngân sách" fill="#10b981" fillOpacity={0.3} stroke="#10b981" strokeDasharray="3 3" radius={[3, 3, 0, 0]} />
          <Bar dataKey="CP thực tế" fill="#ef4444" radius={[3, 3, 0, 0]} />
          <Bar dataKey="CP ngân sách" fill="#ef4444" fillOpacity={0.3} stroke="#ef4444" strokeDasharray="3 3" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
