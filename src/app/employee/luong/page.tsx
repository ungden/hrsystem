"use client";

import { useState, useMemo } from 'react';
import PayslipDetail from '@/components/agents/PayslipDetail';
import { generatePayslip } from '@/lib/payslip-data';
import { CURRENT_USER_ID } from '@/lib/mock-data';

export default function MyPayslipPage() {
  const [month, setMonth] = useState(4);
  const payslip = useMemo(() => generatePayslip(CURRENT_USER_ID, month), [month]);

  return (
    <div className="p-6">
      <div className="border-b border-slate-200 pb-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Bảng lương</h1>
            <p className="text-sm text-slate-500 mt-1">Phiếu lương chi tiết của bạn</p>
          </div>
          <select value={month} onChange={e => setMonth(Number(e.target.value))}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
            {[1, 2, 3, 4].map(m => <option key={m} value={m}>Tháng {m}/2026</option>)}
          </select>
        </div>
      </div>

      {payslip ? (
        <PayslipDetail payslip={payslip} />
      ) : (
        <p className="text-sm text-slate-400 text-center py-12">Không có dữ liệu lương cho tháng này.</p>
      )}
    </div>
  );
}
