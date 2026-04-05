"use client";

import { useState, useEffect, useMemo } from 'react';
import { ListChecks, Target, DollarSign, CalendarCheck, TrendingUp, Clock } from 'lucide-react';
import StatCard from '@/components/StatCard';
import ProgressRing from '@/components/agents/ProgressRing';
import PersonalScorecard from '@/components/agents/PersonalScorecard';
import PerformanceTrendLine from '@/components/agents/PerformanceTrendLine';
import { employees, employeeCareers, CURRENT_USER_ID, formatCurrency } from '@/lib/mock-data';
import { runFullCoordination } from '@/lib/agents/coordinator';
import { generatePayslip } from '@/lib/payslip-data';
import { generateEmployeeKPICard } from '@/lib/payslip-data';

export default function EmployeeDashboard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const emp = employees.find(e => e.id === CURRENT_USER_ID)!;
  const career = employeeCareers.find(c => c.employeeId === CURRENT_USER_ID);
  const state = useMemo(() => runFullCoordination(2026, 'Q2'), []);
  const myPlans = state.individualPlans.filter(p => p.employeeId === CURRENT_USER_ID);
  const completedPlans = myPlans.filter(p => p.status === 'completed').length;
  const payslip = generatePayslip(CURRENT_USER_ID, 4);
  const kpiCard = generateEmployeeKPICard(CURRENT_USER_ID);

  const avgKPI = career?.performanceHistory.length
    ? Math.round(career.performanceHistory.reduce((s, h) => s + h.kpiScore, 0) / career.performanceHistory.length)
    : 60;

  return (
    <div className="p-6">
      {/* Welcome */}
      <div className="border-b border-slate-200 pb-4 mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Xin chào, {emp.name}!</h1>
        <p className="text-sm text-slate-500 mt-1">{emp.chucVu} - {emp.phongBan} | {career?.levelCode || 'L3'}</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={ListChecks} label="Công việc hoàn thành" value={`${completedPlans}/${myPlans.length}`} color="green" />
        <StatCard icon={Target} label="KPI trung bình" value={`${avgKPI}%`} color="blue" />
        <StatCard icon={DollarSign} label="Lương tháng này" value={payslip ? `${(payslip.thucNhan / 1_000_000).toFixed(1)}M` : 'N/A'} color="purple" />
        <StatCard icon={TrendingUp} label="Xếp loại" value={kpiCard?.bonusTier || 'N/A'} color="orange" />
      </div>

      {/* Scorecard */}
      <div className="mb-6">
        <h2 className="text-base font-semibold text-slate-800 mb-3">Bảng điểm cá nhân</h2>
        <PersonalScorecard plans={myPlans} avgKPI={avgKPI} />
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Performance Trend */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-base font-semibold text-slate-800 mb-4">Xu hướng KPI</h2>
          {career && mounted && <PerformanceTrendLine career={career} />}
        </div>

        {/* Recent Tasks */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-base font-semibold text-slate-800 mb-4">Công việc gần đây</h2>
          <div className="space-y-2">
            {myPlans.slice(0, 6).map(plan => (
              <div key={plan.id} className="flex items-center gap-3 py-2 border-b border-slate-50">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  plan.status === 'completed' ? 'bg-green-500' :
                  plan.status === 'in_progress' ? 'bg-blue-500' :
                  plan.status === 'at_risk' ? 'bg-red-500' : 'bg-slate-300'
                }`} />
                <p className="text-[12px] text-slate-700 flex-1 truncate">{plan.taskTitle}</p>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                  plan.status === 'completed' ? 'bg-green-100 text-green-700' :
                  plan.status === 'at_risk' ? 'bg-red-100 text-red-700' :
                  'bg-slate-100 text-slate-600'
                }`}>
                  {plan.status === 'completed' ? 'Xong' : plan.status === 'in_progress' ? 'Đang làm' : plan.status === 'at_risk' ? 'Rủi ro' : 'Chờ'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Salary Summary */}
      {payslip && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-base font-semibold text-slate-800 mb-4">Tóm tắt lương {payslip.month}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-blue-700">{formatCurrency(payslip.thuNhap.tongThuNhap)}</p>
              <p className="text-[10px] text-blue-500">Thu nhập</p>
            </div>
            <div className="bg-emerald-50 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-emerald-700">{formatCurrency(payslip.thuong.tongThuong)}</p>
              <p className="text-[10px] text-emerald-500">Thưởng ({payslip.thuong.kpiAchievement}% KPI)</p>
            </div>
            <div className="bg-red-50 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-red-700">{formatCurrency(Math.abs(payslip.khauTru.tongKhauTru))}</p>
              <p className="text-[10px] text-red-500">Khấu trừ</p>
            </div>
            <div className="bg-indigo-50 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-indigo-700">{formatCurrency(payslip.thucNhan)}</p>
              <p className="text-[10px] text-indigo-500">Thực nhận</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
