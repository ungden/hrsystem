"use client";

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { IncomeStatementMonth } from '@/lib/financial-types';

interface PnLWaterfallProps {
  statement: IncomeStatementMonth;
}

export default function PnLWaterfall({ statement }: PnLWaterfallProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const dt = statement.doanhThu.tongDoanhThu;
  const cp = statement.chiPhi.tongChiPhi;
  const ebitda = statement.ebitda;
  const kh = statement.khauHao;
  const thue = statement.thueDoanhNghiep;
  const ln = statement.loiNhuanSauThue;

  const data = [
    { name: 'Doanh thu', value: Math.round(dt / 1_000_000), fill: '#10b981', base: 0 },
    { name: 'Chi phí', value: -Math.round(cp / 1_000_000), fill: '#ef4444', base: Math.round(dt / 1_000_000) },
    { name: 'EBITDA', value: Math.round(ebitda / 1_000_000), fill: '#3b82f6', base: 0 },
    { name: 'Khấu hao', value: -Math.round(kh / 1_000_000), fill: '#f59e0b', base: Math.round(ebitda / 1_000_000) },
    { name: 'Thuế', value: -Math.round(thue / 1_000_000), fill: '#f59e0b', base: Math.round((ebitda - kh) / 1_000_000) },
    { name: 'LN ròng', value: Math.round(ln / 1_000_000), fill: ln >= 0 ? '#10b981' : '#ef4444', base: 0 },
  ];

  // For waterfall: show absolute values as bars
  const chartData = data.map(d => ({
    name: d.name,
    value: Math.abs(d.value),
    fill: d.fill,
    label: d.value >= 0 ? `${d.value}M` : `${d.value}M`,
  }));

  if (!mounted) return <div className="h-[280px] bg-slate-50 rounded-lg animate-pulse" />;

  return (
    <div className="h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 15, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v}M`} />
          <Tooltip formatter={(value: number) => [`${value}M VND`, '']} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} label={{ position: 'top', fontSize: 10, formatter: (v: number) => `${v}M` }}>
            {chartData.map((entry, index) => (
              <Cell key={index} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
