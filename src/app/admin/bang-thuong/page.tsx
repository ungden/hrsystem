"use client";

import { useState, useMemo } from 'react';
import { Gift, Users, TrendingUp, Award } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import BonusCalculationSheet from '@/components/agents/BonusCalculationSheet';
import KPIScorecardTable from '@/components/agents/KPIScorecardTable';
import { generateAllKPICards, generateEmployeeKPICard } from '@/lib/payslip-data';
import { formatCurrency } from '@/lib/mock-data';

export default function BonusSheetPage() {
  const cards = useMemo(() => generateAllKPICards('Q2/2026'), []);
  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null);

  const selectedCard = selectedEmpId ? generateEmployeeKPICard(selectedEmpId, 'Q2/2026') : null;
  const totalBonus = cards.reduce((s, c) => s + c.bonusAmount, 0);
  const avgKPI = Math.round(cards.reduce((s, c) => s + c.totalWeightedScore, 0) / cards.length);
  const excellentCount = cards.filter(c => c.bonusTier === 'Xuất sắc' || c.bonusTier === 'Giỏi').length;

  return (
    <div className="p-6">
      <PageHeader
        title="Bảng tính thưởng"
        subtitle="KPI Achievement → Xếp loại → Hệ số thưởng → Tổng thưởng cho Q2/2026"
        breadcrumbs={[
          { label: 'AI Agents', href: '/admin' },
          { label: 'Bảng tính thưởng' },
        ]}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Gift} label="Tổng quỹ thưởng" value={`${(totalBonus / 1_000_000).toFixed(0)}M`} color="green" />
        <StatCard icon={TrendingUp} label="KPI trung bình" value={`${avgKPI}%`} color="blue" />
        <StatCard icon={Award} label="Xuất sắc/Giỏi" value={`${excellentCount}/${cards.length}`} color="purple" />
        <StatCard icon={Users} label="Tổng nhân viên" value={cards.length} color="orange" />
      </div>

      {/* Individual KPI Scorecard (if selected) */}
      {selectedCard && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-800">KPI Scorecard - {selectedCard.employeeName}</h2>
            <button onClick={() => setSelectedEmpId(null)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
              Đóng
            </button>
          </div>
          <KPIScorecardTable card={selectedCard} />
        </div>
      )}

      {/* Bonus Calculation Sheet */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-base font-semibold text-slate-800 mb-4">Bảng tính thưởng Q2/2026</h2>
        <BonusCalculationSheet cards={cards} />
      </div>

      {/* Click hint */}
      {!selectedEmpId && (
        <p className="text-xs text-slate-400 text-center mt-4">Click vào tên nhân viên trong bảng ở trên để xem KPI Scorecard chi tiết</p>
      )}
    </div>
  );
}
