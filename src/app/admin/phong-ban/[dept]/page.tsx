"use client";

import { useState, useEffect } from 'react';
import { use } from 'react';
import Link from 'next/link';
import { Users, TrendingUp, DollarSign, Target } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import ProgressRing from '@/components/agents/ProgressRing';
import { getDeptFromSlug } from '@/lib/department-utils';
import { getEmployees, getEmployeeCareers, getTasks, calculateEmployeeScores } from '@/lib/supabase-data';
import { formatCurrency } from '@/lib/format';

interface Employee {
  id: number;
  name: string;
  department: string;
  role: string;
  base_salary: number;
  status: string;
  email: string;
  phone: string;
}

interface EmployeeCareer {
  employee_id: number;
  level_code: string;
  track: string;
  current_salary: number;
}

interface Task {
  id: string;
  assignee_id: number;
  status: string;
  department: string;
  points: number;
  title: string;
}

interface EmpRanking {
  emp: Employee;
  career: EmployeeCareer | undefined;
  completedTasks: number;
  totalTasks: number;
  completionRate: number;
  kpiScore: number;
  salary: number;
}

export default function DepartmentDetailPage({ params }: { params: Promise<{ dept: string }> }) {
  const { dept: slug } = use(params);
  const deptName = getDeptFromSlug(slug) || '';

  const [loading, setLoading] = useState(true);
  const [deptEmployees, setDeptEmployees] = useState<Employee[]>([]);
  const [empRanking, setEmpRanking] = useState<EmpRanking[]>([]);
  const [deptTasks, setDeptTasks] = useState<Task[]>([]);
  const [totalCost, setTotalCost] = useState(0);
  const [avgKPI, setAvgKPI] = useState(0);
  const [taskCompletion, setTaskCompletion] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        const [allEmployees, allCareers, allTasks, scores] = await Promise.all([
          getEmployees(),
          getEmployeeCareers(),
          getTasks({ department: deptName }),
          calculateEmployeeScores(),
        ]);

        const filtered = allEmployees.filter(
          (e: Employee) => e.department === deptName && e.status === 'Đang làm việc'
        );
        setDeptEmployees(filtered);

        const dTasks = allTasks as Task[];
        setDeptTasks(dTasks);

        const cost = filtered.reduce((s: number, e: Employee) => s + (e.base_salary || 0), 0);
        setTotalCost(cost);

        const doneCount = dTasks.filter(t => t.status === 'done').length;
        const completion = dTasks.length > 0 ? Math.round((doneCount / dTasks.length) * 100) : 0;
        setTaskCompletion(completion);

        // Build ranking
        const ranking: EmpRanking[] = filtered.map((emp: Employee) => {
          const career = (allCareers as EmployeeCareer[]).find(c => c.employee_id === emp.id);
          const empTasks = dTasks.filter(t => t.assignee_id === emp.id);
          const completed = empTasks.filter(t => t.status === 'done').length;
          const total = empTasks.length;
          const score = scores.find((s: { employee: { id: number } }) => s.employee.id === emp.id);
          return {
            emp,
            career,
            completedTasks: completed,
            totalTasks: total,
            completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
            kpiScore: score?.scorePercent || 0,
            salary: career?.current_salary || emp.base_salary || 0,
          };
        }).sort((a, b) => b.completionRate - a.completionRate);

        setEmpRanking(ranking);

        const avg = ranking.length > 0
          ? Math.round(ranking.reduce((s, r) => s + r.kpiScore, 0) / ranking.length)
          : 0;
        setAvgKPI(avg);

        setLoading(false);
      } catch (err) {
        console.error('Error loading department data:', err);
        setLoading(false);
      }
    }
    if (deptName) load();
  }, [deptName]);

  if (!deptName) {
    return <div className="p-6"><p className="text-slate-500">Không tìm thấy phòng ban.</p></div>;
  }

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
        title={deptName}
        subtitle={`${deptEmployees.length} nhân sự`}
        breadcrumbs={[
          { label: 'AI Agents', href: '/admin' },
          { label: 'Phòng ban', href: '/admin/phong-ban' },
          { label: deptName },
        ]}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Users} label="Nhân sự" value={deptEmployees.length} color="blue" />
        <StatCard icon={TrendingUp} label="KPI trung bình" value={`${avgKPI}%`} color="green" />
        <StatCard icon={Target} label="Hoàn thành CV" value={`${taskCompletion}%`} color="purple" />
        <StatCard icon={DollarSign} label="Chi phí/tháng" value={`${(totalCost / 1_000_000).toFixed(0)}M`} color="orange" />
      </div>

      {/* Task Summary */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <h2 className="text-base font-semibold text-slate-800 mb-3">Tổng quan công việc</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Tổng task', value: deptTasks.length, color: 'text-slate-700' },
            { label: 'Hoàn thành', value: deptTasks.filter(t => t.status === 'done').length, color: 'text-green-600' },
            { label: 'Đang làm', value: deptTasks.filter(t => t.status === 'in_progress').length, color: 'text-blue-600' },
            { label: 'Chờ làm', value: deptTasks.filter(t => t.status === 'todo').length, color: 'text-orange-600' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-3 bg-slate-50 rounded-lg p-3">
              <ProgressRing
                percent={deptTasks.length > 0 ? Math.round((item.value / deptTasks.length) * 100) : 0}
                size={40}
                strokeWidth={4}
                color={item.color === 'text-green-600' ? '#10b981' : item.color === 'text-blue-600' ? '#3b82f6' : item.color === 'text-orange-600' ? '#f59e0b' : '#64748b'}
              />
              <div className="flex-1 min-w-0">
                <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
                <p className="text-[10px] text-slate-500">{item.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Employee Ranking */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-base font-semibold text-slate-800 mb-4">Bảng xếp hạng nhân viên</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <th className="pb-2 pr-3">#</th>
                <th className="pb-2 pr-3">Nhân viên</th>
                <th className="pb-2 pr-3">Level</th>
                <th className="pb-2 pr-3 text-center">KPI</th>
                <th className="pb-2 pr-3 text-center">CV hoàn thành</th>
                <th className="pb-2 pr-3 text-right">Thu nhập</th>
                <th className="pb-2 text-right">Tiến độ</th>
              </tr>
            </thead>
            <tbody>
              {empRanking.map((r, i) => (
                <tr key={r.emp.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="py-2.5 pr-3 text-sm font-bold text-slate-400">{i + 1}</td>
                  <td className="py-2.5 pr-3">
                    <Link href={`/admin/nhan-vien/${r.emp.id}`} className="text-sm font-medium text-blue-600 hover:text-blue-800">
                      {r.emp.name}
                    </Link>
                    <p className="text-[10px] text-slate-400">{r.emp.role}</p>
                  </td>
                  <td className="py-2.5 pr-3">
                    <span className="bg-blue-100 text-blue-700 text-[10px] font-semibold px-1.5 py-0.5 rounded">
                      {r.career?.level_code || '—'}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 text-center">
                    <span className={`text-sm font-medium ${r.kpiScore >= 75 ? 'text-green-600' : r.kpiScore >= 55 ? 'text-blue-600' : 'text-orange-600'}`}>
                      {r.kpiScore}%
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 text-center text-sm text-slate-600">{r.completedTasks}/{r.totalTasks}</td>
                  <td className="py-2.5 pr-3 text-right text-sm text-slate-700">{formatCurrency(r.salary)}</td>
                  <td className="py-2.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${r.completionRate >= 80 ? 'bg-green-500' : r.completionRate >= 50 ? 'bg-blue-500' : 'bg-orange-500'}`} style={{ width: `${r.completionRate}%` }} />
                      </div>
                      <span className="text-[11px] text-slate-500 w-8">{r.completionRate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
