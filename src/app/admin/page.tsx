"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Target, TrendingUp, Users, ShoppingCart,
  CheckCircle2, AlertTriangle, ArrowRight, ArrowUpRight,
  Zap, Package, Globe, Brain, RefreshCw,
  Activity, Flame, Star, MessageSquare, Eye,
} from 'lucide-react';
import { agentProfiles, allAgentRoles } from '@/lib/agents/agent-profiles';
import { runFullCoordination } from '@/lib/agents/coordinator';
import { buildExecutiveReport, ExecutiveReportData, fmtVND, fmtPct } from '@/lib/report-builder';
import type { AgentCoordinationState, AgentRole } from '@/lib/agent-types';

export default function CommandCenterPage() {
  const [agentState, setAgentState] = useState<AgentCoordinationState | null>(null);
  const [report, setReport] = useState<ExecutiveReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState('Khởi tạo...');
  const [phaseNum, setPhaseNum] = useState(0);

  const loadData = () => {
    setLoading(true);
    setPhaseNum(0);
    setPhase('Thu thập dữ liệu...');
    const t0 = Date.now();

    const tick = setInterval(() => {
      const elapsed = (Date.now() - t0) / 1000;
      if (elapsed < 2) { setPhase('Thu thập Intelligence...'); setPhaseNum(1); }
      else if (elapsed < 4) { setPhase('CEO đặt chiến lược...'); setPhaseNum(2); }
      else if (elapsed < 6) { setPhase('Phân bổ mục tiêu phòng ban...'); setPhaseNum(3); }
      else if (elapsed < 8) { setPhase('Coach đánh giá hiệu suất...'); setPhaseNum(4); }
      else { setPhase('Tổng hợp báo cáo...'); setPhaseNum(5); }
    }, 500);

    Promise.all([
      runFullCoordination(2026, 'Q2'),
      buildExecutiveReport(2026),
    ]).then(([state, rpt]) => {
      clearInterval(tick);
      setAgentState(state);
      setReport(rpt);
      setLoading(false);
    }).catch(() => {
      clearInterval(tick);
      setPhase('Lỗi kết nối');
      setLoading(false);
    });
  };

  useEffect(() => { loadData(); }, []);

  // ── Loading ──
  if (loading || !agentState || !report) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center">
        <div className="text-center max-w-md">
          {/* Animated rings */}
          <div className="relative w-28 h-28 mx-auto mb-8">
            <div className="absolute inset-0 rounded-full border border-cyan-500/20 animate-ping" style={{ animationDuration: '2s' }} />
            <div className="absolute inset-3 rounded-full border border-cyan-400/30 animate-ping" style={{ animationDuration: '1.5s' }} />
            <div className="absolute inset-6 rounded-full border border-cyan-300/40 animate-pulse" />
            <div className="absolute inset-8 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-600/20 flex items-center justify-center backdrop-blur-sm">
              <Brain className="w-7 h-7 text-cyan-400" />
            </div>
          </div>
          <p className="text-cyan-400 text-sm font-medium tracking-wide mb-2">{phase}</p>
          {/* Phase progress */}
          <div className="flex items-center gap-1.5 justify-center mb-4">
            {[1,2,3,4,5].map(n => (
              <div key={n} className={`h-1 rounded-full transition-all duration-500 ${n <= phaseNum ? 'w-8 bg-cyan-400' : 'w-4 bg-slate-700'}`} />
            ))}
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {['CEO','HR','CFO','Coach','MR','CH','KHO','BST','STR','TrP','TL'].map((a, i) => (
              <span key={a} className={`text-[9px] px-2 py-1 rounded-full border transition-all duration-300 ${i < phaseNum * 2 ? 'border-cyan-500/40 text-cyan-400 bg-cyan-500/10' : 'border-slate-700 text-slate-600'}`}>{a}</span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const { businessTargets, departmentGoals, individualPlans, messages, agentStatuses, stockAlerts, channelAnalysis, collectionPlans, strategyReport } = agentState;

  const totalMessages = messages.length;
  const alerts = messages.filter(m => m.type === 'alert').length;
  const decisions = messages.filter(m => m.type === 'decision').length;
  const recommendations = messages.filter(m => m.type === 'recommendation').length;
  const onTrack = businessTargets.filter(t => t.status === 'on_track' || t.status === 'achieved').length;
  const behind = businessTargets.filter(t => t.status === 'behind').length;
  const criticalStock = stockAlerts.filter(a => a.status === 'critical').length;
  const lowStockCount = stockAlerts.filter(a => a.status === 'low').length;

  return (
    <div className="min-h-screen bg-[#f0f2f5]">

      {/* ═══════════════════════════════════════════════
          HERO HEADER — Dark gradient with glassmorphism
         ═══════════════════════════════════════════════ */}
      <div className="relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a]" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-50" />
        {/* Glow orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />

        <div className="relative max-w-[1400px] mx-auto px-4 md:px-8 pt-6 pb-8">
          {/* Title bar */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <span className="text-white text-sm font-black tracking-tight">TW</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Tổng Chỉ Huy</h1>
                <p className="text-sm text-slate-400">Teeworld Command Center — Q2/2026</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-sm shadow-emerald-400" />
                <span className="text-xs text-emerald-300 font-mono">11/11 agents online</span>
              </div>
              <button onClick={loadData} className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all backdrop-blur-sm">
                <RefreshCw size={16} className="text-slate-400" />
              </button>
            </div>
          </div>

          {/* ── Hero Metrics Grid ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <HeroCard
              label="Doanh thu YTD"
              value={fmtVND(report.overview.totalRevenue)}
              sub={`/ ${fmtVND(report.overview.revenueTarget)} mục tiêu`}
              accent="cyan"
              pct={report.overview.targetAchievement}
            />
            <HeroCard
              label="Lợi nhuận ròng"
              value={fmtVND(report.overview.netProfit)}
              sub={`Margin ${fmtPct(report.overview.profitMargin)}`}
              accent={report.overview.netProfit > 0 ? "emerald" : "red"}
            />
            <HeroCard
              label="Đội ngũ"
              value={`${report.overview.headcount} người`}
              sub={`KPI trung bình: ${report.overview.avgKPI}/100`}
              accent="violet"
            />
            <HeroCard
              label="Pipeline"
              value={`${report.overview.totalDeals} deals`}
              sub={`${report.overview.totalOrders} đơn hàng`}
              accent="amber"
            />
          </div>

          {/* Revenue progress bar */}
          <div className="mt-6 relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400">Tiến độ mục tiêu năm</span>
              <span className="text-sm font-bold text-cyan-400">{fmtPct(report.overview.targetAchievement)}</span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden backdrop-blur-sm">
              <div className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-400 rounded-full shadow-sm shadow-cyan-500/50 transition-all duration-1000" style={{ width: `${Math.min(report.overview.targetAchievement, 100)}%` }} />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-slate-500">{fmtVND(report.overview.totalRevenue)}</span>
              <span className="text-[10px] text-slate-500">{fmtVND(report.overview.revenueTarget)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          MAIN CONTENT
         ═══════════════════════════════════════════════ */}
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 -mt-2 pb-10 space-y-6">

        {/* ── Quick Stats Strip ── */}
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
          {[
            { label: 'Mục tiêu', value: `${onTrack}/${businessTargets.length}`, color: behind > 0 ? 'text-amber-600' : 'text-emerald-600' },
            { label: 'Tồn kho', value: `${report.inventory.totalItems}`, color: criticalStock > 0 ? 'text-red-600' : 'text-emerald-600' },
            { label: 'BST active', value: `${collectionPlans.filter(c => c.status === 'launched' || c.status === 'in_production').length}`, color: 'text-fuchsia-600' },
            { label: 'Sản phẩm', value: `${report.overview.activeProducts}`, color: 'text-blue-600' },
            { label: 'Agent msgs', value: `${totalMessages}`, color: 'text-slate-600' },
            { label: 'Quyết định', value: `${decisions}`, color: 'text-emerald-600' },
            { label: 'Cảnh báo', value: `${alerts}`, color: alerts > 0 ? 'text-amber-600' : 'text-slate-400' },
            { label: 'KH cá nhân', value: `${individualPlans.length}`, color: 'text-violet-600' },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-xl p-3 text-center shadow-sm border border-slate-100">
              <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
              <div className="text-[9px] text-slate-400 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── AI Agents Audit ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <Brain className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-800">AI Agents — Đã audit toàn bộ hệ thống</h2>
                <p className="text-[11px] text-slate-400">5 giai đoạn: Intelligence → Chiến lược → Phân bổ → Kiểm soát → Tổng hợp</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/admin/tro-chuyen" className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-semibold rounded-xl hover:shadow-lg hover:shadow-blue-500/20 transition-all">
                <MessageSquare size={12} /> Chat với Agents
              </Link>
              <Link href="/admin/nhat-ky" className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-blue-600 px-3 py-2">
                <Eye size={12} /> {totalMessages} logs
              </Link>
            </div>
          </div>

          <div className="p-5">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              {allAgentRoles.map(role => {
                const profile = agentProfiles[role];
                const status = agentStatuses[role];
                const msgCount = messages.filter(m => m.agentRole === role).length;
                const lastMsg = [...messages].reverse().find(m => m.agentRole === role);
                const alertCount = messages.filter(m => m.agentRole === role && m.type === 'alert').length;

                return (
                  <div key={role} className="group relative rounded-xl border border-slate-100 p-3.5 hover:border-slate-200 hover:shadow-md transition-all duration-200 cursor-default">
                    {/* Status dot */}
                    <div className={`absolute top-3 right-3 w-2 h-2 rounded-full ${status === 'done' ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-slate-300'}`} />

                    <div className="flex items-center gap-2.5 mb-2.5">
                      <div className={`w-8 h-8 ${profile.color} rounded-lg flex items-center justify-center text-white text-[9px] font-bold shadow-sm`}>
                        {profile.avatar}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 truncate">{profile.name}</p>
                        <p className="text-[9px] text-slate-400 truncate">{profile.title}</p>
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-500 line-clamp-2 min-h-[28px] leading-relaxed mb-2">
                      {lastMsg ? lastMsg.content.slice(0, 90) + '...' : profile.description}
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                      <span className="text-[9px] text-slate-400">{msgCount} msgs</span>
                      <div className="flex items-center gap-1.5">
                        {alertCount > 0 && (
                          <span className="flex items-center gap-0.5 text-[8px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full font-medium">
                            <AlertTriangle size={7} /> {alertCount}
                          </span>
                        )}
                        {status === 'done' && <CheckCircle2 size={11} className="text-emerald-500" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Coordination summary */}
            <div className="grid grid-cols-4 gap-3 mt-5 bg-gradient-to-r from-slate-50 to-slate-50/50 rounded-xl p-4">
              {[
                { icon: CheckCircle2, label: 'Quyết định', value: decisions, color: 'text-emerald-600' },
                { icon: Zap, label: 'Khuyến nghị', value: recommendations, color: 'text-blue-600' },
                { icon: AlertTriangle, label: 'Cảnh báo', value: alerts, color: 'text-amber-600' },
                { icon: Target, label: 'KH cá nhân', value: individualPlans.length, color: 'text-violet-600' },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg bg-white border border-slate-100 flex items-center justify-center shadow-sm`}>
                    <s.icon size={16} className={s.color} />
                  </div>
                  <div>
                    <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
                    <div className="text-[9px] text-slate-400">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Quarter Performance + P&L ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Quarters */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-5">
              <div className="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center"><TrendingUp size={13} className="text-blue-600" /></div>
              Quý so sánh
            </h2>
            <div className="space-y-3">
              {report.quarterComparison.map(q => {
                const maxRev = Math.max(...report.quarterComparison.map(x => x.revenue));
                const isCurrent = q.quarter === 'Q2';
                return (
                  <div key={q.quarter} className={`rounded-xl p-4 ${isCurrent ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 shadow-sm' : 'bg-slate-50 border border-slate-100'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm font-bold ${isCurrent ? 'text-blue-700' : 'text-slate-600'}`}>{q.quarter} {isCurrent ? '← hiện tại' : ''}</span>
                      <span className={`text-xs font-bold ${q.margin > 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmtPct(q.margin)}</span>
                    </div>
                    <div className="h-2 bg-white/80 rounded-full overflow-hidden mb-1.5">
                      <div className={`h-full rounded-full ${isCurrent ? 'bg-gradient-to-r from-blue-500 to-indigo-500' : 'bg-slate-300'}`} style={{ width: `${maxRev > 0 ? (q.revenue / maxRev) * 100 : 0}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-500">DT: {fmtVND(q.revenue)}</span>
                      <span className={q.profit >= 0 ? 'text-emerald-600 font-medium' : 'text-red-500 font-medium'}>LN: {fmtVND(q.profit)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Monthly P&L */}
          <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-emerald-100 flex items-center justify-center"><Activity size={13} className="text-emerald-600" /></div>
                P&L theo tháng
              </h2>
              <Link href="/admin/bao-cao-tai-chinh/ket-qua-kinh-doanh" className="text-[11px] text-blue-600 hover:underline flex items-center gap-1">
                Chi tiết <ArrowRight size={10} />
              </Link>
            </div>
            <div className="space-y-1">
              {report.monthlyPnL.map((m, idx) => {
                const maxRev = Math.max(...report.monthlyPnL.map(x => x.revenue));
                const barW = maxRev > 0 ? (m.revenue / maxRev) * 100 : 0;
                return (
                  <div key={m.month} className="flex items-center gap-2 py-1.5 group hover:bg-slate-50 rounded-lg px-2 -mx-2 transition-colors">
                    <span className="text-[11px] text-slate-500 w-14 font-mono">{m.month}</span>
                    <div className="flex-1 h-6 bg-slate-50 rounded-lg overflow-hidden relative">
                      <div className={`h-full rounded-lg transition-all duration-500 ${m.profit >= 0 ? 'bg-gradient-to-r from-emerald-200 to-emerald-300' : 'bg-gradient-to-r from-red-200 to-red-300'}`} style={{ width: `${barW}%` }} />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-slate-500 font-mono opacity-0 group-hover:opacity-100 transition-opacity">{fmtVND(m.revenue)}</span>
                    </div>
                    <span className="text-[10px] text-slate-600 w-14 text-right font-mono">{fmtVND(m.revenue)}</span>
                    <span className={`text-[10px] w-12 text-right font-bold font-mono ${m.profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fmtVND(m.profit)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Business Targets ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-5">
            <div className="w-6 h-6 rounded-md bg-orange-100 flex items-center justify-center"><Flame size={13} className="text-orange-600" /></div>
            Mục tiêu Kinh doanh Q2/2026 — CEO đã thiết lập
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {businessTargets.map(t => {
              const pct = t.targetValue > 0 ? Math.round((t.currentValue / t.targetValue) * 100) : 0;
              const st = t.status;
              const gradients: Record<string, string> = {
                achieved: 'from-emerald-500 to-green-500',
                on_track: 'from-blue-500 to-indigo-500',
                at_risk: 'from-amber-500 to-orange-500',
                behind: 'from-red-500 to-rose-500',
              };
              const bgs: Record<string, string> = {
                achieved: 'bg-emerald-50 border-emerald-200',
                on_track: 'bg-blue-50 border-blue-200',
                at_risk: 'bg-amber-50 border-amber-200',
                behind: 'bg-red-50 border-red-200',
              };
              const labels: Record<string, string> = { achieved: 'Đạt', on_track: 'Đúng tiến độ', at_risk: 'Rủi ro', behind: 'Chậm' };
              return (
                <div key={t.id} className={`rounded-xl border p-4 ${bgs[st] || 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-slate-700 flex-1">{t.name}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${st === 'achieved' ? 'bg-emerald-100 text-emerald-700' : st === 'on_track' ? 'bg-blue-100 text-blue-700' : st === 'at_risk' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                      {labels[st] || st}
                    </span>
                  </div>
                  <div className="h-2 bg-white/80 rounded-full overflow-hidden mb-1.5">
                    <div className={`h-full rounded-full bg-gradient-to-r ${gradients[st] || 'from-slate-400 to-slate-500'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span>{t.currentValue.toLocaleString()} / {t.targetValue.toLocaleString()} {t.unit}</span>
                    <span className="font-bold">{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Channel + Department ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Channels */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-indigo-100 flex items-center justify-center"><Globe size={13} className="text-indigo-600" /></div>
                Kênh bán — Agent Analysis
              </h2>
              <Link href="/admin/master-plan/marketing" className="text-[11px] text-blue-600 hover:underline flex items-center gap-1">Report <ArrowRight size={10} /></Link>
            </div>
            <div className="space-y-4">
              {channelAnalysis.map(ch => {
                const recColors: Record<string, { bg: string; text: string; label: string }> = {
                  increase: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: '↑ Tăng đầu tư' },
                  maintain: { bg: 'bg-blue-50', text: 'text-blue-700', label: '→ Giữ nguyên' },
                  decrease: { bg: 'bg-red-50', text: 'text-red-700', label: '↓ Cắt giảm' },
                  optimize: { bg: 'bg-amber-50', text: 'text-amber-700', label: '⚡ Tối ưu hóa' },
                };
                const rec = recColors[ch.recommendation] || recColors.maintain;
                const marginColor = ch.margin_pct >= 30 ? 'from-emerald-400 to-green-500' : ch.margin_pct >= 15 ? 'from-blue-400 to-indigo-500' : ch.margin_pct >= 0 ? 'from-amber-400 to-orange-500' : 'from-red-400 to-rose-500';

                return (
                  <div key={ch.channel} className="group">
                    <div className="flex items-center gap-3 mb-1.5">
                      <span className="text-xs font-semibold text-slate-800 w-28">{ch.channel}</span>
                      <div className="flex-1 h-4 bg-slate-50 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full bg-gradient-to-r ${marginColor}`} style={{ width: `${Math.max(ch.margin_pct + 20, 8)}%` }} />
                      </div>
                      <span className={`text-xs font-bold w-12 text-right ${ch.margin_pct >= 20 ? 'text-emerald-600' : ch.margin_pct >= 0 ? 'text-amber-600' : 'text-red-600'}`}>{ch.margin_pct}%</span>
                    </div>
                    <div className="flex items-center gap-3 pl-28">
                      <span className="text-[9px] text-slate-400">Share {ch.revenue_share}%</span>
                      <span className="text-[9px] text-slate-400">ROAS {ch.roas}x</span>
                      <span className={`text-[8px] font-semibold px-2 py-0.5 rounded-full ${rec.bg} ${rec.text}`}>{rec.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Departments */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-violet-100 flex items-center justify-center"><Users size={13} className="text-violet-600" /></div>
                Hiệu suất Phòng ban
              </h2>
              <Link href="/admin/master-plan/hr-director" className="text-[11px] text-blue-600 hover:underline flex items-center gap-1">Report <ArrowRight size={10} /></Link>
            </div>
            <div className="space-y-2">
              {report.departments.map(dept => {
                const crColor = dept.completionRate >= 70 ? 'text-emerald-600 bg-emerald-50' : dept.completionRate >= 40 ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50';
                return (
                  <div key={dept.name} className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 rounded-lg px-2 -mx-2 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-[9px] font-bold text-slate-600">
                      {dept.name.replace('Phòng ', '').slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-medium text-slate-800 block truncate">{dept.name}</span>
                      <span className="text-[10px] text-slate-400">{dept.headcount} NV · KPI {dept.avgKPI || '—'}</span>
                    </div>
                    <div className="text-right">
                      <div className={`text-xs font-bold px-2 py-0.5 rounded-md ${crColor}`}>{fmtPct(dept.completionRate)}</div>
                      <div className="text-[9px] text-slate-400 mt-0.5">{dept.tasksDone}/{dept.tasksTotal} tasks</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Top Performers + Inventory + Pipeline ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Top / Risk */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-5">
              <div className="w-6 h-6 rounded-md bg-amber-100 flex items-center justify-center"><Star size={13} className="text-amber-600" /></div>
              Nhân sự nổi bật
            </h2>
            {report.employees.topPerformers.length > 0 && (
              <div className="mb-4">
                <div className="text-[9px] text-emerald-600 font-bold uppercase tracking-widest mb-2">TOP PERFORMERS</div>
                {report.employees.topPerformers.map((e, i) => (
                  <div key={i} className="flex items-center gap-2 py-2 border-b border-slate-50 last:border-0">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white ${i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-slate-400' : 'bg-amber-700'}`}>
                      {i + 1}
                    </div>
                    <span className="text-xs text-slate-700 flex-1 truncate">{e.name}</span>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">{e.kpiScore}</span>
                  </div>
                ))}
              </div>
            )}
            {report.employees.atRisk.length > 0 && (
              <div>
                <div className="text-[9px] text-red-600 font-bold uppercase tracking-widest mb-2">CẦN COACHING</div>
                {report.employees.atRisk.map((e, i) => (
                  <div key={i} className="flex items-center gap-2 py-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-xs text-slate-700 flex-1 truncate">{e.name}</span>
                    <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md">{e.kpiScore}</span>
                  </div>
                ))}
              </div>
            )}
            <Link href="/admin/master-plan/coach" className="flex items-center gap-1 text-[11px] text-blue-600 hover:underline mt-4">Coach Report <ArrowRight size={10} /></Link>
          </div>

          {/* Inventory */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-5">
              <div className="w-6 h-6 rounded-md bg-orange-100 flex items-center justify-center"><Package size={13} className="text-orange-600" /></div>
              Tồn kho
            </h2>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className={`rounded-xl p-4 text-center ${criticalStock > 0 ? 'bg-gradient-to-br from-red-50 to-rose-50 border border-red-200' : 'bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200'}`}>
                <div className={`text-2xl font-bold ${criticalStock > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{criticalStock}</div>
                <div className="text-[9px] text-slate-500 mt-0.5">Hết hàng</div>
              </div>
              <div className={`rounded-xl p-4 text-center ${lowStockCount > 0 ? 'bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200' : 'bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200'}`}>
                <div className={`text-2xl font-bold ${lowStockCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{lowStockCount}</div>
                <div className="text-[9px] text-slate-500 mt-0.5">Sắp hết</div>
              </div>
            </div>
            {stockAlerts.filter(a => a.status === 'critical' || a.status === 'low').slice(0, 4).map((a, i) => (
              <div key={i} className="flex items-center gap-2 py-1.5 text-xs">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${a.status === 'critical' ? 'bg-red-500' : 'bg-amber-500'}`} />
                <span className="text-slate-700 flex-1 truncate">{a.itemName}</span>
                <span className="text-[10px] text-slate-400 font-mono">{a.currentStock}/{a.minStock}</span>
              </div>
            ))}
            <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
              Tổng giá trị: <span className="font-bold text-slate-700">{fmtVND(report.inventory.totalValue)}</span>
            </div>
            <Link href="/admin/master-plan/operations" className="flex items-center gap-1 text-[11px] text-blue-600 hover:underline mt-2">Operations <ArrowRight size={10} /></Link>
          </div>

          {/* Pipeline */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-5">
              <div className="w-6 h-6 rounded-md bg-purple-100 flex items-center justify-center"><ShoppingCart size={13} className="text-purple-600" /></div>
              Pipeline
            </h2>
            <div className="space-y-3">
              {report.pipeline.map((p, idx) => {
                const maxVal = Math.max(...report.pipeline.map(x => x.totalValue));
                const colors = ['bg-gradient-to-r from-purple-500 to-indigo-500', 'bg-gradient-to-r from-blue-500 to-cyan-500', 'bg-gradient-to-r from-emerald-500 to-green-500', 'bg-gradient-to-r from-amber-500 to-orange-500', 'bg-gradient-to-r from-slate-400 to-slate-500'];
                return (
                  <div key={p.stage}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-700 font-medium">{p.stage}</span>
                      <span className="text-slate-400">({p.count})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-3 bg-slate-50 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${colors[idx % colors.length]}`} style={{ width: `${maxVal > 0 ? (p.totalValue / maxVal) * 100 : 0}%` }} />
                      </div>
                      <span className="text-[10px] font-bold text-slate-700 w-14 text-right">{fmtVND(p.totalValue)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <Link href="/admin/master-plan/sales" className="flex items-center gap-1 text-[11px] text-blue-600 hover:underline mt-4">Sales Report <ArrowRight size={10} /></Link>
          </div>
        </div>

        {/* ── Financial Health ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-teal-100 flex items-center justify-center"><Activity size={13} className="text-teal-600" /></div>
              Sức khỏe Tài chính
            </h2>
            <Link href="/admin/master-plan/cfo" className="text-[11px] text-blue-600 hover:underline flex items-center gap-1">CFO Report <ArrowRight size={10} /></Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <HealthGauge label="Current Ratio" value={report.financialHealth.currentRatio} unit="x" good={1.5} warn={1.0} />
            <HealthGauge label="Debt/Equity" value={report.financialHealth.debtToEquity} unit="x" good={1.0} warn={2.0} invert />
            <HealthGauge label="Profit Margin" value={report.financialHealth.profitMargin} unit="%" good={15} warn={5} />
            <HealthGauge label="Operating Margin" value={report.financialHealth.operatingMargin} unit="%" good={20} warn={10} />
            <HealthGauge label="Burn Rate" value={report.financialHealth.burnRate / 1_000_000} unit="M" good={500} warn={800} invert />
          </div>
        </div>

        {/* ── Strategy Insights ── */}
        {strategyReport && strategyReport.messages.filter(m => m.type === 'alert' || m.type === 'recommendation').length > 0 && (
          <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 rounded-2xl border border-amber-200 p-6">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-5">
              <div className="w-6 h-6 rounded-md bg-amber-200 flex items-center justify-center"><Zap size={13} className="text-amber-700" /></div>
              Strategy Advisor — Cảnh báo & Blind spots
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {strategyReport.messages.filter(m => m.type === 'alert' || m.type === 'recommendation').slice(0, 4).map((msg, i) => (
                <div key={i} className="bg-white/90 rounded-xl p-4 border border-amber-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    {msg.type === 'alert' ? <AlertTriangle size={13} className="text-amber-600" /> : <Zap size={13} className="text-blue-600" />}
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${msg.type === 'alert' ? 'text-amber-600' : 'text-blue-600'}`}>
                      {msg.type === 'alert' ? 'CẢNH BÁO' : 'KHUYẾN NGHỊ'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed line-clamp-4">{msg.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── BST Calendar ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-5">
            <div className="w-6 h-6 rounded-md bg-fuchsia-100 flex items-center justify-center"><span className="text-[11px]">🎨</span></div>
            BST & Lịch ra mắt — 12 BST/năm
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {collectionPlans.map(c => {
              const statusStyles: Record<string, { border: string; bg: string; badge: string; label: string }> = {
                launched: { border: 'border-emerald-200', bg: 'bg-gradient-to-br from-emerald-50 to-green-50', badge: 'bg-emerald-100 text-emerald-700', label: '🚀 Live' },
                in_production: { border: 'border-blue-200', bg: 'bg-gradient-to-br from-blue-50 to-indigo-50', badge: 'bg-blue-100 text-blue-700', label: '🏭 SX' },
                in_design: { border: 'border-purple-200', bg: 'bg-gradient-to-br from-purple-50 to-fuchsia-50', badge: 'bg-purple-100 text-purple-700', label: '🎨 Design' },
                completed: { border: 'border-slate-200', bg: 'bg-slate-50', badge: 'bg-slate-100 text-slate-600', label: '✅ Xong' },
                planned: { border: 'border-slate-100', bg: 'bg-white', badge: 'bg-slate-50 text-slate-500', label: '📋 Plan' },
              };
              const st = statusStyles[c.status] || statusStyles.planned;
              return (
                <div key={c.month} className={`rounded-xl border ${st.border} ${st.bg} p-3.5 hover:shadow-md transition-all`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-slate-400 font-mono">T{c.month}</span>
                    <span className={`text-[8px] font-semibold px-1.5 py-0.5 rounded-full ${st.badge}`}>{st.label}</span>
                  </div>
                  <div className="text-xs font-bold text-slate-800 truncate mb-0.5">{c.name}</div>
                  <div className="text-[10px] text-slate-500 truncate mb-2">{c.theme}</div>
                  <div className="text-[9px] text-slate-400">{c.targetSKUs} SKUs</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Quick Navigation ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { href: '/admin/master-plan/ceo', label: 'CEO Report', icon: '📊', color: 'from-amber-500 to-orange-600' },
            { href: '/admin/master-plan/cfo', label: 'CFO Report', icon: '💰', color: 'from-emerald-500 to-green-600' },
            { href: '/admin/master-plan/hr-director', label: 'HR Report', icon: '👥', color: 'from-purple-500 to-violet-600' },
            { href: '/admin/master-plan/marketing', label: 'Marketing', icon: '📢', color: 'from-cyan-500 to-teal-600' },
            { href: '/admin/master-plan/sales', label: 'Sales', icon: '🤝', color: 'from-indigo-500 to-blue-600' },
            { href: '/admin/master-plan/operations', label: 'Operations', icon: '⚙️', color: 'from-slate-500 to-gray-600' },
            { href: '/admin/master-plan/coach', label: 'Coach', icon: '🏆', color: 'from-rose-500 to-pink-600' },
            { href: '/admin/tro-chuyen', label: 'Chat Agents', icon: '🤖', color: 'from-blue-600 to-indigo-700' },
          ].map(link => (
            <Link key={link.href} href={link.href} className="group relative overflow-hidden rounded-xl bg-white border border-slate-100 hover:border-slate-200 hover:shadow-lg transition-all duration-300">
              <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${link.color}`} />
              <div className="flex items-center gap-3 p-4 pl-5">
                <span className="text-xl">{link.icon}</span>
                <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-900">{link.label}</span>
                <ArrowUpRight size={14} className="text-slate-300 ml-auto group-hover:text-blue-500 transition-colors" />
              </div>
            </Link>
          ))}
        </div>

        {/* ── Recent Agent Messages ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center"><MessageSquare size={13} className="text-slate-600" /></div>
              Agent Messages gần nhất
            </h2>
            <Link href="/admin/nhat-ky" className="text-[11px] text-blue-600 hover:underline flex items-center gap-1">
              Tất cả {totalMessages} <ArrowRight size={10} />
            </Link>
          </div>
          <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
            {messages.slice(0, 8).map(msg => {
              const profile = agentProfiles[msg.agentRole];
              const typeStyles: Record<string, { border: string; badge: string }> = {
                alert: { border: 'border-l-amber-400', badge: 'bg-amber-50 text-amber-700' },
                decision: { border: 'border-l-emerald-400', badge: 'bg-emerald-50 text-emerald-700' },
                recommendation: { border: 'border-l-blue-400', badge: 'bg-blue-50 text-blue-700' },
                analysis: { border: 'border-l-slate-300', badge: 'bg-slate-50 text-slate-600' },
                question: { border: 'border-l-purple-400', badge: 'bg-purple-50 text-purple-700' },
              };
              const ts = typeStyles[msg.type] || typeStyles.analysis;
              return (
                <div key={msg.id} className={`border-l-[3px] ${ts.border} bg-slate-50/50 rounded-r-xl px-4 py-3 hover:bg-slate-50 transition-colors`}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-5 h-5 ${profile.color} rounded-md flex items-center justify-center text-white text-[7px] font-bold`}>
                      {profile.avatar.slice(0, 2)}
                    </div>
                    <span className="text-[11px] font-bold text-slate-700">{msg.agentName}</span>
                    <span className={`text-[8px] font-semibold px-1.5 py-0.5 rounded-full ${ts.badge}`}>{msg.type}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed pl-7">{msg.content}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════ SUB COMPONENTS ═══════════

function HeroCard({ label, value, sub, accent, pct }: { label: string; value: string; sub: string; accent: string; pct?: number }) {
  const accents: Record<string, { from: string; to: string; glow: string; text: string }> = {
    cyan: { from: 'from-cyan-500/10', to: 'to-blue-500/5', glow: 'shadow-cyan-500/5', text: 'text-cyan-400' },
    emerald: { from: 'from-emerald-500/10', to: 'to-green-500/5', glow: 'shadow-emerald-500/5', text: 'text-emerald-400' },
    red: { from: 'from-red-500/10', to: 'to-rose-500/5', glow: 'shadow-red-500/5', text: 'text-red-400' },
    violet: { from: 'from-violet-500/10', to: 'to-purple-500/5', glow: 'shadow-violet-500/5', text: 'text-violet-400' },
    amber: { from: 'from-amber-500/10', to: 'to-orange-500/5', glow: 'shadow-amber-500/5', text: 'text-amber-400' },
  };
  const a = accents[accent] || accents.cyan;

  return (
    <div className={`bg-gradient-to-br ${a.from} ${a.to} rounded-2xl border border-white/10 backdrop-blur-sm p-5 shadow-lg ${a.glow}`}>
      <div className="text-[11px] text-slate-400 mb-1.5 tracking-wide">{label}</div>
      <div className={`text-2xl font-bold text-white mb-1 tracking-tight`}>{value}</div>
      <div className="text-[10px] text-slate-500">{sub}</div>
      {pct !== undefined && (
        <div className="mt-2.5 h-1 bg-white/5 rounded-full overflow-hidden">
          <div className={`h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-400`} style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
      )}
    </div>
  );
}

function HealthGauge({ label, value, unit, good, warn, invert }: { label: string; value: number; unit: string; good: number; warn: number; invert?: boolean }) {
  const isGood = invert ? value <= good : value >= good;
  const isWarn = invert ? (value > good && value <= warn) : (value < good && value >= warn);
  const styles = isGood
    ? 'bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200 text-emerald-600'
    : isWarn
    ? 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200 text-amber-600'
    : 'bg-gradient-to-br from-red-50 to-rose-50 border-red-200 text-red-600';
  const statusLabel = isGood ? '✓ Tốt' : isWarn ? '⚠ Theo dõi' : '✕ Cần xử lý';

  return (
    <div className={`rounded-xl border p-4 text-center ${styles}`}>
      <div className="text-xl font-bold">{typeof value === 'number' ? value.toFixed(1) : value}<span className="text-xs font-normal ml-0.5">{unit}</span></div>
      <div className="text-[10px] text-slate-500 mt-1">{label}</div>
      <div className="text-[9px] font-semibold mt-1.5">{statusLabel}</div>
    </div>
  );
}
