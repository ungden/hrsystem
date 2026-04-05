"use client";

import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { SalaryProjection } from '@/lib/agent-types';
import { formatCurrency } from '@/lib/format';

interface SalaryProjectionTableProps {
  projections: SalaryProjection[];
}

export default function SalaryProjectionTable({ projections }: SalaryProjectionTableProps) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'total' | 'bonus'>('total');
  const [deptFilter, setDeptFilter] = useState('');

  const departments = useMemo(() => [...new Set(projections.map(p => p.department))], [projections]);

  const filtered = useMemo(() => {
    let data = [...projections];
    if (search) {
      const lower = search.toLowerCase();
      data = data.filter(p => p.employeeName.toLowerCase().includes(lower));
    }
    if (deptFilter) {
      data = data.filter(p => p.department === deptFilter);
    }
    switch (sortBy) {
      case 'name': data.sort((a, b) => a.employeeName.localeCompare(b.employeeName)); break;
      case 'total': data.sort((a, b) => b.projectedTotal - a.projectedTotal); break;
      case 'bonus': data.sort((a, b) => b.projectedBonus - a.projectedBonus); break;
    }
    return data;
  }, [projections, search, sortBy, deptFilter]);

  return (
    <div>
      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm nhân viên..."
            className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
        <select
          value={deptFilter}
          onChange={e => setDeptFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Tất cả phòng ban</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as 'name' | 'total' | 'bonus')}
          className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
        >
          <option value="total">Sắp xếp: Tổng thu nhập</option>
          <option value="bonus">Sắp xếp: Thưởng</option>
          <option value="name">Sắp xếp: Tên</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <th className="pb-2 pr-3">Nhân viên</th>
              <th className="pb-2 pr-3">Phòng ban</th>
              <th className="pb-2 pr-3">Level</th>
              <th className="pb-2 pr-3 text-right">Lương CB</th>
              <th className="pb-2 pr-3 text-right">Phụ cấp</th>
              <th className="pb-2 pr-3 text-right">Thưởng DK</th>
              <th className="pb-2 pr-3 text-right">Tổng dự kiến</th>
              <th className="pb-2 text-right">Hoàn thành</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.employeeId} className="border-b border-slate-50 hover:bg-slate-50/50">
                <td className="py-2.5 pr-3 font-medium text-slate-700">{p.employeeName}</td>
                <td className="py-2.5 pr-3 text-slate-500 text-[12px]">{p.department.replace('Phòng ', '')}</td>
                <td className="py-2.5 pr-3">
                  <span className="bg-blue-100 text-blue-700 text-[10px] font-semibold px-1.5 py-0.5 rounded">{p.levelCode}</span>
                </td>
                <td className="py-2.5 pr-3 text-right text-slate-700">{formatCurrency(p.baseSalary)}</td>
                <td className="py-2.5 pr-3 text-right text-slate-500">{formatCurrency(p.allowances)}</td>
                <td className="py-2.5 pr-3 text-right text-emerald-600 font-medium">{formatCurrency(p.projectedBonus)}</td>
                <td className="py-2.5 pr-3 text-right text-blue-600 font-bold">{formatCurrency(p.projectedTotal)}</td>
                <td className="py-2.5 text-right">
                  <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded-full ${
                    p.completionRate >= 80 ? 'bg-green-100 text-green-700' :
                    p.completionRate >= 60 ? 'bg-blue-100 text-blue-700' :
                    'bg-orange-100 text-orange-700'
                  }`}>
                    {p.completionRate}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
