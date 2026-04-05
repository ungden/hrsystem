"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { DollarSign, TrendingUp, PiggyBank, Receipt, ArrowRight } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import IncomeStatementChart from '@/components/agents/IncomeStatementChart';
import IncomeStatementTable from '@/components/agents/IncomeStatementTable';
import BalanceSheetView from '@/components/agents/BalanceSheetView';
import CashFlowChart from '@/components/agents/CashFlowChart';
import { runFullCoordination } from '@/lib/agents/coordinator';
import { formatCurrency } from '@/lib/mock-data';

export default function FinancialHubPage() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'pnl' | 'bs' | 'cf'>('pnl');
  useEffect(() => { setMounted(true); }, []);

  const state = useMemo(() => runFullCoordination(2026, 'Q2'), []);
  const { incomeStatements, balanceSheet, cashFlows } = state.financials;

  const lastMonth = incomeStatements[incomeStatements.length - 1];
  const totalRevenue12m = incomeStatements.reduce((s, m) => s + m.doanhThu.tongDoanhThu, 0);
  const totalProfit12m = incomeStatements.reduce((s, m) => s + m.loiNhuanSauThue, 0);
  const lastCashFlow = cashFlows[cashFlows.length - 1];

  const tabs = [
    { key: 'pnl' as const, label: 'Kết quả Kinh doanh', href: '/admin/bao-cao-tai-chinh/ket-qua-kinh-doanh' },
    { key: 'bs' as const, label: 'Cân đối Kế toán', href: '/admin/bao-cao-tai-chinh/can-doi-ke-toan' },
    { key: 'cf' as const, label: 'Lưu chuyển Tiền tệ', href: '/admin/bao-cao-tai-chinh/luu-chuyen-tien-te' },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="Báo cáo Tài chính"
        subtitle="3 bảng tài chính: Kết quả Kinh doanh, Cân đối Kế toán, Lưu chuyển Tiền tệ"
        breadcrumbs={[
          { label: 'AI Agents', href: '/admin' },
          { label: 'Báo cáo tài chính' },
        ]}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={DollarSign} label="Doanh thu 12 tháng" value={`${(totalRevenue12m / 1_000_000_000).toFixed(1)} tỷ`} color="green" />
        <StatCard icon={TrendingUp} label="Lợi nhuận 12 tháng" value={`${(totalProfit12m / 1_000_000_000).toFixed(2)} tỷ`} color="blue" />
        <StatCard icon={PiggyBank} label="Tổng tài sản" value={`${(balanceSheet.data.tongTaiSan / 1_000_000_000).toFixed(1)} tỷ`} color="purple" />
        <StatCard icon={Receipt} label="Tiền mặt hiện tại" value={`${(lastCashFlow.soDuCuoiKy / 1_000_000_000).toFixed(2)} tỷ`} color="orange" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-slate-100 rounded-lg p-1">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
              activeTab === tab.key ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'pnl' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-800">Doanh thu - Chi phí - Lợi nhuận (12 tháng)</h2>
              <Link href="/admin/bao-cao-tai-chinh/ket-qua-kinh-doanh" className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
                Chi tiết <ArrowRight size={12} />
              </Link>
            </div>
            {mounted && <IncomeStatementChart statements={incomeStatements} />}
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-base font-semibold text-slate-800 mb-4">Báo cáo Kết quả Kinh doanh (6 tháng gần nhất)</h2>
            <IncomeStatementTable statements={incomeStatements} compact />
          </div>
        </div>
      )}

      {activeTab === 'bs' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-800">Bảng Cân đối Kế toán - {balanceSheet.month}</h2>
            <Link href="/admin/bao-cao-tai-chinh/can-doi-ke-toan" className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
              Chi tiết <ArrowRight size={12} />
            </Link>
          </div>
          <BalanceSheetView balanceSheet={balanceSheet} />
        </div>
      )}

      {activeTab === 'cf' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-800">Dòng tiền lũy kế</h2>
              <Link href="/admin/bao-cao-tai-chinh/luu-chuyen-tien-te" className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
                Chi tiết <ArrowRight size={12} />
              </Link>
            </div>
            {mounted && <CashFlowChart cashFlows={cashFlows} type="cumulative" />}
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-base font-semibold text-slate-800 mb-4">Dòng tiền theo hoạt động</h2>
            {mounted && <CashFlowChart cashFlows={cashFlows} type="waterfall" />}
          </div>
        </div>
      )}
    </div>
  );
}
