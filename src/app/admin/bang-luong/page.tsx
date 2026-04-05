"use client";

import { useState, useMemo } from 'react';
import { DollarSign, Users, Gift, TrendingDown } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import PayslipTable from '@/components/agents/PayslipTable';
import PayslipDetail from '@/components/agents/PayslipDetail';
import { generateAllPayslips } from '@/lib/payslip-data';
import { formatCurrency } from '@/lib/mock-data';

export default function PayslipHubPage() {
  const [month, setMonth] = useState(4);
  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null);

  const payslips = useMemo(() => generateAllPayslips(month), [month]);
  const selectedPayslip = selectedEmpId ? payslips.find(p => p.employeeId === selectedEmpId) : null;

  const totalThucNhan = payslips.reduce((s, p) => s + p.thucNhan, 0);
  const totalThuong = payslips.reduce((s, p) => s + p.thuong.tongThuong, 0);
  const totalKhauTru = payslips.reduce((s, p) => s + Math.abs(p.khauTru.tongKhauTru), 0);
  const avgKPI = payslips.length > 0 ? Math.round(payslips.reduce((s, p) => s + p.thuong.kpiAchievement, 0) / payslips.length) : 0;

  return (
    <div className="p-6">
      <PageHeader
        title="Bảng lương chi tiết"
        subtitle="Payslip đầy đủ: Thu nhập, Thưởng KPI, Bảo hiểm, Thuế TNCN"
        breadcrumbs={[
          { label: 'AI Agents', href: '/admin' },
          { label: 'Bảng lương' },
        ]}
        actions={
          <select value={month} onChange={e => { setMonth(Number(e.target.value)); setSelectedEmpId(null); }}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium">
            {[1, 2, 3, 4].map(m => <option key={m} value={m}>Tháng {m}/2026</option>)}
          </select>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={DollarSign} label="Tổng thực nhận" value={`${(totalThucNhan / 1_000_000).toFixed(0)}M`} color="blue" />
        <StatCard icon={Gift} label="Tổng thưởng" value={`${(totalThuong / 1_000_000).toFixed(0)}M`} color="green" />
        <StatCard icon={TrendingDown} label="Tổng khấu trừ" value={`${(totalKhauTru / 1_000_000).toFixed(0)}M`} color="red" />
        <StatCard icon={Users} label="KPI TB" value={`${avgKPI}%`} color="purple" />
      </div>

      {/* Payslip Detail (if selected) */}
      {selectedPayslip && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-slate-800">Phiếu lương - {selectedPayslip.employeeName}</h2>
            <button onClick={() => setSelectedEmpId(null)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
              Đóng
            </button>
          </div>
          <PayslipDetail payslip={selectedPayslip} />
        </div>
      )}

      {/* Payslip Table */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-base font-semibold text-slate-800 mb-4">
          Bảng lương tháng {month}/2026 — {payslips.length} nhân viên
        </h2>
        <PayslipTable payslips={payslips} onSelect={setSelectedEmpId} />
      </div>
    </div>
  );
}
