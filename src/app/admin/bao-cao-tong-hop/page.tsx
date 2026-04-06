"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Download, RefreshCw, Building2, Users, TrendingUp, AlertTriangle, CheckCircle2, XCircle, DollarSign, Target, BarChart3, ShoppingCart, Package, Palette } from 'lucide-react';
import { runFullCoordination } from '@/lib/agents/coordinator';
import { getEmployees, getTasksWithActuals, type TaskWithActual } from '@/lib/supabase-data';
import type { AgentCoordinationState, BusinessTarget, CostProjection } from '@/lib/agent-types';

function fmt(n: number): string {
  if (Math.abs(n) >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)} tỷ`;
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M`;
  return new Intl.NumberFormat('vi-VN').format(Math.round(n));
}

function pct(a: number, b: number): string {
  if (b === 0) return '0%';
  return `${Math.round((a / b) * 100)}%`;
}

function statusColor(s: string): string {
  switch (s) {
    case 'achieved': return 'text-emerald-600 bg-emerald-50';
    case 'on_track': return 'text-blue-600 bg-blue-50';
    case 'at_risk': return 'text-amber-600 bg-amber-50';
    case 'behind': return 'text-red-600 bg-red-50';
    default: return 'text-gray-600 bg-gray-50';
  }
}

function statusLabel(s: string): string {
  switch (s) {
    case 'achieved': return 'Dat';
    case 'on_track': return 'Dung tien do';
    case 'at_risk': return 'Canh bao';
    case 'behind': return 'Cham tien do';
    default: return s;
  }
}

interface TeamAnalysis {
  totalHeadcount: number;
  totalMonthlyCost: number;
  annualCost: number;
  revenuePerHead: number;
  costPerHead: number;
  departments: { name: string; count: number; cost: number }[];
  hiring: string[];
  risks: string[];
}

function analyzeTeam(
  employees: Array<{ id: number; name: string; role: string; department: string; base_salary: number; status: string }>,
  targets: BusinessTarget[],
  costs: CostProjection[],
): TeamAnalysis {
  const active = employees.filter(e => e.status === 'Đang làm việc');
  const totalMonthlyCost = active.reduce((s, e) => s + (e.base_salary || 0), 0);
  const annualCost = totalMonthlyCost * 12 * 1.25; // salary + insurance + bonus ~25%
  const annualRevTarget = 20_000_000_000; // 20 tỷ
  const revenuePerHead = annualRevTarget / active.length;
  const costPerHead = annualCost / active.length;

  const deptMap = new Map<string, { count: number; cost: number }>();
  active.forEach(e => {
    const d = deptMap.get(e.department) || { count: 0, cost: 0 };
    d.count++;
    d.cost += e.base_salary || 0;
    deptMap.set(e.department, d);
  });
  const departments = Array.from(deptMap.entries()).map(([name, d]) => ({ name, ...d }));

  // AI hiring recommendations based on team gaps
  const hiring: string[] = [];
  const risks: string[] = [];

  // Gap analysis
  const hasSales = active.some(e => e.department === 'Sales');
  const hasMarketing = active.some(e => e.department === 'Marketing');
  const hasAccounting = active.filter(e => e.role.includes('Kế toán')).length;
  const salesCount = active.filter(e => e.department === 'Sales').length;
  const marketingCount = active.filter(e => e.department === 'Marketing').length;

  if (hasAccounting === 0) {
    hiring.push('Tuyển 1 Kế toán/HR — Hiện không có ai quản lý sổ sách, công nợ, bảo hiểm. Rủi ro pháp lý cao. Lương đề xuất: 10-14M');
  }
  if (salesCount <= 1) {
    hiring.push('Tuyển 1-2 NV CSKH/Telesales — Chỉ có 1 NV vận hành Shopee. Cần thêm người cho CSKH đa kênh (Zalo, FB, TikTok). Lương: 8-10M');
  }
  if (marketingCount <= 1) {
    hiring.push('Tuyển 1 Ads Specialist — Chỉ có 1 NV Marketing (Hoàng lo website + traffic). Cần chuyên gia chạy ads FB/TikTok/Shopee. Lương: 10-15M');
  }

  // Revenue per head analysis
  if (revenuePerHead > 4_000_000_000) {
    risks.push(`Doanh thu/đầu người = ${fmt(revenuePerHead)}/năm — Quá cao cho team ${active.length} người. Cần tuyển thêm để giảm tải`);
  }

  // Single point of failure
  const deptsWith1 = departments.filter(d => d.count === 1);
  deptsWith1.forEach(d => {
    risks.push(`${d.name} chỉ có 1 người — Rủi ro nếu nghỉ/ốm. Nên có backup`);
  });

  // Cost ratio
  const costRatio = annualCost / annualRevTarget * 100;
  if (costRatio < 8) {
    risks.push(`Chi phí nhân sự chỉ ${costRatio.toFixed(1)}% doanh thu mục tiêu — Đang thiếu người nghiêm trọng`);
  }

  return { totalHeadcount: active.length, totalMonthlyCost, annualCost, revenuePerHead, costPerHead, departments, hiring, risks };
}

export default function CEOBriefingPage() {
  const [state, setState] = useState<AgentCoordinationState | null>(null);
  const [employees, setEmployees] = useState<Array<{ id: number; name: string; role: string; department: string; base_salary: number; status: string; manager_id: number | null }>>([]);
  const [tasks, setTasks] = useState<TaskWithActual[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([
      runFullCoordination(2026, 'Q2'),
      getEmployees(),
      getTasksWithActuals(),
    ])
      .then(([s, emps, t]) => {
        setState(s);
        setEmployees(emps as typeof employees);
        setTasks(t as TaskWithActual[]);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-lg font-medium text-gray-700">AI Agents dang phan tich du lieu...</p>
          <p className="text-sm text-gray-500 mt-1">Tong hop bao cao tu 8 AI Agents</p>
        </div>
      </div>
    );
  }

  if (error || !state) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="text-red-700">Loi: {error || 'Khong load duoc du lieu'}</p>
        </div>
      </div>
    );
  }

  const activeEmps = employees.filter(e => e.status === 'Đang làm việc');
  const activeTasks = tasks.filter(t => activeEmps.some(e => e.id === t.assignee_id));
  const currentMonthTasks = activeTasks.filter(t => t.month_number === 4);
  const doneTasks = currentMonthTasks.filter(t => t.status === 'done');
  const team = analyzeTeam(employees as Parameters<typeof analyzeTeam>[0], state.businessTargets, state.costProjections);
  const today = new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });

  // Channel data
  const channels = state.channelAnalysis || [];
  // Financial
  const health = state.financialHealth;
  // At-risk employees
  const atRisk = state.individualPlans.filter(p => p.status === 'at_risk');
  const topPerformers = state.individualPlans
    .filter(p => p.status === 'completed')
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-slate-900 text-white px-8 py-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <Link href="/admin" className="text-slate-400 hover:text-white text-sm flex items-center gap-1 mb-2">
              <ArrowLeft className="w-4 h-4" /> Dashboard
            </Link>
            <h1 className="text-2xl font-bold">BAO CAO TONG HOP - AI AGENTS</h1>
            <p className="text-slate-400 mt-1">Teeworld (The Gioi Ao Thun) | {today}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-400">Bao cao tu dong boi</p>
            <p className="text-lg font-semibold">8 AI Agents</p>
            <p className="text-xs text-slate-500 mt-1">CEO | HR | CFO | Dept Mgr | Coach | Channel | Inventory | Collection</p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-8" ref={reportRef}>

        {/* ══════════════════════════════════════ */}
        {/* SECTION 1: EXECUTIVE SUMMARY */}
        {/* ══════════════════════════════════════ */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <Building2 className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">I. TOM TAT TINH HINH</h2>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <p className="text-gray-800 leading-relaxed">
              <strong>Teeworld</strong> hien co <strong>{team.totalHeadcount} nhan vien</strong> tren <strong>3 phong ban</strong> (Ban GD, Sales, Marketing, Van hanh).
              Tong chi phi nhan su <strong>{fmt(team.totalMonthlyCost)}/thang</strong> ({fmt(team.annualCost)}/nam).
              Muc tieu doanh thu <strong>20 ty VND/nam</strong> — tuong duong <strong>{fmt(team.revenuePerHead)}/nguoi/nam</strong>.
              {team.risks.length > 0 && (
                <> Hien co <strong className="text-red-600">{team.risks.length} rui ro</strong> va <strong className="text-amber-600">{team.hiring.length} de xuat tuyen dung</strong> can xu ly.</>
              )}
            </p>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {state.businessTargets.map(t => (
              <div key={t.id} className="bg-white border rounded-lg p-4 shadow-sm">
                <p className="text-xs text-gray-500 uppercase tracking-wide">{t.name}</p>
                <p className="text-2xl font-bold mt-1">
                  {t.unit === 'VND' ? fmt(t.currentValue) : t.currentValue}{t.unit === '%' ? '%' : ''}
                </p>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-gray-400">Target: {t.unit === 'VND' ? fmt(t.targetValue) : t.targetValue}{t.unit === '%' ? '%' : ''}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(t.status)}`}>
                    {statusLabel(t.status)}
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
                  <div
                    className={`h-1.5 rounded-full ${t.status === 'achieved' ? 'bg-emerald-500' : t.status === 'on_track' ? 'bg-blue-500' : t.status === 'at_risk' ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${Math.min(100, (t.currentValue / t.targetValue) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════ */}
        {/* SECTION 2: TEAM & ORG STRUCTURE */}
        {/* ══════════════════════════════════════ */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-6 h-6 text-indigo-600" />
            <h2 className="text-xl font-bold text-gray-900">II. CO CAU NHAN SU & CHI PHI</h2>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-indigo-700">{team.totalHeadcount}</p>
              <p className="text-sm text-indigo-600">Nhan vien</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-emerald-700">{fmt(team.totalMonthlyCost)}</p>
              <p className="text-sm text-emerald-600">Chi phi/thang</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-amber-700">{pct(team.annualCost, 20_000_000_000)}</p>
              <p className="text-sm text-amber-600">% DT muc tieu</p>
            </div>
          </div>

          {/* Employee Table */}
          <div className="border rounded-lg overflow-hidden mb-6">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Ten</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Chuc vu</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Phong ban</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Luong CB</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Quan ly</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {activeEmps.map(e => {
                  const mgr = e.manager_id ? activeEmps.find(m => m.id === e.manager_id)?.name : '—';
                  return (
                    <tr key={e.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{e.name}</td>
                      <td className="px-4 py-3 text-gray-600">{e.role}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 rounded text-xs bg-gray-100">{e.department}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">{fmt(e.base_salary)}</td>
                      <td className="px-4 py-3 text-gray-500">{mgr}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-50 font-medium">
                <tr>
                  <td className="px-4 py-3" colSpan={3}>TONG</td>
                  <td className="px-4 py-3 text-right font-mono">{fmt(team.totalMonthlyCost)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Department breakdown */}
          <div className="grid grid-cols-3 gap-3">
            {team.departments.map(d => (
              <div key={d.name} className="border rounded-lg p-3">
                <p className="font-medium text-sm">{d.name}</p>
                <p className="text-lg font-bold">{d.count} nguoi</p>
                <p className="text-xs text-gray-500">{fmt(d.cost)}/thang</p>
              </div>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════ */}
        {/* SECTION 3: FINANCIAL OVERVIEW */}
        {/* ══════════════════════════════════════ */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <DollarSign className="w-6 h-6 text-emerald-600" />
            <h2 className="text-xl font-bold text-gray-900">III. TAI CHINH</h2>
          </div>

          {health && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="border rounded-lg p-4">
                <p className="text-xs text-gray-500">Bien loi nhuan</p>
                <p className="text-2xl font-bold">{health.profitMargin.toFixed(1)}%</p>
              </div>
              <div className="border rounded-lg p-4">
                <p className="text-xs text-gray-500">Burn Rate</p>
                <p className="text-2xl font-bold">{fmt(health.burnRate)}/thang</p>
              </div>
              <div className="border rounded-lg p-4">
                <p className="text-xs text-gray-500">Current Ratio</p>
                <p className="text-2xl font-bold">{health.currentRatio.toFixed(1)}x</p>
              </div>
              <div className="border rounded-lg p-4">
                <p className="text-xs text-gray-500">D/E Ratio</p>
                <p className="text-2xl font-bold">{health.debtToEquity.toFixed(2)}</p>
              </div>
            </div>
          )}

          {/* P&L Summary */}
          {state.financials && (
            <div className="bg-gray-50 border rounded-lg p-6">
              <h3 className="font-bold text-sm text-gray-700 mb-3">KET QUA KINH DOANH Q2/2026 (Du kien)</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Doanh thu</span>
                  <span className="font-mono font-bold">{fmt(state.financials.incomeStatements.reduce((s, m) => s + m.doanhThu.tongDoanhThu, 0))}</span>
                </div>
                <div className="flex justify-between">
                  <span>Chi phi</span>
                  <span className="font-mono text-red-600">-{fmt(state.financials.incomeStatements.reduce((s, m) => s + m.chiPhi.tongChiPhi, 0))}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-bold">
                  <span>Loi nhuan rong</span>
                  <span className="font-mono">{fmt(state.financials.incomeStatements.reduce((s, m) => s + m.loiNhuanSauThue, 0))}</span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ══════════════════════════════════════ */}
        {/* SECTION 4: TASK & PRODUCTIVITY */}
        {/* ══════════════════════════════════════ */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <Target className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-bold text-gray-900">IV. NANG SUAT & CONG VIEC</h2>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="border rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-purple-700">{activeTasks.length}</p>
              <p className="text-sm text-gray-500">Tong task (12 thang)</p>
            </div>
            <div className="border rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-emerald-700">{doneTasks.length}/{currentMonthTasks.length}</p>
              <p className="text-sm text-gray-500">Hoan thanh thang 4</p>
            </div>
            <div className="border rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-blue-700">{currentMonthTasks.length > 0 ? Math.round(doneTasks.length / currentMonthTasks.length * 100) : 0}%</p>
              <p className="text-sm text-gray-500">Ti le hoan thanh</p>
            </div>
          </div>

          {/* Per-employee productivity */}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Nhan vien</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Tasks T4</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Hoan thanh</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Diem</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Trang thai</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {activeEmps.map(e => {
                  const empTasks = currentMonthTasks.filter(t => t.assignee_id === e.id);
                  const empDone = empTasks.filter(t => t.status === 'done');
                  const pts = empTasks.reduce((s, t) => s + (t.points || 0), 0);
                  const donePts = empDone.reduce((s, t) => s + (t.points || 0), 0);
                  const completionPct = empTasks.length > 0 ? Math.round(empDone.length / empTasks.length * 100) : 0;
                  const status = completionPct >= 80 ? 'achieved' : completionPct >= 50 ? 'on_track' : completionPct >= 20 ? 'at_risk' : 'behind';
                  return (
                    <tr key={e.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{e.name}</td>
                      <td className="px-4 py-3 text-center">{empTasks.length}</td>
                      <td className="px-4 py-3 text-center">{empDone.length}</td>
                      <td className="px-4 py-3 text-center font-mono">{donePts}/{pts}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-1 rounded-full ${statusColor(status)}`}>
                          {completionPct}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* ══════════════════════════════════════ */}
        {/* SECTION 5: CHANNEL ANALYSIS */}
        {/* ══════════════════════════════════════ */}
        {channels.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <ShoppingCart className="w-6 h-6 text-orange-600" />
              <h2 className="text-xl font-bold text-gray-900">V. PHAN TICH KENH BAN HANG</h2>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Kenh</th>
                    <th className="text-right px-4 py-3 font-medium">Doanh thu</th>
                    <th className="text-right px-4 py-3 font-medium">Ty trong</th>
                    <th className="text-right px-4 py-3 font-medium">Margin</th>
                    <th className="text-right px-4 py-3 font-medium">ROAS</th>
                    <th className="text-left px-4 py-3 font-medium">De xuat</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {channels.map(ch => (
                    <tr key={ch.channel} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{ch.channel}</td>
                      <td className="px-4 py-3 text-right font-mono">{fmt(ch.revenue)}</td>
                      <td className="px-4 py-3 text-right">{ch.revenue_share.toFixed(1)}%</td>
                      <td className="px-4 py-3 text-right">{ch.margin_pct.toFixed(1)}%</td>
                      <td className="px-4 py-3 text-right">{ch.roas.toFixed(1)}x</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded ${
                          ch.recommendation === 'increase' ? 'bg-emerald-100 text-emerald-700' :
                          ch.recommendation === 'maintain' ? 'bg-blue-100 text-blue-700' :
                          ch.recommendation === 'decrease' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {ch.recommendation === 'increase' ? 'Tang' : ch.recommendation === 'maintain' ? 'Giu' : ch.recommendation === 'decrease' ? 'Giam' : 'Toi uu'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ══════════════════════════════════════ */}
        {/* SECTION 6: INVENTORY & COLLECTIONS */}
        {/* ══════════════════════════════════════ */}
        {(state.stockAlerts.length > 0 || state.collectionPlans.length > 0) && (
          <section className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <Package className="w-6 h-6 text-teal-600" />
              <h2 className="text-xl font-bold text-gray-900">VI. TON KHO & BO SUU TAP</h2>
            </div>

            {state.stockAlerts.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <p className="font-medium text-amber-800 mb-2">Canh bao ton kho ({state.stockAlerts.length} SP)</p>
                <ul className="text-sm text-amber-700 space-y-1">
                  {state.stockAlerts.slice(0, 5).map((a, i) => (
                    <li key={i}>• {a.itemName}: ton {a.currentStock} / min {a.minStock} — {a.action}</li>
                  ))}
                </ul>
              </div>
            )}

            {state.collectionPlans.length > 0 && (
              <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                {state.collectionPlans.map(cp => (
                  <div key={cp.month} className={`border rounded-lg p-3 ${cp.status === 'launched' ? 'bg-emerald-50 border-emerald-200' : cp.status === 'in_production' ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'}`}>
                    <p className="text-xs text-gray-500">T{cp.month}</p>
                    <p className="font-medium text-sm">{cp.name}</p>
                    <p className="text-xs text-gray-400 mt-1">{cp.targetSKUs} SKUs</p>
                    <span className={`text-xs mt-1 inline-block px-1.5 py-0.5 rounded ${
                      cp.status === 'launched' ? 'bg-emerald-200 text-emerald-800' :
                      cp.status === 'in_production' ? 'bg-blue-200 text-blue-800' :
                      cp.status === 'in_design' ? 'bg-purple-200 text-purple-800' :
                      'bg-gray-200 text-gray-600'
                    }`}>{cp.status}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ══════════════════════════════════════ */}
        {/* SECTION 7: AI RECOMMENDATIONS */}
        {/* ══════════════════════════════════════ */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            <h2 className="text-xl font-bold text-gray-900">VII. DE XUAT & CANH BAO TU AI AGENTS</h2>
          </div>

          {/* Hiring recommendations */}
          {team.hiring.length > 0 && (
            <div className="mb-6">
              <h3 className="font-bold text-sm text-gray-700 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" /> DE XUAT TUYEN DUNG (AI HR Director)
              </h3>
              <div className="space-y-3">
                {team.hiring.map((h, i) => (
                  <div key={i} className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                    <p className="text-sm text-gray-800">{h}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Risks */}
          {team.risks.length > 0 && (
            <div className="mb-6">
              <h3 className="font-bold text-sm text-gray-700 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> RUI RO (AI Performance Coach)
              </h3>
              <div className="space-y-3">
                {team.risks.map((r, i) => (
                  <div key={i} className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                    <p className="text-sm text-gray-800">{r}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Agent Messages */}
          <div>
            <h3 className="font-bold text-sm text-gray-700 mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> PHAN TICH TU AGENTS
            </h3>
            <div className="space-y-2">
              {state.messages.slice(0, 10).map(msg => (
                <div key={msg.id} className="border rounded-lg p-3 bg-gray-50">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-200">{msg.agentName}</span>
                    <span className="text-xs text-gray-400">{msg.type}</span>
                  </div>
                  <p className="text-sm text-gray-700">{msg.content}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════ */}
        {/* FOOTER */}
        {/* ══════════════════════════════════════ */}
        <footer className="border-t pt-6 text-center text-sm text-gray-400">
          <p>Bao cao nay duoc tao tu dong boi 8 AI Agents cua Teeworld HR System</p>
          <p className="mt-1">Du lieu lay tu Supabase real-time | {today}</p>
          <div className="flex justify-center gap-4 mt-4">
            <Link href="/admin/tro-chuyen" className="text-blue-600 hover:underline">Chat voi AI Agents</Link>
            <Link href="/admin/bao-cao-tai-chinh" className="text-blue-600 hover:underline">Chi tiet tai chinh</Link>
            <Link href="/admin/tong-quan-okr" className="text-blue-600 hover:underline">OKR Overview</Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
