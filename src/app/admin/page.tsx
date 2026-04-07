"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  TrendingUp, Activity, Users,
  AlertTriangle, RefreshCw, MessageSquare, Loader2,
  Sparkles,
} from 'lucide-react';
import { fmtVND, fmtPct } from '@/lib/report-builder';
import { createBrowserClient } from '@supabase/ssr';
import CEOGuide from '@/components/CEOGuide';
import TodayFocus, { deriveAlerts } from '@/components/TodayFocus';

interface CData {
  businessTargets: any[]; departmentGoals: any[]; individualPlans: any[];
  costProjections: any[]; messages: any[]; agentStatuses: Record<string, string>;
  actions: any[]; channelAnalysis: any[]; stockAlerts: any[];
  collectionPlans: any[]; inventoryForecasts: any[]; financialHealth: any;
  milestones: any[]; departmentDetails: any[];
  marketResearch: any; strategyReport: any; report: any;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Chào buổi sáng';
  if (h < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

function getTodayVi(): string {
  const d = new Date();
  const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  return `${days[d.getDay()]}, ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function statusLevel(value: number, good: number, warn: number): 'good' | 'warn' | 'bad' {
  if (value >= good) return 'good';
  if (value >= warn) return 'warn';
  return 'bad';
}

const STATUS_CONFIG = {
  good: { dot: '●', textColor: 'text-emerald-400', gradient: 'from-emerald-500 to-teal-600', glow: 'shadow-emerald-500/20', bgClass: 'metric-emerald' },
  warn: { dot: '●', textColor: 'text-amber-400', gradient: 'from-amber-500 to-orange-600', glow: 'shadow-amber-500/20', bgClass: 'metric-amber' },
  bad:  { dot: '●', textColor: 'text-red-400', gradient: 'from-red-500 to-rose-600', glow: 'shadow-red-500/20', bgClass: 'metric-red' },
};

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
      <div className="text-center">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/30 animate-pulse">
          <Loader2 className="w-6 h-6 animate-spin text-white" />
        </div>
        <span className="text-sm text-slate-400">Đang tải dữ liệu...</span>
      </div>
    </div>
  );
  if (error || !data) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="text-center max-w-md">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-7 h-7 text-amber-500" />
        </div>
        <p className="text-base font-semibold text-slate-700 mb-2">Chưa có dữ liệu</p>
        <p className="text-sm text-slate-400 mb-4">{error}</p>
        <button onClick={load} className="btn-primary text-sm">Thử lại</button>
      </div>
    </div>
  );

  const r = data.report;
  const alerts = deriveAlerts(data);

  const topAlerts = data.messages
    .filter((m: any) => m.type === 'alert' || m.type === 'decision')
    .slice(0, 3);
  const aiSummary = topAlerts.length > 0
    ? topAlerts.map((m: any) => m.content?.split('.')[0]).filter(Boolean).join('. ') + '.'
    : '';

  const revenueStatus = statusLevel(r.overview.targetAchievement, 80, 50);
  const profitStatus = statusLevel(r.overview.profitMargin, 25, 15);
  const kpiStatus = statusLevel(r.overview.avgKPI, 70, 50);

  return (
    <div className="p-4 md:p-6 max-w-[1100px] mx-auto space-y-6">

      {/* GREETING */}
      <div className="flex items-center justify-between animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {getGreeting()}, <span className="gradient-text">Anh Dương</span>!
          </h1>
          <p className="text-sm text-slate-400 mt-1.5">
            Teeworld · {getTodayVi()} · Cập nhật {ts ? new Date(ts).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/tro-chuyen" className="btn-primary flex items-center gap-2 text-sm">
            <Sparkles size={16} /> Hỏi AI
          </Link>
          <button onClick={load} className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-white rounded-xl transition-all">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* ONBOARDING */}
      <CEOGuide />

      {/* 3 KEY METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 stagger-children">
        {/* Revenue */}
        <div className={`rounded-2xl p-5 ${STATUS_CONFIG[revenueStatus].bgClass} transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${STATUS_CONFIG[revenueStatus].gradient} flex items-center justify-center shadow-lg ${STATUS_CONFIG[revenueStatus].glow}`}>
                <TrendingUp size={18} className="text-white" />
              </div>
              <span className="text-sm font-medium text-slate-600">Doanh thu</span>
            </div>
            <span className={`text-xs font-bold ${STATUS_CONFIG[revenueStatus].textColor}`}>
              {STATUS_CONFIG[revenueStatus].dot}
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {fmtVND(r.overview.totalRevenue)}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 bg-slate-200/60 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${STATUS_CONFIG[revenueStatus].gradient} transition-all duration-700`}
                style={{ width: `${Math.min(r.overview.targetAchievement, 100)}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {fmtPct(r.overview.targetAchievement)}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1.5">Mục tiêu: {fmtVND(r.overview.revenueTarget)}</p>
        </div>

        {/* Profit */}
        <div className={`rounded-2xl p-5 ${STATUS_CONFIG[profitStatus].bgClass} transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${STATUS_CONFIG[profitStatus].gradient} flex items-center justify-center shadow-lg ${STATUS_CONFIG[profitStatus].glow}`}>
                <Activity size={18} className="text-white" />
              </div>
              <span className="text-sm font-medium text-slate-600">Lợi nhuận</span>
            </div>
            <span className={`text-xs font-bold ${STATUS_CONFIG[profitStatus].textColor}`}>
              {STATUS_CONFIG[profitStatus].dot}
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {fmtVND(r.overview.netProfit)}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 bg-slate-200/60 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${STATUS_CONFIG[profitStatus].gradient} transition-all duration-700`}
                style={{ width: `${Math.min(r.overview.profitMargin, 100)}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {fmtPct(r.overview.profitMargin)}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1.5">Biên lợi nhuận</p>
        </div>

        {/* Team KPI */}
        <div className={`rounded-2xl p-5 ${STATUS_CONFIG[kpiStatus].bgClass} transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${STATUS_CONFIG[kpiStatus].gradient} flex items-center justify-center shadow-lg ${STATUS_CONFIG[kpiStatus].glow}`}>
                <Users size={18} className="text-white" />
              </div>
              <span className="text-sm font-medium text-slate-600">Đội ngũ</span>
            </div>
            <span className={`text-xs font-bold ${STATUS_CONFIG[kpiStatus].textColor}`}>
              {STATUS_CONFIG[kpiStatus].dot}
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            KPI {r.overview.avgKPI}<span className="text-base font-medium text-slate-400">/100</span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 bg-slate-200/60 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${STATUS_CONFIG[kpiStatus].gradient} transition-all duration-700`}
                style={{ width: `${Math.min(r.overview.avgKPI, 100)}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {r.overview.avgKPI}%
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1.5">{r.overview.headcount} nhân viên</p>
        </div>
      </div>

      {/* TODAY FOCUS */}
      <TodayFocus alerts={alerts} />

      {/* AI SUMMARY */}
      {aiSummary && (
        <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/80 to-violet-50/50 px-5 py-4 animate-fade-in-up">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-indigo-500/20">
              <Sparkles size={14} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-600 leading-relaxed">{aiSummary}</p>
              <Link href="/admin/tro-chuyen" className="text-xs font-medium text-indigo-600 hover:text-indigo-700 mt-1.5 inline-flex items-center gap-1">
                Hỏi AI thêm chi tiết <span className="text-indigo-400">→</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
