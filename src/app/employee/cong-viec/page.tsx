"use client";

import { useMemo } from 'react';
import { ListChecks, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import StatCard from '@/components/StatCard';
import DepartmentKanbanBoard from '@/components/agents/DepartmentKanbanBoard';
import { CURRENT_USER_ID, employees } from '@/lib/mock-data';
import { runFullCoordination } from '@/lib/agents/coordinator';

export default function MyTasksPage() {
  const state = useMemo(() => runFullCoordination(2026, 'Q2'), []);
  const myPlans = state.individualPlans.filter(p => p.employeeId === CURRENT_USER_ID);
  const emp = employees.find(e => e.id === CURRENT_USER_ID)!;

  const completed = myPlans.filter(p => p.status === 'completed').length;
  const inProgress = myPlans.filter(p => p.status === 'in_progress').length;
  const atRisk = myPlans.filter(p => p.status === 'at_risk').length;

  return (
    <div className="p-6">
      <div className="border-b border-slate-200 pb-4 mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Công việc của tôi</h1>
        <p className="text-sm text-slate-500 mt-1">Nhiệm vụ được giao từ hệ thống AI Agents</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={ListChecks} label="Tổng nhiệm vụ" value={myPlans.length} color="blue" />
        <StatCard icon={CheckCircle2} label="Hoàn thành" value={completed} color="green" />
        <StatCard icon={Clock} label="Đang làm" value={inProgress} color="purple" />
        <StatCard icon={AlertTriangle} label="Rủi ro" value={atRisk} color={atRisk > 0 ? 'red' : 'green'} />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-base font-semibold text-slate-800 mb-4">Bảng Kanban</h2>
        <DepartmentKanbanBoard plans={myPlans} />
      </div>
    </div>
  );
}
