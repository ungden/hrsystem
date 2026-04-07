"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Target, TrendingUp, Users, ShoppingCart,
  CheckCircle2, AlertTriangle, ArrowRight, ArrowUpRight,
  Zap, Package, Globe, Brain, RefreshCw,
  Activity, Flame, Star, MessageSquare, Eye, Loader2,
} from 'lucide-react';
import { agentProfiles, allAgentRoles } from '@/lib/agents/agent-profiles';
import { fmtVND, fmtPct } from '@/lib/report-builder';
import { createBrowserClient } from '@supabase/ssr';
import type { AgentRole } from '@/lib/agent-types';

interface CData {
  businessTargets: any[]; departmentGoals: any[]; individualPlans: any[];
  costProjections: any[]; messages: any[]; agentStatuses: Record<string, string>;
  actions: any[]; channelAnalysis: any[]; stockAlerts: any[];
  collectionPlans: any[]; inventoryForecasts: any[]; financialHealth: any;
  milestones: any[]; departmentDetails: any[];
  marketResearch: any; strategyReport: any; report: any;
}

export default function CommandCenterPage() {
  const [data, setData] = useState<CData | null>(null);
  const [ts, setTs] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true); setError('');
    const sb = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    sb.from('command_center_snapshots').select('data, generated_at').eq('snapshot_type', 'full')
      .order('generated_at', { ascending: false }).limit(1).single()
      .then(({ data: row, error: err }) => {
        if (err || !row) { setError(err?.message || 'Chưa có data'); }
        else { setData(row.data as CData); setTs(row.generated_at); }
        setLoading(false);
      });
  };
  useEffect(() => { load(); }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      <span className="ml-3 text-sm text-slate-500">Đang tải dữ liệu...</span>
    </div>
  );
  if (error || !data) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="text-center max-w-md">
        <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
        <p className="text-sm text-slate-700 font-medium mb-1">Chưa có dữ liệu AI Agent</p>
        <p className="text-xs text-slate-400 mb-3">{error}</p>
        <code className="block text-[11px] bg-slate-100 text-slate-600 px-3 py-2 rounded-lg font-mono mb-3">npx tsx --env-file=.env.local scripts/push-snapshot.ts</code>
        <button onClick={load} className="text-xs text-blue-600 hover:underline">Thử lại</button>
      </div>
    </div>
  );

  const { businessTargets, individualPlans, messages, agentStatuses, stockAlerts, channelAnalysis, collectionPlans, strategyReport } = data;
  const r = data.report;
  const alerts = messages.filter((m: any) => m.type === 'alert').length;
  const decisions = messages.filter((m: any) => m.type === 'decision').length;
  const recs = messages.filter((m: any) => m.type === 'recommendation').length;
  const onTrack = businessTargets.filter((t: any) => t.status === 'on_track' || t.status === 'achieved').length;
  const behind = businessTargets.filter((t: any) => t.status === 'behind').length;
  const critStock = stockAlerts.filter((a: any) => a.status === 'critical').length;
  const lowStock = stockAlerts.filter((a: any) => a.status === 'low').length;

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto space-y-5">

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Tổng Chỉ Huy</h1>
          <p className="text-xs text-slate-400">
            Q2/2026 · Cập nhật {ts ? new Date(ts).toLocaleString('vi-VN') : '—'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden md:flex items-center gap-1.5 text-[11px] text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full">
            <CheckCircle2 size={12} /> 11 agents done
          </span>
          <Link href="/admin/tro-chuyen" className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700">
            <MessageSquare size={12} /> Chat AI
          </Link>
          <button onClick={load} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"><RefreshCw size={14} /></button>
        </div>
      </div>

      {/* ── TOP 4 METRICS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Metric icon={<TrendingUp size={18} />} iconBg="bg-blue-100 text-blue-600" label="Doanh thu YTD" value={fmtVND(r.overview.totalRevenue)} sub={`/ ${fmtVND(r.overview.revenueTarget)} mục tiêu`} badge={`${fmtPct(r.overview.targetAchievement)}`} badgeColor={r.overview.targetAchievement >= 100 ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'} />
        <Metric icon={<Activity size={18} />} iconBg="bg-emerald-100 text-emerald-600" label="Lợi nhuận ròng" value={fmtVND(r.overview.netProfit)} sub={`Margin ${fmtPct(r.overview.profitMargin)}`} />
        <Metric icon={<Users size={18} />} iconBg="bg-violet-100 text-violet-600" label="Đội ngũ" value={`${r.overview.headcount} người`} sub={`KPI TB: ${r.overview.avgKPI}/100`} />
        <Metric icon={<ShoppingCart size={18} />} iconBg="bg-amber-100 text-amber-600" label="Pipeline" value={`${r.overview.totalDeals} deals`} sub={`${r.overview.totalOrders} đơn hàng`} />
      </div>

      {/* ── REVENUE PROGRESS ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-700">Tiến độ mục tiêu năm 2026</span>
          <span className="text-sm font-bold text-blue-600">{fmtPct(r.overview.targetAchievement)}</span>
        </div>
        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(r.overview.targetAchievement, 100)}%` }} />
        </div>
        <div className="flex justify-between mt-1.5 text-[10px] text-slate-400">
          <span>{fmtVND(r.overview.totalRevenue)}</span>
          <span>{fmtVND(r.overview.revenueTarget)}</span>
        </div>
      </div>

      {/* ── AI AGENTS ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-800">AI Agents</h2>
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span>{messages.length} messages</span>
            <span className="text-emerald-600">{decisions} quyết định</span>
            <span className="text-amber-600">{alerts} cảnh báo</span>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2.5">
          {allAgentRoles.map(role => {
            const p = agentProfiles[role];
            const done = agentStatuses[role] === 'done';
            const mc = messages.filter((m: any) => m.agentRole === role).length;
            const last = [...messages].reverse().find((m: any) => m.agentRole === role);
            const ac = messages.filter((m: any) => m.agentRole === role && m.type === 'alert').length;
            return (
              <div key={role} className="rounded-lg border border-slate-100 p-3 hover:border-slate-200 hover:shadow-sm transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-7 h-7 ${p.color} rounded-md flex items-center justify-center text-white text-[8px] font-bold`}>{p.avatar}</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold text-slate-800 truncate">{p.name}</p>
                  </div>
                  {done && <CheckCircle2 size={12} className="text-emerald-500 flex-shrink-0" />}
                </div>
                <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed min-h-[26px]">
                  {last ? last.content.slice(0, 80) + '...' : p.description}
                </p>
                <div className="flex items-center gap-2 mt-2 text-[9px] text-slate-400">
                  <span>{mc} msgs</span>
                  {ac > 0 && <span className="text-amber-600 bg-amber-50 px-1 py-0.5 rounded text-[8px] font-medium">{ac} alert</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── QUARTERS + P&L ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-bold text-slate-800 mb-4">Quý so sánh</h2>
          <div className="space-y-2.5">
            {r.quarterComparison.map((q: any) => {
              const max = Math.max(...r.quarterComparison.map((x: any) => x.revenue));
              const cur = q.quarter === 'Q2';
              return (
                <div key={q.quarter} className={`rounded-lg p-3 ${cur ? 'bg-blue-50 border border-blue-200' : 'bg-slate-50'}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-xs font-bold ${cur ? 'text-blue-700' : 'text-slate-600'}`}>{q.quarter}{cur ? ' ← hiện tại' : ''}</span>
                    <span className={`text-[11px] font-bold ${q.margin > 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmtPct(q.margin)}</span>
                  </div>
                  <div className="h-1.5 bg-white rounded-full overflow-hidden mb-1">
                    <div className={`h-full rounded-full ${cur ? 'bg-blue-500' : 'bg-slate-300'}`} style={{ width: `${max > 0 ? (q.revenue / max) * 100 : 0}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>DT: {fmtVND(q.revenue)}</span>
                    <span className={q.profit >= 0 ? 'text-emerald-600' : 'text-red-500'}>LN: {fmtVND(q.profit)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-800">P&L theo tháng</h2>
            <Link href="/admin/bao-cao-tai-chinh/ket-qua-kinh-doanh" className="text-[11px] text-blue-600 hover:underline">Chi tiết →</Link>
          </div>
          <div className="space-y-1">
            {r.monthlyPnL.map((m: any) => {
              const max = Math.max(...r.monthlyPnL.map((x: any) => x.revenue));
              return (
                <div key={m.month} className="flex items-center gap-2 py-1">
                  <span className="text-[11px] text-slate-500 w-14 font-mono">{m.month}</span>
                  <div className="flex-1 h-5 bg-slate-50 rounded overflow-hidden">
                    <div className={`h-full rounded ${m.profit >= 0 ? 'bg-emerald-200' : 'bg-red-200'}`} style={{ width: `${max > 0 ? (m.revenue / max) * 100 : 0}%` }} />
                  </div>
                  <span className="text-[10px] text-slate-600 w-14 text-right font-mono">{fmtVND(m.revenue)}</span>
                  <span className={`text-[10px] w-12 text-right font-bold font-mono ${m.profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fmtVND(m.profit)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── TARGETS ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-sm font-bold text-slate-800 mb-4">Mục tiêu Q2/2026</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {businessTargets.map((t: any) => {
            const pct = t.targetValue > 0 ? Math.round((t.currentValue / t.targetValue) * 100) : 0;
            const c = t.status === 'achieved' ? 'emerald' : t.status === 'on_track' ? 'blue' : t.status === 'at_risk' ? 'amber' : 'red';
            const labels: Record<string, string> = { achieved: 'Đạt', on_track: 'Đúng tiến độ', at_risk: 'Rủi ro', behind: 'Chậm' };
            return (
              <div key={t.id} className="rounded-lg border border-slate-100 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-700">{t.name}</span>
                  <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full bg-${c}-50 text-${c}-700`}>{labels[t.status] || t.status}</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-1">
                  <div className={`h-full rounded-full bg-${c}-500`} style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>{t.currentValue?.toLocaleString()} / {t.targetValue?.toLocaleString()} {t.unit}</span>
                  <span className="font-bold">{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── CHANNELS + DEPARTMENTS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-800">Kênh bán hàng</h2>
            <Link href="/admin/master-plan/marketing" className="text-[11px] text-blue-600 hover:underline">Report →</Link>
          </div>
          <div className="space-y-3">
            {channelAnalysis.map((ch: any) => {
              const rec = ch.recommendation === 'increase' ? { l: '↑ Tăng', c: 'text-emerald-700 bg-emerald-50' } : ch.recommendation === 'decrease' ? { l: '↓ Giảm', c: 'text-red-700 bg-red-50' } : ch.recommendation === 'optimize' ? { l: '⚡ Tối ưu', c: 'text-amber-700 bg-amber-50' } : { l: '→ Giữ', c: 'text-blue-700 bg-blue-50' };
              return (
                <div key={ch.channel}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-slate-700 w-28">{ch.channel}</span>
                    <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${ch.margin_pct >= 30 ? 'bg-emerald-400' : ch.margin_pct >= 15 ? 'bg-blue-400' : ch.margin_pct >= 0 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${Math.max(ch.margin_pct + 20, 5)}%` }} />
                    </div>
                    <span className={`text-[11px] font-bold w-10 text-right ${ch.margin_pct >= 20 ? 'text-emerald-600' : ch.margin_pct >= 0 ? 'text-amber-600' : 'text-red-600'}`}>{ch.margin_pct}%</span>
                  </div>
                  <div className="flex items-center gap-2 pl-28 text-[9px] text-slate-400">
                    <span>Share {ch.revenue_share}%</span>
                    <span>ROAS {ch.roas}x</span>
                    <span className={`font-medium px-1.5 py-0.5 rounded-full ${rec.c}`}>{rec.l}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-800">Phòng ban</h2>
            <Link href="/admin/master-plan/hr-director" className="text-[11px] text-blue-600 hover:underline">Report →</Link>
          </div>
          <div className="space-y-1">
            {r.departments.map((d: any) => (
              <div key={d.name} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                <span className="text-xs text-slate-700 flex-1">{d.name}</span>
                <span className="text-[10px] text-slate-400">{d.headcount} NV</span>
                <span className={`text-[10px] font-bold ${d.avgKPI >= 80 ? 'text-emerald-600' : d.avgKPI >= 60 ? 'text-blue-600' : d.avgKPI > 0 ? 'text-amber-600' : 'text-slate-300'}`}>{d.avgKPI || '—'} KPI</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${d.completionRate >= 70 ? 'bg-emerald-50 text-emerald-700' : d.completionRate >= 40 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>{fmtPct(d.completionRate)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── TOP PERFORMERS + INVENTORY + PIPELINE ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Top */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-bold text-slate-800 mb-3">Nhân sự nổi bật</h2>
          {r.employees.topPerformers.length > 0 && (
            <div className="mb-3">
              <p className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider mb-1.5">Top Performers</p>
              {r.employees.topPerformers.map((e: any, i: number) => (
                <div key={i} className="flex items-center gap-2 py-1.5 border-b border-slate-50 last:border-0">
                  <span className="text-[10px] text-slate-400 w-4">#{i+1}</span>
                  <span className="text-xs text-slate-700 flex-1 truncate">{e.name}</span>
                  <span className="text-xs font-bold text-emerald-600">{e.kpiScore}</span>
                </div>
              ))}
            </div>
          )}
          {r.employees.atRisk.length > 0 && (
            <div>
              <p className="text-[9px] text-red-600 font-bold uppercase tracking-wider mb-1.5">Cần coaching</p>
              {r.employees.atRisk.map((e: any, i: number) => (
                <div key={i} className="flex items-center gap-2 py-1.5">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                  <span className="text-xs text-slate-700 flex-1 truncate">{e.name}</span>
                  <span className="text-xs font-bold text-red-600">{e.kpiScore}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Inventory */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-bold text-slate-800 mb-3">Tồn kho</h2>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className={`rounded-lg p-3 text-center ${critStock > 0 ? 'bg-red-50' : 'bg-emerald-50'}`}>
              <div className={`text-xl font-bold ${critStock > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{critStock}</div>
              <div className="text-[9px] text-slate-500">Hết hàng</div>
            </div>
            <div className={`rounded-lg p-3 text-center ${lowStock > 0 ? 'bg-amber-50' : 'bg-emerald-50'}`}>
              <div className={`text-xl font-bold ${lowStock > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{lowStock}</div>
              <div className="text-[9px] text-slate-500">Sắp hết</div>
            </div>
          </div>
          {stockAlerts.filter((a: any) => a.status !== 'ok').slice(0, 4).map((a: any, i: number) => (
            <div key={i} className="flex items-center gap-2 py-1 text-xs">
              <span className={`w-1.5 h-1.5 rounded-full ${a.status === 'critical' ? 'bg-red-500' : a.status === 'low' ? 'bg-amber-500' : 'bg-slate-300'}`} />
              <span className="text-slate-700 flex-1 truncate">{a.itemName}</span>
              <span className="text-[10px] text-slate-400 font-mono">{a.currentStock}/{a.minStock}</span>
            </div>
          ))}
          <div className="mt-3 text-[11px] text-slate-400">Giá trị kho: <b className="text-slate-600">{fmtVND(r.inventory.totalValue)}</b></div>
        </div>

        {/* Pipeline */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-bold text-slate-800 mb-3">Pipeline</h2>
          <div className="space-y-2.5">
            {r.pipeline.map((p: any) => {
              const max = Math.max(...r.pipeline.map((x: any) => x.totalValue));
              return (
                <div key={p.stage}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-700">{p.stage} <span className="text-slate-400">({p.count})</span></span>
                    <span className="font-bold text-slate-700">{fmtVND(p.totalValue)}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-400 rounded-full" style={{ width: `${max > 0 ? (p.totalValue / max) * 100 : 0}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── FINANCIAL HEALTH ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-800">Sức khỏe Tài chính</h2>
          <Link href="/admin/master-plan/cfo" className="text-[11px] text-blue-600 hover:underline">CFO Report →</Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Gauge label="Current Ratio" value={r.financialHealth.currentRatio} unit="x" good={1.5} warn={1} />
          <Gauge label="Debt/Equity" value={r.financialHealth.debtToEquity} unit="x" good={1} warn={2} inv />
          <Gauge label="Profit Margin" value={r.financialHealth.profitMargin} unit="%" good={15} warn={5} />
          <Gauge label="Operating Margin" value={r.financialHealth.operatingMargin} unit="%" good={20} warn={10} />
          <Gauge label="Burn Rate" value={r.financialHealth.burnRate / 1e6} unit="M/th" good={500} warn={800} inv />
        </div>
      </div>

      {/* ── STRATEGY ALERTS ── */}
      {strategyReport?.messages?.filter((m: any) => m.type === 'alert' || m.type === 'recommendation').length > 0 && (
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-5">
          <h2 className="text-sm font-bold text-slate-800 mb-3">Strategy Advisor — Blind spots</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {strategyReport.messages.filter((m: any) => m.type === 'alert' || m.type === 'recommendation').slice(0, 4).map((msg: any, i: number) => (
              <div key={i} className="bg-white rounded-lg p-3 border border-amber-100">
                <div className="flex items-center gap-1.5 mb-1">
                  {msg.type === 'alert' ? <AlertTriangle size={11} className="text-amber-600" /> : <Zap size={11} className="text-blue-600" />}
                  <span className={`text-[9px] font-bold uppercase ${msg.type === 'alert' ? 'text-amber-600' : 'text-blue-600'}`}>{msg.type === 'alert' ? 'Cảnh báo' : 'Khuyến nghị'}</span>
                </div>
                <p className="text-[11px] text-slate-700 leading-relaxed line-clamp-3">{msg.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── BST ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-sm font-bold text-slate-800 mb-3">BST — 12 BST/năm</h2>
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {collectionPlans.map((c: any) => {
            const st = c.status === 'launched' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : c.status === 'in_production' ? 'bg-blue-50 border-blue-200 text-blue-700' : c.status === 'in_design' ? 'bg-purple-50 border-purple-200 text-purple-700' : c.status === 'completed' ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-white border-slate-100 text-slate-500';
            const lb = c.status === 'launched' ? 'Live' : c.status === 'in_production' ? 'SX' : c.status === 'in_design' ? 'Design' : c.status === 'completed' ? 'Xong' : 'Plan';
            return (
              <div key={c.month} className={`rounded-lg border p-2.5 ${st}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono text-slate-400">T{c.month}</span>
                  <span className="text-[8px] font-semibold">{lb}</span>
                </div>
                <div className="text-[11px] font-bold text-slate-800 truncate">{c.name}</div>
                <div className="text-[9px] text-slate-400 mt-0.5">{c.targetSKUs} SKUs</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── QUICK NAV ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          { href: '/admin/master-plan/ceo', l: 'CEO Report', i: '📊' },
          { href: '/admin/master-plan/cfo', l: 'CFO Report', i: '💰' },
          { href: '/admin/master-plan/hr-director', l: 'HR Report', i: '👥' },
          { href: '/admin/master-plan/marketing', l: 'Marketing', i: '📢' },
          { href: '/admin/master-plan/sales', l: 'Sales', i: '🤝' },
          { href: '/admin/master-plan/operations', l: 'Operations', i: '⚙️' },
          { href: '/admin/master-plan/coach', l: 'Coach', i: '🏆' },
          { href: '/admin/tro-chuyen', l: 'Chat AI', i: '🤖' },
        ].map(lk => (
          <Link key={lk.href} href={lk.href} className="flex items-center gap-2.5 bg-white rounded-lg border border-slate-200 px-3 py-2.5 hover:border-blue-300 hover:shadow-sm transition-all text-sm text-slate-700 hover:text-blue-700">
            <span>{lk.i}</span> {lk.l} <ArrowUpRight size={12} className="ml-auto text-slate-300" />
          </Link>
        ))}
      </div>

      {/* ── RECENT MESSAGES ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-800">Agent Messages</h2>
          <Link href="/admin/nhat-ky" className="text-[11px] text-blue-600 hover:underline">{messages.length} messages →</Link>
        </div>
        <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
          {messages.slice(0, 8).map((msg: any) => {
            const pr = agentProfiles[msg.agentRole as AgentRole];
            const tc = msg.type === 'alert' ? 'border-l-amber-400' : msg.type === 'decision' ? 'border-l-emerald-400' : msg.type === 'recommendation' ? 'border-l-blue-400' : 'border-l-slate-200';
            return (
              <div key={msg.id} className={`border-l-2 ${tc} bg-slate-50 rounded-r-lg px-3 py-2`}>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <div className={`w-4 h-4 ${pr?.color || 'bg-slate-500'} rounded flex items-center justify-center text-white text-[6px] font-bold`}>{pr?.avatar?.slice(0, 2) || '?'}</div>
                  <span className="text-[10px] font-semibold text-slate-700">{msg.agentName}</span>
                  <span className={`text-[8px] font-medium px-1 py-0.5 rounded ${msg.type === 'alert' ? 'bg-amber-50 text-amber-600' : msg.type === 'decision' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>{msg.type}</span>
                </div>
                <p className="text-[10px] text-slate-600 line-clamp-2 pl-5">{msg.content}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── SUB COMPONENTS ──

function Metric({ icon, iconBg, label, value, sub, badge, badgeColor }: { icon: React.ReactNode; iconBg: string; label: string; value: string; sub: string; badge?: string; badgeColor?: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconBg}`}>{icon}</div>
        {badge && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeColor}`}>{badge}</span>}
      </div>
      <div className="text-xl font-bold text-slate-900">{value}</div>
      <div className="text-[11px] text-slate-400 mt-0.5">{sub}</div>
    </div>
  );
}

function Gauge({ label, value, unit, good, warn, inv }: { label: string; value: number; unit: string; good: number; warn: number; inv?: boolean }) {
  const ok = inv ? value <= good : value >= good;
  const mid = inv ? (value > good && value <= warn) : (value < good && value >= warn);
  const c = ok ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : mid ? 'text-amber-600 bg-amber-50 border-amber-200' : 'text-red-600 bg-red-50 border-red-200';
  return (
    <div className={`rounded-lg border p-3 text-center ${c}`}>
      <div className="text-lg font-bold">{value.toFixed(1)}<span className="text-[10px] font-normal ml-0.5">{unit}</span></div>
      <div className="text-[10px] text-slate-500 mt-0.5">{label}</div>
      <div className="text-[8px] font-semibold mt-1">{ok ? '✓ Tốt' : mid ? '⚠ Theo dõi' : '✕ Xử lý'}</div>
    </div>
  );
}
