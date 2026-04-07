"use client";

import { useState, useEffect, useMemo } from 'react';
import {
  CheckCircle2, Circle, Clock, Send, ChevronRight, Trophy, Target, TrendingUp,
  Loader2, AlertTriangle, Flame, ArrowRight,
} from 'lucide-react';
import { getEmployees, getTasks, updateTaskStatus, createDailyReport, getDailyReportByDate, upsertTaskSubmission, getTaskSubmissions, submitDailyReport, getMasterPlans } from '@/lib/supabase-data';
import { getSelectedEmpId, setSelectedEmpId as persistEmpId } from '@/lib/employee-context';

function fmt(n: number) { return new Intl.NumberFormat('vi-VN').format(n); }
function fmtVND(v: number) { if (v >= 1e9) return `${(v / 1e9).toFixed(1)} tỷ`; if (v >= 1e6) return `${(v / 1e6).toFixed(0)}M`; return fmt(v); }

// Determine current week number in month (1-5)
function getWeekOfMonth(date: Date): number {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  return Math.ceil((date.getDate() + firstDay.getDay()) / 7);
}

interface Task {
  id: string; title: string; status: string; priority: string; points: number;
  kpi_metric: string | null; kpi_target: string | null; kpi_unit: string | null;
  category: string | null; channel: string | null;
  month_number: number; week_number: number;
  actual_value: string | null;
}

interface Submission {
  task_id: string;
  actual_value: string;
  actual_numeric: number | null;
}

export default function EmployeeTodayDashboard() {
  const [employee, setEmployee] = useState<{ id: number; name: string; role: string; department: string } | null>(null);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [allEmployees, setAllEmployees] = useState<Array<{ id: number; name: string; role: string; department: string }>>([]);
  const [selectedEmpId, setSelectedEmpIdState] = useState(getSelectedEmpId());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [reportId, setReportId] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Record<string, { value: string; done: boolean }>>({});
  const [existingSubmissions, setExistingSubmissions] = useState<Submission[]>([]);
  const [companyTarget, setCompanyTarget] = useState(20_000_000_000);

  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentWeek = getWeekOfMonth(today);
  const dateStr = today.toISOString().split('T')[0];
  const dateLabel = today.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [emps, tasks, plans] = await Promise.all([
          getEmployees(),
          getTasks({ assignee_id: selectedEmpId }),
          getMasterPlans({ role: 'ceo', year: 2026 }),
        ]);
        setAllEmployees(emps);
        setEmployee(emps.find((e: { id: number }) => e.id === selectedEmpId) || null);
        setAllTasks(tasks);

        // Revenue target
        const revPlan = plans.find((p: { title: string }) => p.title?.includes('Doanh thu'));
        if (revPlan?.target_value) setCompanyTarget(Number(revPlan.target_value));

        // Check existing daily report
        try {
          const existingReport = await getDailyReportByDate(selectedEmpId, dateStr);
          if (existingReport) {
            setReportId(existingReport.id);
            if (existingReport.status === 'submitted' || existingReport.status === 'approved') {
              setSubmitted(true);
            }
            // Load existing submissions
            const subs = await getTaskSubmissions(existingReport.id);
            setExistingSubmissions(subs);
            const subMap: Record<string, { value: string; done: boolean }> = {};
            subs.forEach((s: Submission) => {
              subMap[s.task_id] = { value: s.actual_value || '', done: true };
            });
            setSubmissions(subMap);
          }
        } catch { /* no report yet */ }
      } catch (e) { console.error(e); }
      setLoading(false);
    }
    load();
  }, [selectedEmpId]);

  // Today's tasks: current month + current week
  const todayTasks = useMemo(() => {
    return allTasks.filter(t =>
      t.month_number === currentMonth && t.week_number === currentWeek
    ).sort((a, b) => {
      // Sort: not done first, then by priority, then by category
      const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
      const aIsDone = submissions[a.id]?.done || a.status === 'done';
      const bIsDone = submissions[b.id]?.done || b.status === 'done';
      if (aIsDone !== bIsDone) return aIsDone ? 1 : -1;
      return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
    });
  }, [allTasks, currentMonth, currentWeek, submissions]);

  // Monthly progress
  const monthTasks = useMemo(() => allTasks.filter(t => t.month_number === currentMonth), [allTasks, currentMonth]);
  const monthDone = monthTasks.filter(t => t.status === 'done').length;
  const monthTotal = monthTasks.length;
  const monthPct = monthTotal > 0 ? Math.round((monthDone / monthTotal) * 100) : 0;

  // Weekly progress
  const weekDone = todayTasks.filter(t => t.status === 'done' || submissions[t.id]?.done).length;
  const weekTotal = todayTasks.length;
  const weekPct = weekTotal > 0 ? Math.round((weekDone / weekTotal) * 100) : 0;

  // Points earned today
  const todayPoints = todayTasks.reduce((s, t) => {
    if (submissions[t.id]?.done || t.status === 'done') return s + (t.points || 0);
    return s;
  }, 0);
  const todayMaxPoints = todayTasks.reduce((s, t) => s + (t.points || 0), 0);

  // Toggle task completion
  const toggleTask = (taskId: string) => {
    if (submitted) return;
    setSubmissions(prev => {
      const current = prev[taskId];
      if (current?.done) {
        const next = { ...prev };
        delete next[taskId];
        return next;
      }
      return { ...prev, [taskId]: { value: current?.value || '1', done: true } };
    });
  };

  // Update actual value
  const setActualValue = (taskId: string, value: string) => {
    if (submitted) return;
    setSubmissions(prev => ({
      ...prev,
      [taskId]: { value, done: prev[taskId]?.done || false },
    }));
  };

  // Submit daily report
  const handleSubmit = async () => {
    if (!employee || submitting) return;
    setSubmitting(true);
    try {
      // Create daily report if not exists
      let rId = reportId;
      if (!rId) {
        const report = await createDailyReport({
          employee_id: employee.id,
          report_date: dateStr,
          department: employee.department,
        });
        rId = report.id;
        setReportId(rId);
      }

      // Save task submissions
      if (!rId) throw new Error('Failed to create daily report');
      const completedTasks = todayTasks.filter(t => submissions[t.id]?.done);
      for (const task of completedTasks) {
        await upsertTaskSubmission({
          daily_report_id: rId,
          task_id: task.id,
          actual_value: submissions[task.id]?.value || '1',
          actual_numeric: parseFloat(submissions[task.id]?.value || '1') || 1,
        });
        // Also mark task as done
        if (task.status !== 'done') {
          await updateTaskStatus(task.id, 'done');
        }
      }

      // Submit the report
      await submitDailyReport(rId);
      setSubmitted(true);
    } catch (e) {
      console.error('Submit error:', e);
      alert('Có lỗi khi gửi báo cáo. Vui lòng thử lại.');
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        <p className="text-sm text-slate-500 mt-3">Đang tải việc hôm nay...</p>
      </div>
    );
  }

  if (!employee) return <div className="p-6 text-center text-slate-500">Không tìm thấy nhân viên</div>;

  const completedCount = todayTasks.filter(t => submissions[t.id]?.done || t.status === 'done').length;
  const allDone = completedCount === todayTasks.length && todayTasks.length > 0;

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      {/* Header — Greeting + Date */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {today.getHours() < 12 ? 'Chào buổi sáng' : today.getHours() < 18 ? 'Chào buổi chiều' : 'Chào buổi tối'}, {employee.name.split(' ').pop()}!
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">{employee.role} · {dateLabel}</p>
          </div>
          <select value={selectedEmpId} onChange={e => { const v = Number(e.target.value); setSelectedEmpIdState(v); persistEmpId(v); }}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5">
            {allEmployees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>
      </div>

      {/* Progress Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {/* Today */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${allDone ? 'bg-green-100' : 'bg-blue-100'}`}>
              {allDone ? <Trophy size={16} className="text-green-600" /> : <Target size={16} className="text-blue-600" />}
            </div>
            <span className="text-xs text-slate-500">Hôm nay</span>
          </div>
          <div className="text-2xl font-bold text-slate-800">{completedCount}/{weekTotal}</div>
          <div className="h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
            <div className={`h-full rounded-full transition-all ${allDone ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${weekPct}%` }} />
          </div>
          <div className="text-[10px] text-slate-400 mt-1">{todayPoints}/{todayMaxPoints} điểm</div>
        </div>

        {/* Month */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp size={16} className="text-purple-600" />
            </div>
            <span className="text-xs text-slate-500">Tháng {currentMonth}</span>
          </div>
          <div className="text-2xl font-bold text-slate-800">{monthPct}%</div>
          <div className="h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-purple-500 rounded-full" style={{ width: `${monthPct}%` }} />
          </div>
          <div className="text-[10px] text-slate-400 mt-1">{monthDone}/{monthTotal} tasks</div>
        </div>

        {/* Company target */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
              <Flame size={16} className="text-amber-600" />
            </div>
            <span className="text-xs text-slate-500">Mục tiêu năm</span>
          </div>
          <div className="text-lg font-bold text-slate-800">{fmtVND(companyTarget)}</div>
          <div className="text-[10px] text-slate-400 mt-1">Bạn đóng góp mỗi task!</div>
        </div>
      </div>

      {/* Main: Today's Tasks */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <Clock size={18} className="text-blue-600" />
              Việc cần làm hôm nay
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Tuần {currentWeek}, Tháng {currentMonth} — {weekTotal} việc</p>
          </div>
          {submitted && (
            <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-3 py-1.5 rounded-full">
              <CheckCircle2 size={14} /> Đã gửi báo cáo
            </span>
          )}
        </div>

        <div className="divide-y divide-slate-50">
          {todayTasks.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <Trophy size={40} className="mx-auto text-green-400 mb-3" />
              <p className="text-sm text-slate-500">Không có task nào trong tuần này!</p>
            </div>
          ) : (
            todayTasks.map((task, idx) => {
              const isDone = submissions[task.id]?.done || task.status === 'done';
              const priorityColors: Record<string, string> = {
                urgent: 'border-l-red-500',
                high: 'border-l-orange-400',
                medium: 'border-l-blue-400',
                low: 'border-l-slate-300',
              };
              const categoryIcons: Record<string, string> = {
                revenue: '💰', growth: '📈', efficiency: '⚡', quality: '✅',
              };

              return (
                <div key={task.id}
                  className={`px-5 py-3.5 flex items-center gap-3 border-l-4 transition-all ${priorityColors[task.priority] || 'border-l-slate-300'} ${isDone ? 'bg-green-50/50' : 'hover:bg-slate-50'}`}
                >
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleTask(task.id)}
                    disabled={submitted}
                    className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      isDone ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 hover:border-green-400'
                    } ${submitted ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    {isDone && <CheckCircle2 size={14} />}
                  </button>

                  {/* Task info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{categoryIcons[task.category || ''] || '📋'}</span>
                      <span className={`text-sm font-medium ${isDone ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                        {task.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      {task.channel && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">{task.channel}</span>
                      )}
                      {task.points > 0 && (
                        <span className="text-[10px] text-amber-600 font-medium">{task.points}đ</span>
                      )}
                      {task.kpi_target && (
                        <span className="text-[10px] text-slate-400">Target: {task.kpi_target} {task.kpi_unit || ''}</span>
                      )}
                    </div>
                  </div>

                  {/* Actual input (for KPI tasks) */}
                  {task.kpi_target && !submitted && (
                    <input
                      type="text"
                      value={submissions[task.id]?.value || ''}
                      onChange={e => setActualValue(task.id, e.target.value)}
                      placeholder="Thực tế"
                      className="w-16 text-xs border border-slate-200 rounded-lg px-2 py-1.5 text-center focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none"
                    />
                  )}

                  {/* Points badge */}
                  {isDone && task.points > 0 && (
                    <span className="text-xs font-bold text-green-600">+{task.points}</span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Submit bar */}
        {todayTasks.length > 0 && !submitted && (
          <div className="px-5 py-4 bg-slate-50 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-600">
                <span className="font-bold text-green-600">{completedCount}</span>/{weekTotal} việc đã xong ·
                <span className="font-bold text-amber-600 ml-1">{todayPoints}</span> điểm
              </div>
              <button
                onClick={handleSubmit}
                disabled={submitting || completedCount === 0}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${
                  completedCount > 0
                    ? 'bg-green-600 hover:bg-green-700 text-white shadow-sm'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                Gửi báo cáo hôm nay
              </button>
            </div>
          </div>
        )}

        {/* Submitted confirmation */}
        {submitted && (
          <div className="px-5 py-4 bg-green-50 border-t border-green-100 text-center">
            <p className="text-sm text-green-700 font-medium">Bạn đã gửi báo cáo ngày hôm nay. Nghỉ ngơi nhé! 🎉</p>
          </div>
        )}
      </div>

      {/* How your work connects to company goals */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-5 text-white">
        <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
          <ArrowRight size={16} className="text-blue-400" />
          Công việc của bạn kết nối thế nào với mục tiêu công ty
        </h3>
        <div className="flex items-center gap-2 text-xs">
          <Step label={`Bạn hoàn thành ${completedCount}/${weekTotal} tasks`} active />
          <ChevronRight size={14} className="text-slate-500 flex-shrink-0" />
          <Step label={`Tháng ${currentMonth}: ${monthPct}% tiến độ`} active={monthPct > 0} />
          <ChevronRight size={14} className="text-slate-500 flex-shrink-0" />
          <Step label={`Phòng ${employee.department}`} active={monthPct > 30} />
          <ChevronRight size={14} className="text-slate-500 flex-shrink-0" />
          <Step label={`Mục tiêu ${fmtVND(companyTarget)}`} active={monthPct > 50} />
        </div>
      </div>
    </div>
  );
}

function Step({ label, active }: { label: string; active: boolean }) {
  return (
    <div className={`px-3 py-1.5 rounded-lg text-[11px] flex-1 text-center ${active ? 'bg-blue-600/30 text-blue-200' : 'bg-white/5 text-slate-500'}`}>
      {label}
    </div>
  );
}
