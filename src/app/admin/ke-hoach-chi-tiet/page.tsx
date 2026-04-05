"use client";

import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import CascadeTimeline from '@/components/agents/CascadeTimeline';
import { generateAllCascades } from '@/lib/cascade-data';
import { employees } from '@/lib/mock-data';

export default function DetailedPlanPage() {
  const cascades = useMemo(() => generateAllCascades(), []);
  const [selectedEmpId, setSelectedEmpId] = useState(cascades[0]?.employeeId || '');
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  const departments = [...new Set(cascades.map(c => c.department))];
  const filtered = cascades.filter(c => {
    if (search && !c.employeeName.toLowerCase().includes(search.toLowerCase())) return false;
    if (deptFilter && c.department !== deptFilter) return false;
    return true;
  });

  const selectedCascade = cascades.find(c => c.employeeId === selectedEmpId);

  return (
    <div className="p-6">
      <PageHeader
        title="Kế hoạch chi tiết"
        subtitle="Phân rã mục tiêu: Năm → Quý → Tháng → Tuần → Ngày cho từng nhân viên"
        breadcrumbs={[
          { label: 'AI Agents', href: '/admin' },
          { label: 'Kế hoạch chi tiết' },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left: Employee selector */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-slate-200 p-4 sticky top-4">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Chọn nhân viên</h3>
            <div className="space-y-2 mb-3">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm..."
                  className="w-full pl-7 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[12px] focus:outline-none" />
              </div>
              <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-[12px]">
                <option value="">Tất cả PB</option>
                {departments.map(d => <option key={d} value={d}>{d.replace('Phòng ', '')}</option>)}
              </select>
            </div>
            <div className="space-y-1 max-h-[500px] overflow-y-auto">
              {filtered.map(c => (
                <button
                  key={c.employeeId}
                  onClick={() => setSelectedEmpId(c.employeeId)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-[12px] transition-colors ${
                    c.employeeId === selectedEmpId
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <p className="font-medium truncate">{c.employeeName}</p>
                  <p className="text-[10px] text-slate-400">{c.department.replace('Phòng ', '')}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Cascade Timeline */}
        <div className="lg:col-span-3">
          {selectedCascade ? (
            <>
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-4 mb-4">
                <p className="text-sm font-semibold text-blue-800">
                  {selectedCascade.employeeName} — {selectedCascade.department}
                </p>
                <p className="text-xs text-blue-600 mt-0.5">
                  Kế hoạch phân rã từ mục tiêu năm đến nhiệm vụ hàng ngày. Click vào từng cấp để xem chi tiết.
                </p>
              </div>
              <CascadeTimeline cascade={selectedCascade} />
            </>
          ) : (
            <p className="text-sm text-slate-400 text-center py-12">Chọn nhân viên để xem kế hoạch chi tiết.</p>
          )}
        </div>
      </div>
    </div>
  );
}
