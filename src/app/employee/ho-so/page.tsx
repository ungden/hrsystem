"use client";

import { useMemo } from 'react';
import EmployeeProfileCard from '@/components/agents/EmployeeProfileCard';
import { employees, employeeCareers, CURRENT_USER_ID, getCareerLevel, calculatePromotionReadiness, formatCurrency } from '@/lib/mock-data';
import { runFullCoordination } from '@/lib/agents/coordinator';

export default function MyProfilePage() {
  const emp = employees.find(e => e.id === CURRENT_USER_ID)!;
  const career = employeeCareers.find(c => c.employeeId === CURRENT_USER_ID);
  const level = getCareerLevel(career?.levelCode || 'L3');
  const promotion = calculatePromotionReadiness(CURRENT_USER_ID);
  const state = useMemo(() => runFullCoordination(2026, 'Q2'), []);
  const salary = state.salaryProjections.find(s => s.employeeId === CURRENT_USER_ID);

  return (
    <div className="p-6">
      <div className="border-b border-slate-200 pb-4 mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Hồ sơ cá nhân</h1>
        <p className="text-sm text-slate-500 mt-1">Thông tin cá nhân và lộ trình nghề nghiệp</p>
      </div>

      {/* Profile Card */}
      <div className="mb-6">
        <EmployeeProfileCard employee={emp} salary={salary} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Career Info */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-base font-semibold text-slate-800 mb-4">Thông tin Career</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Level hiện tại</span>
              <span className="font-medium text-blue-600">{career?.levelCode} - {level?.nameVi}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Track</span>
              <span className="font-medium">{career?.track === 'IC' ? 'Individual Contributor' : 'Manager'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Ngày vào làm</span>
              <span className="font-medium">{emp.ngayVaoLam}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Lương hiện tại</span>
              <span className="font-medium text-emerald-600">{career ? formatCurrency(career.currentSalary) : 'N/A'} đ</span>
            </div>
            {level && (
              <div className="flex justify-between">
                <span className="text-slate-500">Salary band</span>
                <span className="text-[12px] text-slate-600">{formatCurrency(level.salaryBand.min)} - {formatCurrency(level.salaryBand.max)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Promotion Readiness */}
        {promotion && (
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-base font-semibold text-slate-800 mb-4">Sẵn sàng thăng tiến</h2>
            <div className="space-y-3 text-sm">
              {promotion.nextLevel && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Level tiếp theo</span>
                  <span className="font-medium text-purple-600">{promotion.nextLevel.code} - {promotion.nextLevel.nameVi}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Thời gian tại level</span>
                <span className={`font-medium ${promotion.timeReady ? 'text-green-600' : 'text-orange-600'}`}>
                  {promotion.timeServed}/{promotion.timeRequired} tháng {promotion.timeReady ? '✓' : ''}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">KPI trung bình</span>
                <span className={`font-medium ${promotion.kpiReady ? 'text-green-600' : 'text-orange-600'}`}>
                  {promotion.avgKPIScore}% {promotion.kpiReady ? '✓' : ''}
                </span>
              </div>
              <div className={`mt-3 p-3 rounded-lg ${promotion.overallReady ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'}`}>
                <p className={`text-xs font-medium ${promotion.overallReady ? 'text-green-700' : 'text-orange-700'}`}>
                  {promotion.overallReady ? 'Đủ điều kiện thăng tiến!' : promotion.missingCriteria.join('; ')}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
