"use client";

import { useState, useEffect, useMemo } from 'react';
import {
  CheckCircle2, Circle, Clock, Send, Trophy, Target, TrendingUp,
  Loader2, Flame, ArrowRight, ChevronRight, ChevronDown, ChevronUp,
  Briefcase, DollarSign, Calendar, CalendarDays, Star, FileText,
  AlertTriangle, Info, BarChart3, Zap, BookOpen, Lightbulb,
  ArrowUpRight, HelpCircle, Award, MessageSquare,
} from 'lucide-react';
import {
  getEmployees, getTasks, updateTaskStatus,
  createDailyReport, getDailyReportByDate, upsertTaskSubmission,
  getTaskSubmissions, submitDailyReport, updateDailyReport,
  getMasterPlans, getEmployeeCareer,
} from '@/lib/supabase-data';
import { getSelectedEmpId, setSelectedEmpId as persistEmpId } from '@/lib/employee-context';
import { getJobDescription, estimateBonus, COMPANY_TARGETS, DEPT_TARGETS } from '@/lib/jd-kpi-framework';

function fmt(n: number) { return new Intl.NumberFormat('vi-VN').format(n); }
function fmtVND(v: number) { if (v >= 1e9) return `${(v / 1e9).toFixed(1)} tỷ`; if (v >= 1e6) return `${(v / 1e6).toFixed(0)}M`; return fmt(v); }

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
  context_note: string | null;
  adjusted_target: number | null;
  target_rationale: string | null;
  week_cumulative: number | null;
  month_cumulative: number | null;
  description: string | null;
}

type TabKey = 'today' | 'week' | 'month' | 'jd' | 'bonus';

export default function EmployeeDashboard() {
  const [employee, setEmployee] = useState<{ id: number; name: string; role: string; department: string } | null>(null);
  const [salary, setSalary] = useState(0);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [allEmployees, setAllEmployees] = useState<Array<{ id: number; name: string; role: string; department: string }>>([]);
  const [selectedEmpId, setSelectedEmpIdState] = useState(getSelectedEmpId());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [reportId, setReportId] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Record<string, { value: string; done: boolean; notes: string }>>({});
  const [activeTab, setActiveTab] = useState<TabKey>('today');
  const [reportNotes, setReportNotes] = useState({ highlights: '', blockers: '', tomorrow: '' });
  const [collapsedTasks, setCollapsedTasks] = useState<Set<string>>(new Set());

  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentWeek = getWeekOfMonth(today);
  const dateStr = today.toISOString().split('T')[0];
  const dateLabel = today.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [emps, tasks] = await Promise.all([
          getEmployees(),
          getTasks({ assignee_id: selectedEmpId }),
        ]);
        setAllEmployees(emps);
        const emp = emps.find((e: { id: number }) => e.id === selectedEmpId);
        setEmployee(emp || null);
        setAllTasks(tasks);

        try {
          const career = await getEmployeeCareer(selectedEmpId);
          if (career) setSalary(career.current_salary || 0);
        } catch { /* */ }

        try {
          const existingReport = await getDailyReportByDate(selectedEmpId, dateStr);
          if (existingReport) {
            setReportId(existingReport.id);
            if (existingReport.status === 'submitted' || existingReport.status === 'approved') setSubmitted(true);
            if (existingReport.highlights) setReportNotes(p => ({ ...p, highlights: existingReport.highlights }));
            if (existingReport.blockers) setReportNotes(p => ({ ...p, blockers: existingReport.blockers }));
            const subs = await getTaskSubmissions(existingReport.id);
            const subMap: Record<string, { value: string; done: boolean; notes: string }> = {};
            subs.forEach((s: { task_id: string; actual_value: string; notes?: string }) => {
              subMap[s.task_id] = { value: s.actual_value || '', done: true, notes: s.notes || '' };
            });
            setSubmissions(subMap);
          }
        } catch { /* no report yet */ }
      } catch (e) { console.error(e); }
      setLoading(false);
    }
    load();
  }, [selectedEmpId]);

  // Task filters
  const todayTasks = useMemo(() => allTasks.filter(t => t.month_number === currentMonth && t.week_number === currentWeek)
    .sort((a, b) => {
      const prio: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
      const aDone = submissions[a.id]?.done || a.status === 'done';
      const bDone = submissions[b.id]?.done || b.status === 'done';
      if (aDone !== bDone) return aDone ? 1 : -1;
      return (prio[a.priority] || 2) - (prio[b.priority] || 2);
    }), [allTasks, currentMonth, currentWeek, submissions]);

  const weekTasks = useMemo(() => {
    return allTasks.filter(t => t.month_number === currentMonth && t.week_number === currentWeek)
      .sort((a, b) => a.week_number - b.week_number || a.title.localeCompare(b.title));
  }, [allTasks, currentMonth, currentWeek]);

  const monthTasks = useMemo(() => allTasks.filter(t => t.month_number === currentMonth)
    .sort((a, b) => a.week_number - b.week_number || a.title.localeCompare(b.title)), [allTasks, currentMonth]);

  // Stats
  const todayDone = todayTasks.filter(t => submissions[t.id]?.done || t.status === 'done').length;
  const monthDone = monthTasks.filter(t => t.status === 'done').length;
  const monthPct = monthTasks.length > 0 ? Math.round((monthDone / monthTasks.length) * 100) : 0;
  const todayPoints = todayTasks.reduce((s, t) => (submissions[t.id]?.done || t.status === 'done') ? s + (t.points || 0) : s, 0);
  const todayMaxPoints = todayTasks.reduce((s, t) => s + (t.points || 0), 0);
  const monthPoints = monthTasks.reduce((s, t) => t.status === 'done' ? s + (t.points || 0) : s, 0);
  const monthMaxPoints = monthTasks.reduce((s, t) => s + (t.points || 0), 0);

  const kpiScore = monthMaxPoints > 0 ? Math.round(((monthPoints + todayPoints) / monthMaxPoints) * 100) : 0;
  const bonus = estimateBonus(salary, kpiScore);

  const jd = employee ? getJobDescription(employee.role, employee.department) : null;
  const deptTarget = employee ? DEPT_TARGETS[employee.department] : null;

  // Metric summary
  const metricSummary = useMemo(() => {
    const metrics: Record<string, { target: number; actual: number; unit: string }> = {};
    for (const task of todayTasks) {
      if (!task.kpi_metric) continue;
      const target = task.adjusted_target ?? (task.kpi_target ? parseFloat(String(task.kpi_target).replace(/[^0-9.]/g, '')) : 0);
      const actual = parseFloat(submissions[task.id]?.value || '0') || 0;
      if (metrics[task.kpi_metric]) {
        metrics[task.kpi_metric].target += target;
        metrics[task.kpi_metric].actual += actual;
      } else {
        metrics[task.kpi_metric] = { target, actual, unit: task.kpi_unit || '' };
      }
    }
    return metrics;
  }, [todayTasks, submissions]);

  // Missed tasks
  const missedTasks = useMemo(() => {
    return todayTasks.filter(t => {
      if (!submissions[t.id]?.done) return false;
      const target = t.adjusted_target ?? (t.kpi_target ? parseFloat(String(t.kpi_target).replace(/[^0-9.]/g, '')) : 0);
      if (!target) return false;
      const actual = parseFloat(submissions[t.id]?.value || '0') || 0;
      return actual < target * 0.8;
    });
  }, [todayTasks, submissions]);

  const hasMissedWithoutNotes = missedTasks.some(t => !submissions[t.id]?.notes?.trim());

  const toggleTask = (taskId: string) => {
    if (submitted) return;
    setSubmissions(prev => {
      const current = prev[taskId];
      if (current?.done) { const next = { ...prev }; delete next[taskId]; return next; }
      return { ...prev, [taskId]: { value: current?.value || '1', done: true, notes: current?.notes || '' } };
    });
  };

  const setActualValue = (taskId: string, value: string) => {
    if (submitted) return;
    setSubmissions(prev => ({ ...prev, [taskId]: { value, done: prev[taskId]?.done || false, notes: prev[taskId]?.notes || '' } }));
  };

  const setTaskNotes = (taskId: string, notes: string) => {
    if (submitted) return;
    setSubmissions(prev => ({ ...prev, [taskId]: { ...prev[taskId], notes, value: prev[taskId]?.value || '', done: prev[taskId]?.done || false } }));
  };

  const toggleCollapse = (taskId: string) => {
    setCollapsedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId); else next.add(taskId);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!employee || submitting) return;
    if (hasMissedWithoutNotes) {
      alert('Vui lòng ghi chú lý do cho các task chưa đạt target (dưới 80% mục tiêu).');
      return;
    }

    setSubmitting(true);
    try {
      let rId = reportId;
      if (!rId) {
        const report = await createDailyReport({ employee_id: employee.id, report_date: dateStr, department: employee.department });
        rId = report.id;
        setReportId(rId);
      }
      if (!rId) throw new Error('Failed to create report');

      const completedTasks = todayTasks.filter(t => submissions[t.id]?.done);
      for (const task of completedTasks) {
        await upsertTaskSubmission({
          daily_report_id: rId, task_id: task.id,
          actual_value: submissions[task.id]?.value || '1',
          actual_numeric: parseFloat(submissions[task.id]?.value || '1') || 1,
          notes: submissions[task.id]?.notes || undefined,
        });
        if (task.status !== 'done') await updateTaskStatus(task.id, 'done');
      }

      const structuredMetrics: Record<string, { target: number; actual: number; unit: string; pct: number }> = {};
      for (const [metric, info] of Object.entries(metricSummary)) {
        structuredMetrics[metric] = {
          target: info.target, actual: info.actual, unit: info.unit,
          pct: info.target > 0 ? Math.round((info.actual / info.target) * 100) : 0,
        };
      }

      const totalPcts = Object.values(structuredMetrics).map(m => m.pct);
      const performanceScore = totalPcts.length > 0
        ? Math.round(totalPcts.reduce((a, b) => a + b, 0) / totalPcts.length)
        : Math.round((todayDone / Math.max(todayTasks.length, 1)) * 100);

      await updateDailyReport(rId, {
        structured_metrics: structuredMetrics,
        highlights: reportNotes.highlights || null,
        blockers: reportNotes.blockers || null,
        tomorrow_plan: reportNotes.tomorrow || null,
        performance_score: performanceScore,
      });

      await submitDailyReport(rId);
      setSubmitted(true);
    } catch (e) {
      console.error(e);
      alert('Có lỗi khi gửi báo cáo. Vui lòng thử lại.');
    }
    setSubmitting(false);
  };

  if (loading) return <div className="p-8 flex flex-col items-center justify-center min-h-[60vh]"><Loader2 className="w-10 h-10 animate-spin text-emerald-500" /><p className="text-base text-slate-500 mt-4">Đang tải dữ liệu...</p></div>;
  if (!employee) return <div className="p-8 text-center text-slate-500 text-lg">Không tìm thấy nhân viên</div>;

  const allDone = todayDone === todayTasks.length && todayTasks.length > 0;

  return (
    <div className="p-5 md:p-8 max-w-5xl mx-auto">
      {/* ═══════════ HEADER ═══════════ */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {today.getHours() < 12 ? 'Chào buổi sáng' : today.getHours() < 18 ? 'Chào buổi chiều' : 'Chào buổi tối'}, {employee.name.split(' ').pop()}!
          </h1>
          <p className="text-base text-slate-500 mt-1">{employee.role} · {employee.department} · {dateLabel}</p>
        </div>
        <select value={selectedEmpId} onChange={e => { const v = Number(e.target.value); setSelectedEmpIdState(v); persistEmpId(v); }}
          className="text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
          {allEmployees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </div>

      {/* ═══════════ STATS ═══════════ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Target} label="Hôm nay" value={`${todayDone}/${todayTasks.length}`} sub={`${todayPoints}/${todayMaxPoints} điểm`} color={allDone ? 'green' : 'blue'} />
        <StatCard icon={TrendingUp} label={`Tháng ${currentMonth}`} value={`${monthPct}%`} sub={`${monthDone}/${monthTasks.length} tasks`} color="purple" />
        <StatCard icon={Star} label="KPI Score" value={`${kpiScore}`} sub={bonus.tier} color={kpiScore >= 80 ? 'green' : kpiScore >= 50 ? 'amber' : 'red'} />
        <StatCard icon={DollarSign} label="Thưởng dự kiến" value={fmtVND(bonus.amount)} sub={`${(bonus.rate * 100).toFixed(0)}% lương`} color="emerald" />
      </div>

      {/* ═══════════ TABS ═══════════ */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6">
        {([
          { key: 'today' as TabKey, label: 'Hôm nay', icon: Clock, count: todayTasks.length },
          { key: 'week' as TabKey, label: `Tuần ${currentWeek}`, icon: Calendar, count: weekTasks.length },
          { key: 'month' as TabKey, label: `Tháng ${currentMonth}`, icon: CalendarDays, count: monthTasks.length },
          { key: 'jd' as TabKey, label: 'JD & KPI', icon: Briefcase },
          { key: 'bonus' as TabKey, label: 'Lương thưởng', icon: DollarSign },
        ]).map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-all ${
              activeTab === tab.key ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
            }`}>
            <tab.icon size={16} />
            <span>{tab.label}</span>
            {tab.count !== undefined && <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === tab.key ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'}`}>{tab.count}</span>}
          </button>
        ))}
      </div>

      {/* ═══════════ TAB: HÔM NAY ═══════════ */}
      {activeTab === 'today' && (
        <div className="space-y-5">
          {/* Hướng dẫn nhanh */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
                <Lightbulb size={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold text-blue-900 mb-1">Hướng dẫn làm việc hôm nay</h3>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal ml-4">
                  <li><strong>Đọc kỹ từng task</strong> — AI đã phân tích và đặt target dựa trên dữ liệu thực tế</li>
                  <li><strong>Thực hiện theo thứ tự ưu tiên</strong> — task khẩn cấp/cao ở trên cùng</li>
                  <li><strong>Tick hoàn thành + nhập số liệu</strong> — ghi lại kết quả thực tế đạt được</li>
                  <li><strong>Gửi báo cáo cuối ngày</strong> — KPI được tính tự động, ảnh hưởng trực tiếp đến thưởng</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Task List */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                  <Clock size={20} className="text-blue-600" /> Việc cần làm hôm nay
                </h2>
                <p className="text-sm text-slate-500 mt-1">Tuần {currentWeek}, Tháng {currentMonth} — {todayTasks.length} công việc · {todayMaxPoints} điểm tổng</p>
              </div>
              {submitted && (
                <span className="flex items-center gap-2 text-base font-semibold text-green-700 bg-green-50 px-4 py-2 rounded-xl">
                  <CheckCircle2 size={18} /> Đã gửi báo cáo
                </span>
              )}
            </div>

            <div className="divide-y divide-slate-100">
              {todayTasks.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <Trophy size={48} className="mx-auto text-green-400 mb-3" />
                  <p className="text-lg text-slate-600 font-medium">Không có task hôm nay!</p>
                  <p className="text-sm text-slate-400 mt-1">Kiểm tra tab Tuần hoặc Tháng để xem các task sắp tới</p>
                </div>
              ) : todayTasks.map((task, index) => (
                <DetailedTaskCard
                  key={task.id}
                  task={task}
                  index={index + 1}
                  submission={submissions[task.id]}
                  submitted={submitted}
                  collapsed={collapsedTasks.has(task.id)}
                  onToggle={() => toggleTask(task.id)}
                  onSetValue={(val) => setActualValue(task.id, val)}
                  onSetNotes={(notes) => setTaskNotes(task.id, notes)}
                  onCollapse={() => toggleCollapse(task.id)}
                />
              ))}
            </div>
          </div>

          {/* ===== KPI METRICS SUMMARY ===== */}
          {Object.keys(metricSummary).length > 0 && todayDone > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="font-bold text-slate-900 text-lg mb-4 flex items-center gap-2">
                <BarChart3 size={20} className="text-purple-600" /> Tổng hợp KPI hôm nay
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.entries(metricSummary).map(([metric, info]) => {
                  const pct = info.target > 0 ? Math.round((info.actual / info.target) * 100) : 0;
                  const isGood = pct >= 80;
                  const isBad = pct < 60;
                  return (
                    <div key={metric} className={`rounded-xl p-5 border-2 ${isGood ? 'bg-green-50 border-green-200' : isBad ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-base font-bold text-slate-800">{metric}</span>
                        <span className={`text-lg font-bold ${isGood ? 'text-green-700' : isBad ? 'text-red-700' : 'text-amber-700'}`}>{pct}%</span>
                      </div>
                      <div className="flex items-baseline gap-2 mb-3">
                        <span className="text-3xl font-bold text-slate-900">{fmt(info.actual)}</span>
                        <span className="text-base text-slate-500">/ {fmt(info.target)} {info.unit}</span>
                      </div>
                      <div className="h-3 bg-white/60 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${isGood ? 'bg-green-500' : isBad ? 'bg-red-500' : 'bg-amber-500'}`}
                          style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ===== MISSED TASKS WARNING ===== */}
          {missedTasks.length > 0 && !submitted && (
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <AlertTriangle size={22} className="text-red-600" />
                <span className="text-base font-bold text-red-800">
                  {missedTasks.length} task chưa đạt target — bắt buộc ghi chú lý do
                </span>
              </div>
              <p className="text-sm text-red-700">
                Các task có kết quả dưới 80% mục tiêu cần ghi chú lý do để AI Agent điều chỉnh kế hoạch ngày mai phù hợp hơn.
              </p>
            </div>
          )}

          {/* ===== REPORT FORM ===== */}
          {!submitted && todayDone > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="font-bold text-slate-900 text-lg mb-5 flex items-center gap-2">
                <FileText size={20} className="text-blue-600" /> Báo cáo cuối ngày
              </h3>
              <div className="space-y-5">
                <div>
                  <label className="text-base font-semibold text-slate-700 mb-2 block">Điểm nổi bật hôm nay</label>
                  <p className="text-sm text-slate-400 mb-2">Liệt kê những thành tích, kết quả tốt đạt được trong ngày</p>
                  <textarea value={reportNotes.highlights} onChange={e => setReportNotes(p => ({ ...p, highlights: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-base resize-none h-24 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none"
                    placeholder="VD: Chốt được 5 đơn lớn qua Website, ROAS FB đạt 3.2x, hoàn thành thiết kế BST mới..." />
                </div>
                <div>
                  <label className="text-base font-semibold text-slate-700 mb-2 block">Khó khăn / Cần hỗ trợ</label>
                  <p className="text-sm text-slate-400 mb-2">Ghi lại vấn đề gặp phải, cần quản lý hoặc team khác hỗ trợ gì</p>
                  <textarea value={reportNotes.blockers} onChange={e => setReportNotes(p => ({ ...p, blockers: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-base resize-none h-24 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none"
                    placeholder="VD: Hết size M áo Saigonese cần đặt thêm, KH lớn yêu cầu giảm giá cần xin duyệt..." />
                </div>
                <div>
                  <label className="text-base font-semibold text-slate-700 mb-2 block">Kế hoạch ngày mai</label>
                  <p className="text-sm text-slate-400 mb-2">Dự kiến công việc ưu tiên cho ngày tiếp theo</p>
                  <textarea value={reportNotes.tomorrow} onChange={e => setReportNotes(p => ({ ...p, tomorrow: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-base resize-none h-24 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none"
                    placeholder="VD: Follow-up 8 KH cũ từ tháng 3, chạy campaign IG mới cho BST Texture Studio..." />
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          {todayTasks.length > 0 && !submitted && (
            <div className="bg-white rounded-2xl border border-slate-200 px-6 py-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="text-base text-slate-600 space-x-3">
                  <span>Hoàn thành: <span className="font-bold text-green-700">{todayDone}</span>/{todayTasks.length} việc</span>
                  <span>·</span>
                  <span>Điểm: <span className="font-bold text-amber-700">{todayPoints}</span></span>
                  <span>·</span>
                  <span>KPI: <span className={`font-bold ${kpiScore >= 80 ? 'text-green-700' : kpiScore >= 50 ? 'text-amber-700' : 'text-red-700'}`}>{kpiScore}</span></span>
                </div>
                <button onClick={handleSubmit} disabled={submitting || todayDone === 0 || hasMissedWithoutNotes}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-base transition-all ${
                    todayDone > 0 && !hasMissedWithoutNotes ? 'bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}>
                  {submitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                  Gửi báo cáo ngày
                </button>
              </div>
              {hasMissedWithoutNotes && (
                <p className="text-sm text-red-600 mt-3 flex items-center gap-2">
                  <AlertTriangle size={16} /> Cần ghi chú lý do cho task chưa đạt target trước khi gửi
                </p>
              )}
            </div>
          )}

          {submitted && (
            <div className="bg-green-50 border-2 border-green-200 rounded-2xl px-6 py-5 text-center">
              <CheckCircle2 size={32} className="mx-auto text-green-600 mb-2" />
              <p className="text-lg text-green-700 font-bold">Đã gửi báo cáo hôm nay thành công!</p>
              <p className="text-sm text-green-600 mt-1">KPI và thưởng sẽ được cập nhật tự động</p>
            </div>
          )}

          {/* Cascade */}
          <CascadeVisual employeeDept={employee.department} todayDone={todayDone} todayTotal={todayTasks.length} monthPct={monthPct} />
        </div>
      )}

      {/* ═══════════ TAB: TUẦN ═══════════ */}
      {activeTab === 'week' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="font-bold text-slate-900 text-lg mb-4">Tuần {currentWeek} — Tháng {currentMonth}/2026</h3>
            <div className="grid grid-cols-4 gap-4 mb-4">
              <MiniStat label="Tổng tasks" value={weekTasks.length} />
              <MiniStat label="Đã xong" value={weekTasks.filter(t => t.status === 'done').length} color="green" />
              <MiniStat label="Chưa làm" value={weekTasks.filter(t => t.status === 'todo').length} color="amber" />
              <MiniStat label="Điểm" value={`${weekTasks.filter(t => t.status === 'done').reduce((s, t) => s + t.points, 0)}/${weekTasks.reduce((s, t) => s + t.points, 0)}`} />
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${weekTasks.length > 0 ? (weekTasks.filter(t => t.status === 'done').length / weekTasks.length) * 100 : 0}%` }} />
            </div>
          </div>

          {['revenue', 'growth', 'efficiency', 'quality'].map(cat => {
            const catTasks = weekTasks.filter(t => t.category === cat);
            if (catTasks.length === 0) return null;
            const catLabels: Record<string, { label: string; desc: string }> = {
              revenue: { label: '💰 Doanh thu', desc: 'Tasks trực tiếp tạo ra doanh thu cho công ty' },
              growth: { label: '📈 Tăng trưởng', desc: 'Tasks mở rộng thị trường, tăng khách hàng mới' },
              efficiency: { label: '⚡ Hiệu suất', desc: 'Tasks tối ưu quy trình, tiết kiệm chi phí' },
              quality: { label: '✅ Chất lượng', desc: 'Tasks nâng cao chất lượng sản phẩm/dịch vụ' },
            };
            const done = catTasks.filter(t => t.status === 'done').length;
            return (
              <div key={cat} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-bold text-slate-800">{catLabels[cat].label}</span>
                    <span className="text-sm text-slate-500">{done}/{catTasks.length} hoàn thành</span>
                  </div>
                  <p className="text-sm text-slate-400 mt-0.5">{catLabels[cat].desc}</p>
                </div>
                <div className="divide-y divide-slate-50">
                  {catTasks.map(t => (
                    <WeekTaskRow key={t.id} task={t} isDone={t.status === 'done'} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══════════ TAB: THÁNG ═══════════ */}
      {activeTab === 'month' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h3 className="font-bold text-slate-900 text-lg mb-4">Tháng {currentMonth}/2026 — Tổng quan</h3>
            <div className="grid grid-cols-4 gap-4 mb-4">
              <MiniStat label="Tổng tasks" value={monthTasks.length} />
              <MiniStat label="Đã xong" value={monthDone} color="green" />
              <MiniStat label="Điểm đạt" value={`${monthPoints}/${monthMaxPoints}`} />
              <MiniStat label="KPI" value={`${kpiScore}/100`} color={kpiScore >= 80 ? 'green' : kpiScore >= 50 ? 'amber' : 'red'} />
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${monthPct >= 80 ? 'bg-green-500' : monthPct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${monthPct}%` }} />
            </div>
          </div>

          {[1, 2, 3, 4, 5].map(w => {
            const wTasks = monthTasks.filter(t => t.week_number === w);
            if (wTasks.length === 0) return null;
            const wDone = wTasks.filter(t => t.status === 'done').length;
            const isCurrentWeekRow = w === currentWeek;
            return (
              <div key={w} className={`bg-white rounded-2xl border-2 ${isCurrentWeekRow ? 'border-blue-300 ring-2 ring-blue-100' : 'border-slate-200'} overflow-hidden shadow-sm`}>
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-base font-bold text-slate-800">
                    {isCurrentWeekRow && <span className="text-blue-600 mr-2">▶</span>}
                    Tuần {w}
                    {isCurrentWeekRow && <span className="ml-2 text-sm font-normal text-blue-600">(tuần hiện tại)</span>}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-500 font-medium">{wDone}/{wTasks.length} hoàn thành</span>
                    <div className="w-20 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${wTasks.length > 0 ? (wDone / wTasks.length) * 100 : 0}%` }} />
                    </div>
                  </div>
                </div>
                <div className="divide-y divide-slate-50">
                  {wTasks.map(t => <WeekTaskRow key={t.id} task={t} isDone={t.status === 'done'} />)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══════════ TAB: JD & KPI ═══════════ */}
      {activeTab === 'jd' && jd && (
        <div className="space-y-5">
          {/* Hướng dẫn KPI */}
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border-2 border-indigo-200 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0">
                <HelpCircle size={24} className="text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-indigo-900 mb-2">KPI là gì? Cách nghiệm thu?</h3>
                <div className="text-base text-indigo-800 space-y-2">
                  <p><strong>KPI (Key Performance Indicator)</strong> là chỉ số đo lường hiệu suất công việc của bạn. Mỗi task được giao đều có target (mục tiêu) cụ thể.</p>
                  <p><strong>Cách tính điểm KPI:</strong></p>
                  <ul className="list-disc ml-5 space-y-1">
                    <li>Mỗi task có số <strong>điểm (points)</strong> — hoàn thành task = nhận điểm</li>
                    <li><strong>KPI Score = Tổng điểm đạt / Tổng điểm tối đa × 100</strong></li>
                    <li>KPI ≥ 95 = Xuất sắc (thưởng 25% lương), ≥ 80 = Giỏi (15%), ≥ 65 = Khá (10%), ≥ 50 = Đạt (5%)</li>
                  </ul>
                  <p><strong>Nghiệm thu:</strong> Khi bạn nhập số liệu thực tế và gửi báo cáo, AI Agent sẽ so sánh với target → tính KPI tự động → Manager duyệt → Tính thưởng</p>
                </div>
              </div>
            </div>
          </div>

          {/* Job Description */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-5 text-white">
              <h3 className="font-bold text-lg">{jd.role}</h3>
              <p className="text-base text-slate-300 mt-1">{jd.department} · Teeworld</p>
            </div>
            <div className="p-6">
              <p className="text-base text-slate-700 mb-5 leading-relaxed">{jd.summary}</p>
              <h4 className="text-base font-bold text-slate-600 uppercase tracking-wider mb-3">Trách nhiệm chính</h4>
              <ul className="space-y-2 mb-6">
                {jd.responsibilities.map((r, i) => (
                  <li key={i} className="flex items-start gap-3 text-base text-slate-700">
                    <span className="text-blue-500 mt-0.5 text-lg">•</span> {r}
                  </li>
                ))}
              </ul>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-base text-amber-800"><strong>Chế độ thưởng:</strong> {jd.bonusRules}</p>
              </div>
            </div>
          </div>

          {/* KPI Cascade */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-6 py-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-lg">KPI Cascade: Công ty → Phòng ban → Bạn</h3>
              <p className="text-sm text-slate-500 mt-1">Mục tiêu của bạn được phân bổ từ mục tiêu chung của công ty</p>
            </div>
            <div className="p-6 space-y-5">
              <KPILevel level="Công ty" color="purple" items={[
                { label: 'Doanh thu năm', value: fmtVND(COMPANY_TARGETS.yearlyRevenue) },
                { label: 'Lợi nhuận', value: `${COMPANY_TARGETS.profitMargin}%` },
                { label: 'BST/năm', value: `${COMPANY_TARGETS.bstPerYear}` },
              ]} />

              {deptTarget && (
                <KPILevel level={`Phòng ${employee.department}`} color="blue" items={[
                  { label: 'Tỷ trọng DT', value: `${deptTarget.revenueShare}%` },
                  { label: 'Chỉ tiêu chính', value: deptTarget.keyMetric },
                  { label: 'Mục tiêu', value: deptTarget.keyTarget },
                ]} />
              )}

              {/* Individual KPIs */}
              <div className="border-2 border-green-200 rounded-2xl p-5 bg-green-50/50">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white text-base font-bold">3</div>
                  <span className="text-base font-bold text-green-800">KPI Cá nhân — {employee.name.split(' ').pop()}</span>
                </div>
                <div className="overflow-hidden rounded-xl border border-green-200">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-green-100/50">
                        <th className="text-left px-4 py-3 text-sm font-bold text-green-800">Chỉ tiêu</th>
                        <th className="text-center px-4 py-3 text-sm font-bold text-green-800">Mục tiêu</th>
                        <th className="text-center px-4 py-3 text-sm font-bold text-green-800">Trọng số</th>
                        <th className="text-center px-4 py-3 text-sm font-bold text-green-800">Loại</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jd.kpis.map((kpi, i) => {
                        const catIcons: Record<string, string> = { revenue: '💰', growth: '📈', efficiency: '⚡', quality: '✅' };
                        return (
                          <tr key={i} className="border-t border-green-100">
                            <td className="px-4 py-3 text-base font-medium text-slate-800">{kpi.name}</td>
                            <td className="px-4 py-3 text-center text-base text-slate-700">{kpi.target} {kpi.unit}</td>
                            <td className="px-4 py-3 text-center"><span className="bg-green-200 text-green-800 text-sm px-3 py-1 rounded-full font-semibold">{kpi.weight}%</span></td>
                            <td className="px-4 py-3 text-center text-lg">{catIcons[kpi.category]}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Daily connection */}
              <div className="bg-slate-50 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center text-white text-base font-bold">4</div>
                  <span className="text-base font-bold text-slate-700">Liên kết hàng ngày</span>
                </div>
                <p className="text-base text-slate-600 leading-relaxed">
                  Mỗi ngày bạn có khoảng <strong>{Math.round(monthTasks.length / 4.3)} tasks</strong>. Hoàn thành đầy đủ tasks = đạt KPI = nhận thưởng.
                  Hiện tại tháng {currentMonth}: <strong>{monthDone}/{monthTasks.length}</strong> tasks done = KPI <strong className={`${kpiScore >= 80 ? 'text-green-700' : kpiScore >= 50 ? 'text-amber-700' : 'text-red-700'}`}>{kpiScore}/100</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ TAB: LƯƠNG THƯỞNG ═══════════ */}
      {activeTab === 'bonus' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="bg-gradient-to-r from-emerald-700 to-teal-700 px-6 py-5 text-white">
              <h3 className="font-bold text-lg">Lương & Thưởng — Tháng {currentMonth}/2026</h3>
              <p className="text-base text-emerald-200 mt-1">Cập nhật real-time theo tiến độ công việc</p>
            </div>
            <div className="p-6 space-y-5">
              {/* Salary breakdown */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-2xl p-5 text-center border border-blue-200">
                  <p className="text-base text-blue-700 font-medium mb-1">Lương cơ bản</p>
                  <p className="text-2xl font-bold text-blue-900">{fmtVND(salary)}</p>
                </div>
                <div className={`rounded-2xl p-5 text-center border ${bonus.amount > 0 ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
                  <p className="text-base text-green-700 font-medium mb-1">Thưởng KPI dự kiến</p>
                  <p className={`text-2xl font-bold ${bonus.amount > 0 ? 'text-green-900' : 'text-slate-400'}`}>{fmtVND(bonus.amount)}</p>
                </div>
              </div>

              {/* Bonus tier table */}
              <div className="bg-slate-50 rounded-2xl p-5">
                <h4 className="text-base font-bold text-slate-700 mb-4">Bảng tính thưởng KPI</h4>
                <div className="space-y-2.5">
                  {[
                    { tier: 'Xuất sắc', min: 95, rate: 25, color: 'green', desc: 'Top performer, vượt mọi chỉ tiêu' },
                    { tier: 'Giỏi', min: 80, rate: 15, color: 'blue', desc: 'Hoàn thành tốt, đáng tin cậy' },
                    { tier: 'Khá', min: 65, rate: 10, color: 'cyan', desc: 'Trên trung bình, cần cải thiện thêm' },
                    { tier: 'Đạt', min: 50, rate: 5, color: 'amber', desc: 'Cơ bản đạt yêu cầu' },
                    { tier: 'Chưa đạt', min: 0, rate: 0, color: 'red', desc: 'Cần cải thiện nhiều' },
                  ].map(t => {
                    const isActive = bonus.tier === t.tier;
                    return (
                      <div key={t.tier} className={`flex items-center gap-4 px-4 py-3.5 rounded-xl ${isActive ? 'bg-white border-2 border-green-400 shadow-md' : 'bg-white/50'}`}>
                        {isActive ? <CheckCircle2 size={20} className="text-green-600 flex-shrink-0" /> : <Circle size={20} className="text-slate-300 flex-shrink-0" />}
                        <div className="flex-1">
                          <span className={`text-base ${isActive ? 'font-bold text-slate-900' : 'text-slate-600 font-medium'}`}>{t.tier}</span>
                          <p className="text-sm text-slate-400">{t.desc}</p>
                        </div>
                        <span className="text-sm text-slate-500 font-medium">KPI ≥ {t.min}</span>
                        <span className={`text-base font-bold ${isActive ? 'text-green-700' : 'text-slate-400'}`}>{t.rate}%</span>
                        <span className={`text-base font-bold min-w-[80px] text-right ${isActive ? 'text-green-700' : 'text-slate-300'}`}>{fmtVND(Math.round(salary * t.rate / 100))}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Progress to next tier */}
              {kpiScore < 95 && (
                <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <Flame size={22} className="text-amber-600" />
                    <span className="text-base font-bold text-amber-900">Cách tăng thưởng</span>
                  </div>
                  {(() => {
                    const nextTier = kpiScore < 50 ? { min: 50, tier: 'Đạt', rate: 5 } : kpiScore < 65 ? { min: 65, tier: 'Khá', rate: 10 } : kpiScore < 80 ? { min: 80, tier: 'Giỏi', rate: 15 } : { min: 95, tier: 'Xuất sắc', rate: 25 };
                    const tasksNeeded = monthMaxPoints > 0 ? Math.ceil((nextTier.min - kpiScore) * monthMaxPoints / 100 / 30) : 0;
                    return (
                      <p className="text-base text-amber-800 leading-relaxed">
                        KPI hiện tại: <strong className="text-lg">{kpiScore}</strong> điểm. Cần thêm <strong>{nextTier.min - kpiScore} điểm</strong> (khoảng {tasksNeeded} tasks nữa) để lên hạng <strong>{nextTier.tier}</strong> — thưởng {nextTier.rate}% lương = <strong className="text-green-700">{fmtVND(Math.round(salary * nextTier.rate / 100))}</strong>.
                      </p>
                    );
                  })()}
                </div>
              )}

              {/* Total */}
              <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-2xl p-6 text-white text-center">
                <p className="text-base text-slate-300 mb-2">Thu nhập ước tính tháng {currentMonth}</p>
                <p className="text-4xl font-bold mb-2">{fmtVND(salary + bonus.amount)}</p>
                <p className="text-base text-slate-400">= {fmtVND(salary)} lương + {fmtVND(bonus.amount)} thưởng KPI ({bonus.tier})</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════ SUB-COMPONENTS ═══════════════════

function StatCard({ icon: Icon, label, value, sub, color }: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string; value: string | number; sub: string; color: string }) {
  const colors: Record<string, string> = { blue: 'bg-blue-100 text-blue-600', green: 'bg-green-100 text-green-600', purple: 'bg-purple-100 text-purple-600', amber: 'bg-amber-100 text-amber-600', red: 'bg-red-100 text-red-600', emerald: 'bg-emerald-100 text-emerald-600' };
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center gap-2.5 mb-2">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${colors[color] || colors.blue}`}><Icon size={18} /></div>
        <span className="text-sm font-medium text-slate-500">{label}</span>
      </div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="text-sm text-slate-400 mt-0.5">{sub}</div>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string | number; color?: string }) {
  const c = color === 'green' ? 'text-green-700' : color === 'amber' ? 'text-amber-700' : color === 'red' ? 'text-red-700' : 'text-slate-900';
  return (
    <div className="text-center">
      <div className={`text-2xl font-bold ${c}`}>{value}</div>
      <div className="text-sm text-slate-400">{label}</div>
    </div>
  );
}

/** Detailed task card — expanded by default showing full AI context */
function DetailedTaskCard({ task, index, submission, submitted, collapsed, onToggle, onSetValue, onSetNotes, onCollapse }: {
  task: Task;
  index: number;
  submission?: { value: string; done: boolean; notes: string };
  submitted: boolean;
  collapsed: boolean;
  onToggle: () => void;
  onSetValue: (val: string) => void;
  onSetNotes: (notes: string) => void;
  onCollapse: () => void;
}) {
  const isDone = submission?.done || task.status === 'done';
  const catIcons: Record<string, string> = { revenue: '💰', growth: '📈', efficiency: '⚡', quality: '✅' };
  const catLabels: Record<string, string> = { revenue: 'Doanh thu', growth: 'Tăng trưởng', efficiency: 'Hiệu suất', quality: 'Chất lượng' };
  const prioColors: Record<string, string> = { urgent: 'border-l-red-500 bg-red-50/30', high: 'border-l-orange-400 bg-orange-50/20', medium: 'border-l-blue-400', low: 'border-l-slate-300' };
  const prioLabels: Record<string, { text: string; color: string }> = {
    urgent: { text: '🔴 Khẩn cấp', color: 'bg-red-100 text-red-800' },
    high: { text: '🟠 Ưu tiên cao', color: 'bg-orange-100 text-orange-800' },
    medium: { text: '🔵 Trung bình', color: 'bg-blue-100 text-blue-800' },
    low: { text: '⚪ Thấp', color: 'bg-slate-100 text-slate-600' },
  };

  const target = task.adjusted_target ?? (task.kpi_target ? parseFloat(String(task.kpi_target).replace(/[^0-9.]/g, '')) : 0);
  const actual = parseFloat(submission?.value || '0') || 0;
  const hasTarget = target > 0;
  const pct = hasTarget ? Math.round((actual / target) * 100) : 0;
  const isMissed = isDone && hasTarget && actual < target * 0.8;
  const hasDetail = !!(task.context_note || task.target_rationale || task.description);

  return (
    <div className={`border-l-4 ${prioColors[task.priority] || 'border-l-slate-300'} ${isDone ? 'bg-green-50/40' : ''}`}>
      {/* ── Header ── */}
      <div className="px-6 py-4">
        <div className="flex items-start gap-4">
          {/* Checkbox */}
          <button onClick={onToggle} disabled={submitted}
            className={`flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all mt-0.5 ${isDone ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 hover:border-green-400'} ${submitted ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
            {isDone && <CheckCircle2 size={16} />}
          </button>

          {/* Task content */}
          <div className="flex-1 min-w-0">
            {/* Title row */}
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-sm font-bold text-slate-400">#{index}</span>
              <span className="text-lg">{catIcons[task.category || ''] || '📋'}</span>
              <span className={`text-base font-semibold leading-snug ${isDone ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                {task.title}
              </span>
            </div>

            {/* Meta row */}
            <div className="flex items-center gap-3 flex-wrap mt-1">
              {task.priority && prioLabels[task.priority] && (
                <span className={`text-sm px-2.5 py-1 rounded-lg font-semibold ${prioLabels[task.priority].color}`}>
                  {prioLabels[task.priority].text}
                </span>
              )}
              {task.category && (
                <span className="text-sm text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{catLabels[task.category] || task.category}</span>
              )}
              {task.channel && <span className="text-sm px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-medium">{task.channel}</span>}
              {task.points > 0 && <span className="text-sm font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">{task.points} điểm</span>}
              {hasTarget && <span className="text-sm text-slate-500">Target: <strong>{fmt(target)}</strong> {task.kpi_unit || ''}</span>}
            </div>

            {/* ── Description (always visible) ── */}
            {task.description && !collapsed && (
              <p className="text-base text-slate-600 mt-3 leading-relaxed bg-slate-50 rounded-xl p-4 border border-slate-100">
                {task.description}
              </p>
            )}

            {/* ── AI Context & Rationale (always visible by default) ── */}
            {!collapsed && (
              <div className="mt-3 space-y-2.5">
                {task.context_note && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Info size={16} className="text-blue-600" />
                      <span className="text-sm font-bold text-blue-800">AI phân tích bối cảnh</span>
                    </div>
                    <p className="text-base text-blue-900 leading-relaxed">{task.context_note}</p>
                  </div>
                )}

                {task.target_rationale && (
                  <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Zap size={16} className="text-purple-600" />
                      <span className="text-sm font-bold text-purple-800">Lý do đặt target này</span>
                    </div>
                    <p className="text-base text-purple-900 leading-relaxed">{task.target_rationale}</p>
                  </div>
                )}

                {/* Cumulative progress */}
                {(task.week_cumulative != null || task.month_cumulative != null) && hasTarget && (
                  <div className="grid grid-cols-2 gap-3">
                    {task.week_cumulative != null && (
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                        <div className="flex justify-between text-sm mb-1.5">
                          <span className="text-slate-500 font-medium">Tuần này đã đạt</span>
                          <span className="font-bold text-slate-800">{fmt(task.week_cumulative)} {task.kpi_unit || ''}</span>
                        </div>
                        <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, target > 0 ? (task.week_cumulative / (target * 5)) * 100 : 0)}%` }} />
                        </div>
                      </div>
                    )}
                    {task.month_cumulative != null && (
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                        <div className="flex justify-between text-sm mb-1.5">
                          <span className="text-slate-500 font-medium">Tháng này đã đạt</span>
                          <span className="font-bold text-slate-800">{fmt(task.month_cumulative)} {task.kpi_unit || ''}</span>
                        </div>
                        <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.min(100, target > 0 ? (task.month_cumulative / (target * 22)) * 100 : 0)}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── Input area ── */}
            {hasTarget && !submitted && (
              <div className="mt-3 flex items-center gap-3 bg-slate-50 rounded-xl p-3 border border-slate-100">
                <span className="text-sm font-medium text-slate-600">Kết quả thực tế:</span>
                <input type="text" value={submission?.value || ''} onChange={e => onSetValue(e.target.value)}
                  placeholder={`Nhập số (target: ${fmt(target)})`}
                  className={`w-32 text-base border-2 rounded-xl px-4 py-2 text-center font-semibold outline-none transition-colors ${
                    isMissed ? 'border-red-300 bg-red-50 focus:border-red-500' : 'border-slate-200 bg-white focus:border-blue-500'
                  }`} />
                <span className="text-sm text-slate-400">/ {fmt(target)} {task.kpi_unit || ''}</span>
                {isDone && hasTarget && (
                  <span className={`text-sm font-bold px-3 py-1 rounded-lg ${pct >= 100 ? 'bg-green-100 text-green-700' : pct >= 80 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                    {pct}%
                  </span>
                )}
              </div>
            )}

            {/* Actual vs Target visual */}
            {isDone && hasTarget && (
              <div className={`rounded-xl px-4 py-3 mt-3 ${isMissed ? 'bg-red-50 border-2 border-red-200' : 'bg-green-50 border-2 border-green-200'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-base font-semibold text-slate-700">Kết quả</span>
                  <span className={`text-lg font-bold ${isMissed ? 'text-red-700' : 'text-green-700'}`}>{pct}% {pct >= 100 ? '🎉' : pct >= 80 ? '👍' : '⚠️'}</span>
                </div>
                <div className="h-3 bg-white/60 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${isMissed ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${Math.min(pct, 120)}%` }} />
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-slate-600">Thực tế: <strong>{fmt(actual)}</strong> {task.kpi_unit || ''}</span>
                  <span className="text-slate-600">Target: <strong>{fmt(target)}</strong> {task.kpi_unit || ''}</span>
                </div>
              </div>
            )}

            {/* Mandatory notes for missed */}
            {isMissed && !submitted && (
              <div className="mt-3">
                <label className="text-base font-semibold text-red-700 mb-2 block flex items-center gap-2">
                  <AlertTriangle size={16} /> Lý do chưa đạt target (bắt buộc ghi)
                </label>
                <textarea
                  value={submission?.notes || ''}
                  onChange={e => onSetNotes(e.target.value)}
                  className="w-full border-2 border-red-200 rounded-xl px-4 py-3 text-base resize-none h-20 focus:border-red-400 outline-none bg-red-50"
                  placeholder="Ghi rõ lý do: hết hàng, KH hẹn lại, thiếu nhân lực, v.v..."
                />
              </div>
            )}
          </div>

          {/* Right side: Done badge + collapse */}
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            {isDone && task.points > 0 && (
              <span className="text-base font-bold text-green-600 bg-green-100 px-3 py-1 rounded-lg">+{task.points}đ</span>
            )}
            {hasDetail && (
              <button onClick={onCollapse} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100" title={collapsed ? 'Mở rộng' : 'Thu gọn'}>
                {collapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function WeekTaskRow({ task, isDone }: { task: Task; isDone: boolean }) {
  const catIcons: Record<string, string> = { revenue: '💰', growth: '📈', efficiency: '⚡', quality: '✅' };
  const target = task.adjusted_target ?? (task.kpi_target ? parseFloat(String(task.kpi_target).replace(/[^0-9.]/g, '')) : 0);

  return (
    <div className={`px-5 py-4 flex items-start gap-3 ${isDone ? 'bg-green-50/30' : ''}`}>
      <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${isDone ? 'bg-green-500 border-green-500' : 'border-slate-300'}`}>
        {isDone && <CheckCircle2 size={14} className="text-white" />}
      </span>
      <span className="text-base">{catIcons[task.category || ''] || '📋'}</span>
      <div className="flex-1 min-w-0">
        <span className={`text-base font-medium ${isDone ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{task.title}</span>
        {task.context_note && (
          <p className="text-sm text-slate-400 mt-1 line-clamp-2">{task.context_note}</p>
        )}
        {task.description && (
          <p className="text-sm text-slate-500 mt-1 line-clamp-2">{task.description}</p>
        )}
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        {task.channel && <span className="text-sm px-2 py-1 rounded-lg bg-blue-50 text-blue-700 font-medium">{task.channel}</span>}
        {target > 0 && <span className="text-sm text-slate-500">{fmt(target)} {task.kpi_unit || ''}</span>}
        <span className="text-sm font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">{task.points}đ</span>
      </div>
    </div>
  );
}

function KPILevel({ level, color, items }: { level: string; color: string; items: { label: string; value: string }[] }) {
  const colors: Record<string, string> = { purple: 'border-purple-200 bg-purple-50/50', blue: 'border-blue-200 bg-blue-50/50', green: 'border-green-200 bg-green-50/50' };
  const dotColors: Record<string, string> = { purple: 'bg-purple-600', blue: 'bg-blue-600', green: 'bg-green-600' };
  const numColors: Record<string, string> = { purple: '1', blue: '2', green: '3' };
  return (
    <div className={`border-2 rounded-2xl p-5 ${colors[color]}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-8 h-8 ${dotColors[color]} rounded-full flex items-center justify-center text-white text-base font-bold`}>{numColors[color]}</div>
        <span className={`text-base font-bold text-${color}-800`}>{level}</span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {items.map((item, i) => (
          <div key={i} className="text-center bg-white/50 rounded-xl p-3">
            <div className="text-sm text-slate-500">{item.label}</div>
            <div className="text-base font-bold text-slate-900 mt-1">{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CascadeVisual({ employeeDept, todayDone, todayTotal, monthPct }: { employeeDept: string; todayDone: number; todayTotal: number; monthPct: number }) {
  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white">
      <h3 className="font-bold text-base mb-4 flex items-center gap-2">
        <ArrowRight size={18} className="text-blue-400" /> Chuỗi giá trị: Công việc hàng ngày → Mục tiêu công ty
      </h3>
      <div className="flex items-center gap-3">
        <Step label={`${todayDone}/${todayTotal} tasks hôm nay`} active />
        <ChevronRight size={16} className="text-slate-500" />
        <Step label={`Tháng: ${monthPct}% hoàn thành`} active={monthPct > 0} />
        <ChevronRight size={16} className="text-slate-500" />
        <Step label={`Phòng ${employeeDept}`} active={monthPct > 30} />
        <ChevronRight size={16} className="text-slate-500" />
        <Step label={`Teeworld: ${fmtVND(COMPANY_TARGETS.yearlyRevenue)}/năm`} active={monthPct > 50} />
      </div>
    </div>
  );
}

function Step({ label, active }: { label: string; active: boolean }) {
  return <div className={`px-4 py-2 rounded-xl text-sm flex-1 text-center font-medium ${active ? 'bg-blue-600/30 text-blue-200' : 'bg-white/5 text-slate-500'}`}>{label}</div>;
}
