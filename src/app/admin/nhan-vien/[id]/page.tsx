"use client";

import { useState, useEffect } from 'react';
import { use } from 'react';
import PageHeader from '@/components/PageHeader';
import EmployeeProfileCard from '@/components/agents/EmployeeProfileCard';
import PerformanceTrendLine from '@/components/agents/PerformanceTrendLine';
import { getEmployee, getEmployeeCareer, getCareerLevel, calculatePromotionReadiness, getTasks, getPerformanceRatings, getPayrolls } from '@/lib/supabase-data';
import { formatCurrency } from '@/lib/format';
import { RATING_COLORS, getPerformanceRatingTier } from '@/lib/career-config';

interface Employee {
  id: number;
  name: string;
  department: string;
  role: string;
  base_salary: number;
  email: string;
  phone: string;
  status: string;
}

interface EmployeeCareer {
  employee_id: number;
  level_code: string;
  track: string;
  current_salary: number;
  level_start_date: string;
}

interface Task {
  id: string;
  assignee_id: number;
  status: string;
  title: string;
  points: number;
  priority: string;
  due_date: string;
}

interface PerformanceRating {
  employee_id: number;
  period: string;
  kpi_score: number;
  tier: string;
}

interface Payroll {
  employee_id: number;
  month: string;
  base_salary: number;
  bonus: number;
  deduction: number;
  net_salary: number;
}

interface CareerLevel {
  code: string;
  name: string;
  name_vi: string;
  track: string;
  salary_band_min: number;
  salary_band_mid: number;
  salary_band_max: number;
  min_time_months: number;
  required_kpi_percent: number;
  next_level: string | null;
}

interface PromotionResult {
  timeServed: number;
  timeRequired: number;
  timeReady: boolean;
  avgKPIScore: number;
  kpiReady: boolean;
  currentRating: string;
  salaryPosition: number;
  missingCriteria: string[];
  overallReady: boolean;
  nextLevel: CareerLevel | null;
}

export default function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const empId = parseInt(id, 10);

  const [loading, setLoading] = useState(true);
  const [emp, setEmp] = useState<Employee | null>(null);
  const [career, setCareer] = useState<EmployeeCareer | null>(null);
  const [level, setLevel] = useState<CareerLevel | null>(null);
  const [promotion, setPromotion] = useState<PromotionResult | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [ratings, setRatings] = useState<PerformanceRating[]>([]);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const [empData, careerData, tasksData, ratingsData, payrollsData, promotionData] = await Promise.all([
          getEmployee(empId),
          getEmployeeCareer(empId),
          getTasks({ assignee_id: empId }),
          getPerformanceRatings({ employee_id: empId }),
          getPayrolls(),
          calculatePromotionReadiness(empId),
        ]);

        setEmp(empData as Employee);
        setCareer(careerData as EmployeeCareer | null);
        setTasks(tasksData as Task[]);
        setRatings(ratingsData as PerformanceRating[]);
        setPayrolls((payrollsData as Payroll[]).filter(p => p.employee_id === empId));
        setPromotion(promotionData as PromotionResult | null);

        if (careerData) {
          const levelData = await getCareerLevel((careerData as EmployeeCareer).level_code);
          setLevel(levelData as CareerLevel | null);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error loading employee data:', err);
        setLoading(false);
      }
    }
    load();
  }, [empId]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/3" />
          <div className="h-32 bg-slate-100 rounded-xl" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-48 bg-slate-100 rounded-xl" />
            <div className="h-48 bg-slate-100 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!emp) {
    return <div className="p-6"><p className="text-slate-500">Không tìm thấy nhân viên.</p></div>;
  }

  const doneTasks = tasks.filter(t => t.status === 'done').length;
  const totalTasks = tasks.length;
  const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const avgKPI = ratings.length > 0
    ? Math.round(ratings.reduce((s, r) => s + r.kpi_score, 0) / ratings.length)
    : 0;

  const ratingTier = getPerformanceRatingTier(avgKPI);
  const ratingColor = RATING_COLORS[ratingTier];

  const latestPayroll = payrolls.length > 0 ? payrolls[payrolls.length - 1] : null;

  return (
    <div className="p-6">
      <PageHeader
        title={emp.name}
        subtitle={`${emp.role} - ${emp.department}`}
        breadcrumbs={[
          { label: 'AI Agents', href: '/admin' },
          { label: 'Nhân viên', href: '/admin/nhan-vien' },
          { label: emp.name },
        ]}
      />

      {/* Profile Card */}
      <div className="mb-6">
        <EmployeeProfileCard employee={emp} />
      </div>

      {/* Personal Scorecard */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <h2 className="text-base font-semibold text-slate-800 mb-3">Bảng điểm cá nhân</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-800">{completionRate}%</p>
            <p className="text-xs text-slate-500">Hoàn thành CV</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-800">{doneTasks}/{totalTasks}</p>
            <p className="text-xs text-slate-500">Tasks done</p>
          </div>
          <div className="text-center">
            <p className={`text-2xl font-bold ${ratingColor}`}>{avgKPI}%</p>
            <p className="text-xs text-slate-500">KPI trung bình</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{career?.level_code || '—'}</p>
            <p className="text-xs text-slate-500">Level ({career?.track || 'IC'})</p>
          </div>
        </div>
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Performance Trend */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-base font-semibold text-slate-800 mb-4">Xu hướng KPI</h2>
          {ratings.length > 0 ? (
            <PerformanceTrendLine ratings={ratings.map(r => ({ period: r.period, kpi_score: r.kpi_score, tier: r.tier }))} />
          ) : (
            <p className="text-sm text-slate-400 text-center py-8">Chưa có dữ liệu KPI.</p>
          )}
        </div>

        {/* Salary Info */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-base font-semibold text-slate-800 mb-4">Thông tin thu nhập</h2>
          <div className="space-y-2">
            <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
              <span className="text-sm text-slate-600">Lương cơ bản</span>
              <span className="text-sm font-medium text-slate-800">{formatCurrency(emp.base_salary)} đ</span>
            </div>
            {career && (
              <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                <span className="text-sm text-slate-600">Lương hiện tại (career)</span>
                <span className="text-sm font-medium text-blue-600">{formatCurrency(career.current_salary)} đ</span>
              </div>
            )}
            {latestPayroll && (
              <>
                <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                  <span className="text-sm text-slate-600">Thưởng ({latestPayroll.month})</span>
                  <span className="text-sm font-medium text-emerald-600">{formatCurrency(latestPayroll.bonus)} đ</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                  <span className="text-sm text-slate-600">Khấu trừ</span>
                  <span className="text-sm font-medium text-red-600">-{formatCurrency(latestPayroll.deduction)} đ</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                  <span className="text-sm font-semibold text-slate-800">Thực nhận ({latestPayroll.month})</span>
                  <span className="text-sm font-bold text-emerald-700">{formatCurrency(latestPayroll.net_salary)} đ</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Task List */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <h2 className="text-base font-semibold text-slate-800 mb-4">Danh sách công việc ({tasks.length})</h2>
        {tasks.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <th className="pb-2 pr-3">Tiêu đề</th>
                  <th className="pb-2 pr-3 text-center">Trạng thái</th>
                  <th className="pb-2 pr-3 text-center">Ưu tiên</th>
                  <th className="pb-2 pr-3 text-center">Điểm</th>
                  <th className="pb-2 text-right">Hạn</th>
                </tr>
              </thead>
              <tbody>
                {tasks.slice(0, 20).map(t => (
                  <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="py-2 pr-3 text-sm text-slate-700">{t.title}</td>
                    <td className="py-2 pr-3 text-center">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        t.status === 'done' ? 'bg-green-100 text-green-700' :
                        t.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                        t.status === 'review' ? 'bg-purple-100 text-purple-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {t.status === 'done' ? 'Xong' : t.status === 'in_progress' ? 'Đang làm' : t.status === 'review' ? 'Review' : 'Chờ'}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-center">
                      <span className={`text-[10px] font-medium ${
                        t.priority === 'urgent' ? 'text-red-600' :
                        t.priority === 'high' ? 'text-orange-600' :
                        t.priority === 'medium' ? 'text-blue-600' : 'text-slate-500'
                      }`}>
                        {t.priority}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-center text-sm text-slate-600">{t.points || 0}</td>
                    <td className="py-2 text-right text-xs text-slate-500">{t.due_date || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {tasks.length > 20 && (
              <p className="text-xs text-slate-400 text-center mt-2">... và {tasks.length - 20} công việc khác</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-400 text-center py-8">Chưa có nhiệm vụ được giao.</p>
        )}
      </div>

      {/* Promotion & Career */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* KPI History */}
        {ratings.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-base font-semibold text-slate-800 mb-4">Lịch sử KPI</h2>
            <div className="space-y-2">
              {ratings.map((r, i) => {
                const tier = getPerformanceRatingTier(r.kpi_score);
                const color = RATING_COLORS[tier];
                return (
                  <div key={i} className="flex justify-between items-center py-1.5 border-b border-slate-50">
                    <span className="text-sm text-slate-600">{r.period}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${color}`}>{r.kpi_score}%</span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${color}`}>{tier}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Promotion Readiness */}
        {promotion && level && (
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-base font-semibold text-slate-800 mb-4">Lộ trình thăng tiến</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Level hiện tại</span>
                <span className="font-medium text-blue-600">{career?.level_code} - {level.name_vi}</span>
              </div>
              {promotion.nextLevel && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Level tiếp theo</span>
                  <span className="font-medium text-purple-600">{promotion.nextLevel.code} - {promotion.nextLevel.name_vi}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Thời gian tại level</span>
                <span className={`font-medium ${promotion.timeReady ? 'text-green-600' : 'text-orange-600'}`}>
                  {promotion.timeServed}/{promotion.timeRequired} tháng
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">KPI trung bình</span>
                <span className={`font-medium ${promotion.kpiReady ? 'text-green-600' : 'text-orange-600'}`}>
                  {promotion.avgKPIScore}% (yêu cầu {level.required_kpi_percent}%)
                </span>
              </div>
              <div className={`mt-3 p-3 rounded-lg ${promotion.overallReady ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'}`}>
                <p className={`text-xs font-medium ${promotion.overallReady ? 'text-green-700' : 'text-orange-700'}`}>
                  {promotion.overallReady ? 'Đủ điều kiện thăng tiến!' : `Chưa đủ ĐK: ${promotion.missingCriteria.join('; ')}`}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
