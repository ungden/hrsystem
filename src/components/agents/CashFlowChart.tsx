"use client";

import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { CashFlowMonth } from '@/lib/financial-types';

interface CashFlowChartProps {
  cashFlows: CashFlowMonth[];
  type?: 'cumulative' | 'waterfall';
}

export default function CashFlowChart({ cashFlows, type = 'cumulative' }: CashFlowChartProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return <div className="h-[300px] bg-slate-50 rounded-lg animate-pulse" />;

  if (type === 'cumulative') {
    const data = cashFlows.map(cf => ({
      month: cf.month,
      'Số dư': Math.round(cf.soDuCuoiKy / 1_000_000),
    }));

    return (
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}M`} />
            <Tooltip formatter={(value: number) => [`${value}M VND`, '']} />
            <Area type="monotone" dataKey="Số dư" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // Waterfall view
  const data = cashFlows.map(cf => ({
    month: cf.month,
    'Kinh doanh': Math.round(cf.hoatDongKinhDoanh.dongTienKinhDoanh / 1_000_000),
    'Đầu tư': Math.round(cf.hoatDongDauTu.dongTienDauTu / 1_000_000),
    'Tài chính': Math.round(cf.hoatDongTaiChinh.dongTienTaiChinh / 1_000_000),
  }));

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}M`} />
          <Tooltip formatter={(value: number) => [`${value}M VND`, '']} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="Kinh doanh" fill="#10b981" radius={[3, 3, 0, 0]} />
          <Bar dataKey="Đầu tư" fill="#f59e0b" radius={[3, 3, 0, 0]} />
          <Bar dataKey="Tài chính" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
