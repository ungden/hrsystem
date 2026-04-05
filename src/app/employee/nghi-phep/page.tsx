"use client";

import { useState, useEffect } from 'react';
import { Calendar, Plus, Loader2, CheckCircle2, Clock, XCircle, X } from 'lucide-react';
import { getEmployees, getLeaveRequests, createLeaveRequest } from '@/lib/supabase-data';
import { getSelectedEmpId, setSelectedEmpId as persistEmpId } from '@/lib/employee-context';

const leaveTypes = ['Nghỉ phép', 'Nghỉ ốm', 'Nghỉ không lương', 'Nghỉ thai sản', 'Nghỉ việc riêng'];
const statusCfg: Record<string, { icon: typeof Clock; bg: string; text: string; label: string }> = {
  pending: { icon: Clock, bg: 'bg-orange-100', text: 'text-orange-700', label: 'Chờ duyệt' },
  approved: { icon: CheckCircle2, bg: 'bg-green-100', text: 'text-green-700', label: 'Đã duyệt' },
  rejected: { icon: XCircle, bg: 'bg-red-100', text: 'text-red-700', label: 'Từ chối' },
};

export default function LeavePage() {
  const [requests, setRequests] = useState<Array<{
    id: number; employee_id: number; leave_type: string; start_date: string; end_date: string;
    days: number; reason: string; status: string; approved_by: number | null; reject_reason: string | null;
  }>>([]);
  const [allRequests, setAllRequests] = useState<typeof requests>([]);
  const [employees, setEmployees] = useState<Array<{ id: number; name: string; department: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState(getSelectedEmpId());
  const [isAdmin, setIsAdmin] = useState(false);
  const [form, setForm] = useState({ leave_type: 'Nghỉ phép', start_date: '', end_date: '', reason: '' });

  useEffect(() => { load(); }, [selectedEmpId]);

  async function load() {
    setLoading(true);
    try {
      const [emps, myReqs, allReqs] = await Promise.all([
        getEmployees(),
        getLeaveRequests({ employee_id: selectedEmpId }),
        getLeaveRequests(),
      ]);
      setEmployees(emps);
      setRequests(myReqs);
      setAllRequests(allReqs);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  async function handleSubmit() {
    const start = new Date(form.start_date);
    const end = new Date(form.end_date);
    const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    await createLeaveRequest({
      employee_id: selectedEmpId,
      leave_type: form.leave_type,
      start_date: form.start_date,
      end_date: form.end_date,
      days,
      reason: form.reason,
    });
    setShowAdd(false);
    setForm({ leave_type: 'Nghỉ phép', start_date: '', end_date: '', reason: '' });
    load();
  }

  const emp = employees.find(e => e.id === selectedEmpId);
  const totalUsed = requests.filter(r => r.status === 'approved').reduce((s, r) => s + r.days, 0);
  const pending = requests.filter(r => r.status === 'pending').length;

  if (loading) {
    return <div className="p-6 flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /><span className="ml-3 text-slate-500">Đang tải...</span></div>;
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Nghỉ phép</h1>
          <p className="text-sm text-slate-500 mt-0.5">Xin phép & theo dõi ngày nghỉ</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 bg-emerald-600 text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-emerald-700">
          <Plus size={14} /> Xin nghỉ
        </button>
      </div>

      {/* Employee selector */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
        <div className="flex items-center gap-3">
          <select value={selectedEmpId} onChange={e => { persistEmpId(Number(e.target.value)); setSelectedEmpId(Number(e.target.value)); }} className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm">
            {employees.map(e => <option key={e.id} value={e.id}>{e.name} — {e.department}</option>)}
          </select>
          <button onClick={() => setIsAdmin(!isAdmin)} className={`text-[11px] px-2 py-1 rounded ${isAdmin ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
            {isAdmin ? 'Xem tất cả' : 'Chỉ của tôi'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">12</p>
          <p className="text-[11px] text-slate-500">Phép năm</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-2xl font-bold text-orange-600">{totalUsed}</p>
          <p className="text-[11px] text-slate-500">Đã dùng</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{12 - totalUsed}</p>
          <p className="text-[11px] text-slate-500">Còn lại</p>
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-white rounded-xl border border-emerald-200 p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-800">Đơn xin nghỉ phép</h3>
            <button onClick={() => setShowAdd(false)}><X size={16} className="text-slate-400" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select value={form.leave_type} onChange={e => setForm(p => ({ ...p, leave_type: e.target.value }))} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm">
              {leaveTypes.map(t => <option key={t}>{t}</option>)}
            </select>
            <div></div>
            <div>
              <label className="text-[11px] text-slate-500 mb-1 block">Từ ngày</label>
              <input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="text-[11px] text-slate-500 mb-1 block">Đến ngày</label>
              <input type="date" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm" />
            </div>
            <textarea value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} placeholder="Lý do xin nghỉ..." rows={2} className="sm:col-span-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm resize-none" />
          </div>
          <button onClick={handleSubmit} disabled={!form.start_date || !form.end_date} className="mt-3 bg-emerald-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
            Gửi đơn
          </button>
        </div>
      )}

      {/* Leave list */}
      <div className="space-y-2">
        {(isAdmin ? allRequests : requests).map(req => {
          const cfg = statusCfg[req.status] || statusCfg.pending;
          const Icon = cfg.icon;
          const empName = employees.find(e => e.id === req.employee_id)?.name || '';
          return (
            <div key={req.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <Icon size={18} className={cfg.text} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {isAdmin && <span className="text-[12px] font-semibold text-slate-800">{empName}</span>}
                    <span className="text-[12px] font-medium text-slate-700">{req.leave_type}</span>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {req.start_date} → {req.end_date} ({req.days} ngày) — {req.reason}
                  </p>
                  {req.reject_reason && <p className="text-[11px] text-red-600 mt-0.5">Lý do từ chối: {req.reject_reason}</p>}
                </div>
              </div>
            </div>
          );
        })}
        {(isAdmin ? allRequests : requests).length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">Chưa có đơn nghỉ phép nào.</div>
        )}
      </div>
    </div>
  );
}
