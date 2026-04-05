"use client";

import { useState, useEffect, useMemo } from 'react';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import CashFlowChart from '@/components/agents/CashFlowChart';
import { runFullCoordination } from '@/lib/agents/coordinator';
import { formatCurrency } from '@/lib/mock-data';
import { Banknote, TrendingUp, TrendingDown, Wallet } from 'lucide-react';

export default function CashFlowDetailPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const state = useMemo(() => runFullCoordination(2026, 'Q2'), []);
  const cashFlows = state.financials.cashFlows;

  const lastCF = cashFlows[cashFlows.length - 1];
  const totalOperating = cashFlows.reduce((s, cf) => s + cf.hoatDongKinhDoanh.dongTienKinhDoanh, 0);
  const totalInvesting = cashFlows.reduce((s, cf) => s + cf.hoatDongDauTu.dongTienDauTu, 0);
  const totalFinancing = cashFlows.reduce((s, cf) => s + cf.hoatDongTaiChinh.dongTienTaiChinh, 0);

  return (
    <div className="p-6">
      <PageHeader
        title="Báo cáo Lưu chuyển Tiền tệ"
        subtitle="Cash Flow Statement - Dòng tiền từ kinh doanh, đầu tư và tài chính"
        breadcrumbs={[
          { label: 'AI Agents', href: '/admin' },
          { label: 'Báo cáo tài chính', href: '/admin/bao-cao-tai-chinh' },
          { label: 'Lưu chuyển tiền tệ' },
        ]}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Wallet} label="Tiền mặt hiện tại" value={`${(lastCF.soDuCuoiKy / 1_000_000_000).toFixed(2)} tỷ`} color="blue" />
        <StatCard icon={TrendingUp} label="Dòng tiền KD (12T)" value={`${(totalOperating / 1_000_000_000).toFixed(2)} tỷ`} color="green" />
        <StatCard icon={TrendingDown} label="Dòng tiền ĐT (12T)" value={`${(totalInvesting / 1_000_000).toFixed(0)}M`} color="orange" />
        <StatCard icon={Banknote} label="Dòng tiền TC (12T)" value={`${(totalFinancing / 1_000_000).toFixed(0)}M`} color="purple" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-base font-semibold text-slate-800 mb-4">Số dư tiền mặt lũy kế</h2>
          {mounted && <CashFlowChart cashFlows={cashFlows} type="cumulative" />}
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-base font-semibold text-slate-800 mb-4">Dòng tiền theo hoạt động</h2>
          {mounted && <CashFlowChart cashFlows={cashFlows} type="waterfall" />}
        </div>
      </div>

      {/* Cash Flow Table */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-base font-semibold text-slate-800 mb-4">Chi tiết Lưu chuyển Tiền tệ</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-slate-200">
                <th className="pb-2 text-left text-[10px] text-slate-500 uppercase pl-2 min-w-[180px]">Khoản mục</th>
                {cashFlows.slice(-6).map(cf => (
                  <th key={cf.month} className="pb-2 px-2 text-right text-[10px] text-slate-500 uppercase min-w-[90px]">{cf.month}</th>
                ))}
              </tr>
            </thead>
            <tbody className="text-[12px]">
              <tr className="font-semibold bg-green-50/50">
                <td className="py-1.5 pl-2 text-slate-800">I. Hoạt động kinh doanh</td>
                {cashFlows.slice(-6).map(cf => <td key={cf.month} className="py-1.5 px-2 text-right text-slate-800">{formatCurrency(cf.hoatDongKinhDoanh.dongTienKinhDoanh)}</td>)}
              </tr>
              <tr><td className="py-1 pl-6 text-slate-500">Thu từ doanh thu</td>{cashFlows.slice(-6).map(cf => <td key={cf.month} className="py-1 px-2 text-right text-slate-600">{formatCurrency(cf.hoatDongKinhDoanh.thuTuDoanhThu)}</td>)}</tr>
              <tr><td className="py-1 pl-6 text-slate-500">Chi lương</td>{cashFlows.slice(-6).map(cf => <td key={cf.month} className="py-1 px-2 text-right text-red-500">{formatCurrency(cf.hoatDongKinhDoanh.chiLuong)}</td>)}</tr>
              <tr><td className="py-1 pl-6 text-slate-500">Chi hoạt động</td>{cashFlows.slice(-6).map(cf => <td key={cf.month} className="py-1 px-2 text-right text-red-500">{formatCurrency(cf.hoatDongKinhDoanh.chiHoatDong)}</td>)}</tr>

              <tr className="font-semibold bg-amber-50/50 border-t border-slate-100">
                <td className="py-1.5 pl-2 text-slate-800">II. Hoạt động đầu tư</td>
                {cashFlows.slice(-6).map(cf => <td key={cf.month} className="py-1.5 px-2 text-right text-slate-800">{formatCurrency(cf.hoatDongDauTu.dongTienDauTu)}</td>)}
              </tr>

              <tr className="font-semibold bg-purple-50/50 border-t border-slate-100">
                <td className="py-1.5 pl-2 text-slate-800">III. Hoạt động tài chính</td>
                {cashFlows.slice(-6).map(cf => <td key={cf.month} className="py-1.5 px-2 text-right text-slate-800">{formatCurrency(cf.hoatDongTaiChinh.dongTienTaiChinh)}</td>)}
              </tr>

              <tr className="font-bold border-t-2 border-slate-300 bg-blue-50/50">
                <td className="py-2 pl-2 text-blue-800">Số dư cuối kỳ</td>
                {cashFlows.slice(-6).map(cf => <td key={cf.month} className="py-2 px-2 text-right text-blue-800 font-bold">{formatCurrency(cf.soDuCuoiKy)}</td>)}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
