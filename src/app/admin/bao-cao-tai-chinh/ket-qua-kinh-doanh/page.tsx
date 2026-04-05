"use client";

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import PageHeader from '@/components/PageHeader';
import IncomeStatementChart from '@/components/agents/IncomeStatementChart';
import IncomeStatementTable from '@/components/agents/IncomeStatementTable';
import { runFullCoordination } from '@/lib/agents/coordinator';
import { formatCurrency } from '@/lib/format';

export default function PnLDetailPage() {
  const [mounted, setMounted] = useState(false);
  const [state, setState] = useState<any>(null);
  useEffect(() => { setMounted(true); runFullCoordination(2026, 'Q2').then(s => setState(s)); }, []);
  if (!state) return <div className="p-6"><PageHeader title="Kết quả Kinh doanh" subtitle="Đang tải..." breadcrumbs={[]} /><div className="animate-pulse h-96 bg-slate-100 rounded-xl" /></div>;
  const statements = state.financials.incomeStatements;

  // Budget variance data
  const varianceData = statements.slice(-6).map((m: any) => ({
    month: m.month,
    'Thực tế': Math.round(m.doanhThu.tongDoanhThu / 1_000_000),
    'Ngân sách': Math.round(m.nganSachDoanhThu / 1_000_000),
    'Chênh lệch': Math.round((m.doanhThu.tongDoanhThu - m.nganSachDoanhThu) / 1_000_000),
  }));

  // Revenue by department
  const revenueByDept = statements.slice(-6).map((m: any) => ({
    month: m.month,
    'Kinh doanh': Math.round(m.doanhThu.kinhdoanh / 1_000_000),
    'Marketing': Math.round(m.doanhThu.marketing / 1_000_000),
    'CNTT': Math.round(m.doanhThu.cntt / 1_000_000),
    'Khác': Math.round(m.doanhThu.khac / 1_000_000),
  }));

  return (
    <div className="p-6">
      <PageHeader
        title="Báo cáo Kết quả Kinh doanh"
        subtitle="Income Statement / P&L - Chi tiết doanh thu, chi phí và lợi nhuận"
        breadcrumbs={[
          { label: 'AI Agents', href: '/admin' },
          { label: 'Báo cáo tài chính', href: '/admin/bao-cao-tai-chinh' },
          { label: 'Kết quả kinh doanh' },
        ]}
      />

      {/* Trend chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <h2 className="text-base font-semibold text-slate-800 mb-4">Xu hướng Doanh thu - Chi phí - Lợi nhuận</h2>
        {mounted && <IncomeStatementChart statements={statements} />}
      </div>

      {/* Two column charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-base font-semibold text-slate-800 mb-4">Doanh thu theo nguồn</h2>
          {mounted && (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueByDept}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${v}M`} />
                  <Tooltip formatter={(v: number) => [`${v}M VND`, '']} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Kinh doanh" stackId="a" fill="#f59e0b" isAnimationActive={false} />
                  <Bar dataKey="Marketing" stackId="a" fill="#ec4899" isAnimationActive={false} />
                  <Bar dataKey="CNTT" stackId="a" fill="#10b981" isAnimationActive={false} />
                  <Bar dataKey="Khác" stackId="a" fill="#8b5cf6" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-base font-semibold text-slate-800 mb-4">Thực tế vs Ngân sách</h2>
          {mounted && (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={varianceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${v}M`} />
                  <Tooltip formatter={(v: number) => [`${v}M VND`, '']} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Thực tế" fill="#3b82f6" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  <Bar dataKey="Ngân sách" fill="#e2e8f0" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Full table */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-base font-semibold text-slate-800 mb-4">Bảng Kết quả Kinh doanh đầy đủ (12 tháng)</h2>
        <IncomeStatementTable statements={statements} />
      </div>
    </div>
  );
}
