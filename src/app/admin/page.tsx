"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Target, DollarSign, TrendingUp, AlertTriangle, Users, PiggyBank, ArrowRight, Banknote } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import AgentDashboardGrid from '@/components/agents/AgentDashboardGrid';
import AgentMessageCard from '@/components/agents/AgentMessageCard';
import IncomeStatementChart from '@/components/agents/IncomeStatementChart';
import DepartmentRadarChart from '@/components/agents/DepartmentRadarChart';
import FinancialHealthGauges from '@/components/agents/FinancialHealthGauges';
import BusinessMilestoneTimeline from '@/components/agents/BusinessMilestoneTimeline';
import PnLWaterfall from '@/components/agents/PnLWaterfall';
import RevenueTreemap from '@/components/agents/RevenueTreemap';
import DeptContributionArea from '@/components/agents/DeptContributionArea';
import EmployeeScatter from '@/components/agents/EmployeeScatter';
import CostDonut from '@/components/agents/CostDonut';
import BudgetVarianceBars from '@/components/agents/BudgetVarianceBars';
import KPIHeatmapGrid from '@/components/agents/KPIHeatmapGrid';
import CashFlowChart from '@/components/agents/CashFlowChart';
import { runFullCoordination } from '@/lib/agents/coordinator';
import { formatCurrency } from '@/lib/mock-data';

export default function AIAgentsPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const state = useMemo(() => runFullCoordination(2026, 'Q2'), []);

  const { incomeStatements, balanceSheet, cashFlows } = state.financials;
  const lastPnL = incomeStatements[incomeStatements.length - 1];
  const totalRevenue12m = incomeStatements.reduce((s, m) => s + m.doanhThu.tongDoanhThu, 0);
  const totalProfit12m = incomeStatements.reduce((s, m) => s + m.loiNhuanSauThue, 0);
  const totalCost = state.costProjections.reduce((s, c) => s + c.totalCost, 0);
  const lastCash = cashFlows[cashFlows.length - 1]?.soDuCuoiKy || 0;
  const atRiskCount = state.individualPlans.filter(p => p.status === 'at_risk').length;
  const totalHeadcount = state.costProjections.reduce((s, c) => s + c.headcount, 0);
  const completedPlans = state.individualPlans.filter(p => p.status === 'completed').length;
  const totalPlans = state.individualPlans.length;

  return (
    <div className="p-6">
      <PageHeader
        title="Trung tâm điều hành"
        subtitle="All-in-One Business Overview - Bao quát toàn bộ doanh nghiệp trong 1 trang"
      />

      {/* Row 1: 6 Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <StatCard icon={DollarSign} label="Doanh thu 12T" value={`${(totalRevenue12m / 1_000_000_000).toFixed(1)} tỷ`} color="green" />
        <StatCard icon={TrendingUp} label="Lợi nhuận 12T" value={`${(totalProfit12m / 1_000_000_000).toFixed(2)} tỷ`} color="blue" />
        <StatCard icon={PiggyBank} label="Tiền mặt" value={`${(lastCash / 1_000_000_000).toFixed(2)} tỷ`} color="purple" />
        <StatCard icon={Banknote} label="Chi phí NS/T" value={`${(totalCost / 1_000_000).toFixed(0)}M`} color="orange" />
        <StatCard icon={Users} label="Nhân sự" value={totalHeadcount} color="blue" />
        <StatCard icon={Target} label="OKR hoàn thành" value={`${completedPlans}/${totalPlans}`} color={atRiskCount > 5 ? 'red' : 'green'} />
      </div>

      {/* Row 2: Financial Health Gauges */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-800">Sức khỏe tài chính</h2>
          <Link href="/admin/bao-cao-tai-chinh" className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
            Chi tiết <ArrowRight size={12} />
          </Link>
        </div>
        <FinancialHealthGauges metrics={state.financialHealth} />
      </div>

      {/* Row 3: P&L Trend + P&L Waterfall */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-800">Doanh thu - Chi phí - Lợi nhuận (12T)</h2>
            <Link href="/admin/bao-cao-tai-chinh/ket-qua-kinh-doanh" className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
              P&L <ArrowRight size={12} />
            </Link>
          </div>
          {mounted && <IncomeStatementChart statements={incomeStatements} />}
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-base font-semibold text-slate-800 mb-4">P&L Waterfall - {lastPnL.month}</h2>
          {mounted && <PnLWaterfall statement={lastPnL} />}
        </div>
      </div>

      {/* Row 4: Revenue Treemap + Cost Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-base font-semibold text-slate-800 mb-4">Cơ cấu doanh thu - {lastPnL.month}</h2>
          {mounted && <RevenueTreemap statement={lastPnL} />}
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-base font-semibold text-slate-800 mb-4">Cơ cấu chi phí nhân sự</h2>
          {mounted && <CostDonut projections={state.costProjections} />}
        </div>
      </div>

      {/* Row 5: Dept Contribution Area + Dept Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-base font-semibold text-slate-800 mb-4">Đóng góp doanh thu theo phòng ban (12T)</h2>
          {mounted && <DeptContributionArea statements={incomeStatements} />}
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-800">So sánh phòng ban</h2>
            <Link href="/admin/phong-ban" className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
              Chi tiết <ArrowRight size={12} />
            </Link>
          </div>
          {mounted && <DepartmentRadarChart departments={state.departmentDetails} />}
        </div>
      </div>

      {/* Row 6: Employee Scatter + Budget Variance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-800">Lương vs Hiệu suất (Scatter)</h2>
            <Link href="/admin/nhan-vien" className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
              NV <ArrowRight size={12} />
            </Link>
          </div>
          {mounted && <EmployeeScatter projections={state.salaryProjections} />}
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-base font-semibold text-slate-800 mb-4">Thực tế vs Ngân sách (6T)</h2>
          {mounted && <BudgetVarianceBars statements={incomeStatements} />}
        </div>
      </div>

      {/* Row 7: Business Targets + Cash Flow */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-800">Mục tiêu kinh doanh Q2/2026</h2>
            <Link href="/admin/tong-quan-okr" className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
              OKR <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-3">
            {state.businessTargets.map(t => {
              const pct = t.targetValue > 0 ? Math.round(t.currentValue / t.targetValue * 100) : 0;
              const barColor = t.status === 'achieved' ? 'bg-green-500' : t.status === 'on_track' ? 'bg-blue-500' : t.status === 'at_risk' ? 'bg-orange-500' : 'bg-red-500';
              return (
                <div key={t.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12px] text-slate-700 font-medium">{t.name}</span>
                    <span className="text-[11px] text-slate-500">{pct}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-800">Dòng tiền lũy kế (12T)</h2>
            <Link href="/admin/bao-cao-tai-chinh/luu-chuyen-tien-te" className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
              CF <ArrowRight size={12} />
            </Link>
          </div>
          {mounted && <CashFlowChart cashFlows={cashFlows} type="cumulative" />}
        </div>
      </div>

      {/* Row 8: KPI Heatmap */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <h2 className="text-base font-semibold text-slate-800 mb-4">KPI Heatmap - Phòng ban</h2>
        <KPIHeatmapGrid departments={state.departmentDetails} />
      </div>

      {/* Row 9: Agents + Milestones + Messages */}
      <div className="mb-6">
        <h2 className="text-base font-semibold text-slate-800 mb-3">AI Agents</h2>
        <AgentDashboardGrid statuses={state.agentStatuses} messages={state.messages} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-base font-semibold text-slate-800 mb-4">Cột mốc kinh doanh</h2>
          <div className="max-h-[350px] overflow-y-auto pr-1">
            <BusinessMilestoneTimeline milestones={state.milestones} />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-800">Hoạt động gần đây</h2>
            <Link href="/admin/nhat-ky" className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
              Xem tất cả <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
            {state.messages.slice(0, 5).map(msg => (
              <AgentMessageCard key={msg.id} message={msg} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
