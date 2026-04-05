"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DollarSign, TrendingUp, PiggyBank, Receipt, ArrowRight, Loader2 } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import { getMonthlyPnL } from '@/lib/supabase-data';
import { generateAllFinancials } from '@/lib/financial-data';
import BalanceSheetView from '@/components/agents/BalanceSheetView';
import CashFlowChart from '@/components/agents/CashFlowChart';

function formatCurrency(n: number) {
  return new Intl.NumberFormat('vi-VN').format(n);
}
function formatM(n: number) {
  return `${(n / 1_000_000).toFixed(0)}M`;
}

interface PnLRow {
  id: string;
  month: string;
  year: number;
  revenue_shopee: number;
  revenue_tiktok: number;
  revenue_website: number;
  revenue_fbig: number;
  revenue_b2b: number;
  total_revenue: number;
  cogs: number;
  gross_profit: number;
  expense_ads: number;
  expense_platform_fees: number;
  expense_shipping: number;
  expense_hr: number;
  expense_rent: number;
  expense_tools: number;
  expense_other: number;
  total_expenses: number;
  ebitda: number;
  tax_vat: number;
  tax_cit: number;
  net_profit: number;
  orders_count: number;
  avg_order_value: number;
  return_rate: number;
}

export default function FinancialHubPage() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'pnl' | 'bs' | 'cf'>('pnl');
  const [pnlData, setPnlData] = useState<PnLRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [financials, setFinancials] = useState<{ balanceSheet: any; cashFlows: any[] } | null>(null);

  useEffect(() => {
    setMounted(true);
    async function load() {
      try {
        const [data, fin] = await Promise.all([
          getMonthlyPnL(),
          generateAllFinancials(),
        ]);
        setPnlData(data);
        setFinancials(fin);
      } catch (e) {
        console.error('Failed to load financial data:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const totalRevenue = pnlData.reduce((s, m) => s + (m.total_revenue || 0), 0);
  const totalProfit = pnlData.reduce((s, m) => s + (m.net_profit || 0), 0);
  const totalOrders = pnlData.reduce((s, m) => s + (m.orders_count || 0), 0);
  const avgMargin = totalRevenue > 0 ? Math.round(totalProfit / totalRevenue * 100) : 0;

  // Balance sheet & cash flows from async generateAllFinancials
  const balanceSheet = financials?.balanceSheet;
  const cashFlows = financials?.cashFlows || [];
  const lastCashFlow = cashFlows[cashFlows.length - 1];

  const tabs = [
    { key: 'pnl' as const, label: 'Kết quả Kinh doanh' },
    { key: 'bs' as const, label: 'Cân đối Kế toán' },
    { key: 'cf' as const, label: 'Lưu chuyển Tiền tệ' },
  ];

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-3 text-slate-500">Đang tải báo cáo tài chính...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Báo cáo Tài chính"
        subtitle={`${pnlData.length} tháng P&L từ Supabase | Balance Sheet & Cash Flow (projected)`}
        breadcrumbs={[
          { label: 'AI Agents', href: '/admin' },
          { label: 'Báo cáo tài chính' },
        ]}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={DollarSign} label={`Doanh thu ${pnlData.length} tháng`} value={`${(totalRevenue / 1_000_000_000).toFixed(2)} tỷ`} color="green" />
        <StatCard icon={TrendingUp} label="Lợi nhuận ròng" value={`${(totalProfit / 1_000_000).toFixed(0)}M`} color="blue" />
        <StatCard icon={PiggyBank} label="Biên LN ròng" value={`${avgMargin}%`} color="purple" />
        <StatCard icon={Receipt} label="Tổng đơn hàng" value={formatCurrency(totalOrders)} color="orange" />
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
          {/* Revenue by Channel Chart - simple bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-base font-semibold text-slate-800 mb-4">Doanh thu theo kênh bán hàng</h2>
            <div className="grid grid-cols-5 gap-3">
              {['Website', 'FB/IG', 'TikTok', 'Shopee', 'B2B'].map((ch, i) => {
                const keys = ['revenue_website', 'revenue_fbig', 'revenue_tiktok', 'revenue_shopee', 'revenue_b2b'] as const;
                const total = pnlData.reduce((s, m) => s + ((m as unknown as Record<string, number>)[keys[i]] || 0), 0);
                const pct = totalRevenue > 0 ? Math.round(total / totalRevenue * 100) : 0;
                const colors = ['bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-orange-500', 'bg-green-500'];
                return (
                  <div key={ch} className="text-center">
                    <div className="h-24 flex items-end justify-center mb-2">
                      <div className={`w-10 ${colors[i]} rounded-t-md`} style={{ height: `${Math.max(10, pct)}%` }} />
                    </div>
                    <p className="text-[11px] font-semibold text-slate-700">{ch}</p>
                    <p className="text-[10px] text-slate-500">{formatM(total)}</p>
                    <p className="text-[10px] text-slate-400">{pct}%</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* P&L Table */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-base font-semibold text-slate-800 mb-4">Báo cáo Kết quả Kinh doanh</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="text-left text-[10px] text-slate-500 uppercase tracking-wider border-b-2 border-slate-200">
                    <th className="pb-2 pr-3 sticky left-0 bg-white">Chỉ tiêu</th>
                    {pnlData.map(m => (
                      <th key={m.id} className="pb-2 px-2 text-right min-w-[90px]">{m.month}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Revenue */}
                  <tr className="font-bold text-blue-700 bg-blue-50/50">
                    <td className="py-1.5 pr-3 sticky left-0 bg-blue-50/50">Doanh thu</td>
                    {pnlData.map(m => <td key={m.id} className="py-1.5 px-2 text-right">{formatM(m.total_revenue)}</td>)}
                  </tr>
                  {[
                    { label: '  Website', key: 'revenue_website' },
                    { label: '  FB/IG', key: 'revenue_fbig' },
                    { label: '  TikTok', key: 'revenue_tiktok' },
                    { label: '  Shopee', key: 'revenue_shopee' },
                    { label: '  B2B', key: 'revenue_b2b' },
                  ].map(row => (
                    <tr key={row.key} className="text-slate-600">
                      <td className="py-1 pr-3 pl-4 sticky left-0 bg-white">{row.label}</td>
                      {pnlData.map(m => <td key={m.id} className="py-1 px-2 text-right">{formatM((m as unknown as Record<string, number>)[row.key] || 0)}</td>)}
                    </tr>
                  ))}

                  {/* COGS */}
                  <tr className="text-red-600">
                    <td className="py-1.5 pr-3 sticky left-0 bg-white font-medium">Giá vốn (COGS)</td>
                    {pnlData.map(m => <td key={m.id} className="py-1.5 px-2 text-right">-{formatM(m.cogs)}</td>)}
                  </tr>

                  {/* Gross Profit */}
                  <tr className="font-bold text-green-700 bg-green-50/30 border-t border-slate-200">
                    <td className="py-1.5 pr-3 sticky left-0 bg-green-50/30">Lãi gộp</td>
                    {pnlData.map(m => <td key={m.id} className="py-1.5 px-2 text-right">{formatM(m.gross_profit)}</td>)}
                  </tr>

                  {/* Operating Expenses */}
                  <tr className="font-bold text-orange-700 bg-orange-50/30">
                    <td className="py-1.5 pr-3 sticky left-0 bg-orange-50/30">Chi phí hoạt động</td>
                    {pnlData.map(m => <td key={m.id} className="py-1.5 px-2 text-right">-{formatM(m.total_expenses)}</td>)}
                  </tr>
                  {[
                    { label: '  Quảng cáo', key: 'expense_ads' },
                    { label: '  Phí sàn', key: 'expense_platform_fees' },
                    { label: '  Vận chuyển', key: 'expense_shipping' },
                    { label: '  Nhân sự', key: 'expense_hr' },
                    { label: '  Thuê VP', key: 'expense_rent' },
                    { label: '  Công cụ', key: 'expense_tools' },
                    { label: '  Khác', key: 'expense_other' },
                  ].map(row => (
                    <tr key={row.key} className="text-slate-600">
                      <td className="py-1 pr-3 pl-4 sticky left-0 bg-white">{row.label}</td>
                      {pnlData.map(m => <td key={m.id} className="py-1 px-2 text-right">-{formatM((m as unknown as Record<string, number>)[row.key] || 0)}</td>)}
                    </tr>
                  ))}

                  {/* EBITDA */}
                  <tr className="font-bold text-purple-700 bg-purple-50/30 border-t border-slate-200">
                    <td className="py-1.5 pr-3 sticky left-0 bg-purple-50/30">EBITDA</td>
                    {pnlData.map(m => <td key={m.id} className="py-1.5 px-2 text-right">{formatM(m.ebitda)}</td>)}
                  </tr>

                  {/* Taxes */}
                  <tr className="text-slate-600">
                    <td className="py-1 pr-3 pl-2 sticky left-0 bg-white">Thuế VAT</td>
                    {pnlData.map(m => <td key={m.id} className="py-1 px-2 text-right">-{formatM(m.tax_vat)}</td>)}
                  </tr>
                  <tr className="text-slate-600">
                    <td className="py-1 pr-3 pl-2 sticky left-0 bg-white">Thuế TNDN</td>
                    {pnlData.map(m => <td key={m.id} className="py-1 px-2 text-right">-{formatM(m.tax_cit)}</td>)}
                  </tr>

                  {/* Net Profit */}
                  <tr className="font-bold text-emerald-700 bg-emerald-50/50 border-t-2 border-slate-300">
                    <td className="py-2 pr-3 sticky left-0 bg-emerald-50/50">Lợi nhuận ròng</td>
                    {pnlData.map(m => <td key={m.id} className="py-2 px-2 text-right">{formatM(m.net_profit)}</td>)}
                  </tr>

                  {/* Metrics */}
                  <tr className="text-slate-400 border-t border-dashed border-slate-200">
                    <td className="py-1 pr-3 pl-2 sticky left-0 bg-white text-[10px]">Đơn hàng</td>
                    {pnlData.map(m => <td key={m.id} className="py-1 px-2 text-right text-[10px]">{formatCurrency(m.orders_count)}</td>)}
                  </tr>
                  <tr className="text-slate-400">
                    <td className="py-1 pr-3 pl-2 sticky left-0 bg-white text-[10px]">AOV</td>
                    {pnlData.map(m => <td key={m.id} className="py-1 px-2 text-right text-[10px]">{formatM(m.avg_order_value)}</td>)}
                  </tr>
                  <tr className="text-slate-400">
                    <td className="py-1 pr-3 pl-2 sticky left-0 bg-white text-[10px]">Return %</td>
                    {pnlData.map(m => <td key={m.id} className="py-1 px-2 text-right text-[10px]">{m.return_rate}%</td>)}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'bs' && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-800">Bảng Cân đối Kế toán - {balanceSheet.month}</h2>
            <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-1 rounded">Projected</span>
          </div>
          <BalanceSheetView balanceSheet={balanceSheet} />
        </div>
      )}

      {activeTab === 'cf' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-800">Dòng tiền lũy kế</h2>
              <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-1 rounded">Projected</span>
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
