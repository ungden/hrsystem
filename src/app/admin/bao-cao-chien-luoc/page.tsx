"use client";

import { useState, useEffect } from 'react';
import {
  Loader2, AlertTriangle, TrendingUp, TrendingDown, Target, Shield,
  Eye, Zap, ChevronRight, Users, Globe, BarChart3, Crosshair,
  ArrowUpRight, ArrowDownRight, Minus, CheckCircle2, XCircle,
  Lightbulb, MessageSquare, DollarSign, Package, ShoppingCart,
  Star, Flame, Brain, Activity, Award,
} from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';
import { fmtVND, fmtPct } from '@/lib/report-builder';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StrategicAssessment {
  overallHealth: string; score: number; topStrength: string; topWeakness: string; oneLineSummary: string;
}
interface CriticalDecision {
  question: string; options: { name: string; pros: string; cons: string; recommendation: boolean }[]; deadline: string; impact: string;
}
interface BlindSpot { area: string; risk: string; whatToDoNow: string; }
interface QuarterPriority { rank: number; title: string; why: string; metric: string; owner: string; }
interface StrategyReport {
  strategicAssessment: StrategicAssessment; criticalDecisions: CriticalDecision[];
  blindSpots: BlindSpot[]; quarterPriorities: QuarterPriority[]; ceoChallenge: string; messages: any[];
}
interface MarketOverview { totalMarketSize: number; teeworldMarketShare: number; growthRate: number; positionVsCompetitors: string; }
interface CompetitorInsight { name: string; revenue: number; vsTeeworldRevenue: string; keyAdvantage: string; keyWeakness: string; threatLevel: string; }
interface TrendAlert { trend: string; impact: string; urgency: string; recommendation: string; }
interface Opportunity { title: string; potentialRevenue: number; difficulty: string; timeframe: string; description: string; }
interface Threat { title: string; severity: string; probability: number; mitigation: string; }
interface MarketResearch {
  marketOverview: MarketOverview; competitorAnalysis: CompetitorInsight[];
  trendAlerts: TrendAlert[]; opportunities: Opportunity[]; threats: Threat[]; messages: any[];
}
interface BusinessTarget { id: string; name: string; category: string; targetValue: number; currentValue: number; unit: string; status: string; }
interface ChannelAnalysis { channel: string; revenue: number; margin_pct: number; revenue_share: number; adSpend: number; roas: number; recommendation: string; }
interface CostProjection { department: string; headcount: number; totalBaseSalary: number; totalAllowances: number; totalInsurance: number; projectedBonusPool: number; totalCost: number; }
interface DeptDetail { department: string; headcount: number; avgKpiScore: number; completionRate: number; topPerformers: any[]; atRiskEmployees: any[]; }
interface FinancialHealth { currentRatio: number; debtToEquity: number; profitMargin: number; operatingMargin: number; burnRate: number; }

interface SnapshotData {
  businessTargets: BusinessTarget[]; departmentGoals: any[]; costProjections: CostProjection[];
  channelAnalysis: ChannelAnalysis[]; messages: any[]; stockAlerts: any[];
  collectionPlans: any[]; departmentDetails: DeptDetail[]; financialHealth: FinancialHealth;
  marketResearch: MarketResearch; strategyReport: StrategyReport; report: any; milestones: any[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) { return new Intl.NumberFormat('vi-VN').format(n); }
function fmtB(v: number) { if (v >= 1e12) return `${(v / 1e12).toFixed(1)} nghìn tỷ`; if (v >= 1e9) return `${(v / 1e9).toFixed(1)} tỷ`; if (v >= 1e6) return `${(v / 1e6).toFixed(0)}M`; return fmt(v); }

const healthColors: Record<string, { bg: string; text: string; label: string }> = {
  strong: { bg: 'bg-green-100', text: 'text-green-800', label: 'Mạnh' },
  growing: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Đang phát triển' },
  struggling: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Khó khăn' },
  critical: { bg: 'bg-red-100', text: 'text-red-800', label: 'Nguy hiểm' },
};

const statusIcons: Record<string, { icon: typeof CheckCircle2; color: string }> = {
  on_track: { icon: CheckCircle2, color: 'text-green-600' },
  achieved: { icon: Star, color: 'text-green-600' },
  at_risk: { icon: AlertTriangle, color: 'text-amber-600' },
  behind: { icon: XCircle, color: 'text-red-600' },
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function StrategicReportPage() {
  const [data, setData] = useState<SnapshotData | null>(null);
  const [ts, setTs] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const sb = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    sb.from('command_center_snapshots').select('data, generated_at').eq('snapshot_type', 'full')
      .order('generated_at', { ascending: false }).limit(1).single()
      .then(({ data: row, error: err }) => {
        if (err || !row) setError(err?.message || 'Chưa có data');
        else { setData(row.data as SnapshotData); setTs(row.generated_at); }
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="flex items-center justify-center h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /><span className="ml-3 text-base text-slate-500">Đang tải báo cáo...</span></div>;
  if (error || !data) return <div className="flex items-center justify-center h-[60vh]"><AlertTriangle className="w-10 h-10 text-amber-500" /><p className="ml-3 text-base text-slate-600">{error || 'Không có dữ liệu'}</p></div>;

  const s = data.strategyReport;
  const m = data.marketResearch;
  const r = data.report;
  const health = healthColors[s.strategicAssessment.overallHealth] || healthColors.growing;

  // Aggregate financials
  const totalRevenue = r?.overview?.revenueYTD || data.businessTargets.find(t => t.category === 'revenue')?.currentValue || 0;
  const revenueTarget = r?.overview?.revenueTarget || data.businessTargets.find(t => t.category === 'revenue')?.targetValue || 0;
  const revenuePct = revenueTarget > 0 ? Math.round((totalRevenue / revenueTarget) * 100) : 0;
  const totalCost = data.costProjections.reduce((s, c) => s + c.totalCost, 0);
  const netProfit = r?.overview?.netProfit || 0;
  const profitMargin = data.financialHealth?.profitMargin || 0;

  // Messages by agent role for "discussion" section
  const agentMessages = data.messages || [];
  const ceoMessages = agentMessages.filter((m: any) => m.agentRole === 'ceo');
  const strategyMessages = agentMessages.filter((m: any) => m.agentRole === 'strategy');
  const hrMessages = agentMessages.filter((m: any) => m.agentRole === 'hr_director');
  const financeMessages = agentMessages.filter((m: any) => m.agentRole === 'finance');
  const channelMessages = agentMessages.filter((m: any) => m.agentRole === 'channel_optimizer');
  const marketMessages = agentMessages.filter((m: any) => m.agentRole === 'market_research');

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      {/* ═══════════ HEADER ═══════════ */}
      <div className="border-b-2 border-slate-800 pb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-1">Teeworld Strategic Report</p>
            <h1 className="text-3xl font-bold text-slate-900">Báo cáo Chiến lược CEO</h1>
            <p className="text-base text-slate-500 mt-1">
              Q2/2026 — Cập nhật {ts ? new Date(ts).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '...'}
            </p>
          </div>
          <div className={`px-5 py-3 rounded-xl ${health.bg}`}>
            <div className="text-sm font-medium text-slate-500">Sức khỏe DN</div>
            <div className={`text-3xl font-bold ${health.text}`}>{s.strategicAssessment.score}/100</div>
            <div className={`text-sm font-semibold ${health.text}`}>{health.label}</div>
          </div>
        </div>
      </div>

      {/* ═══════════ I. EXECUTIVE SUMMARY ═══════════ */}
      <section>
        <SectionTitle number="I" title="Tổng quan Chiến lược" icon={Brain} />
        <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-2xl p-6 border border-slate-200">
          <p className="text-lg text-slate-800 leading-relaxed font-medium mb-4">
            {s.strategicAssessment.oneLineSummary}
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl p-4 border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={18} className="text-green-600" />
                <span className="text-sm font-bold text-green-800">Thế mạnh lớn nhất</span>
              </div>
              <p className="text-sm text-slate-700">{s.strategicAssessment.topStrength}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-red-200">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown size={18} className="text-red-600" />
                <span className="text-sm font-bold text-red-800">Điểm yếu lớn nhất</span>
              </div>
              <p className="text-sm text-slate-700">{s.strategicAssessment.topWeakness}</p>
            </div>
          </div>
        </div>

        {/* KPI Dashboard */}
        <div className="grid grid-cols-4 gap-4 mt-5">
          <KPICard label="Doanh thu YTD" value={fmtB(totalRevenue)} target={fmtB(revenueTarget)} pct={revenuePct} icon={DollarSign} color="blue" />
          <KPICard label="Biên lợi nhuận" value={`${profitMargin}%`} target="≥25%" pct={Math.min(100, Math.round((profitMargin / 25) * 100))} icon={TrendingUp} color="green" />
          <KPICard label="Thị phần" value={`${m.marketOverview.teeworldMarketShare}%`} target="Tăng" pct={65} icon={Globe} color="purple" />
          <KPICard label="Nhân sự" value={`${data.departmentDetails.reduce((s, d) => s + d.headcount, 0)} NV`} target="Tối ưu" pct={80} icon={Users} color="amber" />
        </div>
      </section>

      {/* ═══════════ II. CEO CHALLENGE — LỜI KHUYÊN THẲNG THẮN ═══════════ */}
      <section>
        <SectionTitle number="II" title="Lời khuyên thẳng thắn cho CEO" icon={MessageSquare} subtitle="Strategy Advisor phân tích và phản biện — không sugarcoat" />
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center">
              <Brain size={20} />
            </div>
            <div>
              <div className="font-bold text-lg">AI Strategy Advisor</div>
              <div className="text-sm text-slate-400">Phản biện chiến lược — nói thật, không né tránh</div>
            </div>
          </div>
          <div className="space-y-4">
            {s.ceoChallenge.split('\n\n').filter(Boolean).map((paragraph, i) => (
              <div key={i} className="leading-relaxed">
                {paragraph.split('\n').map((line, j) => {
                  const isHeader = line.match(/^\d+\.\s+[A-ZĐ]/);
                  const isBold = line.includes('HÀNH ĐỘNG:') || line.includes('KHÔNG PHẢI');
                  if (isHeader) {
                    return <p key={j} className="text-amber-400 font-bold text-base mt-3 first:mt-0">{line}</p>;
                  }
                  if (isBold) {
                    const parts = line.split(/(HÀNH ĐỘNG:|KHÔNG PHẢI KHÔNG THỂ)/);
                    return <p key={j} className="text-sm text-slate-300">{parts.map((part, k) =>
                      part === 'HÀNH ĐỘNG:' || part === 'KHÔNG PHẢI KHÔNG THỂ'
                        ? <span key={k} className="text-amber-400 font-bold">{part}</span>
                        : <span key={k}>{part}</span>
                    )}</p>;
                  }
                  return <p key={j} className="text-sm text-slate-300">{line}</p>;
                })}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ III. PHÂN TÍCH THỊ TRƯỜNG 360° ═══════════ */}
      <section>
        <SectionTitle number="III" title="Phân tích Thị trường 360°" icon={Globe} subtitle="Thị trường, đối thủ, xu hướng, cơ hội và rủi ro" />

        {/* Market Size */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-5">
          <h4 className="text-base font-bold text-slate-800 mb-4">Bức tranh thị trường</h4>
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-slate-800">{fmtB(m.marketOverview.totalMarketSize)}</div>
              <div className="text-sm text-slate-500 mt-1">Quy mô thị trường</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-700">{m.marketOverview.teeworldMarketShare}%</div>
              <div className="text-sm text-slate-500 mt-1">Thị phần Teeworld</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-700">+{m.marketOverview.growthRate}%/năm</div>
              <div className="text-sm text-slate-500 mt-1">Tốc độ tăng trưởng ngành</div>
            </div>
          </div>
          <div className="mt-4 bg-blue-50 rounded-xl p-4">
            <p className="text-sm text-blue-800">
              <strong>Nhận định:</strong> {m.marketOverview.positionVsCompetitors}. Thị trường {fmtB(m.marketOverview.totalMarketSize)} với tốc độ tăng {m.marketOverview.growthRate}%/năm —
              Teeworld chiếm {m.marketOverview.teeworldMarketShare}% nghĩa là còn rất nhiều dư địa để tăng trưởng.
              Với doanh thu hiện tại {fmtB(totalRevenue)}, Teeworld cần tập trung scale nhanh để chiếm thêm thị phần trước khi đối thủ consolidate.
            </p>
          </div>
        </div>

        {/* Competitors */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-5">
          <h4 className="text-base font-bold text-slate-800 mb-4">Phân tích đối thủ cạnh tranh</h4>
          <div className="space-y-3">
            {m.competitorAnalysis.map((comp, i) => {
              const threatColors: Record<string, string> = { high: 'bg-red-100 text-red-700 border-red-200', medium: 'bg-amber-100 text-amber-700 border-amber-200', low: 'bg-green-100 text-green-700 border-green-200' };
              return (
                <div key={i} className="border border-slate-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-base font-bold text-slate-800">{comp.name}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${threatColors[comp.threatLevel] || threatColors.medium}`}>
                        {comp.threatLevel === 'high' ? 'Nguy hiểm' : comp.threatLevel === 'medium' ? 'Cần theo dõi' : 'Thấp'}
                      </span>
                    </div>
                    <span className="text-sm text-slate-500">DT: {fmtB(comp.revenue)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-red-50 rounded-lg p-3">
                      <div className="text-xs font-semibold text-red-700 mb-1">Lợi thế so với Teeworld</div>
                      <p className="text-sm text-slate-700">{comp.keyAdvantage}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3">
                      <div className="text-xs font-semibold text-green-700 mb-1">Điểm yếu của họ</div>
                      <p className="text-sm text-slate-700">{comp.keyWeakness}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Opportunities & Threats */}
        <div className="grid grid-cols-2 gap-5 mb-5">
          <div className="bg-white rounded-2xl border border-green-200 p-6">
            <h4 className="text-base font-bold text-green-800 mb-4 flex items-center gap-2"><Lightbulb size={18} /> Cơ hội</h4>
            <div className="space-y-3">
              {m.opportunities.map((opp, i) => (
                <div key={i} className="bg-green-50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-slate-800">{opp.title}</span>
                    <span className="text-sm font-bold text-green-700">{fmtB(opp.potentialRevenue)}</span>
                  </div>
                  <p className="text-sm text-slate-600 mb-2">{opp.description}</p>
                  <div className="flex gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${opp.difficulty === 'easy' ? 'bg-green-200 text-green-800' : opp.difficulty === 'medium' ? 'bg-amber-200 text-amber-800' : 'bg-red-200 text-red-800'}`}>
                      {opp.difficulty === 'easy' ? 'Dễ' : opp.difficulty === 'medium' ? 'Trung bình' : 'Khó'}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-200 text-blue-800">{opp.timeframe}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-red-200 p-6">
            <h4 className="text-base font-bold text-red-800 mb-4 flex items-center gap-2"><Shield size={18} /> Rủi ro & Mối đe dọa</h4>
            <div className="space-y-3">
              {m.threats.map((threat, i) => (
                <div key={i} className="bg-red-50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-slate-800">{threat.title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${threat.severity === 'critical' ? 'bg-red-200 text-red-800' : threat.severity === 'high' ? 'bg-orange-200 text-orange-800' : 'bg-amber-200 text-amber-800'}`}>
                      {threat.severity === 'critical' ? 'Nghiêm trọng' : threat.severity === 'high' ? 'Cao' : 'Trung bình'} — {threat.probability}%
                    </span>
                  </div>
                  <p className="text-sm text-slate-600"><strong>Giải pháp:</strong> {threat.mitigation}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Trends */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h4 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2"><Activity size={18} /> Xu hướng cần theo dõi</h4>
          <div className="space-y-2">
            {m.trendAlerts.map((trend, i) => {
              const impactColors: Record<string, string> = { positive: 'text-green-700 bg-green-50', negative: 'text-red-700 bg-red-50', neutral: 'text-slate-700 bg-slate-50' };
              const urgencyLabels: Record<string, string> = { act_now: 'Hành động ngay', monitor: 'Theo dõi', long_term: 'Dài hạn' };
              return (
                <div key={i} className={`rounded-xl p-4 ${impactColors[trend.impact] || impactColors.neutral}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold">{trend.trend}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${trend.urgency === 'act_now' ? 'bg-red-200 text-red-800' : trend.urgency === 'monitor' ? 'bg-amber-200 text-amber-800' : 'bg-blue-200 text-blue-800'}`}>
                      {urgencyLabels[trend.urgency] || trend.urgency}
                    </span>
                  </div>
                  <p className="text-sm opacity-80">{trend.recommendation}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════ IV. QUYẾT ĐỊNH CHIẾN LƯỢC ═══════════ */}
      <section>
        <SectionTitle number="IV" title="Quyết định Chiến lược cần đưa ra" icon={Crosshair} subtitle="Các quyết định then chốt với phân tích pros/cons và đề xuất" />
        <div className="space-y-5">
          {s.criticalDecisions.map((dec, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className={`px-6 py-4 ${dec.impact === 'high' ? 'bg-red-50 border-b border-red-100' : 'bg-amber-50 border-b border-amber-100'}`}>
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-bold text-slate-800">{dec.question}</h4>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${dec.impact === 'high' ? 'bg-red-200 text-red-800' : 'bg-amber-200 text-amber-800'}`}>
                      Impact: {dec.impact === 'high' ? 'Cao' : 'Trung bình'}
                    </span>
                    <span className="text-xs font-semibold px-2 py-1 rounded-full bg-slate-200 text-slate-700">{dec.deadline}</span>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {dec.options.map((opt, j) => (
                    <div key={j} className={`rounded-xl p-4 border-2 ${opt.recommendation ? 'border-green-400 bg-green-50/50' : 'border-slate-200 bg-slate-50/50'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        {opt.recommendation ? <CheckCircle2 size={18} className="text-green-600" /> : <Circle size={18} className="text-slate-400" />}
                        <span className={`text-sm font-bold ${opt.recommendation ? 'text-green-800' : 'text-slate-700'}`}>
                          {opt.name} {opt.recommendation && <span className="text-green-600 text-xs ml-1">— ĐỀ XUẤT</span>}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 ml-7">
                        <div>
                          <div className="text-xs font-semibold text-green-700 mb-0.5">Ưu điểm</div>
                          <p className="text-sm text-slate-600">{opt.pros}</p>
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-red-700 mb-0.5">Nhược điểm</div>
                          <p className="text-sm text-slate-600">{opt.cons}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════ V. KẾ HOẠCH KÊNH BÁN HÀNG ═══════════ */}
      <section>
        <SectionTitle number="V" title="Chiến lược Kênh bán hàng" icon={ShoppingCart} subtitle="Phân tích hiệu quả từng kênh và đề xuất phân bổ ngân sách" />
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="space-y-4">
            {data.channelAnalysis.sort((a, b) => b.margin_pct - a.margin_pct).map((ch, i) => {
              const maxRevenue = Math.max(...data.channelAnalysis.map(c => c.revenue));
              const pct = maxRevenue > 0 ? (ch.revenue / maxRevenue) * 100 : 0;
              const recColors: Record<string, { bg: string; text: string; label: string }> = {
                increase: { bg: 'bg-green-100', text: 'text-green-700', label: 'Tăng đầu tư' },
                maintain: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Duy trì' },
                decrease: { bg: 'bg-red-100', text: 'text-red-700', label: 'Giảm' },
                optimize: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Tối ưu' },
              };
              const rec = recColors[ch.recommendation] || recColors.maintain;
              return (
                <div key={i} className="border border-slate-100 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-base font-bold text-slate-800">{ch.channel}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${rec.bg} ${rec.text}`}>{rec.label}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-slate-500">Margin: <strong className={ch.margin_pct >= 30 ? 'text-green-700' : ch.margin_pct >= 20 ? 'text-amber-700' : 'text-red-700'}>{ch.margin_pct}%</strong></span>
                      <span className="text-slate-500">ROAS: <strong className={ch.roas >= 3 ? 'text-green-700' : ch.roas >= 2 ? 'text-amber-700' : 'text-red-700'}>{ch.roas}x</strong></span>
                      <span className="text-slate-500">Share: <strong>{ch.revenue_share}%</strong></span>
                    </div>
                  </div>
                  {/* Revenue bar */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full flex items-center justify-end pr-2 ${ch.margin_pct >= 30 ? 'bg-green-500' : ch.margin_pct >= 20 ? 'bg-amber-500' : 'bg-red-400'}`}
                        style={{ width: `${Math.max(pct, 10)}%` }}>
                        <span className="text-xs font-bold text-white">{fmtB(ch.revenue)}</span>
                      </div>
                    </div>
                    {ch.adSpend > 0 && <span className="text-xs text-slate-400 whitespace-nowrap">Ads: {fmtB(ch.adSpend)}</span>}
                  </div>
                  {/* Channel narrative */}
                  <p className="text-sm text-slate-500 mt-2">
                    {ch.recommendation === 'increase'
                      ? `Kênh hiệu quả cao nhất với margin ${ch.margin_pct}% và ROAS ${ch.roas}x. Nên tăng ngân sách quảng cáo và đẩy mạnh traffic.`
                      : ch.recommendation === 'decrease'
                      ? `Hiệu quả thấp (margin ${ch.margin_pct}%, ROAS ${ch.roas}x). Cân nhắc giảm chi phí hoặc tái cấu trúc chiến lược kênh này.`
                      : ch.recommendation === 'optimize'
                      ? `Có tiềm năng nhưng cần tối ưu hóa. ROAS ${ch.roas}x cho thấy có thể cải thiện conversion và chi phí quảng cáo.`
                      : `Kênh ổn định. Duy trì ngân sách hiện tại và theo dõi biến động.`
                    }
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════ VI. BLIND SPOTS & PRIORITIES ═══════════ */}
      <section>
        <SectionTitle number="VI" title="Điểm mù & Ưu tiên Quý" icon={Eye} subtitle="Những gì CEO có thể bỏ lỡ và thứ tự ưu tiên hành động" />

        <div className="grid grid-cols-2 gap-5">
          {/* Blind Spots */}
          <div className="bg-white rounded-2xl border border-amber-200 p-6">
            <h4 className="text-base font-bold text-amber-800 mb-4 flex items-center gap-2"><Eye size={18} /> Điểm mù</h4>
            <div className="space-y-3">
              {s.blindSpots.map((bs, i) => (
                <div key={i} className="bg-amber-50 rounded-xl p-4">
                  <div className="text-sm font-bold text-slate-800 mb-1">{bs.area}</div>
                  <p className="text-sm text-red-700 mb-2">{bs.risk}</p>
                  <div className="bg-white rounded-lg p-2 border border-amber-200">
                    <span className="text-xs font-semibold text-amber-700">Hành động ngay: </span>
                    <span className="text-xs text-slate-700">{bs.whatToDoNow}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quarter Priorities */}
          <div className="bg-white rounded-2xl border border-blue-200 p-6">
            <h4 className="text-base font-bold text-blue-800 mb-4 flex items-center gap-2"><Target size={18} /> Ưu tiên Q2/2026</h4>
            <div className="space-y-3">
              {s.quarterPriorities.map((p, i) => (
                <div key={i} className="bg-blue-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">{p.rank}</span>
                    <span className="text-sm font-bold text-slate-800">{p.title}</span>
                  </div>
                  <p className="text-sm text-slate-600 ml-8 mb-2">{p.why}</p>
                  <div className="ml-8 flex items-center gap-3 text-xs text-slate-500">
                    <span className="bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full font-medium">{p.metric}</span>
                    <span>Owner: <strong>{p.owner}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ VII. THẢO LUẬN CÁC BÊN ═══════════ */}
      <section>
        <SectionTitle number="VII" title="Thảo luận các bên" icon={MessageSquare} subtitle="Tổng hợp góc nhìn và đề xuất từ 11 AI Agents" />

        <div className="space-y-4">
          {[
            { role: 'CEO', messages: ceoMessages, color: 'blue', icon: Star },
            { role: 'Strategy Advisor', messages: strategyMessages, color: 'amber', icon: Brain },
            { role: 'Market Research', messages: marketMessages, color: 'purple', icon: Globe },
            { role: 'Channel Optimizer', messages: channelMessages, color: 'green', icon: ShoppingCart },
            { role: 'HR Director', messages: hrMessages, color: 'cyan', icon: Users },
            { role: 'CFO', messages: financeMessages, color: 'emerald', icon: DollarSign },
          ].filter(g => g.messages.length > 0).map((group, i) => {
            const colors: Record<string, string> = {
              blue: 'border-l-blue-500 bg-blue-50/30', amber: 'border-l-amber-500 bg-amber-50/30',
              purple: 'border-l-purple-500 bg-purple-50/30', green: 'border-l-green-500 bg-green-50/30',
              cyan: 'border-l-cyan-500 bg-cyan-50/30', emerald: 'border-l-emerald-500 bg-emerald-50/30',
            };
            const typeLabels: Record<string, { label: string; color: string }> = {
              analysis: { label: 'Phân tích', color: 'bg-blue-100 text-blue-700' },
              decision: { label: 'Quyết định', color: 'bg-green-100 text-green-700' },
              alert: { label: 'Cảnh báo', color: 'bg-red-100 text-red-700' },
              recommendation: { label: 'Đề xuất', color: 'bg-purple-100 text-purple-700' },
              question: { label: 'Câu hỏi', color: 'bg-orange-100 text-orange-700' },
            };
            return (
              <div key={i} className={`border-l-4 rounded-r-2xl ${colors[group.color]} p-5`}>
                <div className="flex items-center gap-2 mb-3">
                  <group.icon size={18} className="text-slate-600" />
                  <span className="text-base font-bold text-slate-800">{group.role}</span>
                  <span className="text-xs text-slate-400">({group.messages.length} ý kiến)</span>
                </div>
                <div className="space-y-2">
                  {group.messages.map((msg: any, j: number) => {
                    const tl = typeLabels[msg.type] || typeLabels.analysis;
                    return (
                      <div key={j} className="bg-white rounded-lg p-3 border border-slate-100">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${tl.color}`}>{tl.label}</span>
                        </div>
                        <p className="text-sm text-slate-700 leading-relaxed">{msg.content}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ═══════════ VIII. MỤC TIÊU KINH DOANH ═══════════ */}
      <section>
        <SectionTitle number="VIII" title="Mục tiêu Kinh doanh Q2/2026" icon={Target} subtitle="Trạng thái từng mục tiêu với phân tích tiến độ" />
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 text-sm font-semibold text-slate-600">
                <th className="text-left px-5 py-3">Mục tiêu</th>
                <th className="text-left px-5 py-3">Loại</th>
                <th className="text-right px-5 py-3">Target</th>
                <th className="text-right px-5 py-3">Hiện tại</th>
                <th className="text-center px-5 py-3">Tiến độ</th>
                <th className="text-center px-5 py-3">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {data.businessTargets.map((t, i) => {
                const pct = t.targetValue > 0 ? Math.round((t.currentValue / t.targetValue) * 100) : 0;
                const si = statusIcons[t.status] || statusIcons.at_risk;
                const StatusIcon = si.icon;
                const catLabels: Record<string, string> = { revenue: 'Doanh thu', growth: 'Tăng trưởng', efficiency: 'Hiệu suất', quality: 'Chất lượng' };
                return (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="px-5 py-3 text-sm font-medium text-slate-800">{t.name}</td>
                    <td className="px-5 py-3"><span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{catLabels[t.category] || t.category}</span></td>
                    <td className="px-5 py-3 text-sm text-right text-slate-600">{t.unit === 'VND' ? fmtB(t.targetValue) : `${fmt(t.targetValue)} ${t.unit}`}</td>
                    <td className="px-5 py-3 text-sm text-right font-bold text-slate-800">{t.unit === 'VND' ? fmtB(t.currentValue) : `${fmt(t.currentValue)} ${t.unit}`}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                        <span className="text-xs font-bold text-slate-600 w-10 text-right">{pct}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-center"><StatusIcon size={18} className={si.color} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ═══════════ IX. NHÂN SỰ & PHÒNG BAN ═══════════ */}
      <section>
        <SectionTitle number="IX" title="Phân tích Nhân sự & Phòng ban" icon={Users} subtitle="Hiệu suất, chi phí và rủi ro nhân sự từng phòng ban" />
        <div className="space-y-4">
          {data.departmentDetails.map((dept, i) => {
            const cost = data.costProjections.find(c => c.department === dept.department);
            return (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-base font-bold text-slate-800">{dept.department}</h4>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-slate-500">{dept.headcount} NV</span>
                    <span className={`font-bold ${dept.avgKpiScore >= 80 ? 'text-green-700' : dept.avgKpiScore >= 50 ? 'text-amber-700' : 'text-red-700'}`}>KPI: {dept.avgKpiScore}</span>
                    <span className="text-slate-500">Completion: {dept.completionRate}%</span>
                    {cost && <span className="text-slate-500">Chi phí: {fmtB(cost.totalCost)}/tháng</span>}
                  </div>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden mb-3">
                  <div className={`h-full rounded-full ${dept.completionRate >= 80 ? 'bg-green-500' : dept.completionRate >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${dept.completionRate}%` }} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {dept.topPerformers.length > 0 && (
                    <div className="bg-green-50 rounded-lg p-3">
                      <div className="text-xs font-semibold text-green-700 mb-1">Top Performers</div>
                      <div className="flex flex-wrap gap-1">
                        {dept.topPerformers.map((p: any, j: number) => (
                          <span key={j} className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full">{p.name} ({p.kpiScore})</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {dept.atRiskEmployees.length > 0 && (
                    <div className="bg-red-50 rounded-lg p-3">
                      <div className="text-xs font-semibold text-red-700 mb-1">Cần hỗ trợ</div>
                      <div className="flex flex-wrap gap-1">
                        {dept.atRiskEmployees.map((p: any, j: number) => (
                          <span key={j} className="text-xs bg-red-200 text-red-800 px-2 py-0.5 rounded-full">{p.name} ({p.reason})</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
      <div className="border-t-2 border-slate-200 pt-6 text-center text-sm text-slate-400">
        <p>Báo cáo được tạo tự động bởi 11 AI Agents — Teeworld Command Center</p>
        <p className="mt-1">Dữ liệu cập nhật lần cuối: {ts ? new Date(ts).toLocaleString('vi-VN') : '...'}</p>
      </div>
    </div>
  );
}

// ─── Sub Components ───────────────────────────────────────────────────────────

function SectionTitle({ number, title, icon: Icon, subtitle }: { number: string; title: string; icon: React.ComponentType<{ size?: number; className?: string }>; subtitle?: string }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center text-sm font-bold">{number}</div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">{title} <Icon size={20} className="text-slate-400" /></h2>
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

function Circle({ size, className }: { size?: number; className?: string }) {
  return <div className={`w-[${size || 18}px] h-[${size || 18}px] rounded-full border-2 border-slate-300 ${className}`} />;
}

function KPICard({ label, value, target, pct, icon: Icon, color }: { label: string; value: string; target: string; pct: number; icon: React.ComponentType<{ size?: number; className?: string }>; color: string }) {
  const colors: Record<string, { bg: string; text: string; bar: string }> = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-700', bar: 'bg-blue-500' },
    green: { bg: 'bg-green-50', text: 'text-green-700', bar: 'bg-green-500' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-700', bar: 'bg-purple-500' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-700', bar: 'bg-amber-500' },
  };
  const c = colors[color] || colors.blue;
  return (
    <div className={`${c.bg} rounded-xl p-4 border border-slate-200`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} className={c.text} />
        <span className="text-xs font-medium text-slate-500">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${c.text}`}>{value}</div>
      <div className="text-xs text-slate-400 mt-0.5">Target: {target}</div>
      <div className="h-1.5 bg-white/60 rounded-full overflow-hidden mt-2">
        <div className={`h-full rounded-full ${c.bar}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  );
}
