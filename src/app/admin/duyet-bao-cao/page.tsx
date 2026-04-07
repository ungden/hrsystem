"use client";

import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Clock, Loader2, ChevronDown, ChevronRight, Bot, Zap, Users } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import {
  getEmployees, getDailyReports, getTaskSubmissions,
  approveDailyReport, rejectDailyReport,
} from '@/lib/supabase-data';

interface Employee {
  id: number; name: string; role: string; department: string; manager_id: number | null;
}

interface ReportWithDetails {
  id: string;
  employee_id: number;
  report_date: string;
  department: string;
  summary: string;
  challenges: string;
  tomorrow_plan: string;
  status: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  reviewed_by: number | null;
  employee_name: string;
  employee_role: string;
  reviewer_name: string;
  submissions: Array<{ id: string; task_id: string; actual_value: string; notes: string }>;
  roleInputs: Record<string, string>;
  parsedSummary: string;
  canApprove: boolean; // current viewer can approve this
}

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: 'bg-slate-100', text: 'text-slate-600', label: 'Nháp' },
  submitted: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Chờ duyệt' },
  approved: { bg: 'bg-green-100', text: 'text-green-700', label: 'Đã duyệt' },
  rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'Từ chối' },
  auto_approved: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'AI duyệt' },
};

// Approval hierarchy: manager_id in employees table
// - NV Hùng(3), Linh(4) → TP Mai(2) duyệt
// - NV Hồng(6), Phúc(7) → TN Tuấn(5) duyệt
// - NV Ngọc(9) → QL Đức(8) duyệt
// - Kim(10) → CEO(1) duyệt
// - Leaders (Mai, Tuấn, Đức, Minh) → CEO(1) duyệt
// - AI auto-approve: khi tất cả required fields đã nhập

function getSubordinateIds(empId: number, employees: Employee[]): number[] {
  const directReports = employees.filter(e => e.manager_id === empId).map(e => e.id);
  const allReports = [...directReports];
  // Also get indirect reports (2 levels deep)
  directReports.forEach(drId => {
    employees.filter(e => e.manager_id === drId).forEach(e => allReports.push(e.id));
  });
  return allReports;
}

export default function ApproveReportsPage() {
  const [reports, setReports] = useState<ReportWithDetails[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('submitted');
  const [deptFilter, setDeptFilter] = useState('');
  const [viewAs, setViewAs] = useState(1); // Demo: select who is viewing
  const [rejectNotes, setRejectNotes] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => { loadReports(); }, [statusFilter, deptFilter, viewAs]);

  async function loadReports() {
    setLoading(true);
    try {
      const [emps, rawReports] = await Promise.all([
        getEmployees(),
        getDailyReports({ status: statusFilter || undefined, department: deptFilter || undefined }),
      ]);
      setEmployees(emps);

      const empMap = new Map<number, Employee>(emps.map((e: Employee) => [e.id, e]));
      const subordinateIds = getSubordinateIds(viewAs, emps);
      const isCEO = viewAs === 1;

      const detailed: ReportWithDetails[] = [];
      for (const r of rawReports) {
        const emp = empMap.get(r.employee_id);
        const reviewer = r.reviewed_by ? empMap.get(r.reviewed_by) : null;
        const subs = await getTaskSubmissions(r.id);

        let parsedSummary = r.summary || '';
        let roleInputs: Record<string, string> = {};
        if (parsedSummary.startsWith('{')) {
          try {
            const parsed = JSON.parse(parsedSummary);
            roleInputs = parsed._roleInputs || {};
            parsedSummary = parsed.summary || '';
          } catch { /* not JSON */ }
        }

        // Can this viewer approve this report?
        const canApprove = isCEO || subordinateIds.includes(r.employee_id);

        // Filter: only show reports this viewer can see
        if (!isCEO && !canApprove && r.employee_id !== viewAs) continue;

        detailed.push({
          ...r,
          employee_name: emp?.name || `NV #${r.employee_id}`,
          employee_role: emp?.role || '',
          reviewer_name: reviewer?.name || '',
          submissions: subs,
          roleInputs,
          parsedSummary,
          canApprove,
        });
      }

      setReports(detailed);
    } catch (e) {
      console.error('Failed to load reports:', e);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(reportId: string) {
    setProcessing(reportId);
    try {
      await approveDailyReport(reportId, viewAs);
      await loadReports();
    } finally { setProcessing(null); }
  }

  async function handleReject(reportId: string) {
    if (!rejectNotes.trim()) return;
    setProcessing(reportId);
    try {
      await rejectDailyReport(reportId, viewAs, rejectNotes);
      setRejectNotes('');
      await loadReports();
    } finally { setProcessing(null); }
  }

  // AI auto-approve: approve all submitted reports that have at least 1 submission with actual_value
  async function handleAIAutoApprove() {
    const pending = reports.filter(r => r.status === 'submitted' && r.submissions.length > 0);
    for (const r of pending) {
      const hasData = r.submissions.some(s => s.actual_value) || Object.keys(r.roleInputs).length > 0;
      if (hasData) {
        await approveDailyReport(r.id, viewAs, 'AI auto-approved: dữ liệu đầy đủ');
      }
    }
    await loadReports();
  }

  const departments = [...new Set(reports.map(r => r.department).filter(Boolean))];
  const submittedCount = reports.filter(r => r.status === 'submitted').length;
  const approvedCount = reports.filter(r => r.status === 'approved').length;
  const rejectedCount = reports.filter(r => r.status === 'rejected').length;

  // Leaders who can approve
  const leaders = employees.filter(e =>
    e.role.includes('CEO') || e.role.includes('CMO') || e.role.includes('Trưởng') || e.role.includes('Quản lý')
  );

  if (loading) {
    return <div className="p-6 flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /><span className="ml-3 text-slate-500">Đang tải báo cáo...</span></div>;
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Duyệt báo cáo"
        subtitle={`${reports.length} báo cáo — ${submittedCount} chờ duyệt`}
        breadcrumbs={[{ label: 'AI Agents', href: '/admin' }, { label: 'Duyệt báo cáo' }]}
      />

      {/* Guide */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5 flex items-start gap-3">
        <span className="text-lg">💡</span>
        <p className="text-sm text-slate-700">Nhân viên nộp báo cáo cuối ngày ở đây. Click vào báo cáo để xem chi tiết kết quả từng task, rồi <b>Duyệt</b> hoặc yêu cầu bổ sung.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Clock} label="Chờ duyệt" value={submittedCount} color="blue" />
        <StatCard icon={CheckCircle2} label="Đã duyệt" value={approvedCount} color="green" />
        <StatCard icon={XCircle} label="Từ chối" value={rejectedCount} color="red" />
        <StatCard icon={Users} label="Tổng báo cáo" value={reports.length} color="purple" />
      </div>

      {/* Viewer selector + Filters + AI Auto */}
      <div className="flex gap-3 mb-6 flex-wrap items-center">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">Đang duyệt với tư cách:</span>
          <select value={viewAs} onChange={e => setViewAs(Number(e.target.value))}
            className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm font-medium text-blue-700">
            {leaders.map(l => (
              <option key={l.id} value={l.id}>{l.name} ({l.role})</option>
            ))}
          </select>
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
          <option value="">Tất cả</option>
          <option value="submitted">Chờ duyệt</option>
          <option value="approved">Đã duyệt</option>
          <option value="rejected">Từ chối</option>
        </select>
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
          <option value="">Tất cả PB</option>
          {departments.map(d => <option key={d}>{d}</option>)}
        </select>

        {submittedCount > 0 && (
          <button onClick={handleAIAutoApprove}
            className="ml-auto flex items-center gap-1.5 bg-purple-600 text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-purple-700">
            <Bot size={14} /> AI Auto-duyệt ({submittedCount})
          </button>
        )}
      </div>

      {/* Delegation info */}
      <div className="bg-blue-50 rounded-xl border border-blue-200 p-3 mb-4 text-[12px] text-blue-700">
        <Zap size={14} className="inline mr-1" />
        <strong>{employees.find(e => e.id === viewAs)?.name}</strong> — duyệt cho{' '}
        {getSubordinateIds(viewAs, employees).map(id => employees.find(e => e.id === id)?.name).filter(Boolean).join(', ') || 'không có NV trực thuộc'}
        {viewAs === 1 && ' (CEO: duyệt tất cả)'}
      </div>

      {/* Reports list */}
      <div className="space-y-3">
        {reports.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">
            Không có báo cáo nào trong quyền duyệt của bạn.
          </div>
        ) : (
          reports.map(report => {
            const isExpanded = expandedId === report.id;
            const cfg = statusConfig[report.status] || statusConfig.draft;
            const isSubmitted = report.status === 'submitted';

            return (
              <div key={report.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <button onClick={() => setExpandedId(isExpanded ? null : report.id)}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 transition-colors">
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-slate-800">{report.employee_name}</span>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                      {!report.canApprove && <span className="text-[9px] text-slate-400">(chỉ xem)</span>}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {report.department} | {report.employee_role} | {report.report_date}
                      {report.reviewer_name && <span className="text-emerald-600"> — Duyệt bởi: {report.reviewer_name}</span>}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[12px] font-medium text-slate-600">{report.submissions.length} tasks</p>
                    <p className="text-[10px] text-slate-400">{Object.keys(report.roleInputs).length} chỉ số</p>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-100 p-4">
                    {/* Role inputs */}
                    {Object.keys(report.roleInputs).length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Chỉ số hàng ngày</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                          {Object.entries(report.roleInputs).map(([key, value]) => (
                            <div key={key} className="bg-slate-50 rounded-lg p-2">
                              <p className="text-[10px] text-slate-500">{key.replace(/_/g, ' ')}</p>
                              <p className="text-sm font-semibold text-slate-800">{value}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Task submissions */}
                    {report.submissions.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Kết quả task</h4>
                        <div className="space-y-1">
                          {report.submissions.map(sub => (
                            <div key={sub.id} className="flex items-center gap-2 text-[12px] bg-emerald-50/50 rounded-lg p-2">
                              <CheckCircle2 size={12} className="text-emerald-500 flex-shrink-0" />
                              <span className="flex-1 text-slate-700">{sub.task_id.slice(0, 8)}...</span>
                              <span className="font-medium text-emerald-700">{sub.actual_value}</span>
                              {sub.notes && <span className="text-slate-400 text-[10px]">({sub.notes})</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {report.parsedSummary && (
                      <div className="mb-4">
                        <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Tóm tắt</h4>
                        <p className="text-[13px] text-slate-700 bg-slate-50 rounded-lg p-3">{report.parsedSummary}</p>
                      </div>
                    )}
                    {report.challenges && (
                      <div className="mb-4">
                        <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Khó khăn</h4>
                        <p className="text-[13px] text-orange-700 bg-orange-50 rounded-lg p-3">{report.challenges}</p>
                      </div>
                    )}
                    {report.review_notes && (
                      <div className="mb-4">
                        <h4 className="text-[11px] font-semibold text-red-500 uppercase tracking-wider mb-1">Ghi chú duyệt</h4>
                        <p className="text-[13px] text-red-700 bg-red-50 rounded-lg p-3">{report.review_notes}</p>
                      </div>
                    )}

                    {/* Approve/Reject - only if canApprove and submitted */}
                    {isSubmitted && report.canApprove && (
                      <div className="flex gap-3 pt-3 border-t border-slate-100">
                        <button onClick={() => handleApprove(report.id)} disabled={processing === report.id}
                          className="flex items-center gap-2 bg-emerald-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
                          {processing === report.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                          Duyệt
                        </button>
                        <div className="flex-1 flex gap-2">
                          <input type="text" value={expandedId === report.id ? rejectNotes : ''} onChange={e => setRejectNotes(e.target.value)}
                            placeholder="Lý do từ chối..." className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                          <button onClick={() => handleReject(report.id)} disabled={processing === report.id || !rejectNotes.trim()}
                            className="flex items-center gap-2 bg-red-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                            <XCircle size={14} /> Từ chối
                          </button>
                        </div>
                      </div>
                    )}
                    {isSubmitted && !report.canApprove && (
                      <p className="text-[11px] text-slate-400 pt-3 border-t border-slate-100">
                        Bạn không có quyền duyệt báo cáo này. Người duyệt: quản lý trực tiếp của {report.employee_name}.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
