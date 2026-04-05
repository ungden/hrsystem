"use client";

import { IndividualPlan } from '@/lib/agent-types';

interface DepartmentKanbanBoardProps {
  plans: IndividualPlan[];
}

const columns: { key: IndividualPlan['status']; label: string; color: string; bg: string }[] = [
  { key: 'not_started', label: 'Chưa bắt đầu', color: 'border-slate-300', bg: 'bg-slate-50' },
  { key: 'in_progress', label: 'Đang làm', color: 'border-blue-300', bg: 'bg-blue-50' },
  { key: 'at_risk', label: 'Rủi ro', color: 'border-red-300', bg: 'bg-red-50' },
  { key: 'completed', label: 'Hoàn thành', color: 'border-green-300', bg: 'bg-green-50' },
];

export default function DepartmentKanbanBoard({ plans }: DepartmentKanbanBoardProps) {
  return (
    <div className="grid grid-cols-4 gap-3">
      {columns.map(col => {
        const colPlans = plans.filter(p => p.status === col.key);
        return (
          <div key={col.key}>
            <div className={`${col.bg} border ${col.color} rounded-lg px-3 py-2 mb-2`}>
              <span className="text-xs font-semibold text-slate-700">{col.label}</span>
              <span className="text-[10px] text-slate-500 ml-1">({colPlans.length})</span>
            </div>
            <div className="space-y-2">
              {colPlans.slice(0, 6).map(plan => (
                <div key={plan.id} className="bg-white rounded-lg border border-slate-200 p-2.5 hover:shadow-sm transition-shadow">
                  <p className="text-[11px] font-medium text-slate-700 line-clamp-2">{plan.taskTitle}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[10px] text-slate-400">{plan.employeeName.split(' ').slice(-2).join(' ')}</span>
                    <span className="text-[10px] font-medium text-blue-600">{plan.weight}%</span>
                  </div>
                </div>
              ))}
              {colPlans.length > 6 && (
                <p className="text-[10px] text-slate-400 text-center">+{colPlans.length - 6} khác</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
