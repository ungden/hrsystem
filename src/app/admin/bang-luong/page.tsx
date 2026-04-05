"use client";

import { useState, useEffect, useMemo } from 'react';
import { DollarSign, Users, Gift, TrendingDown, Loader2, Search } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import { getEmployees, getPayrolls } from '@/lib/supabase-data';

function formatCurrency(n: number) {
  return new Intl.NumberFormat('vi-VN').format(n);
}

interface PayrollRow {
  id: number;
  employee_id: number;
  month: string;
  base: number;
  commission: number;
  kpi_bonus: number;
  deduction: number;
  total: number;
  status: string;
  // Joined
  employeeName: string;
  department: string;
  role: string;
}

export default function PayslipHubPage() {
  const [month, setMonth] = useState('03/2026');
  const [payrolls, setPayrolls] = useState<PayrollRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [emps, pays] = await Promise.all([getEmployees(), getPayrolls(month)]);
        const empMap = new Map(emps.map((e: { id: number; name: string; department: string; role: string }) => [e.id, e]));
        const rows: PayrollRow[] = pays.map((p: { employee_id: number; id: number; month: string; base: number; commission: number; kpi_bonus: number; deduction: number; total: number; status: string }) => {
          const emp = empMap.get(p.employee_id) as { name: string; department: string; role: string } | undefined;
          return {
            ...p,
            employeeName: emp?.name || `NV #${p.employee_id}`,
            department: emp?.department || '',
            role: emp?.role || '',
          };
        });
        setPayrolls(rows);
      } catch (e) {
        console.error('Failed to load payrolls:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [month]);

  const departments = [...new Set(payrolls.map(p => p.department).filter(Boolean))];
  const filtered = useMemo(() => {
    let data = payrolls;
    if (search) {
      const lower = search.toLowerCase();
      data = data.filter(p => p.employeeName.toLowerCase().includes(lower));
    }
    if (deptFilter) data = data.filter(p => p.department === deptFilter);
    return data;
  }, [payrolls, search, deptFilter]);

  const totalBase = filtered.reduce((s, p) => s + p.base, 0);
  const totalBonus = filtered.reduce((s, p) => s + p.commission + p.kpi_bonus, 0);
  const totalDeduction = filtered.reduce((s, p) => s + p.deduction, 0);
  const totalNet = filtered.reduce((s, p) => s + p.total, 0);

  const selected = selectedId !== null ? payrolls.find(p => p.employee_id === selectedId) : null;

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-3 text-slate-500">Đang tải bảng lương...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Bảng lương chi tiết"
        subtitle={`${payrolls.length} nhân viên — Dữ liệu từ Supabase`}
        breadcrumbs={[
          { label: 'AI Agents', href: '/admin' },
          { label: 'Bảng lương' },
        ]}
        actions={
          <select value={month} onChange={e => { setMonth(e.target.value); setSelectedId(null); setLoading(true); }}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium">
            <option value="03/2026">Tháng 3/2026</option>
            <option value="02/2026">Tháng 2/2026</option>
            <option value="01/2026">Tháng 1/2026</option>
          </select>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={DollarSign} label="Tổng lương cơ bản" value={`${(totalBase / 1_000_000).toFixed(0)}M`} color="blue" />
        <StatCard icon={Gift} label="Tổng thưởng" value={`${(totalBonus / 1_000_000).toFixed(0)}M`} color="green" />
        <StatCard icon={TrendingDown} label="Tổng khấu trừ" value={`${(totalDeduction / 1_000_000).toFixed(0)}M`} color="red" />
        <StatCard icon={Users} label="Thực nhận" value={`${(totalNet / 1_000_000).toFixed(0)}M`} color="purple" />
      </div>

      {/* Payslip Detail (if selected) */}
      {selected && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-800">Phiếu lương - {selected.employeeName}</h2>
            <button onClick={() => setSelectedId(null)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Đóng</button>
          </div>
          <div className="text-center border-b border-slate-200 pb-4 mb-4">
            <h3 className="text-lg font-bold text-slate-800">BẢNG LƯƠNG THÁNG {month}</h3>
            <div className="flex items-center justify-center gap-4 mt-2 text-sm text-slate-600">
              <span>{selected.employeeName}</span>
              <span className="text-slate-300">|</span>
              <span>{selected.role}</span>
              <span className="text-slate-300">|</span>
              <span>{selected.department}</span>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-bold text-blue-700 mb-2">I. THU NHẬP</h3>
              <div className="bg-blue-50/50 rounded-lg p-3 space-y-1.5">
                <div className="flex justify-between text-[13px]"><span className="text-slate-600 pl-6">Lương cơ bản</span><span className="font-medium text-slate-700">{formatCurrency(selected.base)}</span></div>
                <div className="flex justify-between text-[13px] font-semibold border-t border-slate-200 pt-2 mt-1"><span className="text-slate-800 pl-2">Tổng thu nhập</span><span className="text-slate-800">{formatCurrency(selected.base)}</span></div>
              </div>
              <h3 className="text-sm font-bold text-emerald-700 mb-2 mt-4">II. THƯỞNG</h3>
              <div className="bg-emerald-50/50 rounded-lg p-3 space-y-1.5">
                <div className="flex justify-between text-[13px]"><span className="text-slate-600 pl-6">Hoa hồng / Commission</span><span className="font-medium text-slate-700">{formatCurrency(selected.commission)}</span></div>
                <div className="flex justify-between text-[13px]"><span className="text-slate-600 pl-6">Thưởng KPI</span><span className="font-medium text-slate-700">{formatCurrency(selected.kpi_bonus)}</span></div>
                <div className="flex justify-between text-[13px] font-semibold border-t border-slate-200 pt-2 mt-1"><span className="text-slate-800 pl-2">Tổng thưởng</span><span className="text-emerald-700">{formatCurrency(selected.commission + selected.kpi_bonus)}</span></div>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-bold text-red-700 mb-2">III. KHẤU TRỪ</h3>
              <div className="bg-red-50/50 rounded-lg p-3 space-y-1.5">
                <div className="flex justify-between text-[13px]"><span className="text-slate-600 pl-6">BHXH + BHYT + BHTN + Thuế</span><span className="font-medium text-red-600">-{formatCurrency(selected.deduction)}</span></div>
                <div className="flex justify-between text-[13px] font-semibold border-t border-slate-200 pt-2 mt-1"><span className="text-slate-800 pl-2">Tổng khấu trừ</span><span className="text-red-600">-{formatCurrency(selected.deduction)}</span></div>
              </div>
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-5 text-white mt-4">
                <h3 className="text-sm font-bold text-blue-100 mb-1">IV. THỰC NHẬN</h3>
                <p className="text-3xl font-bold text-center mt-2">{formatCurrency(selected.total)} <span className="text-lg text-blue-200">đ</span></p>
              </div>
              <div className="mt-4 flex justify-end">
                <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                  selected.status === 'Đã thanh toán' ? 'bg-green-100 text-green-700' :
                  selected.status === 'Đã duyệt' ? 'bg-blue-100 text-blue-700' :
                  'bg-orange-100 text-orange-700'
                }`}>{selected.status}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payroll Table */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-base font-semibold text-slate-800 mb-4">
          Bảng lương tháng {month} — {filtered.length} nhân viên
        </h2>
        <div className="flex gap-3 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm nhân viên..."
              className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
          <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
            <option value="">Tất cả phòng ban</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] text-slate-500 uppercase tracking-wider border-b-2 border-slate-200">
                <th className="pb-2 pr-2">Nhân viên</th>
                <th className="pb-2 pr-2">Phòng ban</th>
                <th className="pb-2 pr-2 text-right">Lương CB</th>
                <th className="pb-2 pr-2 text-right">Hoa hồng</th>
                <th className="pb-2 pr-2 text-right">Thưởng KPI</th>
                <th className="pb-2 pr-2 text-right">Khấu trừ</th>
                <th className="pb-2 pr-2 text-right">Thực nhận</th>
                <th className="pb-2 text-center">TT</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.employee_id}
                  className="border-b border-slate-50 hover:bg-blue-50/30 cursor-pointer transition-colors"
                  onClick={() => setSelectedId(p.employee_id)}>
                  <td className="py-2 pr-2 font-medium text-blue-600 text-[12px]">{p.employeeName}</td>
                  <td className="py-2 pr-2 text-slate-500 text-[11px]">{p.department}</td>
                  <td className="py-2 pr-2 text-right text-[12px] text-slate-700">{formatCurrency(p.base)}</td>
                  <td className="py-2 pr-2 text-right text-[12px] text-slate-500">{formatCurrency(p.commission)}</td>
                  <td className="py-2 pr-2 text-right text-[12px] text-emerald-600 font-medium">{formatCurrency(p.kpi_bonus)}</td>
                  <td className="py-2 pr-2 text-right text-[12px] text-red-500">-{formatCurrency(p.deduction)}</td>
                  <td className="py-2 pr-2 text-right text-[12px] text-blue-700 font-bold">{formatCurrency(p.total)}</td>
                  <td className="py-2 text-center">
                    <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${
                      p.status === 'Đã thanh toán' ? 'bg-green-100 text-green-700' :
                      p.status === 'Đã duyệt' ? 'bg-blue-100 text-blue-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {p.status === 'Đã thanh toán' ? 'Paid' : p.status === 'Đã duyệt' ? 'OK' : '...'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 font-bold text-[12px]">
                <td className="py-2 pr-2 text-slate-800" colSpan={2}>Tổng ({filtered.length} NV)</td>
                <td className="py-2 pr-2 text-right text-slate-700">{formatCurrency(totalBase)}</td>
                <td className="py-2 pr-2 text-right text-slate-500">{formatCurrency(filtered.reduce((s, p) => s + p.commission, 0))}</td>
                <td className="py-2 pr-2 text-right text-emerald-700">{formatCurrency(filtered.reduce((s, p) => s + p.kpi_bonus, 0))}</td>
                <td className="py-2 pr-2 text-right text-red-600">-{formatCurrency(totalDeduction)}</td>
                <td className="py-2 pr-2 text-right text-blue-700">{formatCurrency(totalNet)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
