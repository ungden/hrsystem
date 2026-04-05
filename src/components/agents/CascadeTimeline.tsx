"use client";

import { useState } from 'react';
import { ChevronDown, ChevronRight, Calendar, Target, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { EmployeeCascade, MonthlyPlan, WeeklySprint, DailyTask } from '@/lib/cascade-types';
import { formatCurrency } from '@/lib/format';
import ProgressRing from './ProgressRing';

interface CascadeTimelineProps {
  cascade: EmployeeCascade;
}

const statusIcon: Record<string, { icon: typeof CheckCircle2; color: string }> = {
  completed: { icon: CheckCircle2, color: 'text-green-500' },
  on_track: { icon: Clock, color: 'text-blue-500' },
  at_risk: { icon: AlertTriangle, color: 'text-orange-500' },
  behind: { icon: AlertTriangle, color: 'text-red-500' },
  upcoming: { icon: Calendar, color: 'text-slate-400' },
  in_progress: { icon: Clock, color: 'text-blue-500' },
  missed: { icon: AlertTriangle, color: 'text-red-500' },
};

export default function CascadeTimeline({ cascade }: CascadeTimelineProps) {
  const [expandedQ, setExpandedQ] = useState<string[]>(['Q2']);
  const [expandedM, setExpandedM] = useState<string[]>(['T4/2026']);
  const [expandedW, setExpandedW] = useState<string[]>([]);

  const toggleQ = (id: string) => setExpandedQ(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const toggleM = (id: string) => setExpandedM(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const toggleW = (id: string) => setExpandedW(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  if (!cascade.annualTargets.length) return null;
  const annual = cascade.annualTargets[0];
  const annualPct = annual.targetValue > 0 ? Math.round(annual.currentValue / annual.targetValue * 100) : 0;

  return (
    <div className="space-y-2">
      {/* Annual */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-4">
        <div className="flex items-center gap-3">
          <Target size={20} className="text-amber-600" />
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-800">Năm {annual.year}: {annual.name}</p>
            <p className="text-xs text-amber-600">Mục tiêu: {formatCurrency(annual.targetValue)} đ | Đạt: {formatCurrency(annual.currentValue)} đ</p>
          </div>
          <ProgressRing percent={annualPct} size={44} strokeWidth={4} color="#f59e0b" />
        </div>
      </div>

      {/* Quarters */}
      {annual.quarters.map(q => {
        const isExpQ = expandedQ.includes(q.quarter);
        const qPct = q.targetValue > 0 ? Math.round(q.currentValue / q.targetValue * 100) : 0;

        return (
          <div key={q.id} className="ml-4">
            <button onClick={() => toggleQ(q.quarter)} className="w-full flex items-center gap-3 bg-blue-50 rounded-lg border border-blue-200 p-3 hover:bg-blue-100 transition-colors">
              {isExpQ ? <ChevronDown size={14} className="text-blue-500" /> : <ChevronRight size={14} className="text-blue-500" />}
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-blue-800">{q.quarter}/{annual.year}</p>
                <p className="text-[11px] text-blue-500">MT: {formatCurrency(q.targetValue)} | Đạt: {formatCurrency(q.currentValue)}</p>
              </div>
              <ProgressRing percent={qPct} size={36} strokeWidth={3} color="#3b82f6" />
            </button>

            {/* Months */}
            {isExpQ && (
              <div className="mt-1 space-y-1">
                {q.months.map(m => {
                  const isExpM = expandedM.includes(m.month);
                  const mPct = m.targetValue > 0 ? Math.round(m.currentValue / m.targetValue * 100) : 0;
                  const StatusIcon = statusIcon[m.status]?.icon || Clock;
                  const statusColor = statusIcon[m.status]?.color || 'text-slate-400';

                  return (
                    <div key={m.id} className="ml-6">
                      <button onClick={() => toggleM(m.month)} className="w-full flex items-center gap-2 bg-white rounded-lg border border-slate-200 p-2.5 hover:bg-slate-50 transition-colors">
                        {isExpM ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        <StatusIcon size={14} className={statusColor} />
                        <div className="flex-1 text-left">
                          <span className="text-[12px] font-medium text-slate-700">{m.month}</span>
                          <span className="text-[10px] text-slate-500 ml-2">{formatCurrency(m.currentValue)} / {formatCurrency(m.targetValue)}</span>
                        </div>
                        <span className="text-[11px] font-medium text-slate-600">{mPct}%</span>
                      </button>

                      {/* Weeks */}
                      {isExpM && (
                        <div className="mt-1 space-y-1">
                          {m.weeks.map(w => {
                            const isExpW = expandedW.includes(w.id);
                            return (
                              <div key={w.id} className="ml-6">
                                <button onClick={() => toggleW(w.id)} className="w-full flex items-center gap-2 bg-slate-50 rounded p-2 text-left hover:bg-slate-100 transition-colors">
                                  {isExpW ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                                  <span className="text-[11px] font-medium text-slate-600">{w.label}</span>
                                  <span className="text-[10px] text-slate-400">{w.startDate} - {w.endDate}</span>
                                </button>

                                {/* Days */}
                                {isExpW && (
                                  <div className="ml-6 mt-1 space-y-0.5">
                                    {w.days.map(d => (
                                      <div key={d.id} className={`rounded p-2 text-[11px] ${d.status === 'completed' ? 'bg-green-50' : d.status === 'missed' ? 'bg-red-50' : d.status === 'in_progress' ? 'bg-blue-50' : 'bg-white'} border border-slate-100`}>
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="font-medium text-slate-700">{d.dayOfWeek} - {d.date}</span>
                                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${d.status === 'completed' ? 'bg-green-100 text-green-700' : d.status === 'missed' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                                            {d.totalActual}/{d.totalTarget}
                                          </span>
                                        </div>
                                        <div className="space-y-0.5">
                                          {d.tasks.map(t => (
                                            <div key={t.id} className="flex items-center gap-1.5">
                                              <span className={`w-3 h-3 rounded-full flex items-center justify-center text-[8px] ${t.completed ? 'bg-green-500 text-white' : 'bg-slate-200'}`}>
                                                {t.completed ? '✓' : ''}
                                              </span>
                                              <span className="text-slate-600 flex-1">{t.title}</span>
                                              <span className="text-slate-400">{t.actualValue}/{t.targetValue} {t.unit}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
