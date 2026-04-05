"use client";

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { EmployeeKPICard } from '@/lib/cascade-types';
import { formatCurrency } from '@/lib/format';

interface KPIScorecardTableProps {
  card: EmployeeKPICard;
}

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  exceeded: { bg: 'bg-green-100', text: 'text-green-700', label: 'Vượt' },
  met: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Đạt' },
  near: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Gần đạt' },
  behind: { bg: 'bg-red-100', text: 'text-red-700', label: 'Chưa đạt' },
};

export default function KPIScorecardTable({ card }: KPIScorecardTableProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Chart data for KPI achievement
  const chartData = card.kpis.map(k => ({
    name: k.name.length > 15 ? k.name.slice(0, 15) + '...' : k.name,
    'Đạt được': k.achievement,
    fill: k.status === 'exceeded' ? '#10b981' : k.status === 'met' ? '#3b82f6' : k.status === 'near' ? '#f59e0b' : '#ef4444',
  }));

  return (
    <div>
      {/* Summary header */}
      <div className="flex items-center gap-4 mb-4 p-3 bg-slate-50 rounded-lg">
        <div className="text-center">
          <p className="text-2xl font-bold text-slate-800">{card.totalWeightedScore}%</p>
          <p className="text-[10px] text-slate-500">Điểm tổng hợp</p>
        </div>
        <div className="h-10 w-px bg-slate-200" />
        <div className="text-center">
          <p className={`text-lg font-bold ${card.bonusTier === 'Xuất sắc' ? 'text-green-600' : card.bonusTier === 'Giỏi' ? 'text-blue-600' : 'text-orange-600'}`}>
            {card.bonusTier}
          </p>
          <p className="text-[10px] text-slate-500">Xếp loại</p>
        </div>
        <div className="h-10 w-px bg-slate-200" />
        <div className="text-center">
          <p className="text-lg font-bold text-emerald-600">{formatCurrency(card.bonusAmount)} đ</p>
          <p className="text-[10px] text-slate-500">Thưởng ({Math.round(card.bonusRate * 100)}%)</p>
        </div>
      </div>

      {/* KPI table */}
      <table className="w-full text-sm mb-4">
        <thead>
          <tr className="text-left text-[10px] text-slate-500 uppercase tracking-wider border-b-2 border-slate-200">
            <th className="pb-2 pr-2">KPI</th>
            <th className="pb-2 pr-2 text-center">Trọng số</th>
            <th className="pb-2 pr-2 text-right">Mục tiêu</th>
            <th className="pb-2 pr-2 text-right">Thực tế</th>
            <th className="pb-2 pr-2 text-center">Đạt %</th>
            <th className="pb-2 text-center">Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {card.kpis.map(k => {
            const sc = statusColors[k.status];
            return (
              <tr key={k.id} className="border-b border-slate-50">
                <td className="py-2.5 pr-2 text-[12px] font-medium text-slate-700">{k.name}</td>
                <td className="py-2.5 pr-2 text-center text-[12px] text-slate-500">{k.weight}%</td>
                <td className="py-2.5 pr-2 text-right text-[12px] text-slate-600">{k.target.toLocaleString('vi-VN')} {k.unit}</td>
                <td className="py-2.5 pr-2 text-right text-[12px] font-medium text-slate-800">{k.actual.toLocaleString('vi-VN')} {k.unit}</td>
                <td className="py-2.5 pr-2 text-center">
                  <span className={`text-[11px] font-bold ${k.achievement >= 100 ? 'text-green-600' : k.achievement >= 80 ? 'text-blue-600' : 'text-orange-600'}`}>
                    {k.achievement}%
                  </span>
                </td>
                <td className="py-2.5 text-center">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>{sc.label}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* KPI Achievement Chart */}
      {mounted && (
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" domain={[0, 120]} tick={{ fontSize: 10 }} tickFormatter={v => `${v}%`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={120} />
              <Tooltip formatter={(v: number) => [`${v}%`, 'Đạt']} />
              <Bar dataKey="Đạt được" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
