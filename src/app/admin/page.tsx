"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Target, DollarSign, TrendingUp, Users, ShoppingCart, BarChart3,
  CheckCircle2, AlertTriangle, ArrowRight, ArrowUpRight, ArrowDownRight,
  Zap, Package, Palette, Globe, Shield, Brain, RefreshCw,
  Activity, Clock, Flame, Star, Eye, MessageSquare,
} from 'lucide-react';
import AgentAvatar from '@/components/agents/AgentAvatar';
import AgentStatusIndicator from '@/components/agents/AgentStatusIndicator';
import { agentProfiles, allAgentRoles } from '@/lib/agents/agent-profiles';
import { runFullCoordination } from '@/lib/agents/coordinator';
import { buildExecutiveReport, ExecutiveReportData, fmtVND, fmtPct } from '@/lib/report-builder';
import type { AgentCoordinationState, AgentRole, BusinessTarget, StockAlert } from '@/lib/agent-types';

// ============ COMPONENT ============

export default function CommandCenterPage() {
  const [agentState, setAgentState] = useState<AgentCoordinationState | null>(null);
  const [report, setReport] = useState<ExecutiveReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<string>('Khởi tạo...');

  const loadData = () => {
    setLoading(true);
    setPhase('Thu thập dữ liệu...');

    Promise.all([
      runFullCoordination(2026, 'Q2').then(s => { setPhase('Agents phân tích...'); return s; }),
      buildExecutiveReport(2026),
    ]).then(([state, rpt]) => {
      setAgentState(state);
      setReport(rpt);
      setPhase('Hoàn tất');
      setLoading(false);
    }).catch(() => {
      setPhase('Lỗi');
      setLoading(false);
    });
  };

  useEffect(() => { loadData(); }, []);

  // ---- Loading state ----
  if (loading || !agentState || !report) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-2 border-cyan-500/30 animate-ping" />
            <div className="absolute inset-2 rounded-full border-2 border-cyan-400/50 animate-pulse" />
            <div className="absolute inset-4 rounded-full bg-cyan-500/20 flex items-center justify-center">
              <Brain className="w-6 h-6 text-cyan-400 animate-pulse" />
            </div>
          </div>
          <p className="text-cyan-400 text-sm font-mono">{phase}</p>
          <p className="text-slate-500 text-xs mt-2">11 AI Agents đang phối hợp phân tích...</p>
        </div>
      </div>
    );
  }

  const { businessTargets, departmentGoals, individualPlans, costProjections, messages, agentStatuses, stockAlerts, channelAnalysis, collectionPlans, strategyReport, marketResearch, financialHealth } = agentState;

  // Computed metrics
  const totalAgents = allAgentRoles.length;
  const agentsDone = Object.values(agentStatuses).filter(s => s === 'done').length;
  const totalMessages = messages.length;
  const alerts = messages.filter(m => m.type === 'alert').length;
  const decisions = messages.filter(m => m.type === 'decision').length;
  const recommendations = messages.filter(m => m.type === 'recommendation').length;

  // Business target summary
  const onTrack = businessTargets.filter(t => t.status === 'on_track' || t.status === 'achieved').length;
  const atRisk = businessTargets.filter(t => t.status === 'at_risk').length;
  const behind = businessTargets.filter(t => t.status === 'behind').length;

  // Stock alerts
  const criticalStock = stockAlerts.filter(a => a.status === 'critical').length;
  const lowStock = stockAlerts.filter(a => a.status === 'low').length;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ═══════════ HEADER ═══════════ */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 bg-cyan-500/20 rounded-xl flex items-center justify-center border border-cyan-500/30">
                  <Shield className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">Tổng Chỉ Huy</h1>
                  <p className="text-xs text-slate-400">Teeworld Command Center — Q2/2026</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-xs text-green-400 font-mono">{agentsDone}/{totalAgents} agents online</span>
              </div>
              <button onClick={loadData} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors border border-white/10">
                <RefreshCw size={16} className="text-slate-400" />
              </button>
            </div>
          </div>

          {/* ── TOP METRICS ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            <MetricCard label="Doanh thu YTD" value={fmtVND(report.overview.totalRevenue)} sub={`Mục tiêu: ${fmtVND(report.overview.revenueTarget)}`} color="cyan" />
            <MetricCard label="Lợi nhuận" value={fmtVND(report.overview.netProfit)} sub={`Margin: ${fmtPct(report.overview.profitMargin)}`} color={report.overview.netProfit > 0 ? "green" : "red"} />
            <MetricCard label="Nhân sự" value={`${report.overview.headcount}`} sub={`KPI TB: ${report.overview.avgKPI}/100`} color="blue" />
            <MetricCard label="Đơn hàng" value={`${report.overview.totalOrders}`} sub={`${report.overview.totalDeals} deals`} color="purple" />
            <MetricCard label="Mục tiêu" value={`${onTrack}/${businessTargets.length}`} sub={`${atRisk} at risk, ${behind} behind`} color={behind > 0 ? "amber" : "green"} />
            <MetricCard label="Tồn kho" value={`${report.inventory.totalItems}`} sub={`${criticalStock} critical, ${lowStock} low`} color={criticalStock > 0 ? "red" : "green"} />
            <MetricCard label="Agent msgs" value={`${totalMessages}`} sub={`${alerts} alerts, ${decisions} quyết định`} color="slate" />
            <MetricCard label="BST active" value={`${collectionPlans.filter(c => c.status === 'launched' || c.status === 'in_production').length}`} sub={`${collectionPlans.length} planned/năm`} color="pink" />
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-6 space-y-6">

        {/* ═══════════ REVENUE TARGET PROGRESS ═══════════ */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-600" /> Tiến độ Mục tiêu 2026
            </h2>
            <span className="text-2xl font-bold text-blue-600">{fmtPct(report.overview.targetAchievement)}</span>
          </div>
          <div className="h-4 bg-slate-100 rounded-full overflow-hidden mb-2">
            <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all" style={{ width: `${Math.min(report.overview.targetAchievement, 100)}%` }} />
          </div>
          <div className="flex justify-between text-xs text-slate-500">
            <span>Đạt: {fmtVND(report.overview.totalRevenue)}</span>
            <span>Mục tiêu: {fmtVND(report.overview.revenueTarget)}</span>
          </div>

          {/* Quarterly breakdown */}
          <div className="grid grid-cols-4 gap-3 mt-4">
            {report.quarterComparison.map(q => (
              <div key={q.quarter} className={`rounded-lg p-3 text-center ${q.quarter === 'Q2' ? 'bg-blue-50 border-2 border-blue-300' : 'bg-slate-50'}`}>
                <div className="text-xs text-slate-500 mb-1">{q.quarter}{q.quarter === 'Q2' ? ' ←' : ''}</div>
                <div className="text-sm font-bold text-slate-800">{fmtVND(q.revenue)}</div>
                <div className={`text-xs font-medium ${q.margin > 0 ? 'text-green-600' : 'text-red-600'}`}>{fmtPct(q.margin)} margin</div>
              </div>
            ))}
          </div>
        </div>

        {/* ═══════════ AI AGENTS STATUS ═══════════ */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Brain className="w-4 h-4 text-purple-600" /> AI Agents — Trạng thái Audit
            </h2>
            <div className="flex items-center gap-3">
              <Link href="/admin/tro-chuyen" className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700">
                <MessageSquare size={12} /> Chat với Agents
              </Link>
              <Link href="/admin/nhat-ky" className="flex items-center gap-1 text-xs text-slate-500 hover:text-blue-600">
                <Eye size={12} /> {totalMessages} messages
              </Link>
            </div>
          </div>

          {/* Agent grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 mb-4">
            {allAgentRoles.map(role => {
              const profile = agentProfiles[role];
              const status = agentStatuses[role];
              const msgCount = messages.filter(m => m.agentRole === role).length;
              const lastMsg = [...messages].reverse().find(m => m.agentRole === role);
              const alertCount = messages.filter(m => m.agentRole === role && m.type === 'alert').length;

              return (
                <div key={role} className={`rounded-xl border p-3 ${status === 'done' ? 'border-green-200 bg-green-50/50' : status === 'error' ? 'border-red-200 bg-red-50/50' : 'border-slate-200 bg-slate-50'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <AgentAvatar role={role} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-800 truncate">{profile.name}</p>
                      <AgentStatusIndicator status={status} />
                    </div>
                    {alertCount > 0 && (
                      <span className="flex items-center gap-0.5 text-[10px] text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full">
                        <AlertTriangle size={8} /> {alertCount}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 line-clamp-2 min-h-[28px]">
                    {lastMsg ? lastMsg.content.slice(0, 100) + '...' : profile.description}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[9px] text-slate-400">{msgCount} msgs</span>
                    {status === 'done' && <CheckCircle2 size={12} className="text-green-500" />}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Agent coordination summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 rounded-lg p-4">
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">{decisions}</div>
              <div className="text-[10px] text-slate-500">Quyết định</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">{recommendations}</div>
              <div className="text-[10px] text-slate-500">Khuyến nghị</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-amber-600">{alerts}</div>
              <div className="text-[10px] text-slate-500">Cảnh báo</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-purple-600">{individualPlans.length}</div>
              <div className="text-[10px] text-slate-500">Kế hoạch cá nhân</div>
            </div>
          </div>
        </div>

        {/* ═══════════ ROW: Business Targets + P&L ═══════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Business Targets */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-4">
              <Flame className="w-4 h-4 text-orange-500" /> Mục tiêu Kinh doanh Q2/2026
            </h2>
            <div className="space-y-2">
              {businessTargets.slice(0, 10).map(t => {
                const pct = t.targetValue > 0 ? (t.currentValue / t.targetValue) * 100 : 0;
                const statusColor = t.status === 'achieved' ? 'bg-green-500' : t.status === 'on_track' ? 'bg-blue-500' : t.status === 'at_risk' ? 'bg-amber-500' : 'bg-red-500';
                const statusLabel = t.status === 'achieved' ? 'Đạt' : t.status === 'on_track' ? 'Đúng tiến độ' : t.status === 'at_risk' ? 'Rủi ro' : 'Chậm';
                return (
                  <div key={t.id} className="flex items-center gap-3 py-1.5">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusColor}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-700 truncate">{t.name}</span>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${t.status === 'achieved' ? 'bg-green-100 text-green-700' : t.status === 'on_track' ? 'bg-blue-100 text-blue-700' : t.status === 'at_risk' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{statusLabel}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${statusColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                        <span className="text-[10px] text-slate-400 w-8 text-right">{Math.round(pct)}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Monthly P&L */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-green-600" /> P&L theo tháng
            </h2>
            <div className="space-y-1.5">
              {report.monthlyPnL.map(m => {
                const maxRev = Math.max(...report.monthlyPnL.map(x => x.revenue));
                return (
                  <div key={m.month} className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500 w-12 font-mono">{m.month}</span>
                    <div className="flex-1 h-5 bg-slate-50 rounded overflow-hidden flex relative">
                      <div className="bg-green-400/70 h-full" style={{ width: `${maxRev > 0 ? (m.revenue / maxRev) * 100 : 0}%` }} />
                      {m.profit < 0 && <div className="absolute right-1 top-0.5 text-[9px] text-red-500 font-medium">lỗ</div>}
                    </div>
                    <span className="text-[10px] text-slate-600 w-14 text-right font-mono">{fmtVND(m.revenue)}</span>
                    <span className={`text-[10px] w-12 text-right font-bold font-mono ${m.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmtVND(m.profit)}</span>
                  </div>
                );
              })}
            </div>
            <Link href="/admin/bao-cao-tai-chinh/ket-qua-kinh-doanh" className="flex items-center gap-1 text-xs text-blue-600 mt-3 hover:underline">
              Xem báo cáo tài chính <ArrowRight size={12} />
            </Link>
          </div>
        </div>

        {/* ═══════════ ROW: Channel + Department Performance ═══════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Channel Analysis */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-4">
              <Globe className="w-4 h-4 text-indigo-600" /> Kênh bán hàng — Agent Analysis
            </h2>
            <div className="space-y-3">
              {channelAnalysis.map(ch => {
                const recColor = ch.recommendation === 'increase' ? 'text-green-600 bg-green-50' : ch.recommendation === 'decrease' ? 'text-red-600 bg-red-50' : ch.recommendation === 'optimize' ? 'text-amber-600 bg-amber-50' : 'text-blue-600 bg-blue-50';
                const recLabel = ch.recommendation === 'increase' ? '↑ Tăng' : ch.recommendation === 'decrease' ? '↓ Giảm' : ch.recommendation === 'optimize' ? '⚡ Tối ưu' : '→ Giữ';
                return (
                  <div key={ch.channel} className="flex items-center gap-3">
                    <span className="text-xs text-slate-700 font-medium w-24 truncate">{ch.channel}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${ch.margin_pct >= 35 ? 'bg-green-500' : ch.margin_pct >= 20 ? 'bg-blue-500' : ch.margin_pct >= 0 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${Math.max(ch.margin_pct + 20, 5)}%` }} />
                        </div>
                        <span className={`text-[10px] font-bold w-10 text-right ${ch.margin_pct >= 20 ? 'text-green-600' : ch.margin_pct >= 0 ? 'text-amber-600' : 'text-red-600'}`}>{ch.margin_pct}%</span>
                      </div>
                      <div className="flex items-center gap-2 text-[9px] text-slate-400">
                        <span>Share: {ch.revenue_share}%</span>
                        <span>ROAS: {ch.roas}x</span>
                      </div>
                    </div>
                    <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${recColor}`}>{recLabel}</span>
                  </div>
                );
              })}
            </div>
            <Link href="/admin/master-plan/marketing" className="flex items-center gap-1 text-xs text-blue-600 mt-3 hover:underline">
              Xem report Marketing <ArrowRight size={12} />
            </Link>
          </div>

          {/* Department Performance */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-blue-600" /> Hiệu suất Phòng ban
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[10px] text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <th className="pb-2">Phòng ban</th>
                    <th className="pb-2 text-center">NV</th>
                    <th className="pb-2 text-center">KPI TB</th>
                    <th className="pb-2 text-center">Tasks</th>
                    <th className="pb-2 text-center">%</th>
                  </tr>
                </thead>
                <tbody>
                  {report.departments.map(dept => (
                    <tr key={dept.name} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="py-2 text-slate-700 font-medium">{dept.name.replace('Phòng ', '')}</td>
                      <td className="py-2 text-center text-slate-600">{dept.headcount}</td>
                      <td className="py-2 text-center">
                        <span className={`font-bold ${dept.avgKPI >= 80 ? 'text-green-600' : dept.avgKPI >= 60 ? 'text-blue-600' : dept.avgKPI > 0 ? 'text-amber-600' : 'text-slate-300'}`}>
                          {dept.avgKPI || '—'}
                        </span>
                      </td>
                      <td className="py-2 text-center text-slate-600">{dept.tasksDone}/{dept.tasksTotal}</td>
                      <td className="py-2 text-center">
                        <span className={`font-bold ${dept.completionRate >= 70 ? 'text-green-600' : dept.completionRate >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                          {fmtPct(dept.completionRate)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Link href="/admin/master-plan/hr-director" className="flex items-center gap-1 text-xs text-blue-600 mt-3 hover:underline">
              Xem report HR <ArrowRight size={12} />
            </Link>
          </div>
        </div>

        {/* ═══════════ ROW: Top/Risk Employees + Inventory + Pipeline ═══════════ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Top Performers & At-Risk */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-4">
              <Star className="w-4 h-4 text-amber-500" /> Nhân sự nổi bật
            </h2>
            {report.employees.topPerformers.length > 0 && (
              <div className="mb-4">
                <div className="text-[10px] text-green-600 font-semibold uppercase tracking-wider mb-2">Top Performers</div>
                {report.employees.topPerformers.map((e, i) => (
                  <div key={i} className="flex items-center gap-2 py-1.5">
                    <span className="w-5 h-5 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-[9px] font-bold">#{i+1}</span>
                    <span className="text-xs text-slate-700 flex-1 truncate">{e.name}</span>
                    <span className="text-[10px] text-slate-400">{e.department?.replace('Phòng ', '')}</span>
                    <span className="text-xs font-bold text-green-600">{e.kpiScore}</span>
                  </div>
                ))}
              </div>
            )}
            {report.employees.atRisk.length > 0 && (
              <div>
                <div className="text-[10px] text-red-600 font-semibold uppercase tracking-wider mb-2">Cần Coaching</div>
                {report.employees.atRisk.map((e, i) => (
                  <div key={i} className="flex items-center gap-2 py-1.5">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-xs text-slate-700 flex-1 truncate">{e.name}</span>
                    <span className="text-xs font-bold text-red-600">{e.kpiScore}</span>
                  </div>
                ))}
              </div>
            )}
            {report.employees.topPerformers.length === 0 && report.employees.atRisk.length === 0 && (
              <p className="text-xs text-slate-400">Chưa có dữ liệu KPI</p>
            )}
            <Link href="/admin/master-plan/coach" className="flex items-center gap-1 text-xs text-blue-600 mt-3 hover:underline">
              Xem report Coach <ArrowRight size={12} />
            </Link>
          </div>

          {/* Inventory Alerts */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-4">
              <Package className="w-4 h-4 text-orange-600" /> Tồn kho & Chuỗi cung ứng
            </h2>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className={`rounded-lg p-3 text-center ${criticalStock > 0 ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                <div className={`text-xl font-bold ${criticalStock > 0 ? 'text-red-600' : 'text-green-600'}`}>{criticalStock}</div>
                <div className="text-[9px] text-slate-500">Hết hàng</div>
              </div>
              <div className={`rounded-lg p-3 text-center ${lowStock > 0 ? 'bg-amber-50 border border-amber-200' : 'bg-green-50 border border-green-200'}`}>
                <div className={`text-xl font-bold ${lowStock > 0 ? 'text-amber-600' : 'text-green-600'}`}>{lowStock}</div>
                <div className="text-[9px] text-slate-500">Sắp hết</div>
              </div>
            </div>
            {stockAlerts.filter(a => a.status === 'critical' || a.status === 'low').slice(0, 5).map((a, i) => (
              <div key={i} className="flex items-center gap-2 py-1 text-xs">
                <span className={`w-1.5 h-1.5 rounded-full ${a.status === 'critical' ? 'bg-red-500' : 'bg-amber-500'}`} />
                <span className="text-slate-700 flex-1 truncate">{a.itemName}</span>
                <span className="text-[10px] text-slate-400">{a.currentStock}/{a.minStock}</span>
              </div>
            ))}
            <div className="mt-3 text-xs text-slate-500">
              Tổng giá trị kho: <span className="font-bold text-slate-700">{fmtVND(report.inventory.totalValue)}</span>
            </div>
            <Link href="/admin/master-plan/operations" className="flex items-center gap-1 text-xs text-blue-600 mt-2 hover:underline">
              Xem report Operations <ArrowRight size={12} />
            </Link>
          </div>

          {/* Pipeline */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-4">
              <ShoppingCart className="w-4 h-4 text-purple-600" /> Pipeline & Deals
            </h2>
            <div className="space-y-2.5">
              {report.pipeline.map(p => {
                const maxVal = Math.max(...report.pipeline.map(x => x.totalValue));
                return (
                  <div key={p.stage}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-700">{p.stage} <span className="text-slate-400">({p.count})</span></span>
                      <span className="font-bold text-slate-700">{fmtVND(p.totalValue)}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500/70 rounded-full" style={{ width: `${maxVal > 0 ? (p.totalValue / maxVal) * 100 : 0}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <Link href="/admin/master-plan/sales" className="flex items-center gap-1 text-xs text-blue-600 mt-3 hover:underline">
              Xem report Sales <ArrowRight size={12} />
            </Link>
          </div>
        </div>

        {/* ═══════════ FINANCIAL HEALTH ═══════════ */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-teal-600" /> Sức khỏe Tài chính
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <HealthGauge label="Current Ratio" value={report.financialHealth.currentRatio} unit="x" good={1.5} warn={1.0} />
            <HealthGauge label="Debt/Equity" value={report.financialHealth.debtToEquity} unit="x" good={1.0} warn={2.0} invert />
            <HealthGauge label="Profit Margin" value={report.financialHealth.profitMargin} unit="%" good={15} warn={5} />
            <HealthGauge label="Operating Margin" value={report.financialHealth.operatingMargin} unit="%" good={20} warn={10} />
            <HealthGauge label="Burn Rate" value={report.financialHealth.burnRate / 1_000_000} unit="M/tháng" good={500} warn={800} invert />
          </div>
          <Link href="/admin/master-plan/cfo" className="flex items-center gap-1 text-xs text-blue-600 mt-4 hover:underline">
            Xem report CFO <ArrowRight size={12} />
          </Link>
        </div>

        {/* ═══════════ STRATEGY ADVISOR INSIGHTS ═══════════ */}
        {strategyReport && (
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-5">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-amber-600" /> Strategy Advisor — Cảnh báo & Blind spots
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {strategyReport.messages.filter(m => m.type === 'alert' || m.type === 'recommendation').slice(0, 4).map((msg, i) => (
                <div key={i} className="bg-white/80 rounded-lg p-3 border border-amber-200/50">
                  <div className="flex items-center gap-2 mb-1">
                    {msg.type === 'alert' ? <AlertTriangle size={12} className="text-amber-600" /> : <Zap size={12} className="text-blue-600" />}
                    <span className={`text-[10px] font-medium ${msg.type === 'alert' ? 'text-amber-600' : 'text-blue-600'}`}>
                      {msg.type === 'alert' ? 'CẢNH BÁO' : 'KHUYẾN NGHỊ'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 line-clamp-3">{msg.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════ COLLECTION PLANS ═══════════ */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-4">
            <Palette className="w-4 h-4 text-pink-600" /> BST & Sản phẩm — Lịch ra mắt
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {collectionPlans.map(c => {
              const statusColor = c.status === 'launched' ? 'border-green-300 bg-green-50' : c.status === 'in_production' ? 'border-blue-300 bg-blue-50' : c.status === 'in_design' ? 'border-purple-300 bg-purple-50' : c.status === 'completed' ? 'border-slate-300 bg-slate-50' : 'border-slate-200 bg-white';
              const statusLabel = c.status === 'launched' ? '🚀 Đã ra mắt' : c.status === 'in_production' ? '🏭 Đang SX' : c.status === 'in_design' ? '🎨 Thiết kế' : c.status === 'completed' ? '✅ Xong' : '📋 Kế hoạch';
              return (
                <div key={c.month} className={`rounded-lg border p-3 ${statusColor}`}>
                  <div className="text-[10px] text-slate-500 mb-1">T{c.month}</div>
                  <div className="text-xs font-bold text-slate-800 truncate mb-1">{c.name}</div>
                  <div className="text-[10px] text-slate-500 truncate mb-2">{c.theme}</div>
                  <div className="text-[9px]">{statusLabel}</div>
                  <div className="text-[9px] text-slate-400 mt-1">{c.targetSKUs} SKUs</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ═══════════ QUICK LINKS ═══════════ */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { href: '/admin/master-plan/ceo', label: 'CEO Report', icon: '📊', desc: 'Báo cáo tổng hợp' },
            { href: '/admin/master-plan/cfo', label: 'CFO Report', icon: '💰', desc: 'Tài chính & P&L' },
            { href: '/admin/master-plan/hr-director', label: 'HR Report', icon: '👥', desc: 'Nhân sự & KPI' },
            { href: '/admin/master-plan/marketing', label: 'Marketing', icon: '📢', desc: 'Kênh & Chiến dịch' },
            { href: '/admin/master-plan/sales', label: 'Sales Report', icon: '🤝', desc: 'Pipeline & Deals' },
            { href: '/admin/master-plan/operations', label: 'Operations', icon: '⚙️', desc: 'Vận hành & Tồn kho' },
            { href: '/admin/master-plan/coach', label: 'Coach Report', icon: '🏆', desc: 'Hiệu suất & PIP' },
            { href: '/admin/tro-chuyen', label: 'Chat AI Agents', icon: '🤖', desc: 'Chạy /workflow' },
          ].map(link => (
            <Link key={link.href} href={link.href} className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all group">
              <span className="text-2xl">{link.icon}</span>
              <div>
                <div className="text-sm font-semibold text-slate-800 group-hover:text-blue-600">{link.label}</div>
                <div className="text-[10px] text-slate-400">{link.desc}</div>
              </div>
              <ArrowRight size={14} className="text-slate-300 ml-auto group-hover:text-blue-400" />
            </Link>
          ))}
        </div>

        {/* ═══════════ RECENT AGENT MESSAGES ═══════════ */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-slate-600" /> Agent Messages gần nhất
            </h2>
            <Link href="/admin/nhat-ky" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              Tất cả {totalMessages} messages <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {messages.slice(0, 8).map(msg => {
              const profile = agentProfiles[msg.agentRole];
              const typeColor = msg.type === 'alert' ? 'border-l-amber-500' : msg.type === 'decision' ? 'border-l-green-500' : msg.type === 'recommendation' ? 'border-l-blue-500' : 'border-l-slate-300';
              return (
                <div key={msg.id} className={`border-l-3 ${typeColor} bg-slate-50 rounded-r-lg px-3 py-2`} style={{ borderLeftWidth: '3px' }}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <AgentAvatar role={msg.agentRole} size="xs" />
                    <span className="text-[11px] font-semibold text-slate-700">{msg.agentName}</span>
                    <span className={`text-[9px] px-1 py-0.5 rounded ${msg.type === 'alert' ? 'bg-amber-100 text-amber-700' : msg.type === 'decision' ? 'bg-green-100 text-green-700' : msg.type === 'recommendation' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{msg.type}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 line-clamp-2">{msg.content}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ SUB-COMPONENTS ============

function MetricCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  const colors: Record<string, string> = {
    cyan: 'from-cyan-500/10 to-cyan-500/5 border-cyan-500/20',
    green: 'from-green-500/10 to-green-500/5 border-green-500/20',
    red: 'from-red-500/10 to-red-500/5 border-red-500/20',
    blue: 'from-blue-500/10 to-blue-500/5 border-blue-500/20',
    purple: 'from-purple-500/10 to-purple-500/5 border-purple-500/20',
    amber: 'from-amber-500/10 to-amber-500/5 border-amber-500/20',
    slate: 'from-slate-500/10 to-slate-500/5 border-slate-500/20',
    pink: 'from-pink-500/10 to-pink-500/5 border-pink-500/20',
  };

  return (
    <div className={`bg-gradient-to-br ${colors[color] || colors.slate} border rounded-xl px-3 py-3`}>
      <div className="text-[10px] text-slate-400 mb-1">{label}</div>
      <div className="text-lg font-bold text-white">{value}</div>
      <div className="text-[9px] text-slate-500 mt-0.5">{sub}</div>
    </div>
  );
}

function HealthGauge({ label, value, unit, good, warn, invert }: { label: string; value: number; unit: string; good: number; warn: number; invert?: boolean }) {
  const isGood = invert ? value <= good : value >= good;
  const isWarn = invert ? (value > good && value <= warn) : (value < good && value >= warn);
  const isBad = !isGood && !isWarn;
  const color = isGood ? 'text-green-600 bg-green-50 border-green-200' : isWarn ? 'text-amber-600 bg-amber-50 border-amber-200' : 'text-red-600 bg-red-50 border-red-200';

  return (
    <div className={`rounded-lg border p-3 text-center ${color}`}>
      <div className="text-xl font-bold">{typeof value === 'number' ? value.toFixed(1) : value}{unit}</div>
      <div className="text-[10px] text-slate-500 mt-1">{label}</div>
      <div className={`text-[9px] font-medium mt-1 ${isGood ? 'text-green-600' : isWarn ? 'text-amber-600' : 'text-red-600'}`}>
        {isGood ? '✓ Tốt' : isWarn ? '⚠ Theo dõi' : '✕ Cần xử lý'}
      </div>
    </div>
  );
}
