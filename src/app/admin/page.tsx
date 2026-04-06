"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Target, DollarSign, TrendingUp, Users, PiggyBank, ArrowRight, ShoppingCart, BarChart3, CheckCircle2 } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import AgentDashboardGrid from '@/components/agents/AgentDashboardGrid';
import AgentMessageCard from '@/components/agents/AgentMessageCard';
import { getDashboardData, getTasksWithActuals, getEmployees, type TaskWithActual } from '@/lib/supabase-data';
import { getSlugFromDept } from '@/lib/department-utils';
import { runFullCoordination } from '@/lib/agents/coordinator';

function formatVND(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)} tỷ`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M`;
  return new Intl.NumberFormat('vi-VN').format(n);
}

interface DashData {
  employees: { id: number; name: string; role: string; department: string; base_salary: number }[];
  tasks: { id: string; status: string }[];
  deals: { id: string; stage: string; amount: number; title: string }[];
  kpis: { id: number; title: string; target: number; current: number; status: string }[];
  expenses: { id: number; title: string; amount: number; category: string }[];
  channels: { channel: string; revenue_share: number; margin_pct: number }[];
  pnl: { month: string; total_revenue: number; net_profit: number; cogs: number; total_expenses: number }[];
  summary: { headcount: number; totalRevenue: number; totalProfit: number; profitMargin: number; dealsTotal: number; tasksDone: number; tasksTotal: number };
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [agentState, setAgentState] = useState<any>(null);
  const [deptOverview, setDeptOverview] = useState<Array<{
    department: string; slug: string; headcount: number;
    totalTasks: number; completedTasks: number; completionPct: number;
    kpiTasks: number; kpiTarget: number; kpiActual: number; kpiPct: number;
  }>>([]);

  useEffect(() => {
    getDashboardData()
      .then(d => setData(d as DashData))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
    runFullCoordination(2026, 'Q2').then(s => setAgentState(s)).catch(() => {});

    // Load KH vs TT overview per department
    Promise.all([getTasksWithActuals(), getEmployees()]).then(([allTasks, emps]) => {
      const activeEmps = emps.filter((e: { status: string }) => e.status === 'Đang làm việc');
      const deptMap = new Map<string, {
        department: string; headcount: number;
        totalTasks: number; completedTasks: number;
        kpiTasks: number; kpiTarget: number; kpiActual: number;
      }>();

      activeEmps.forEach((e: { department: string }) => {
        if (!deptMap.has(e.department)) {
          deptMap.set(e.department, { department: e.department, headcount: 0, totalTasks: 0, completedTasks: 0, kpiTasks: 0, kpiTarget: 0, kpiActual: 0 });
        }
        deptMap.get(e.department)!.headcount++;
      });

      (allTasks as TaskWithActual[]).forEach(t => {
        const emp = activeEmps.find((e: { id: number; department: string }) => e.id === t.assignee_id);
        if (!emp || !deptMap.has(emp.department)) return;
        const d = deptMap.get(emp.department)!;
        d.totalTasks++;
        if (t.status === 'done') d.completedTasks++;
        if (t.kpi_target) {
          const tgt = parseFloat(String(t.kpi_target).replace(/[^0-9.]/g, ''));
          if (!isNaN(tgt) && tgt > 0) {
            d.kpiTasks++;
            d.kpiTarget += tgt;
            d.kpiActual += t.actualTotal || 0;
          }
        }
      });

      setDeptOverview(Array.from(deptMap.values()).map(d => ({
        ...d,
        slug: getSlugFromDept(d.department),
        completionPct: d.totalTasks > 0 ? Math.round((d.completedTasks / d.totalTasks) * 100) : 0,
        kpiPct: d.kpiTarget > 0 ? Math.round((d.kpiActual / d.kpiTarget) * 100) : 0,
      })).sort((a, b) => b.completionPct - a.completionPct));
    }).catch(() => {});
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <PageHeader title="Teeworld - Trung tâm điều hành" subtitle="Đang tải dữ liệu..." />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-28 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <PageHeader title="Teeworld - Trung tâm điều hành" subtitle="" />
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm text-red-700">{error || 'Không thể tải dữ liệu'}</p>
          <p className="text-xs text-red-500 mt-1">Kiểm tra .env.local NEXT_PUBLIC_SUPABASE_URL</p>
        </div>
      </div>
    );
  }

  const { employees, tasks, deals, kpis, expenses, channels, pnl, summary } = data;
  const tasksDone = tasks.filter(t => t.status === 'done').length;
  const revenueKPI = kpis.find(k => k.title.includes('Năm 2026'));
  const dealStages = ['Đã hoàn thành', 'Đang triển khai', 'Chốt sale', 'Đàm phán', 'Lên kế hoạch'];

  return (
    <div className="p-6">
      <PageHeader title="Teeworld - Trung tâm điều hành" subtitle="CEO Dashboard — Dữ liệu thật từ Supabase" />

      {/* Quick Actions */}
      <div className="flex gap-3 mb-6">
        <Link href="/admin/bao-cao-tong-hop" className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 text-sm font-medium">
          <BarChart3 className="w-4 h-4" /> Bao cao AI Agents
        </Link>
        <Link href="/admin/tro-chuyen" className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
          <CheckCircle2 className="w-4 h-4" /> Chat voi AI
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <StatCard icon={DollarSign} label="Doanh thu YTD" value={formatVND(summary.totalRevenue)} color="green" />
        <StatCard icon={TrendingUp} label="Lợi nhuận YTD" value={formatVND(summary.totalProfit)} color="blue" />
        <StatCard icon={PiggyBank} label="Biên LN" value={`${summary.profitMargin}%`} color="purple" />
        <StatCard icon={Users} label="Nhân sự" value={summary.headcount} color="blue" />
        <StatCard icon={ShoppingCart} label="Pipeline" value={formatVND(summary.dealsTotal)} color="orange" />
        <StatCard icon={Target} label="Tasks done" value={`${tasksDone}/${tasks.length}`} color="green" />
      </div>

      {/* Revenue Target */}
      {revenueKPI && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-blue-800">Mục tiêu 2026: {formatVND(revenueKPI.target)}</span>
            <span className="text-sm font-bold text-blue-700">{Math.round(summary.totalRevenue / revenueKPI.target * 100)}%</span>
          </div>
          <div className="h-3 bg-blue-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full" style={{ width: `${Math.min(summary.totalRevenue / revenueKPI.target * 100, 100)}%` }} />
          </div>
          <p className="text-xs text-blue-500 mt-1">Đạt {formatVND(summary.totalRevenue)} / {formatVND(revenueKPI.target)}</p>
        </div>
      )}

      {/* P&L + Channels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-base font-semibold text-slate-800 mb-4">P&L theo tháng</h2>
          <div className="space-y-2">
            {pnl.map(m => (
              <div key={m.month} className="flex items-center gap-3">
                <span className="text-xs text-slate-500 w-8">{m.month}</span>
                <div className="flex-1 h-5 bg-slate-50 rounded overflow-hidden flex">
                  <div className="bg-green-400 h-full" style={{ width: `${m.total_revenue / 30_000_000}%` }} />
                </div>
                <span className="text-[11px] text-slate-600 w-16 text-right">{formatVND(m.total_revenue)}</span>
                <span className={`text-[11px] w-14 text-right font-medium ${m.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatVND(m.net_profit)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-base font-semibold text-slate-800 mb-4">Margin theo kênh bán</h2>
          <div className="space-y-3">
            {channels.map(c => (
              <div key={c.channel} className="flex items-center gap-3">
                <span className="text-[12px] text-slate-700 font-medium w-28 truncate">{c.channel}</span>
                <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${c.margin_pct >= 35 ? 'bg-green-500' : c.margin_pct >= 25 ? 'bg-blue-500' : 'bg-orange-500'}`} style={{ width: `${c.margin_pct}%` }} />
                </div>
                <span className="text-[11px] font-bold w-12 text-right">{c.margin_pct}%</span>
                <span className="text-[10px] text-slate-400 w-10">{c.revenue_share}%</span>
              </div>
            ))}
            <p className="text-[10px] text-slate-400">Website margin 40.9% gấp 2.2x Shopee 18.5%. Push traffic về website.</p>
          </div>
        </div>
      </div>

      {/* Department Overview — KH vs TT */}
      {deptOverview.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-800">Tổng quan phòng ban — Kế hoạch vs Thực tế</h2>
            <div className="flex gap-2">
              <Link href="/admin/tong-quan-okr" className="text-xs text-blue-600 flex items-center gap-1">OKR <ArrowRight size={12} /></Link>
              <Link href="/admin/ke-hoach-thuc-te" className="text-xs text-blue-600 flex items-center gap-1">KH vs TT <ArrowRight size={12} /></Link>
            </div>
          </div>

          {/* Summary row */}
          {(() => {
            const totals = deptOverview.reduce((s, d) => ({
              tasks: s.tasks + d.totalTasks, done: s.done + d.completedTasks,
              kpiTgt: s.kpiTgt + d.kpiTarget, kpiAct: s.kpiAct + d.kpiActual,
              kpiCount: s.kpiCount + d.kpiTasks, hc: s.hc + d.headcount,
            }), { tasks: 0, done: 0, kpiTgt: 0, kpiAct: 0, kpiCount: 0, hc: 0 });
            const overallCompletion = totals.tasks > 0 ? Math.round((totals.done / totals.tasks) * 100) : 0;
            const overallKPI = totals.kpiTgt > 0 ? Math.round((totals.kpiAct / totals.kpiTgt) * 100) : 0;
            return (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-slate-800">{totals.hc}</p>
                  <p className="text-[10px] text-slate-500">Nhân sự</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-slate-800">{totals.done}/{totals.tasks}</p>
                  <p className="text-[10px] text-slate-500">Tasks hoàn thành</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <p className={`text-xl font-bold ${overallCompletion >= 50 ? 'text-green-600' : 'text-orange-600'}`}>{overallCompletion}%</p>
                  <p className="text-[10px] text-slate-500">Tỷ lệ hoàn thành</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <p className={`text-xl font-bold ${overallKPI >= 70 ? 'text-green-600' : overallKPI >= 50 ? 'text-blue-600' : 'text-orange-600'}`}>{overallKPI}%</p>
                  <p className="text-[10px] text-slate-500">KPI thực tế ({totals.kpiCount} tasks)</p>
                </div>
              </div>
            );
          })()}

          {/* Per-department breakdown */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <th className="pb-2 pr-3">Phòng ban</th>
                  <th className="pb-2 pr-3 text-center">Nhân sự</th>
                  <th className="pb-2 pr-3 text-center">Tasks</th>
                  <th className="pb-2 pr-3">Tiến độ</th>
                  <th className="pb-2 pr-3 text-center">KPI tasks</th>
                  <th className="pb-2">KPI KH vs TT</th>
                </tr>
              </thead>
              <tbody>
                {deptOverview.map(d => (
                  <tr key={d.department} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="py-2.5 pr-3">
                      <Link href={`/admin/phong-ban/${d.slug}`} className="text-sm font-medium text-blue-600 hover:text-blue-800">
                        {d.department.replace('Phòng ', '')}
                      </Link>
                    </td>
                    <td className="py-2.5 pr-3 text-center text-sm text-slate-600">{d.headcount}</td>
                    <td className="py-2.5 pr-3 text-center text-sm text-slate-600">{d.completedTasks}/{d.totalTasks}</td>
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${d.completionPct >= 50 ? 'bg-green-500' : d.completionPct >= 30 ? 'bg-blue-500' : 'bg-orange-500'}`} style={{ width: `${d.completionPct}%` }} />
                        </div>
                        <span className="text-[11px] text-slate-500 w-8">{d.completionPct}%</span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-3 text-center text-sm text-slate-500">{d.kpiTasks}</td>
                    <td className="py-2.5">
                      {d.kpiTasks > 0 ? (
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden relative">
                            <div className={`h-full rounded-full ${d.kpiPct >= 90 ? 'bg-green-500' : d.kpiPct >= 70 ? 'bg-blue-500' : 'bg-orange-500'}`} style={{ width: `${Math.min(d.kpiPct, 100)}%` }} />
                          </div>
                          <span className={`text-[11px] font-bold w-8 ${d.kpiPct >= 90 ? 'text-green-600' : d.kpiPct >= 70 ? 'text-blue-600' : 'text-orange-600'}`}>{d.kpiPct}%</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Deals + KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-base font-semibold text-slate-800 mb-4">Pipeline</h2>
          <div className="space-y-2">
            {dealStages.map(stage => {
              const stageDeals = deals.filter(d => d.stage === stage);
              if (stageDeals.length === 0) return null;
              const total = stageDeals.reduce((s, d) => s + d.amount, 0);
              return (
                <div key={stage}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-2 h-2 rounded-full ${stage === 'Đã hoàn thành' ? 'bg-green-500' : stage === 'Đang triển khai' ? 'bg-blue-500' : stage === 'Chốt sale' ? 'bg-purple-500' : stage === 'Đàm phán' ? 'bg-orange-500' : 'bg-slate-300'}`} />
                    <span className="text-[12px] text-slate-600">{stage} ({stageDeals.length})</span>
                    <span className="text-[12px] text-slate-700 font-medium ml-auto">{formatVND(total)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-base font-semibold text-slate-800 mb-4">KPIs</h2>
          <div className="space-y-2">
            {kpis.filter(k => !k.title.includes('Năm')).map(k => (
              <div key={k.id} className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${k.status === 'on-track' ? 'bg-green-500' : 'bg-orange-500'}`} />
                <span className="text-[11px] text-slate-700 flex-1 truncate">{k.title}</span>
                <span className="text-[10px] text-slate-500">{k.current}/{k.target}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Team + Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-800">Team ({employees.length})</h2>
            <Link href="/admin/nhan-vien" className="text-xs text-blue-600 flex items-center gap-1">Chi tiết <ArrowRight size={12} /></Link>
          </div>
          <div className="space-y-1.5">
            {employees.map(e => (
              <div key={e.id} className="flex items-center gap-2 py-1 text-[12px]">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0">
                  {e.name.split(' ').map(w => w[0]).slice(-2).join('')}
                </div>
                <span className="text-slate-700 font-medium flex-1 truncate">{e.name}</span>
                <span className="text-slate-400 text-[10px] truncate max-w-[100px]">{e.department}</span>
                <span className="text-slate-500 text-[10px]">{formatVND(e.base_salary)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-base font-semibold text-slate-800 mb-4">Top chi phí</h2>
          <div className="space-y-1.5">
            {[...expenses].sort((a, b) => b.amount - a.amount).slice(0, 8).map(e => (
              <div key={e.id} className="flex items-center gap-2 py-1 text-[12px]">
                <span className={`w-1.5 h-1.5 rounded-full ${e.category === 'cogs' ? 'bg-red-500' : e.category === 'mkt' ? 'bg-purple-500' : e.category === 'hr' ? 'bg-blue-500' : 'bg-slate-400'}`} />
                <span className="text-slate-700 flex-1 truncate">{e.title}</span>
                <span className="text-slate-600 font-medium">{formatVND(e.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Agents */}
      {agentState && (
        <>
          <div className="mb-6">
            <h2 className="text-base font-semibold text-slate-800 mb-3">AI Agents</h2>
            <AgentDashboardGrid statuses={agentState.agentStatuses} messages={agentState.messages} />
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-800">Agent Messages</h2>
              <Link href="/admin/nhat-ky" className="text-xs text-blue-600 flex items-center gap-1">Tất cả <ArrowRight size={12} /></Link>
            </div>
            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
              {agentState.messages.slice(0, 4).map((msg: any) => <AgentMessageCard key={msg.id} message={msg} />)}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
