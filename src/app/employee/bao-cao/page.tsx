"use client";

import { useState, useEffect, useCallback } from 'react';
import { Send, Save, Loader2, CheckCircle2, Clock, ChevronDown, ChevronRight, ClipboardList, FileCheck2, Plus, Star, X, Zap } from 'lucide-react';
import {
  getEmployees, getTasks,
  getDailyReportByDate, createDailyReport, updateDailyReport, submitDailyReport,
  getTaskSubmissions, upsertTaskSubmission, getFormTemplateForEmployee, addSelfTask,
} from '@/lib/supabase-data';
import { calculateTaskPoints, calculateSalaryImpact } from '@/lib/ai-points';
import EvidenceUploader from '@/components/reports/EvidenceUploader';
import { getSelectedEmpId, setSelectedEmpId as persistEmpId } from '@/lib/employee-context';

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: 'bg-slate-100', text: 'text-slate-600', label: 'Nháp' },
  submitted: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Đã gửi' },
  approved: { bg: 'bg-green-100', text: 'text-green-700', label: 'Đã duyệt' },
  rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'Từ chối' },
};

interface FormField {
  key: string; label: string; type: string; unit: string; required: boolean; placeholder: string;
}

export default function DailyReportPage() {
  const [employee, setEmployee] = useState<{ id: number; name: string; role: string; department: string } | null>(null);
  const [tasks, setTasks] = useState<Array<{
    id: string; title: string; kpi_metric: string | null; kpi_target: string | null;
    kpi_unit: string | null; priority: string; status: string; month_number: number;
    points: number; source: string; ai_point_reason: string;
  }>>([]);
  const [monthlyTarget, setMonthlyTarget] = useState(1000);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('medium');
  const [addingTask, setAddingTask] = useState(false);
  const [report, setReport] = useState<{
    id: string; status: string; summary: string; challenges: string; tomorrow_plan: string;
  } | null>(null);
  const [submissions, setSubmissions] = useState<Record<string, { actual_value: string; notes: string }>>({});
  const [roleInputs, setRoleInputs] = useState<Record<string, string>>({});
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [formTemplateName, setFormTemplateName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [selectedEmpId, setSelectedEmpId] = useState(getSelectedEmpId());
  const [allEmployees, setAllEmployees] = useState<Array<{ id: number; name: string; role: string; department: string }>>([]);

  const today = new Date().toISOString().split('T')[0];
  const [reportDate, setReportDate] = useState(today);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const emps = await getEmployees();
        setAllEmployees(emps);
        const emp = emps.find((e: { id: number }) => e.id === selectedEmpId);
        if (!emp) return;
        setEmployee(emp);
        setMonthlyTarget(emp.monthly_point_target || 1000);

        // Get form template from DB (admin-customizable)
        const template = await getFormTemplateForEmployee(emp.role, emp.department, emp.id);
        if (template) {
          setFormFields(template.fields as FormField[]);
          setFormTemplateName(template.name);
        } else {
          setFormFields([]);
          setFormTemplateName('');
        }

        // Get current month's tasks, then filter for today's due_date
        const currentMonth = new Date(reportDate).getMonth() + 1;
        const allMonthTasks = await getTasks({ assignee_id: emp.id, month_number: currentMonth });
        // Show only tasks due today (or tasks without due_date that match today's week)
        const reportWeek = Math.ceil(new Date(reportDate).getDate() / 7);
        const todayTasks = allMonthTasks.filter((t: { due_date?: string; week_number?: number }) => {
          if (t.due_date) return t.due_date === reportDate;
          // Tasks without due_date: show if week matches or no week assigned
          if (t.week_number) return t.week_number === reportWeek;
          return false; // Don't show tasks with no date and no week
        });
        // If no tasks match today, fall back to showing incomplete tasks for the month
        setTasks(todayTasks.length > 0 ? todayTasks : allMonthTasks.filter((t: { status: string }) => t.status !== 'done'));

        // Get or create daily report
        let existingReport = await getDailyReportByDate(emp.id, reportDate);
        if (!existingReport) {
          existingReport = await createDailyReport({ employee_id: emp.id, report_date: reportDate, department: emp.department });
        }
        setReport({
          id: existingReport.id, status: existingReport.status || 'draft',
          summary: existingReport.summary || '', challenges: existingReport.challenges || '',
          tomorrow_plan: existingReport.tomorrow_plan || '',
        });

        // Load existing submissions
        const subs = await getTaskSubmissions(existingReport.id);
        const subMap: Record<string, { actual_value: string; notes: string }> = {};
        subs.forEach((s: { task_id: string; actual_value: string; notes: string }) => {
          subMap[s.task_id] = { actual_value: s.actual_value || '', notes: s.notes || '' };
        });
        setSubmissions(subMap);

        // Load role inputs
        if (existingReport.summary?.startsWith('{')) {
          try {
            const parsed = JSON.parse(existingReport.summary);
            if (parsed._roleInputs) {
              setRoleInputs(parsed._roleInputs);
              setReport(prev => prev ? { ...prev, summary: parsed.summary || '' } : prev);
            }
          } catch { /* not JSON */ }
        }
      } catch (e) { console.error('Failed to load:', e); } finally { setLoading(false); }
    }
    load();
  }, [selectedEmpId, reportDate]);

  const autoSave = useCallback(async () => {
    if (!report || report.status !== 'draft') return;
    setSaving(true);
    try {
      const summaryData = JSON.stringify({ _roleInputs: roleInputs, summary: report.summary });
      await updateDailyReport(report.id, { summary: summaryData, challenges: report.challenges, tomorrow_plan: report.tomorrow_plan });

      for (const [taskId, sub] of Object.entries(submissions)) {
        if (sub.actual_value) {
          const numericVal = parseFloat(sub.actual_value.replace(/[,.]/g, ''));
          await upsertTaskSubmission({
            daily_report_id: report.id, task_id: taskId, actual_value: sub.actual_value,
            actual_numeric: isNaN(numericVal) ? null : numericVal, notes: sub.notes,
          });
        }
      }
      setSaveMessage('Đã lưu');
      setTimeout(() => setSaveMessage(''), 2000);
    } catch (e) { console.error('Save failed:', e); setSaveMessage('Lỗi!'); } finally { setSaving(false); }
  }, [report, submissions, roleInputs]);

  const handleSubmit = async () => {
    if (!report) return;
    setSubmitting(true);
    try { await autoSave(); await submitDailyReport(report.id); setReport(prev => prev ? { ...prev, status: 'submitted' } : prev); }
    catch (e) { console.error(e); } finally { setSubmitting(false); }
  };

  // Add self task
  const handleAddTask = async () => {
    if (!newTaskTitle.trim() || !employee) return;
    setAddingTask(true);
    try {
      const currentMonth = new Date(reportDate).getMonth() + 1;
      const { points, reason } = calculateTaskPoints({
        title: newTaskTitle, priority: newTaskPriority, source: 'self_added',
      });
      const newTask = await addSelfTask({
        title: newTaskTitle, assignee_id: employee.id, department: employee.department,
        priority: newTaskPriority, month_number: currentMonth, points, ai_point_reason: reason,
      });
      setTasks(prev => [...prev, newTask]);
      setNewTaskTitle(''); setShowAddTask(false);
    } catch (e) { console.error(e); } finally { setAddingTask(false); }
  };

  const isReadOnly = report?.status === 'submitted' || report?.status === 'approved';
  const todoTasks = tasks.filter(t => t.status !== 'done');
  const doneTasks = tasks.filter(t => t.status === 'done');

  // Points calculation
  const totalPoints = tasks.reduce((s, t) => s + (t.points || 0), 0);
  const earnedPoints = doneTasks.reduce((s, t) => s + (t.points || 0), 0);
  const salaryImpact = calculateSalaryImpact(earnedPoints, monthlyTarget);

  if (loading) {
    return <div className="p-6 flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /><span className="ml-3 text-slate-500">Đang tải...</span></div>;
  }
  if (!employee || !report) return <div className="p-6 text-slate-500">Không tìm thấy dữ liệu.</div>;

  const statusCfg = statusColors[report.status] || statusColors.draft;

  return (
    <div className="p-4 sm:p-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Báo cáo công việc</h1>
          <p className="text-sm text-slate-500">To-do list + Nghiệm thu hàng ngày</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusCfg.bg} ${statusCfg.text}`}>{statusCfg.label}</span>
          {saveMessage && <span className="text-xs text-emerald-600 animate-pulse">{saveMessage}</span>}
        </div>
      </div>

      {/* Employee + Date */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="text-[11px] font-semibold text-slate-500 uppercase">Nhân viên</label>
            <select value={selectedEmpId} onChange={e => { persistEmpId(Number(e.target.value)); setSelectedEmpId(Number(e.target.value)); }}
              className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-medium">
              {allEmployees.map(e => <option key={e.id} value={e.id}>{e.name} — {e.role}</option>)}
            </select>
          </div>
          <div className="w-full sm:w-48">
            <label className="text-[11px] font-semibold text-slate-500 uppercase">Ngày</label>
            <input type="date" value={reportDate} onChange={e => setReportDate(e.target.value)}
              className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm" disabled={isReadOnly} />
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-2">{employee.department} | {employee.role}</p>
      </div>

      {/* Points Progress */}
      <div className={`rounded-xl border p-4 mb-4 ${salaryImpact.tierColor.split(' ')[1]}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Star size={18} className={salaryImpact.tierColor.split(' ')[0]} />
            <span className="text-sm font-bold text-slate-800">Points tháng này</span>
          </div>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${salaryImpact.tierColor}`}>{salaryImpact.tier}</span>
        </div>
        <div className="flex items-center gap-3 mb-1">
          <div className="flex-1 h-3 bg-white/50 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${
              salaryImpact.achievementPct >= 100 ? 'bg-green-500' :
              salaryImpact.achievementPct >= 80 ? 'bg-blue-500' :
              salaryImpact.achievementPct >= 60 ? 'bg-orange-500' : 'bg-red-500'
            }`} style={{ width: `${Math.min(100, salaryImpact.achievementPct)}%` }} />
          </div>
          <span className="text-sm font-bold text-slate-800">{earnedPoints}/{monthlyTarget} pts</span>
        </div>
        <p className="text-[11px] text-slate-600">{salaryImpact.message}</p>
        <p className="text-[10px] text-slate-400 mt-1">Hôm nay: {totalPoints} pts | Target tháng: {monthlyTarget} pts | Lương: {salaryImpact.salaryPct}%</p>
      </div>

      {/* ═══════════ PHẦN 1: TO-DO LIST ═══════════ */}
      <div className="bg-white rounded-xl border border-slate-200 mb-4 overflow-hidden">
        <div className="flex items-center gap-2 p-4 bg-blue-50 border-b border-blue-100">
          <ClipboardList size={18} className="text-blue-600" />
          <h2 className="text-sm font-bold text-blue-800">PHẦN 1: TO-DO LIST — Công việc ngày {new Date(reportDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}</h2>
          <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full ml-auto">{tasks.length} tasks</span>
          {!isReadOnly && (
            <button onClick={() => setShowAddTask(!showAddTask)}
              className="flex items-center gap-1 text-[11px] bg-blue-600 text-white rounded-lg px-2.5 py-1 hover:bg-blue-700">
              <Plus size={12} /> Thêm task
            </button>
          )}
        </div>
        <div className="p-4 space-y-1.5">
          {/* Add task form */}
          {showAddTask && (
            <div className="bg-blue-50 rounded-lg border border-blue-200 p-3 mb-2">
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="text-[10px] font-medium text-blue-700 mb-1 block">Thêm task phát sinh</label>
                  <input type="text" value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)}
                    placeholder="Mô tả công việc..." className="w-full bg-white border border-blue-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                <select value={newTaskPriority} onChange={e => setNewTaskPriority(e.target.value)}
                  className="bg-white border border-blue-200 rounded-lg px-2 py-2 text-sm w-24">
                  <option value="high">Cao</option>
                  <option value="medium">TB</option>
                  <option value="low">Thấp</option>
                </select>
                <button onClick={handleAddTask} disabled={addingTask || !newTaskTitle.trim()}
                  className="bg-blue-600 text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {addingTask ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                </button>
                <button onClick={() => setShowAddTask(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
              </div>
              {newTaskTitle && (
                <p className="text-[10px] text-blue-600 mt-1">
                  <Zap size={10} className="inline" /> AI sẽ chấm: ~{calculateTaskPoints({ title: newTaskTitle, priority: newTaskPriority, source: 'self_added' }).points} pts
                  ({calculateTaskPoints({ title: newTaskTitle, priority: newTaskPriority, source: 'self_added' }).reason})
                </p>
              )}
            </div>
          )}

          {todoTasks.length === 0 && doneTasks.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-3">Không có task nào trong tháng này.</p>
          )}
          {todoTasks.map(task => (
            <div key={task.id} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-slate-50">
              <span className="w-5 h-5 rounded border-2 border-slate-300 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-slate-800">
                  {task.title}
                  {task.source === 'self_added' && <span className="text-[9px] bg-purple-100 text-purple-600 px-1 py-0.5 rounded ml-1">tự thêm</span>}
                </p>
                {task.kpi_target && (
                  <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                    KH: {task.kpi_target} {task.kpi_unit || ''}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded flex-shrink-0">
                {task.points || 0} pts
              </span>
              <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                task.priority === 'high' ? 'bg-red-100 text-red-700' :
                task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-500'
              }`}>{task.priority}</span>
            </div>
          ))}
          {doneTasks.length > 0 && (
            <div className="pt-2 border-t border-slate-100 mt-2">
              <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1">Đã hoàn thành ({doneTasks.length})</p>
              {doneTasks.slice(0, 3).map(task => (
                <div key={task.id} className="flex items-center gap-3 py-1.5 px-3 opacity-60">
                  <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />
                  <p className="text-[12px] text-slate-500 line-through flex-1">{task.title}</p>
                  <span className="text-[10px] font-bold text-green-600">+{task.points || 0} pts</span>
                </div>
              ))}
              {doneTasks.length > 3 && <p className="text-[10px] text-slate-400 pl-10">+{doneTasks.length - 3} khác</p>}
            </div>
          )}
        </div>
      </div>

      {/* ═══════════ PHẦN 2: NGHIỆM THU ═══════════ */}
      <div className="bg-white rounded-xl border border-emerald-200 mb-4 overflow-hidden">
        <div className="flex items-center gap-2 p-4 bg-emerald-50 border-b border-emerald-100">
          <FileCheck2 size={18} className="text-emerald-600" />
          <h2 className="text-sm font-bold text-emerald-800">PHẦN 2: NGHIỆM THU — Nhập kết quả thực tế</h2>
        </div>

        <div className="p-4">
          {/* 2A: Task results */}
          <h3 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">Kết quả từng task</h3>
          <div className="space-y-3 mb-6">
            {tasks.map(task => {
              const sub = submissions[task.id] || { actual_value: '', notes: '' };
              const filled = !!sub.actual_value;
              return (
                <div key={task.id} className={`rounded-lg border p-3 ${filled ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200'}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="text-[13px] font-medium text-slate-800">{task.title}</p>
                      {task.kpi_target && (
                        <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded inline-block mt-1">
                          KH: {task.kpi_target} {task.kpi_unit || ''} {task.kpi_metric ? `(${task.kpi_metric})` : ''}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded flex-shrink-0">{task.points || 0} pts</span>
                    {filled && <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input type="text" value={sub.actual_value}
                      onChange={e => setSubmissions(prev => ({ ...prev, [task.id]: { ...sub, actual_value: e.target.value } }))}
                      placeholder={task.kpi_target ? `Thực tế (KH: ${task.kpi_target})` : 'Kết quả thực tế'}
                      disabled={isReadOnly}
                      className="bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50" />
                    <input type="text" value={sub.notes}
                      onChange={e => setSubmissions(prev => ({ ...prev, [task.id]: { ...sub, notes: e.target.value } }))}
                      placeholder="Ghi chú, giải thích..."
                      disabled={isReadOnly}
                      className="bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-500 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50" />
                  </div>
                  {/* Evidence upload */}
                  <div className="mt-2">
                    <EvidenceUploader dailyReportId={report.id} uploadedBy={selectedEmpId} disabled={isReadOnly} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* 2B: Role-specific fields (from DB template) */}
          {formFields.length > 0 && (
            <>
              <h3 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Chỉ số nghiệm thu — {formTemplateName}
                <span className="text-[9px] font-normal text-slate-400 ml-2">(Admin có thể tùy chỉnh form này)</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                {formFields.map((field: FormField) => (
                  <div key={field.key}>
                    <label className="text-[12px] font-medium text-slate-600 mb-1 block">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-0.5">*</span>}
                      <span className="text-slate-400 ml-1">({field.unit})</span>
                    </label>
                    {field.type === 'textarea' ? (
                      <textarea value={roleInputs[field.key] || ''}
                        onChange={e => setRoleInputs(prev => ({ ...prev, [field.key]: e.target.value }))}
                        placeholder={field.placeholder} rows={2} disabled={isReadOnly}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50 resize-none" />
                    ) : (
                      <input type="text"
                        inputMode={['number', 'currency', 'percentage'].includes(field.type) ? 'decimal' : 'text'}
                        value={roleInputs[field.key] || ''}
                        onChange={e => setRoleInputs(prev => ({ ...prev, [field.key]: e.target.value }))}
                        placeholder={field.placeholder} disabled={isReadOnly}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50" />
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* 2C: Summary */}
          <h3 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">Tóm tắt & Ghi nhận</h3>
          <div className="space-y-3">
            <div>
              <label className="text-[12px] font-medium text-slate-600 mb-1 block">Tóm tắt công việc hôm nay</label>
              <textarea value={report.summary} onChange={e => setReport(prev => prev ? { ...prev, summary: e.target.value } : prev)}
                placeholder="Hôm nay tôi đã hoàn thành..." rows={3} disabled={isReadOnly}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50 resize-none" />
            </div>
            <div>
              <label className="text-[12px] font-medium text-slate-600 mb-1 block">Khó khăn gặp phải</label>
              <textarea value={report.challenges} onChange={e => setReport(prev => prev ? { ...prev, challenges: e.target.value } : prev)}
                placeholder="Vấn đề cần hỗ trợ..." rows={2} disabled={isReadOnly}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50 resize-none" />
            </div>
            <div>
              <label className="text-[12px] font-medium text-slate-600 mb-1 block">Kế hoạch ngày mai</label>
              <textarea value={report.tomorrow_plan} onChange={e => setReport(prev => prev ? { ...prev, tomorrow_plan: e.target.value } : prev)}
                placeholder="Ngày mai sẽ tập trung..." rows={2} disabled={isReadOnly}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50 resize-none" />
            </div>
            {/* Report-level evidence */}
            <div>
              <label className="text-[12px] font-medium text-slate-600 mb-1 block">Đính kèm chung (hóa đơn, biên lai, ảnh,...)</label>
              <EvidenceUploader dailyReportId={report.id} uploadedBy={selectedEmpId} disabled={isReadOnly} />
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      {!isReadOnly && (
        <div className="flex gap-3 sticky bottom-4">
          <button onClick={autoSave} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 rounded-xl px-4 py-3 text-sm font-medium hover:bg-slate-50 disabled:opacity-50">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Lưu nháp
          </button>
          <button onClick={handleSubmit} disabled={submitting}
            className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white rounded-xl px-4 py-3 text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 shadow-sm">
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Gửi báo cáo
          </button>
        </div>
      )}
      {isReadOnly && (
        <div className={`rounded-xl p-4 text-center text-sm font-medium ${statusCfg.bg} ${statusCfg.text}`}>
          {report.status === 'submitted' ? 'Báo cáo đã gửi, đang chờ duyệt.' :
           report.status === 'approved' ? 'Báo cáo đã được duyệt.' : 'Báo cáo bị từ chối.'}
        </div>
      )}
    </div>
  );
}
