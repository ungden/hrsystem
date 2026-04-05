"use client";

import { useState, useEffect, useMemo } from 'react';
import { use } from 'react';
import PageHeader from '@/components/PageHeader';
import EmployeeProfileCard from '@/components/agents/EmployeeProfileCard';
import PersonalScorecard from '@/components/agents/PersonalScorecard';
import DepartmentKanbanBoard from '@/components/agents/DepartmentKanbanBoard';
import SalaryBreakdownPie from '@/components/agents/SalaryBreakdownPie';
import PerformanceTrendLine from '@/components/agents/PerformanceTrendLine';
import { runFullCoordination } from '@/lib/agents/coordinator';
import { employees, employeeCareers, getCareerLevel, formatCurrency, calculatePromotionReadiness } from '@/lib/mock-data';

export default function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const state = useMemo(() => runFullCoordination(2026, 'Q2'), []);
  const emp = employees.find(e => e.id === id);
  const career = employeeCareers.find(c => c.employeeId === id);
  const salary = state.salaryProjections.find(s => s.employeeId === id);
  const plans = state.individualPlans.filter(p => p.employeeId === id);
  const promotion = calculatePromotionReadiness(id);
  const level = getCareerLevel(career?.levelCode || 'L3');

  if (!emp) {
    return <div className="p-6"><p className="text-slate-500">Không tìm thấy nhân viên.</p></div>;
  }

  const avgKPI = career?.performanceHistory.length
    ? Math.round(career.performanceHistory.reduce((s, h) => s + h.kpiScore, 0) / career.performanceHistory.length)
    : 60;

  return (
    <div className="p-6">
      <PageHeader
        title={emp.name}
        subtitle={`${emp.chucVu} - ${emp.phongBan}`}
        breadcrumbs={[
          { label: 'AI Agents', href: '/admin' },
          { label: 'Nhân viên', href: '/admin/nhan-vien' },
          { label: emp.name },
        ]}
      />

      {/* Profile Card */}
      <div className="mb-6">
        <EmployeeProfileCard employee={emp} salary={salary} />
      </div>

      {/* Personal Scorecard */}
      <div className="mb-6">
        <h2 className="text-base font-semibold text-slate-800 mb-3">Bảng điểm cá nhân</h2>
        <PersonalScorecard plans={plans} avgKPI={avgKPI} />
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Performance Trend */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-base font-semibold text-slate-800 mb-4">Xu hướng KPI</h2>
          {career && mounted && <PerformanceTrendLine career={career} />}
        </div>

        {/* Salary Breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-base font-semibold text-slate-800 mb-4">Cơ cấu thu nhập</h2>
          {salary && mounted && <SalaryBreakdownPie projection={salary} />}
        </div>
      </div>

      {/* Kanban */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <h2 className="text-base font-semibold text-slate-800 mb-4">Bảng Kanban cá nhân</h2>
        {plans.length > 0 ? (
          <DepartmentKanbanBoard plans={plans} />
        ) : (
          <p className="text-sm text-slate-400 text-center py-8">Chưa có nhiệm vụ được giao.</p>
        )}
      </div>

      {/* Promotion & Career */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bonus Breakdown */}
        {salary && (
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-base font-semibold text-slate-800 mb-4">Chi tiết thưởng dự kiến</h2>
            <div className="space-y-2">
              {salary.bonusBreakdown.map((b, i) => (
                <div key={i} className="flex justify-between items-center py-1.5 border-b border-slate-50">
                  <span className="text-sm text-slate-600">{b.source}</span>
                  <span className="text-sm font-medium text-emerald-600">{formatCurrency(b.amount)} đ</span>
                </div>
              ))}
              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <span className="text-sm font-semibold text-slate-800">Tổng thưởng dự kiến</span>
                <span className="text-sm font-bold text-emerald-700">{formatCurrency(salary.projectedBonus)} đ</span>
              </div>
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
                <span className="font-medium text-blue-600">{career?.levelCode} - {level.nameVi}</span>
              </div>
              {promotion.nextLevel && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Level tiếp theo</span>
                  <span className="font-medium text-purple-600">{promotion.nextLevel.code} - {promotion.nextLevel.nameVi}</span>
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
                  {promotion.avgKPIScore}% (yêu cầu {level.requiredKPIPercent}%)
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
