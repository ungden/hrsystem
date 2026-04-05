"use client";

import { useState, useEffect } from 'react';
import PageHeader from '@/components/PageHeader';
import BalanceSheetView from '@/components/agents/BalanceSheetView';
import FinancialHealthGauges from '@/components/agents/FinancialHealthGauges';
import { runFullCoordination } from '@/lib/agents/coordinator';
import { formatCurrency } from '@/lib/format';

export default function BalanceSheetDetailPage() {
  const [state, setState] = useState<any>(null);
  useEffect(() => { runFullCoordination(2026, 'Q2').then(s => setState(s)); }, []);
  if (!state) return <div className="p-6"><PageHeader title="Bảng Cân đối Kế toán" subtitle="Đang tải..." breadcrumbs={[]} /><div className="animate-pulse h-96 bg-slate-100 rounded-xl" /></div>;
  const { balanceSheet } = state.financials;
  const bs = balanceSheet.data;

  return (
    <div className="p-6">
      <PageHeader
        title="Bảng Cân đối Kế toán"
        subtitle={`Balance Sheet tại ${balanceSheet.month} - Tài sản = Nợ phải trả + Vốn chủ sở hữu`}
        breadcrumbs={[
          { label: 'AI Agents', href: '/admin' },
          { label: 'Báo cáo tài chính', href: '/admin/bao-cao-tai-chinh' },
          { label: 'Cân đối kế toán' },
        ]}
      />

      {/* Financial Health Gauges */}
      <div className="mb-6">
        <h2 className="text-base font-semibold text-slate-800 mb-3">Chỉ số sức khỏe tài chính</h2>
        <FinancialHealthGauges metrics={state.financialHealth} />
      </div>

      {/* Balance Sheet */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <h2 className="text-base font-semibold text-slate-800 mb-4">Bảng Cân đối Kế toán - {balanceSheet.month}</h2>
        <BalanceSheetView balanceSheet={balanceSheet} />
      </div>

      {/* Key Ratios Summary */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-base font-semibold text-slate-800 mb-4">Tóm tắt cấu trúc tài chính</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-blue-700">{formatCurrency(bs.tongTaiSan)}</p>
            <p className="text-xs text-blue-500 mt-1">Tổng tài sản</p>
            <p className="text-[10px] text-blue-400 mt-0.5">Ngắn hạn: {Math.round(bs.taiSanNganHan.tongNganHan / bs.tongTaiSan * 100)}% | Dài hạn: {Math.round(bs.taiSanDaiHan.tongDaiHan / bs.tongTaiSan * 100)}%</p>
          </div>
          <div className="bg-red-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-red-700">{formatCurrency(bs.noPhaiTra.tongNoPhaiTra)}</p>
            <p className="text-xs text-red-500 mt-1">Tổng nợ phải trả</p>
            <p className="text-[10px] text-red-400 mt-0.5">{Math.round(bs.noPhaiTra.tongNoPhaiTra / bs.tongTaiSan * 100)}% tổng tài sản</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-green-700">{formatCurrency(bs.vonChuSoHuu.tongVon)}</p>
            <p className="text-xs text-green-500 mt-1">Vốn chủ sở hữu</p>
            <p className="text-[10px] text-green-400 mt-0.5">{Math.round(bs.vonChuSoHuu.tongVon / bs.tongTaiSan * 100)}% tổng tài sản</p>
          </div>
        </div>
      </div>
    </div>
  );
}
