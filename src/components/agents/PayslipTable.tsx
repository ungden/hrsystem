"use client";

import { useState } from 'react';
import { Search } from 'lucide-react';
import { PayslipMonth } from '@/lib/cascade-types';
import { formatCurrency } from '@/lib/format';

interface PayslipTableProps {
  payslips: PayslipMonth[];
  onSelect?: (employeeId: string) => void;
}

export default function PayslipTable({ payslips, onSelect }: PayslipTableProps) {
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  const departments = [...new Set(payslips.map(p => p.department))];
  const filtered = payslips.filter(p => {
    if (search && !p.employeeName.toLowerCase().includes(search.toLowerCase())) return false;
    if (deptFilter && p.department !== deptFilter) return false;
    return true;
  });

  const totalThucNhan = filtered.reduce((s, p) => s + p.thucNhan, 0);
  const totalThuong = filtered.reduce((s, p) => s + p.thuong.tongThuong, 0);

  return (
    <div>
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
              <th className="pb-2 pr-2">PB</th>
              <th className="pb-2 pr-2">Level</th>
              <th className="pb-2 pr-2 text-right">Lương CB</th>
              <th className="pb-2 pr-2 text-right">Phụ cấp</th>
              <th className="pb-2 pr-2 text-right">KPI%</th>
              <th className="pb-2 pr-2 text-right">Thưởng</th>
              <th className="pb-2 pr-2 text-right">Khấu trừ</th>
              <th className="pb-2 pr-2 text-right">Thực nhận</th>
              <th className="pb-2 text-center">TT</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.employeeId}
                className="border-b border-slate-50 hover:bg-blue-50/30 cursor-pointer transition-colors"
                onClick={() => onSelect?.(p.employeeId)}>
                <td className="py-2 pr-2 font-medium text-blue-600 text-[12px]">{p.employeeName}</td>
                <td className="py-2 pr-2 text-slate-500 text-[11px]">{p.department.replace('Phòng ', '')}</td>
                <td className="py-2 pr-2"><span className="bg-blue-100 text-blue-700 text-[9px] font-semibold px-1 py-0.5 rounded">{p.levelCode}</span></td>
                <td className="py-2 pr-2 text-right text-[12px] text-slate-700">{formatCurrency(p.thuNhap.luongCoBan)}</td>
                <td className="py-2 pr-2 text-right text-[12px] text-slate-500">{formatCurrency(p.thuNhap.tongThuNhap - p.thuNhap.luongCoBan)}</td>
                <td className="py-2 pr-2 text-right">
                  <span className={`text-[11px] font-medium ${p.thuong.kpiAchievement >= 80 ? 'text-green-600' : p.thuong.kpiAchievement >= 60 ? 'text-blue-600' : 'text-orange-600'}`}>
                    {p.thuong.kpiAchievement}%
                  </span>
                </td>
                <td className="py-2 pr-2 text-right text-[12px] text-emerald-600 font-medium">{formatCurrency(p.thuong.tongThuong)}</td>
                <td className="py-2 pr-2 text-right text-[12px] text-red-500">{formatCurrency(Math.abs(p.khauTru.tongKhauTru))}</td>
                <td className="py-2 pr-2 text-right text-[12px] text-blue-700 font-bold">{formatCurrency(p.thucNhan)}</td>
                <td className="py-2 text-center">
                  <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${
                    p.trangThai === 'da_thanh_toan' ? 'bg-green-100 text-green-700' :
                    p.trangThai === 'da_duyet' ? 'bg-blue-100 text-blue-700' :
                    'bg-orange-100 text-orange-700'
                  }`}>
                    {p.trangThai === 'da_thanh_toan' ? 'Paid' : p.trangThai === 'da_duyet' ? 'OK' : '...'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-200 font-bold text-[12px]">
              <td className="py-2 pr-2 text-slate-800" colSpan={6}>Tổng cộng ({filtered.length} NV)</td>
              <td className="py-2 pr-2 text-right text-emerald-700">{formatCurrency(totalThuong)}</td>
              <td className="py-2 pr-2 text-right text-red-600">{formatCurrency(filtered.reduce((s, p) => s + Math.abs(p.khauTru.tongKhauTru), 0))}</td>
              <td className="py-2 pr-2 text-right text-blue-700">{formatCurrency(totalThucNhan)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
