"use client";

import { useState, useEffect, useMemo } from 'react';
import { Gift, Users, TrendingUp, Award, Loader2 } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import { getEmployees, getTasks } from '@/lib/supabase-data';

function formatCurrency(n: number) {
  return new Intl.NumberFormat('vi-VN').format(n);
}

function getBonusTier(score: number): { tier: string; rate: number } {
  if (score >= 95) return { tier: 'Xuất sắc', rate: 0.25 };
  if (score >= 80) return { tier: 'Giỏi', rate: 0.20 };
  if (score >= 65) return { tier: 'Tốt', rate: 0.15 };
  if (score >= 50) return { tier: 'Đạt', rate: 0.10 };
  return { tier: 'Cần cải thiện', rate: 0.05 };
}

const tierColors: Record<string, string> = {
  'Xuất sắc': 'bg-green-100 text-green-700',
  'Giỏi': 'bg-blue-100 text-blue-700',
  'Tốt': 'bg-emerald-100 text-emerald-700',
  'Đạt': 'bg-slate-100 text-slate-700',
  'Cần cải thiện': 'bg-orange-100 text-orange-700',
};

interface BonusCard {
  employeeId: number;
  employeeName: string;
  department: string;
  totalTasks: number;
  doneTasks: number;
  completionPct: number;
  bonusTier: string;
  bonusRate: number;
  baseSalary: number;
  bonusAmount: number;
}

export default function BonusSheetPage() {
  const [cards, setCards] = useState<BonusCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [employees, tasks] = await Promise.all([getEmployees(), getTasks()]);
        const activeEmps = employees.filter((e: { status: string }) => e.status === 'Đang làm việc');

        const result: BonusCard[] = activeEmps.map((emp: { id: number; name: string; department: string; base_salary: number }) => {
          const empTasks = tasks.filter((t: { assignee_id: number }) => t.assignee_id === emp.id);
          const doneTasks = empTasks.filter((t: { status: string }) => t.status === 'done').length;
          const completionPct = empTasks.length > 0 ? Math.round((doneTasks / empTasks.length) * 100) : 50;

          // Scale completion to KPI-like score (25% done → ~62.5 KPI, 50% → 75, 100% → 100)
          const kpiScore = Math.min(100, Math.round(50 + completionPct * 0.5));
          const { tier, rate } = getBonusTier(kpiScore);
          const bonusAmount = Math.round(emp.base_salary * rate / 100_000) * 100_000;

          return {
            employeeId: emp.id,
            employeeName: emp.name,
            department: emp.department,
            totalTasks: empTasks.length,
            doneTasks,
            completionPct,
            bonusTier: tier,
            bonusRate: rate,
            baseSalary: emp.base_salary,
            bonusAmount,
          };
        });

        setCards(result.sort((a: BonusCard, b: BonusCard) => b.completionPct - a.completionPct));
      } catch (e) {
        console.error('Failed to load bonus data:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const totalBonus = cards.reduce((s, c) => s + c.bonusAmount, 0);
  const avgCompletion = cards.length > 0 ? Math.round(cards.reduce((s, c) => s + c.completionPct, 0) / cards.length) : 0;
  const excellentCount = cards.filter(c => c.bonusTier === 'Xuất sắc' || c.bonusTier === 'Giỏi').length;

  // Tier distribution
  const tierCounts: Record<string, number> = {};
  cards.forEach(c => { tierCounts[c.bonusTier] = (tierCounts[c.bonusTier] || 0) + 1; });

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-3 text-slate-500">Đang tải bảng thưởng...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Bảng tính thưởng"
        subtitle={`Hoàn thành CV → Xếp loại → Hệ số → Thưởng — Dữ liệu từ Supabase (${cards.length} NV, 696 tasks)`}
        breadcrumbs={[
          { label: 'AI Agents', href: '/admin' },
          { label: 'Bảng tính thưởng' },
        ]}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Gift} label="Tổng quỹ thưởng" value={`${(totalBonus / 1_000_000).toFixed(0)}M`} color="green" />
        <StatCard icon={TrendingUp} label="Hoàn thành CV TB" value={`${avgCompletion}%`} color="blue" />
        <StatCard icon={Award} label="Xuất sắc/Giỏi" value={`${excellentCount}/${cards.length}`} color="purple" />
        <StatCard icon={Users} label="Tổng nhân viên" value={cards.length} color="orange" />
      </div>

      {/* Tier Distribution */}
      <div className="flex gap-3 mb-6 flex-wrap">
        {Object.entries(tierCounts).map(([tier, count]) => (
          <div key={tier} className={`px-4 py-2 rounded-lg ${tierColors[tier] || 'bg-slate-100 text-slate-700'}`}>
            <p className="text-lg font-bold">{count}</p>
            <p className="text-[10px]">{tier}</p>
          </div>
        ))}
        <div className="px-4 py-2 rounded-lg bg-blue-50 text-blue-700 ml-auto">
          <p className="text-lg font-bold">{formatCurrency(totalBonus)}</p>
          <p className="text-[10px]">Tổng quỹ thưởng</p>
        </div>
      </div>

      {/* Bonus Table */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-base font-semibold text-slate-800 mb-4">Bảng tính thưởng — Dựa trên hoàn thành công việc</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] text-slate-500 uppercase tracking-wider border-b-2 border-slate-200">
                <th className="pb-2 pr-2">#</th>
                <th className="pb-2 pr-2">Nhân viên</th>
                <th className="pb-2 pr-2">Phòng ban</th>
                <th className="pb-2 pr-2 text-center">CV hoàn thành</th>
                <th className="pb-2 pr-2 text-center">Tỷ lệ %</th>
                <th className="pb-2 pr-2 text-center">Xếp loại</th>
                <th className="pb-2 pr-2 text-center">Hệ số</th>
                <th className="pb-2 pr-2 text-right">Lương CB</th>
                <th className="pb-2 text-right">Tổng thưởng</th>
              </tr>
            </thead>
            <tbody>
              {cards.map((c, i) => (
                <tr key={c.employeeId} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="py-2 pr-2 text-[12px] text-slate-400 font-bold">{i + 1}</td>
                  <td className="py-2 pr-2 text-[12px] font-medium text-slate-700">{c.employeeName}</td>
                  <td className="py-2 pr-2 text-[11px] text-slate-500">{c.department}</td>
                  <td className="py-2 pr-2 text-center text-[12px] text-slate-600">{c.doneTasks}/{c.totalTasks}</td>
                  <td className="py-2 pr-2 text-center">
                    <span className={`text-[12px] font-bold ${c.completionPct >= 30 ? 'text-green-600' : c.completionPct >= 20 ? 'text-blue-600' : 'text-orange-600'}`}>
                      {c.completionPct}%
                    </span>
                  </td>
                  <td className="py-2 pr-2 text-center">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${tierColors[c.bonusTier] || ''}`}>
                      {c.bonusTier}
                    </span>
                  </td>
                  <td className="py-2 pr-2 text-center text-[12px] text-slate-600">{Math.round(c.bonusRate * 100)}%</td>
                  <td className="py-2 pr-2 text-right text-[12px] text-slate-700">{formatCurrency(c.baseSalary)}</td>
                  <td className="py-2 text-right text-[12px] font-bold text-emerald-600">{formatCurrency(c.bonusAmount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 font-bold text-[12px]">
                <td colSpan={8} className="py-2 pr-2 text-slate-800">Tổng cộng</td>
                <td className="py-2 text-right text-emerald-700">{formatCurrency(totalBonus)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Bonus Tiers Legend */}
        <div className="mt-4 bg-slate-50 rounded-lg p-3">
          <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Bảng hệ số thưởng</h4>
          <div className="grid grid-cols-5 gap-2 text-[11px]">
            <div className="text-center"><span className="font-bold text-green-600">25%</span><br/>Xuất sắc (≥95%)</div>
            <div className="text-center"><span className="font-bold text-blue-600">20%</span><br/>Giỏi (≥80%)</div>
            <div className="text-center"><span className="font-bold text-emerald-600">15%</span><br/>Tốt (≥65%)</div>
            <div className="text-center"><span className="font-bold text-slate-600">10%</span><br/>Đạt (≥50%)</div>
            <div className="text-center"><span className="font-bold text-orange-600">5%</span><br/>Cần CT (&lt;50%)</div>
          </div>
        </div>
      </div>
    </div>
  );
}
