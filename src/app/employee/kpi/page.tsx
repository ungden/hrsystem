"use client";

import { useMemo } from 'react';
import KPIScorecardTable from '@/components/agents/KPIScorecardTable';
import CascadeTimeline from '@/components/agents/CascadeTimeline';
import { generateEmployeeKPICard } from '@/lib/payslip-data';
import { generateEmployeeCascade } from '@/lib/cascade-data';
import { CURRENT_USER_ID } from '@/lib/mock-data';

export default function MyKPIPage() {
  const kpiCard = useMemo(() => generateEmployeeKPICard(CURRENT_USER_ID, 'Q2/2026'), []);
  const cascade = useMemo(() => generateEmployeeCascade(CURRENT_USER_ID), []);

  return (
    <div className="p-6">
      <div className="border-b border-slate-200 pb-4 mb-6">
        <h1 className="text-2xl font-bold text-slate-900">KPI & Mục tiêu</h1>
        <p className="text-sm text-slate-500 mt-1">Bảng KPI và kế hoạch chi tiết của bạn cho Q2/2026</p>
      </div>

      {/* KPI Scorecard */}
      {kpiCard && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
          <h2 className="text-base font-semibold text-slate-800 mb-4">Bảng KPI Scorecard</h2>
          <KPIScorecardTable card={kpiCard} />
        </div>
      )}

      {/* Target Cascade */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-base font-semibold text-slate-800 mb-4">Kế hoạch chi tiết (Năm → Ngày)</h2>
        <CascadeTimeline cascade={cascade} />
      </div>
    </div>
  );
}
