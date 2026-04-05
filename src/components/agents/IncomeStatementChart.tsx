"use client";

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { IncomeStatementMonth } from '@/lib/financial-types';

interface IncomeStatementChartProps {
  statements: IncomeStatementMonth[];
}

export default function IncomeStatementChart({ statements }: IncomeStatementChartProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const data = statements.map(m => ({
    month: m.month,
    'Doanh thu': Math.round(m.doanhThu.tongDoanhThu / 1_000_000),
    'Chi phí': Math.round(m.chiPhi.tongChiPhi / 1_000_000),
    'Lợi nhuận': Math.round(m.loiNhuanSauThue / 1_000_000),
    'Ngân sách DT': Math.round(m.nganSachDoanhThu / 1_000_000),
  }));

  if (!mounted) return <div className="h-[300px] bg-slate-50 rounded-lg animate-pulse" />;

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}M`} />
          <Tooltip formatter={(value: number) => [`${value}M VND`, '']} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line type="monotone" dataKey="Doanh thu" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="Chi phí" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="Lợi nhuận" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4 }} />
          <Line type="monotone" dataKey="Ngân sách DT" stroke="#10b981" strokeWidth={1} strokeDasharray="5 5" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
