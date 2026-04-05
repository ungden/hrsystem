"use client";

import { useState, useEffect } from 'react';
import { DollarSign, Gift, TrendingDown, Loader2 } from 'lucide-react';
import { getEmployees, getPayrolls } from '@/lib/supabase-data';
import { getSelectedEmpId, setSelectedEmpId as persistEmpId } from '@/lib/employee-context';

function fmt(n: number) { return new Intl.NumberFormat('vi-VN').format(n); }

export default function MyPayslipPage() {
  const [employee, setEmployee] = useState<{ id: number; name: string; role: string; department: string } | null>(null);
  const [payroll, setPayroll] = useState<{ base: number; commission: number; kpi_bonus: number; deduction: number; total: number; status: string } | null>(null);
  const [allEmployees, setAllEmployees] = useState<Array<{ id: number; name: string }>>([]);
  const [selectedEmpId, setSelectedEmpId] = useState(getSelectedEmpId());
  const [month, setMonth] = useState('03/2026');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [emps, pays] = await Promise.all([getEmployees(), getPayrolls(month)]);
        setAllEmployees(emps);
        setEmployee(emps.find((e: { id: number }) => e.id === selectedEmpId) || null);
        setPayroll(pays.find((p: { employee_id: number }) => p.employee_id === selectedEmpId) || null);
      } catch (e) { console.error(e); } finally { setLoading(false); }
    }
    load();
  }, [selectedEmpId, month]);

  if (loading) {
    return <div className="p-6 flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>;
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="border-b border-slate-200 pb-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Bảng lương</h1>
            <p className="text-sm text-slate-500 mt-1">Phiếu lương của bạn — Dữ liệu từ Supabase</p>
          </div>
          <div className="flex gap-2">
            <select value={selectedEmpId} onChange={e => { const v = Number(e.target.value); setSelectedEmpId(v); persistEmpId(v); }}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
              {allEmployees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            <select value={month} onChange={e => setMonth(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
              <option value="03/2026">T3/2026</option>
              <option value="02/2026">T2/2026</option>
              <option value="01/2026">T1/2026</option>
            </select>
          </div>
        </div>
      </div>

      {payroll && employee ? (
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
          <div className="text-center border-b border-slate-200 pb-4 mb-4">
            <h2 className="text-lg font-bold text-slate-800">BẢNG LƯƠNG {month.replace('/', '/T')}</h2>
            <div className="flex items-center justify-center gap-3 mt-2 text-sm text-slate-600 flex-wrap">
              <span>{employee.name}</span>
              <span className="text-slate-300">|</span>
              <span>{employee.role}</span>
              <span className="text-slate-300">|</span>
              <span>{employee.department}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-bold text-blue-700 mb-2">I. THU NHẬP</h3>
              <div className="bg-blue-50/50 rounded-lg p-3 space-y-2">
                <div className="flex justify-between text-[13px]"><span className="text-slate-600 pl-4">Lương cơ bản</span><span className="font-medium">{fmt(payroll.base)}</span></div>
                <div className="flex justify-between text-[13px] font-semibold border-t border-slate-200 pt-2"><span className="text-slate-800">Tổng thu nhập</span><span>{fmt(payroll.base)}</span></div>
              </div>
              <h3 className="text-sm font-bold text-emerald-700 mb-2 mt-4">II. THƯỞNG</h3>
              <div className="bg-emerald-50/50 rounded-lg p-3 space-y-2">
                <div className="flex justify-between text-[13px]"><span className="text-slate-600 pl-4">Hoa hồng</span><span className="font-medium">{fmt(payroll.commission)}</span></div>
                <div className="flex justify-between text-[13px]"><span className="text-slate-600 pl-4">Thưởng KPI</span><span className="font-medium">{fmt(payroll.kpi_bonus)}</span></div>
                <div className="flex justify-between text-[13px] font-semibold border-t border-slate-200 pt-2"><span className="text-emerald-700">Tổng thưởng</span><span className="text-emerald-700">{fmt(payroll.commission + payroll.kpi_bonus)}</span></div>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-bold text-red-700 mb-2">III. KHẤU TRỪ</h3>
              <div className="bg-red-50/50 rounded-lg p-3 space-y-2">
                <div className="flex justify-between text-[13px]"><span className="text-slate-600 pl-4">BHXH + BHYT + BHTN + Thuế</span><span className="font-medium text-red-600">-{fmt(payroll.deduction)}</span></div>
              </div>
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-5 text-white mt-4">
                <h3 className="text-sm font-bold text-blue-100 mb-1">IV. THỰC NHẬN</h3>
                <p className="text-3xl font-bold text-center mt-2">{fmt(payroll.total)} <span className="text-lg text-blue-200">đ</span></p>
              </div>
              <div className="mt-4 flex justify-end">
                <span className={`text-xs font-medium px-3 py-1 rounded-full ${payroll.status === 'Đã thanh toán' ? 'bg-green-100 text-green-700' : payroll.status === 'Đã duyệt' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>{payroll.status}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-400 text-center py-12">Không có dữ liệu lương cho tháng này.</p>
      )}
    </div>
  );
}
