"use client";

import { useState, useEffect } from 'react';
import { User, Mail, Phone, Calendar, DollarSign, Building2, Loader2, Edit3, Save, X } from 'lucide-react';
import { getEmployees, getTasks, getPayrolls, getLeaveRequests, updateEmployee } from '@/lib/supabase-data';
import { getSelectedEmpId, setSelectedEmpId as persistEmpId } from '@/lib/employee-context';

function fmt(n: number) { return new Intl.NumberFormat('vi-VN').format(n); }

export default function MyProfilePage() {
  const [employee, setEmployee] = useState<Record<string, unknown> | null>(null);
  const [taskStats, setTaskStats] = useState({ total: 0, done: 0, rate: 0 });
  const [payroll, setPayroll] = useState<{ total: number } | null>(null);
  const [leaveUsed, setLeaveUsed] = useState(0);
  const [allEmployees, setAllEmployees] = useState<Array<{ id: number; name: string }>>([]);
  const [selectedEmpId, setSelectedEmpId] = useState(getSelectedEmpId());
  const [loading, setLoading] = useState(true);

  // Edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [emps, tasks, pays, leaves] = await Promise.all([
          getEmployees(), getTasks(), getPayrolls('03/2026'),
          getLeaveRequests({ employee_id: selectedEmpId, status: 'approved' }),
        ]);
        setAllEmployees(emps);
        const emp = emps.find((e: { id: number }) => e.id === selectedEmpId);
        setEmployee(emp || null);
        if (emp) {
          setEditPhone(emp.phone as string || '');
          setEditEmail(emp.email as string || '');
        }
        const myTasks = tasks.filter((t: { assignee_id: number }) => t.assignee_id === selectedEmpId);
        const done = myTasks.filter((t: { status: string }) => t.status === 'done').length;
        setTaskStats({ total: myTasks.length, done, rate: myTasks.length > 0 ? Math.round((done / myTasks.length) * 100) : 0 });
        setPayroll(pays.find((p: { employee_id: number }) => p.employee_id === selectedEmpId) || null);
        setLeaveUsed(leaves.reduce((s: number, l: { days: number }) => s + l.days, 0));
      } catch (e) { console.error(e); } finally { setLoading(false); }
    }
    load();
  }, [selectedEmpId]);

  async function handleSave() {
    if (!employee) return;
    setSaving(true);
    try {
      await updateEmployee(employee.id as number, { phone: editPhone, email: editEmail });
      setEmployee(prev => prev ? { ...prev, phone: editPhone, email: editEmail } : null);
      setIsEditing(false);
    } catch (e) { console.error(e); }
    setSaving(false);
  }

  function handleCancelEdit() {
    if (employee) {
      setEditPhone(employee.phone as string || '');
      setEditEmail(employee.email as string || '');
    }
    setIsEditing(false);
  }

  if (loading || !employee) {
    return <div className="p-6 flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>;
  }

  const manager = allEmployees.find(e => e.id === (employee.manager_id as number));

  return (
    <div className="p-4 sm:p-6">
      <div className="border-b border-slate-200 pb-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Hồ sơ cá nhân</h1>
            <p className="text-sm text-slate-500 mt-1">Thông tin và lộ trình nghề nghiệp</p>
          </div>
          <select value={selectedEmpId} onChange={e => { const v = Number(e.target.value); setSelectedEmpId(v); persistEmpId(v); }}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
            {allEmployees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>
      </div>

      {/* Profile Card */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl p-5 sm:p-6 text-white mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
            {(employee.name as string).split(' ').map((w: string) => w[0]).slice(0, 2).join('')}
          </div>
          <div>
            <h2 className="text-xl font-bold">{employee.name as string}</h2>
            <p className="text-emerald-100">{employee.role as string}</p>
            <p className="text-emerald-200 text-sm">{employee.department as string}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Info */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-800">Thông tin cá nhân</h2>
            {!isEditing ? (
              <button onClick={() => setIsEditing(true)}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 bg-blue-50 rounded-lg px-2.5 py-1.5">
                <Edit3 size={12} /> Sửa
              </button>
            ) : (
              <div className="flex gap-1.5">
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-1 text-xs text-white bg-blue-600 rounded-lg px-2.5 py-1.5 hover:bg-blue-700 disabled:opacity-50">
                  {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Lưu
                </button>
                <button onClick={handleCancelEdit}
                  className="flex items-center gap-1 text-xs text-slate-600 bg-slate-100 rounded-lg px-2.5 py-1.5 hover:bg-slate-200">
                  <X size={12} /> Huỷ
                </button>
              </div>
            )}
          </div>
          <div className="space-y-3">
            {/* Email - editable */}
            <div className="flex items-center gap-3">
              <Mail size={16} className="text-slate-400 flex-shrink-0" />
              <span className="text-sm text-slate-500 w-28">Email</span>
              {isEditing ? (
                <input value={editEmail} onChange={e => setEditEmail(e.target.value)}
                  className="text-sm font-medium text-slate-800 border border-blue-300 rounded px-2 py-1 flex-1"
                  placeholder="Email" />
              ) : (
                <span className="text-sm font-medium text-slate-800">{employee.email as string}</span>
              )}
            </div>
            {/* Phone - editable */}
            <div className="flex items-center gap-3">
              <Phone size={16} className="text-slate-400 flex-shrink-0" />
              <span className="text-sm text-slate-500 w-28">Điện thoại</span>
              {isEditing ? (
                <input value={editPhone} onChange={e => setEditPhone(e.target.value)}
                  className="text-sm font-medium text-slate-800 border border-blue-300 rounded px-2 py-1 flex-1"
                  placeholder="Số điện thoại" />
              ) : (
                <span className="text-sm font-medium text-slate-800">{employee.phone as string}</span>
              )}
            </div>
            {/* Read-only fields */}
            {[
              { icon: Calendar, label: 'Ngày vào làm', value: employee.join_date as string },
              { icon: Building2, label: 'Phòng ban', value: employee.department as string },
              { icon: User, label: 'Quản lý', value: manager?.name || 'N/A' },
              { icon: DollarSign, label: 'Lương cơ bản', value: `${fmt(employee.base_salary as number)}đ` },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3">
                <item.icon size={16} className="text-slate-400 flex-shrink-0" />
                <span className="text-sm text-slate-500 w-28">{item.label}</span>
                <span className="text-sm font-medium text-slate-800">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5">
          <h2 className="text-base font-semibold text-slate-800 mb-4">Tổng quan hiệu suất</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">Tasks hoàn thành</span>
              <span className="text-sm font-bold text-slate-800">{taskStats.done}/{taskStats.total} ({taskStats.rate}%)</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${taskStats.rate}%` }} />
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">Lương T3/2026</span>
              <span className="text-sm font-bold text-emerald-600">{payroll ? `${fmt(payroll.total)}đ` : 'N/A'}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">Phép đã dùng / Tổng</span>
              <span className="text-sm font-bold text-blue-600">{leaveUsed} / 12 ngày</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.round((leaveUsed / 12) * 100)}%` }} />
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">Trạng thái</span>
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-green-100 text-green-700">{employee.status as string}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
