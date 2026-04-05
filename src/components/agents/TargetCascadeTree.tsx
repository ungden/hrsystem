"use client";

import { useState } from 'react';
import { ChevronDown, ChevronRight, Target, Building2, User } from 'lucide-react';
import { BusinessTarget, DepartmentGoal, IndividualPlan } from '@/lib/agent-types';
import { formatCurrency } from '@/lib/format';
import ProgressRing from './ProgressRing';

interface TargetCascadeTreeProps {
  targets: BusinessTarget[];
  goals: DepartmentGoal[];
  plans: IndividualPlan[];
}

const statusColors: Record<string, string> = {
  on_track: 'bg-green-100 text-green-700',
  at_risk: 'bg-orange-100 text-orange-700',
  behind: 'bg-red-100 text-red-700',
  achieved: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  in_progress: 'bg-blue-100 text-blue-700',
  not_started: 'bg-slate-100 text-slate-600',
};

const statusLabels: Record<string, string> = {
  on_track: 'Đúng tiến độ',
  at_risk: 'Có rủi ro',
  behind: 'Chậm tiến độ',
  achieved: 'Đã đạt',
  completed: 'Hoàn thành',
  in_progress: 'Đang làm',
  not_started: 'Chưa bắt đầu',
};

function formatValue(value: number, unit: string): string {
  if (unit === 'VND') return formatCurrency(value) + ' đ';
  return value.toLocaleString('vi-VN') + ' ' + unit;
}

export default function TargetCascadeTree({ targets, goals, plans }: TargetCascadeTreeProps) {
  const [expandedTargets, setExpandedTargets] = useState<string[]>(targets.map(t => t.id));
  const [expandedGoals, setExpandedGoals] = useState<string[]>([]);

  const toggleTarget = (id: string) => {
    setExpandedTargets(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleGoal = (id: string) => {
    setExpandedGoals(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <div className="space-y-3">
      {targets.map(target => {
        const targetGoals = goals.filter(g => g.businessTargetId === target.id);
        const isExpanded = expandedTargets.includes(target.id);
        const pct = target.targetValue > 0 ? Math.round(target.currentValue / target.targetValue * 100) : 0;

        return (
          <div key={target.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {/* Target level */}
            <button
              onClick={() => toggleTarget(target.id)}
              className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors"
            >
              {isExpanded ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
              <Target size={18} className="text-amber-500" />
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-slate-800">{target.name}</p>
                <p className="text-xs text-slate-500">
                  {formatValue(target.currentValue, target.unit)} / {formatValue(target.targetValue, target.unit)}
                </p>
              </div>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusColors[target.status]}`}>
                {statusLabels[target.status]}
              </span>
              <ProgressRing percent={pct} size={36} color={pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444'} />
            </button>

            {/* Department goals */}
            {isExpanded && (
              <div className="border-t border-slate-100">
                {targetGoals.map(goal => {
                  const goalPlans = plans.filter(p => p.departmentGoalId === goal.id);
                  const isGoalExpanded = expandedGoals.includes(goal.id);
                  const goalPct = goal.targetValue > 0 ? Math.round(goal.currentValue / goal.targetValue * 100) : 0;

                  return (
                    <div key={goal.id}>
                      <button
                        onClick={() => toggleGoal(goal.id)}
                        className="w-full flex items-center gap-3 pl-10 pr-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50"
                      >
                        {isGoalExpanded ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                        <Building2 size={15} className="text-blue-500" />
                        <div className="flex-1 text-left">
                          <p className="text-[13px] font-medium text-slate-700">{goal.department}</p>
                          <p className="text-[11px] text-slate-500">
                            Trọng số: {goal.weight}% | {formatValue(goal.currentValue, goal.unit)} / {formatValue(goal.targetValue, goal.unit)}
                          </p>
                        </div>
                        <ProgressRing percent={goalPct} size={32} strokeWidth={3} color={goalPct >= 80 ? '#10b981' : '#3b82f6'} />
                      </button>

                      {/* Individual plans */}
                      {isGoalExpanded && goalPlans.length > 0 && (
                        <div className="bg-slate-50/50">
                          {goalPlans.map(plan => {
                            const planPct = plan.targetValue > 0 ? Math.round(plan.currentValue / plan.targetValue * 100) : 0;
                            return (
                              <div key={plan.id} className="flex items-center gap-3 pl-20 pr-4 py-2.5 border-b border-slate-100/50">
                                <User size={13} className="text-slate-400" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-[12px] font-medium text-slate-700 truncate">{plan.employeeName}</p>
                                  <p className="text-[11px] text-slate-500 truncate">{plan.taskTitle}</p>
                                </div>
                                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${statusColors[plan.status]}`}>
                                  {statusLabels[plan.status]}
                                </span>
                                <span className="text-[11px] text-slate-500 w-10 text-right">{planPct}%</span>
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
