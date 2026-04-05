"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Building2, Users, TrendingUp, DollarSign, Loader2 } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import ProgressRing from '@/components/agents/ProgressRing';
import DepartmentRadarChart from '@/components/agents/DepartmentRadarChart';
import { getEmployees, getTasks } from '@/lib/supabase-data';
import { deptColors, deptNameToSlug } from '@/lib/department-utils';
import { DepartmentDetail } from '@/lib/financial-types';

function formatCurrency(n: number) {
  return new Intl.NumberFormat('vi-VN').format(n);
}

export default function DepartmentListPage() {
  const [depts, setDepts] = useState<DepartmentDetail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [employees, tasks] = await Promise.all([getEmployees(), getTasks()]);
        const activeEmps = employees.filter((e: { status: string }) => e.status === 'Đang làm việc');

        // Group by department
        const deptMap = new Map<string, typeof activeEmps>();
        activeEmps.forEach((emp: { department: string }) => {
          const arr = deptMap.get(emp.department) || [];
          arr.push(emp);
          deptMap.set(emp.department, arr);
        });

        const departmentDetails: DepartmentDetail[] = [];
        deptMap.forEach((emps, dept) => {
          const empIds = emps.map((e: { id: number }) => e.id);
          const deptTasks = tasks.filter((t: { assignee_id: number }) => empIds.includes(t.assignee_id));
          const doneTasks = deptTasks.filter((t: { status: string }) => t.status === 'done').length;
          const taskCompletion = deptTasks.length > 0 ? Math.round((doneTasks / deptTasks.length) * 100) : 0;
          const totalCost = emps.reduce((s: number, e: { base_salary: number }) => s + (e.base_salary || 0), 0);

          // Find head (manager_id is null or is CEO)
          const head = emps.find((e: { manager_id: number | null; role: string }) =>
            !e.manager_id || e.role.includes('Trưởng') || e.role.includes('CEO') || e.role.includes('CMO')
          ) || emps[0];

          // Revenue contribution estimate based on department type
          const revenueWeight: Record<string, number> = {
            'Sales': 0.55, 'Marketing': 0.45, 'Vận hành': 0.15, 'Kế toán': 0.05, 'Ban Giám đốc': 0.3,
          };
          const revenueContribution = totalCost * (revenueWeight[dept] || 0.1) * 3;
          const contributionMargin = revenueContribution > 0
            ? Math.round((revenueContribution - totalCost) / revenueContribution * 100)
            : 0;

          departmentDetails.push({
            department: dept,
            slug: deptNameToSlug[dept] || dept.toLowerCase().replace(/\s/g, '-'),
            headName: head?.name || 'N/A',
            headId: String(head?.id || ''),
            headcount: emps.length,
            avgKPI: taskCompletion, // Use task completion as proxy for KPI
            taskCompletion,
            totalCost,
            revenueContribution,
            contributionMargin,
            kpiMetrics: [
              { name: 'Hoàn thành CV', value: doneTasks, target: deptTasks.length, unit: 'tasks' },
              { name: 'Nhân sự', value: emps.length, target: emps.length, unit: 'người' },
            ],
          });
        });

        setDepts(departmentDetails.sort((a, b) => b.headcount - a.headcount));
      } catch (e) {
        console.error('Failed to load departments:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-3 text-slate-500">Đang tải dữ liệu...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Phòng ban"
        subtitle={`${depts.length} phòng ban — Dữ liệu từ Supabase`}
        breadcrumbs={[
          { label: 'AI Agents', href: '/admin' },
          { label: 'Phòng ban' },
        ]}
      />

      {/* Radar Chart */}
      {depts.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
          <h2 className="text-base font-semibold text-slate-800 mb-2">So sánh phòng ban</h2>
          <DepartmentRadarChart departments={depts} />
        </div>
      )}

      {/* Department Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {depts.map(dept => {
          const colors = deptColors[dept.department] || { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' };
          return (
            <Link key={dept.department} href={`/admin/phong-ban/${dept.slug}`}>
              <div className={`${colors.bg} rounded-xl border ${colors.border} p-5 hover:shadow-md transition-shadow cursor-pointer`}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className={`text-sm font-bold ${colors.text}`}>{dept.department}</h3>
                    <p className="text-[11px] text-slate-500">Trưởng phòng: {dept.headName}</p>
                  </div>
                  <ProgressRing percent={dept.taskCompletion} size={44} strokeWidth={4} color={deptColors[dept.department]?.chart || '#3b82f6'} />
                </div>

                <div className="grid grid-cols-2 gap-2 text-[12px]">
                  <div className="flex items-center gap-1.5">
                    <Users size={12} className="text-slate-400" />
                    <span className="text-slate-600">{dept.headcount} người</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <TrendingUp size={12} className="text-slate-400" />
                    <span className="text-slate-600">CV: {dept.taskCompletion}%</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <DollarSign size={12} className="text-slate-400" />
                    <span className="text-slate-600">{formatCurrency(dept.totalCost)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Building2 size={12} className="text-slate-400" />
                    <span className="text-slate-600">Biên LN: {dept.contributionMargin}%</span>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
