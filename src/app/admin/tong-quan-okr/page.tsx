"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Target, Building2, Users, CheckCircle2, AlertTriangle } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import { getEmployees, getTasks, getMasterPlans } from '@/lib/supabase-data';
import { getSlugFromDept } from '@/lib/department-utils';

interface Employee {
  id: number;
  name: string;
  department: string;
  role: string;
  status: string;
}

interface Task {
  id: string;
  assignee_id: number;
  status: string;
  department: string;
  title: string;
  points: number;
}

interface MasterPlan {
  id: string;
  role: string;
  plan_type: string;
  title: string;
  description: string;
  target_value: number;
  current_value: number;
  unit: string;
  status: string;
  quarter: string;
  year: number;
}

interface DeptSummary {
  department: string;
  slug: string;
  headcount: number;
  totalTasks: number;
  completedTasks: number;
  completionPct: number;
}

export default function OKRTreePage() {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [masterPlans, setMasterPlans] = useState<MasterPlan[]>([]);
  const [deptSummary, setDeptSummary] = useState<DeptSummary[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const [emps, allTasks, plans] = await Promise.all([
          getEmployees(),
          getTasks(),
          getMasterPlans(),
        ]);

        const activeEmps = (emps as Employee[]).filter(e => e.status === 'active');
        setEmployees(activeEmps);
        setTasks(allTasks as Task[]);
        setMasterPlans(plans as MasterPlan[]);

        // Build department summary
        const deptMap = new Map<string, DeptSummary>();
        activeEmps.forEach(e => {
          if (!deptMap.has(e.department)) {
            deptMap.set(e.department, {
              department: e.department,
              slug: getSlugFromDept(e.department),
              headcount: 0,
              totalTasks: 0,
              completedTasks: 0,
              completionPct: 0,
            });
          }
          deptMap.get(e.department)!.headcount++;
        });

        (allTasks as Task[]).forEach(t => {
          const emp = activeEmps.find(e => e.id === t.assignee_id);
          if (emp && deptMap.has(emp.department)) {
            const d = deptMap.get(emp.department)!;
            d.totalTasks++;
            if (t.status === 'done') d.completedTasks++;
          }
        });

        const summaries = Array.from(deptMap.values()).map(d => ({
          ...d,
          completionPct: d.totalTasks > 0 ? Math.round((d.completedTasks / d.totalTasks) * 100) : 0,
        }));
        setDeptSummary(summaries);

        setLoading(false);
      } catch (err) {
        console.error('Error loading OKR data:', err);
        setLoading(false);
      }
    }
    load();
  }, []);

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'done').length;
  const atRiskTasks = tasks.filter(t => t.status === 'todo' || t.status === 'review').length;

  // Separate master plans by type
  const companyTargets = masterPlans.filter(p => p.plan_type === 'company' || p.role === 'CEO');
  const deptGoals = masterPlans.filter(p => p.plan_type === 'department' || (p.role !== 'CEO' && p.plan_type !== 'company'));

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/3" />
          <div className="grid grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-24 bg-slate-100 rounded-xl" />)}
          </div>
          <div className="h-64 bg-slate-100 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Tổng quan OKR"
        subtitle="Objectives & Key Results - Từ mục tiêu công ty đến nhiệm vụ cá nhân"
        breadcrumbs={[
          { label: 'AI Agents', href: '/admin' },
          { label: 'Tổng quan OKR' },
        ]}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Target} label="Mục tiêu công ty" value={companyTargets.length} color="orange" />
        <StatCard icon={Building2} label="Mục tiêu phòng ban" value={deptGoals.length} color="blue" />
        <StatCard icon={CheckCircle2} label="Nhiệm vụ hoàn thành" value={`${completedTasks}/${totalTasks}`} color="green" />
        <StatCard icon={AlertTriangle} label="Nhiệm vụ chờ xử lý" value={atRiskTasks} color="red" />
      </div>

      {/* Department Quick View */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <h2 className="text-base font-semibold text-slate-800 mb-3">Tổng quan theo phòng ban</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {deptSummary.map(d => (
            <Link key={d.department} href={`/admin/phong-ban/${d.slug}`}>
              <div className="bg-slate-50 rounded-lg p-3 text-center hover:bg-blue-50 transition-colors cursor-pointer">
                <p className="text-xl font-bold text-slate-800">{d.completionPct}%</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{d.department.replace('Phòng ', '')}</p>
                <p className="text-[10px] text-slate-400">{d.completedTasks}/{d.totalTasks} CV</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* SUM Invariant */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200 p-4 mb-6">
        <p className="text-sm text-blue-800 font-medium">
          Nguyên tắc OKR: Tổng trọng số phòng ban = 100% mục tiêu công ty.
          Tổng nhiệm vụ cá nhân = 100% mục tiêu phòng ban.
          Nếu mọi nhân viên hoàn thành → Mục tiêu công ty đạt được.
        </p>
      </div>

      {/* Company Targets from Master Plans */}
      {companyTargets.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
          <h2 className="text-base font-semibold text-slate-800 mb-4">Mục tiêu công ty</h2>
          <div className="space-y-3">
            {companyTargets.map(t => {
              const pct = t.target_value > 0 ? Math.round((t.current_value / t.target_value) * 100) : 0;
              return (
                <div key={t.id} className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">{t.title}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{t.description}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-lg font-bold ${pct >= 80 ? 'text-green-600' : pct >= 50 ? 'text-blue-600' : 'text-orange-600'}`}>{pct}%</p>
                    <p className="text-[10px] text-slate-400">{t.current_value}/{t.target_value} {t.unit}</p>
                  </div>
                  <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden flex-shrink-0">
                    <div
                      className={`h-full rounded-full ${pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-blue-500' : 'bg-orange-500'}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Department Goals from Master Plans */}
      {deptGoals.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-base font-semibold text-slate-800 mb-4">Mục tiêu phòng ban / vai trò</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {deptGoals.map(g => {
              const pct = g.target_value > 0 ? Math.round((g.current_value / g.target_value) * 100) : 0;
              return (
                <div key={g.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700">{g.title}</p>
                    <p className="text-[10px] text-slate-400">{g.role} | {g.quarter} {g.year}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className={`text-sm font-bold ${pct >= 80 ? 'text-green-600' : pct >= 50 ? 'text-blue-600' : 'text-orange-600'}`}>
                      {pct}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
