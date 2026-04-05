"use client";

import { useState, useEffect } from 'react';
import { ListChecks, Target, DollarSign, TrendingUp, Loader2 } from 'lucide-react';
import StatCard from '@/components/StatCard';
import { getEmployees, getTasks, getPayrolls, getDailyReports } from '@/lib/supabase-data';
import { getSelectedEmpId, setSelectedEmpId as persistEmpId } from '@/lib/employee-context';

function fmt(n: number) { return new Intl.NumberFormat('vi-VN').format(n); }

export default function EmployeeDashboard() {
  const [employee, setEmployee] = useState<{ id: number; name: string; role: string; department: string; base_salary: number; join_date: string } | null>(null);
  const [tasks, setTasks] = useState<Array<{ id: string; title: string; status: string; priority: string; kpi_metric: string | null; kpi_target: string | null }>>([]);
  const [payroll, setPayroll] = useState<{ base: number; commission: number; kpi_bonus: number; deduction: number; total: number } | null>(null);
  const [reportCount, setReportCount] = useState(0);
  const [allEmployees, setAllEmployees] = useState<Array<{ id: number; name: string; role: string; department: string }>>([]);
  const [selectedEmpId, setSelectedEmpId] = useState(getSelectedEmpId());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [emps, allTasks, pays, reports] = await Promise.all([
          getEmployees(), getTasks(), getPayrolls('03/2026'),
          getDailyReports({ employee_id: selectedEmpId }),
        ]);
        setAllEmployees(emps);
        const emp = emps.find((e: { id: number }) => e.id === selectedEmpId);
        setEmployee(emp || null);
        setTasks(allTasks.filter((t: { assignee_id: number }) => t.assignee_id === selectedEmpId));
        setPayroll(pays.find((p: { employee_id: number }) => p.employee_id === selectedEmpId) || null);
        setReportCount(reports.filter((r: { status: string }) => r.status === 'submitted' || r.status === 'approved').length);
      } catch (e) { console.error(e); } finally { setLoading(false); }
    }
    load();
  }, [selectedEmpId]);

  if (loading || !employee) {
    return <div className="p-6 flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /><span className="ml-3 text-slate-500">Đang tải...</span></div>;
  }

  const doneTasks = tasks.filter(t => t.status === 'done').length;
  const completionRate = tasks.length > 0 ? Math.round((doneTasks / tasks.length) * 100) : 0;

  return (
    <div className="p-4 sm:p-6">
      <div className="border-b border-slate-200 pb-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Xin chào, {employee.name}!</h1>
            <p className="text-sm text-slate-500 mt-1">{employee.role} - {employee.department}</p>
          </div>
          <select value={selectedEmpId} onChange={e => { const v = Number(e.target.value); setSelectedEmpId(v); persistEmpId(v); }}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
            {allEmployees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatCard icon={ListChecks} label="Công việc" value={`${doneTasks}/${tasks.length}`} color="green" />
        <StatCard icon={Target} label="Hoàn thành" value={`${completionRate}%`} color="blue" />
        <StatCard icon={DollarSign} label="Lương T3" value={payroll ? `${(payroll.total / 1_000_000).toFixed(1)}M` : 'N/A'} color="purple" />
        <StatCard icon={TrendingUp} label="Báo cáo gửi" value={reportCount} color="orange" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tasks */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5">
          <h2 className="text-base font-semibold text-slate-800 mb-4">Công việc gần đây</h2>
          <div className="space-y-2">
            {tasks.slice(0, 8).map(task => (
              <div key={task.id} className="flex items-center gap-3 py-2 border-b border-slate-50">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  task.status === 'done' ? 'bg-green-500' : task.status === 'in_progress' ? 'bg-blue-500' : 'bg-slate-300'
                }`} />
                <p className="text-[12px] text-slate-700 flex-1 truncate">{task.title}</p>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                  task.status === 'done' ? 'bg-green-100 text-green-700' :
                  task.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                }`}>{task.status === 'done' ? 'Xong' : task.status === 'in_progress' ? 'Đang làm' : 'Chờ'}</span>
              </div>
            ))}
            {tasks.length === 0 && <p className="text-sm text-slate-400 text-center py-4">Chưa có task nào.</p>}
          </div>
        </div>

        {/* Salary */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5">
          <h2 className="text-base font-semibold text-slate-800 mb-4">Tóm tắt lương T3/2026</h2>
          {payroll ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-blue-700">{fmt(payroll.base)}</p>
                <p className="text-[10px] text-blue-500">Lương CB</p>
              </div>
              <div className="bg-emerald-50 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-emerald-700">{fmt(payroll.commission + payroll.kpi_bonus)}</p>
                <p className="text-[10px] text-emerald-500">Thưởng</p>
              </div>
              <div className="bg-red-50 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-red-700">{fmt(payroll.deduction)}</p>
                <p className="text-[10px] text-red-500">Khấu trừ</p>
              </div>
              <div className="bg-indigo-50 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-indigo-700">{fmt(payroll.total)}</p>
                <p className="text-[10px] text-indigo-500">Thực nhận</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-4">Chưa có dữ liệu lương.</p>
          )}
        </div>
      </div>

      {/* Quick info */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 mt-6">
        <h2 className="text-base font-semibold text-slate-800 mb-3">Thông tin cá nhân</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div><span className="text-slate-400">Email:</span> <span className="text-slate-700 block">{(employee as Record<string, unknown>).email as string}</span></div>
          <div><span className="text-slate-400">SĐT:</span> <span className="text-slate-700 block">{(employee as Record<string, unknown>).phone as string}</span></div>
          <div><span className="text-slate-400">Ngày vào:</span> <span className="text-slate-700 block">{employee.join_date}</span></div>
          <div><span className="text-slate-400">Lương CB:</span> <span className="text-slate-700 block">{fmt(employee.base_salary)}đ</span></div>
        </div>
      </div>
    </div>
  );
}
