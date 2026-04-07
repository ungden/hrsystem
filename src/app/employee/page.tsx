"use client";

import { useState, useEffect, useMemo } from 'react';
import {
  CheckCircle2, Circle, Clock, Send, Trophy, Target, TrendingUp,
  Loader2, Flame, ArrowRight, ChevronRight, Briefcase, DollarSign,
  Calendar, CalendarDays, Star, FileText, AlertTriangle,
} from 'lucide-react';
import {
  getEmployees, getTasks, updateTaskStatus,
  createDailyReport, getDailyReportByDate, upsertTaskSubmission,
  getTaskSubmissions, submitDailyReport, getMasterPlans, getEmployeeCareer,
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
  const [submissions, setSubmissions] = useState<Record<string, { value: string; done: boolean }>>({});
  const [activeTab, setActiveTab] = useState<TabKey>('today');
  const [reportNotes, setReportNotes] = useState({ summary: '', challenges: '', tomorrow: '' });

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

        // Get salary
        try {
          const career = await getEmployeeCareer(selectedEmpId);
          if (career) setSalary(career.current_salary || 0);
        } catch { /* */ }

        // Check existing daily report
        try {
          const existingReport = await getDailyReportByDate(selectedEmpId, dateStr);
          if (existingReport) {
            setReportId(existingReport.id);
            if (existingReport.status === 'submitted' || existingReport.status === 'approved') setSubmitted(true);
            const subs = await getTaskSubmissions(existingReport.id);
            const subMap: Record<string, { value: string; done: boolean }> = {};
            subs.forEach((s: { task_id: string; actual_value: string }) => {
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
    const weeks = [currentWeek];
    return allTasks.filter(t => t.month_number === currentMonth && weeks.includes(t.week_number))
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

  // KPI score estimate (based on completion %)
  const kpiScore = monthMaxPoints > 0 ? Math.round(((monthPoints + todayPoints) / monthMaxPoints) * 100) : 0;
  const bonus = estimateBonus(salary, kpiScore);

  // JD
  const jd = employee ? getJobDescription(employee.role, employee.department) : null;
  const deptTarget = employee ? DEPT_TARGETS[employee.department] : null;

  const toggleTask = (taskId: string) => {
    if (submitted) return;
    setSubmissions(prev => {
      const current = prev[taskId];
      if (current?.done) { const next = { ...prev }; delete next[taskId]; return next; }
      return { ...prev, [taskId]: { value: current?.value || '1', done: true } };
    });
  };

  const setActualValue = (taskId: string, value: string) => {
    if (submitted) return;
    setSubmissions(prev => ({ ...prev, [taskId]: { value, done: prev[taskId]?.done || false } }));
  };

  const handleSubmit = async () => {
    if (!employee || submitting) return;
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
        });
        if (task.status !== 'done') await updateTaskStatus(task.id, 'done');
      }
      await submitDailyReport(rId);
      setSubmitted(true);
    } catch (e) {
      console.error(e);
      alert('Có lỗi khi gửi báo cáo. Vui lòng thử lại.');
    }
    setSubmitting(false);
  };

  if (loading) return <div className="p-6 flex flex-col items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /><p className="text-sm text-slate-500 mt-3">Đang tải...</p></div>;
  if (!employee) return <div className="p-6 text-center text-slate-500">Không tìm thấy nhân viên</div>;

  const allDone = todayDone === todayTasks.length && todayTasks.length > 0;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            {today.getHours() < 12 ? 'Chào buổi sáng' : today.getHours() < 18 ? 'Chào buổi chiều' : 'Chào buổi tối'}, {employee.name.split(' ').pop()}!
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">{employee.role} · {dateLabel}</p>
        </div>
        <select value={selectedEmpId} onChange={e => { const v = Number(e.target.value); setSelectedEmpIdState(v); persistEmpId(v); }}
          className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5">
          {allEmployees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <StatCard icon={Target} label="Hôm nay" value={`${todayDone}/${todayTasks.length}`} sub={`${todayPoints}/${todayMaxPoints}đ`} color={allDone ? 'green' : 'blue'} />
        <StatCard icon={TrendingUp} label={`Tháng ${currentMonth}`} value={`${monthPct}%`} sub={`${monthDone}/${monthTasks.length}`} color="purple" />
        <StatCard icon={Star} label="KPI Score" value={`${kpiScore}`} sub={bonus.tier} color={kpiScore >= 80 ? 'green' : kpiScore >= 50 ? 'amber' : 'red'} />
        <StatCard icon={DollarSign} label="Thưởng dự kiến" value={fmtVND(bonus.amount)} sub={`${(bonus.rate * 100).toFixed(0)}% lương`} color="emerald" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-5">
        {([
          { key: 'today' as TabKey, label: 'Hôm nay', icon: Clock, count: todayTasks.length },
          { key: 'week' as TabKey, label: `Tuần ${currentWeek}`, icon: Calendar, count: weekTasks.length },
          { key: 'month' as TabKey, label: `Tháng ${currentMonth}`, icon: CalendarDays, count: monthTasks.length },
          { key: 'jd' as TabKey, label: 'JD & KPI', icon: Briefcase },
          { key: 'bonus' as TabKey, label: 'Lương thưởng', icon: DollarSign },
        ]).map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === tab.key ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'
            }`}>
            <tab.icon size={14} />
            <span className="hidden sm:inline">{tab.label}</span>
            {tab.count !== undefined && <span className="text-[10px] bg-slate-200 px-1.5 rounded-full">{tab.count}</span>}
          </button>
        ))}
      </div>

      {/* ===================== TAB: HÔM NAY ===================== */}
      {activeTab === 'today' && (
        <div className="space-y-4">
          <TaskList
            tasks={todayTasks} submissions={submissions} submitted={submitted}
            onToggle={toggleTask} onSetValue={setActualValue}
            title="Việc cần làm hôm nay" subtitle={`Tuần ${currentWeek}, Tháng ${currentMonth}`}
          />

          {/* Report Form */}
          {!submitted && todayDone > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
                <FileText size={16} className="text-blue-600" /> Ghi chú báo cáo (tùy chọn)
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Tóm tắt công việc hôm nay</label>
                  <textarea value={reportNotes.summary} onChange={e => setReportNotes(p => ({ ...p, summary: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none h-16 focus:border-blue-400 outline-none"
                    placeholder="VD: Đã xử lý 30 đơn hàng, chạy ads FB mới..." />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Khó khăn / Cần hỗ trợ</label>
                  <textarea value={reportNotes.challenges} onChange={e => setReportNotes(p => ({ ...p, challenges: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none h-16 focus:border-blue-400 outline-none"
                    placeholder="VD: Hết size M áo Saigonese, cần đặt thêm..." />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Kế hoạch ngày mai</label>
                  <textarea value={reportNotes.tomorrow} onChange={e => setReportNotes(p => ({ ...p, tomorrow: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none h-16 focus:border-blue-400 outline-none"
                    placeholder="VD: Tiếp tục xử lý đơn, chạy campaign Quote mới..." />
                </div>
              </div>
            </div>
          )}

          {/* Submit */}
          {todayTasks.length > 0 && !submitted && (
            <div className="bg-white rounded-xl border border-slate-200 px-5 py-4 flex items-center justify-between">
              <div className="text-sm text-slate-600">
                <span className="font-bold text-green-600">{todayDone}</span>/{todayTasks.length} việc ·
                <span className="font-bold text-amber-600 ml-1">{todayPoints}</span>đ ·
                KPI: <span className={`font-bold ${kpiScore >= 80 ? 'text-green-600' : kpiScore >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{kpiScore}</span> ·
                Thưởng: <span className="font-bold text-emerald-600">{fmtVND(bonus.amount)}</span>
              </div>
              <button onClick={handleSubmit} disabled={submitting || todayDone === 0}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${
                  todayDone > 0 ? 'bg-green-600 hover:bg-green-700 text-white shadow-sm' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}>
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                Gửi báo cáo
              </button>
            </div>
          )}
          {submitted && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 text-center">
              <p className="text-sm text-green-700 font-medium">Đã gửi báo cáo hôm nay. Nghỉ ngơi nhé! 🎉</p>
            </div>
          )}

          {/* Cascade */}
          <CascadeVisual employeeDept={employee.department} todayDone={todayDone} todayTotal={todayTasks.length} monthPct={monthPct} />
        </div>
      )}

      {/* ===================== TAB: TUẦN ===================== */}
      {activeTab === 'week' && (
        <div className="space-y-4">
          {/* Week overview */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-bold text-slate-800 mb-3">Tuần {currentWeek} — Tháng {currentMonth}/2026</h3>
            <div className="grid grid-cols-4 gap-3 mb-4">
              <MiniStat label="Tổng tasks" value={weekTasks.length} />
              <MiniStat label="Đã xong" value={weekTasks.filter(t => t.status === 'done').length} color="green" />
              <MiniStat label="Chưa làm" value={weekTasks.filter(t => t.status === 'todo').length} color="amber" />
              <MiniStat label="Điểm" value={`${weekTasks.filter(t => t.status === 'done').reduce((s, t) => s + t.points, 0)}/${weekTasks.reduce((s, t) => s + t.points, 0)}`} />
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${weekTasks.length > 0 ? (weekTasks.filter(t => t.status === 'done').length / weekTasks.length) * 100 : 0}%` }} />
            </div>
          </div>

          {/* Group by category */}
          {['revenue', 'growth', 'efficiency', 'quality'].map(cat => {
            const catTasks = weekTasks.filter(t => t.category === cat);
            if (catTasks.length === 0) return null;
            const catLabels: Record<string, string> = { revenue: '💰 Doanh thu', growth: '📈 Tăng trưởng', efficiency: '⚡ Hiệu suất', quality: '✅ Chất lượng' };
            const done = catTasks.filter(t => t.status === 'done').length;
            return (
              <div key={cat} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700">{catLabels[cat]}</span>
                  <span className="text-xs text-slate-400">{done}/{catTasks.length} xong</span>
                </div>
                <div className="divide-y divide-slate-50">
                  {catTasks.map(t => (
                    <TaskRow key={t.id} task={t} isDone={t.status === 'done'} compact />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===================== TAB: THÁNG ===================== */}
      {activeTab === 'month' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-bold text-slate-800 mb-3">Tháng {currentMonth}/2026 — Tổng quan</h3>
            <div className="grid grid-cols-4 gap-3 mb-4">
              <MiniStat label="Tổng tasks" value={monthTasks.length} />
              <MiniStat label="Đã xong" value={monthDone} color="green" />
              <MiniStat label="Điểm đạt" value={`${monthPoints}/${monthMaxPoints}`} />
              <MiniStat label="KPI" value={`${kpiScore}/100`} color={kpiScore >= 80 ? 'green' : kpiScore >= 50 ? 'amber' : 'red'} />
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${monthPct >= 80 ? 'bg-green-500' : monthPct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${monthPct}%` }} />
            </div>
          </div>

          {/* By week */}
          {[1, 2, 3, 4, 5].map(w => {
            const wTasks = monthTasks.filter(t => t.week_number === w);
            if (wTasks.length === 0) return null;
            const wDone = wTasks.filter(t => t.status === 'done').length;
            const isCurrentWeek = w === currentWeek;
            return (
              <div key={w} className={`bg-white rounded-xl border ${isCurrentWeek ? 'border-blue-300 ring-1 ring-blue-100' : 'border-slate-200'} overflow-hidden`}>
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700">
                    {isCurrentWeek && <span className="text-blue-600 mr-1">→</span>}
                    Tuần {w}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">{wDone}/{wTasks.length} xong</span>
                    <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${wTasks.length > 0 ? (wDone / wTasks.length) * 100 : 0}%` }} />
                    </div>
                  </div>
                </div>
                <div className="divide-y divide-slate-50">
                  {wTasks.map(t => <TaskRow key={t.id} task={t} isDone={t.status === 'done'} compact />)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===================== TAB: JD & KPI ===================== */}
      {activeTab === 'jd' && jd && (
        <div className="space-y-4">
          {/* Job Description */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-5 py-4 text-white">
              <h3 className="font-bold">{jd.role}</h3>
              <p className="text-xs text-slate-300 mt-0.5">{jd.department} · Teeworld</p>
            </div>
            <div className="p-5">
              <p className="text-sm text-slate-700 mb-4">{jd.summary}</p>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Trách nhiệm chính</h4>
              <ul className="space-y-1.5 mb-5">
                {jd.responsibilities.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="text-blue-500 mt-0.5">•</span> {r}
                  </li>
                ))}
              </ul>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                <strong>Chế độ thưởng:</strong> {jd.bonusRules}
              </div>
            </div>
          </div>

          {/* KPI Cascade */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">KPI Cascade: Công ty → Bạn</h3>
            </div>
            <div className="p-5 space-y-4">
              {/* Company */}
              <KPILevel level="Công ty" color="purple" items={[
                { label: 'Doanh thu năm', value: fmtVND(COMPANY_TARGETS.yearlyRevenue) },
                { label: 'Lợi nhuận', value: `${COMPANY_TARGETS.profitMargin}%` },
                { label: 'BST/năm', value: `${COMPANY_TARGETS.bstPerYear}` },
              ]} />

              {/* Department */}
              {deptTarget && (
                <KPILevel level={`Phòng ${employee.department}`} color="blue" items={[
                  { label: 'Tỷ trọng DT', value: `${deptTarget.revenueShare}%` },
                  { label: 'Chỉ tiêu chính', value: deptTarget.keyMetric },
                  { label: 'Mục tiêu', value: deptTarget.keyTarget },
                ]} />
              )}

              {/* Individual KPIs */}
              <div className="border-2 border-green-200 rounded-xl p-4 bg-green-50/50">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center text-white text-[10px] font-bold">3</div>
                  <span className="text-sm font-bold text-green-800">KPI Cá nhân — {employee.name.split(' ').pop()}</span>
                </div>
                <div className="overflow-hidden rounded-lg border border-green-200">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-green-100/50">
                        <th className="text-left px-3 py-2 text-xs font-semibold text-green-800">Chỉ tiêu</th>
                        <th className="text-center px-3 py-2 text-xs font-semibold text-green-800">Mục tiêu</th>
                        <th className="text-center px-3 py-2 text-xs font-semibold text-green-800">Trọng số</th>
                        <th className="text-center px-3 py-2 text-xs font-semibold text-green-800">Loại</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jd.kpis.map((kpi, i) => {
                        const catIcons: Record<string, string> = { revenue: '💰', growth: '📈', efficiency: '⚡', quality: '✅' };
                        return (
                          <tr key={i} className="border-t border-green-100">
                            <td className="px-3 py-2 font-medium text-slate-800">{kpi.name}</td>
                            <td className="px-3 py-2 text-center text-slate-700">{kpi.target} {kpi.unit}</td>
                            <td className="px-3 py-2 text-center"><span className="bg-green-200 text-green-800 text-xs px-2 py-0.5 rounded-full">{kpi.weight}%</span></td>
                            <td className="px-3 py-2 text-center">{catIcons[kpi.category]}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Daily connection */}
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-slate-600 rounded-full flex items-center justify-center text-white text-[10px] font-bold">4</div>
                  <span className="text-sm font-bold text-slate-700">Hàng ngày</span>
                </div>
                <p className="text-xs text-slate-600">
                  Mỗi ngày bạn có ~{Math.round(monthTasks.length / 4.3)} tasks. Hoàn thành tasks = đạt KPI = nhận thưởng.
                  Hiện tại tháng {currentMonth}: <span className="font-bold">{monthDone}/{monthTasks.length}</span> tasks done = KPI <span className="font-bold">{kpiScore}/100</span>.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB: LƯƠNG THƯỞNG ===================== */}
      {activeTab === 'bonus' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-700 to-teal-700 px-5 py-4 text-white">
              <h3 className="font-bold">Lương & Thưởng — Tháng {currentMonth}/2026</h3>
              <p className="text-xs text-emerald-200 mt-0.5">Cập nhật real-time theo tiến độ công việc</p>
            </div>
            <div className="p-5 space-y-4">
              {/* Salary breakdown */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <p className="text-xs text-blue-600 mb-1">Lương cơ bản</p>
                  <p className="text-xl font-bold text-blue-800">{fmtVND(salary)}</p>
                </div>
                <div className={`rounded-xl p-4 text-center ${bonus.amount > 0 ? 'bg-green-50' : 'bg-slate-50'}`}>
                  <p className="text-xs text-green-600 mb-1">Thưởng KPI dự kiến</p>
                  <p className={`text-xl font-bold ${bonus.amount > 0 ? 'text-green-800' : 'text-slate-400'}`}>{fmtVND(bonus.amount)}</p>
                </div>
              </div>

              {/* KPI → Bonus tier */}
              <div className="bg-slate-50 rounded-xl p-4">
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">Bảng tính thưởng KPI</h4>
                <div className="space-y-2">
                  {[
                    { tier: 'Xuất sắc', min: 95, rate: 25, color: 'green' },
                    { tier: 'Giỏi', min: 80, rate: 15, color: 'blue' },
                    { tier: 'Khá', min: 65, rate: 10, color: 'cyan' },
                    { tier: 'Đạt', min: 50, rate: 5, color: 'amber' },
                    { tier: 'Chưa đạt', min: 0, rate: 0, color: 'red' },
                  ].map(t => {
                    const isActive = bonus.tier === t.tier;
                    return (
                      <div key={t.tier} className={`flex items-center gap-3 px-3 py-2 rounded-lg ${isActive ? 'bg-white border-2 border-green-400 shadow-sm' : ''}`}>
                        {isActive && <CheckCircle2 size={16} className="text-green-600 flex-shrink-0" />}
                        {!isActive && <Circle size={16} className="text-slate-300 flex-shrink-0" />}
                        <span className={`text-sm flex-1 ${isActive ? 'font-bold text-slate-800' : 'text-slate-600'}`}>{t.tier}</span>
                        <span className="text-xs text-slate-500">KPI ≥ {t.min}</span>
                        <span className={`text-sm font-bold ${isActive ? 'text-green-700' : 'text-slate-400'}`}>{t.rate}% lương</span>
                        <span className={`text-sm font-bold ${isActive ? 'text-green-700' : 'text-slate-300'}`}>{fmtVND(Math.round(salary * t.rate / 100))}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Progress to next tier */}
              {kpiScore < 95 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={16} className="text-amber-600" />
                    <span className="text-sm font-bold text-amber-800">Làm thêm để tăng thưởng!</span>
                  </div>
                  {(() => {
                    const nextTier = kpiScore < 50 ? { min: 50, tier: 'Đạt', rate: 5 } : kpiScore < 65 ? { min: 65, tier: 'Khá', rate: 10 } : kpiScore < 80 ? { min: 80, tier: 'Giỏi', rate: 15 } : { min: 95, tier: 'Xuất sắc', rate: 25 };
                    const tasksNeeded = monthMaxPoints > 0 ? Math.ceil((nextTier.min - kpiScore) * monthMaxPoints / 100 / 30) : 0;
                    return (
                      <p className="text-xs text-amber-700">
                        KPI hiện tại: <strong>{kpiScore}</strong>. Cần thêm <strong>{nextTier.min - kpiScore} điểm KPI</strong> (≈{tasksNeeded} tasks) để đạt <strong>{nextTier.tier}</strong> ({nextTier.rate}% = {fmtVND(Math.round(salary * nextTier.rate / 100))}).
                      </p>
                    );
                  })()}
                </div>
              )}

              {/* Total estimated */}
              <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl p-5 text-white text-center">
                <p className="text-xs text-slate-300 mb-1">Thu nhập ước tính tháng {currentMonth}</p>
                <p className="text-3xl font-bold">{fmtVND(salary + bonus.amount)}</p>
                <p className="text-xs text-slate-400 mt-1">= {fmtVND(salary)} lương + {fmtVND(bonus.amount)} thưởng KPI ({bonus.tier})</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============ SUB-COMPONENTS ============

function StatCard({ icon: Icon, label, value, sub, color }: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string; value: string | number; sub: string; color: string }) {
  const colors: Record<string, string> = { blue: 'bg-blue-100 text-blue-600', green: 'bg-green-100 text-green-600', purple: 'bg-purple-100 text-purple-600', amber: 'bg-amber-100 text-amber-600', red: 'bg-red-100 text-red-600', emerald: 'bg-emerald-100 text-emerald-600' };
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3">
      <div className="flex items-center gap-2 mb-1.5">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${colors[color] || colors.blue}`}><Icon size={14} /></div>
        <span className="text-[10px] text-slate-500">{label}</span>
      </div>
      <div className="text-lg font-bold text-slate-800">{value}</div>
      <div className="text-[10px] text-slate-400">{sub}</div>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string | number; color?: string }) {
  const c = color === 'green' ? 'text-green-700' : color === 'amber' ? 'text-amber-700' : color === 'red' ? 'text-red-700' : 'text-slate-800';
  return (
    <div className="text-center">
      <div className={`text-lg font-bold ${c}`}>{value}</div>
      <div className="text-[10px] text-slate-400">{label}</div>
    </div>
  );
}

function TaskRow({ task, isDone, compact }: { task: Task; isDone: boolean; compact?: boolean }) {
  const catIcons: Record<string, string> = { revenue: '💰', growth: '📈', efficiency: '⚡', quality: '✅' };
  return (
    <div className={`px-4 py-2.5 flex items-center gap-3 ${isDone ? 'bg-green-50/30' : ''}`}>
      <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isDone ? 'bg-green-500 border-green-500' : 'border-slate-300'}`}>
        {isDone && <CheckCircle2 size={12} className="text-white" />}
      </span>
      <span className="text-xs">{catIcons[task.category || ''] || '📋'}</span>
      <span className={`text-sm flex-1 ${isDone ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{task.title}</span>
      {task.channel && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">{task.channel}</span>}
      <span className="text-[10px] text-amber-600 font-medium">{task.points}đ</span>
    </div>
  );
}

function TaskList({ tasks, submissions, submitted, onToggle, onSetValue, title, subtitle }: {
  tasks: Task[]; submissions: Record<string, { value: string; done: boolean }>; submitted: boolean;
  onToggle: (id: string) => void; onSetValue: (id: string, val: string) => void;
  title: string; subtitle: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="font-bold text-slate-800 text-sm flex items-center gap-2"><Clock size={16} className="text-blue-600" /> {title}</h2>
          <p className="text-[10px] text-slate-400 mt-0.5">{subtitle} — {tasks.length} việc</p>
        </div>
        {submitted && <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-3 py-1 rounded-full"><CheckCircle2 size={12} /> Đã gửi</span>}
      </div>
      <div className="divide-y divide-slate-50 max-h-[600px] overflow-y-auto">
        {tasks.length === 0 ? (
          <div className="px-5 py-10 text-center"><Trophy size={32} className="mx-auto text-green-400 mb-2" /><p className="text-sm text-slate-500">Không có task!</p></div>
        ) : tasks.map(task => {
          const isDone = submissions[task.id]?.done || task.status === 'done';
          const catIcons: Record<string, string> = { revenue: '💰', growth: '📈', efficiency: '⚡', quality: '✅' };
          const prioColors: Record<string, string> = { urgent: 'border-l-red-500', high: 'border-l-orange-400', medium: 'border-l-blue-400', low: 'border-l-slate-300' };
          return (
            <div key={task.id} className={`px-5 py-3 flex items-center gap-3 border-l-4 ${prioColors[task.priority] || 'border-l-slate-300'} ${isDone ? 'bg-green-50/50' : 'hover:bg-slate-50'}`}>
              <button onClick={() => onToggle(task.id)} disabled={submitted}
                className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isDone ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 hover:border-green-400'} ${submitted ? 'cursor-not-allowed' : ''}`}>
                {isDone && <CheckCircle2 size={12} />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs">{catIcons[task.category || ''] || '📋'}</span>
                  <span className={`text-sm ${isDone ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{task.title}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {task.channel && <span className="text-[9px] px-1 py-0.5 rounded bg-blue-50 text-blue-600">{task.channel}</span>}
                  {task.points > 0 && <span className="text-[9px] text-amber-600">{task.points}đ</span>}
                </div>
              </div>
              {task.kpi_target && !submitted && (
                <input type="text" value={submissions[task.id]?.value || ''} onChange={e => onSetValue(task.id, e.target.value)}
                  placeholder="SL" className="w-14 text-xs border border-slate-200 rounded-lg px-2 py-1 text-center focus:border-blue-400 outline-none" />
              )}
              {isDone && task.points > 0 && <span className="text-xs font-bold text-green-600">+{task.points}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function KPILevel({ level, color, items }: { level: string; color: string; items: { label: string; value: string }[] }) {
  const colors: Record<string, string> = { purple: 'border-purple-200 bg-purple-50/50', blue: 'border-blue-200 bg-blue-50/50', green: 'border-green-200 bg-green-50/50' };
  const dotColors: Record<string, string> = { purple: 'bg-purple-600', blue: 'bg-blue-600', green: 'bg-green-600' };
  const numColors: Record<string, string> = { purple: '1', blue: '2', green: '3' };
  return (
    <div className={`border-2 rounded-xl p-4 ${colors[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-6 h-6 ${dotColors[color]} rounded-full flex items-center justify-center text-white text-[10px] font-bold`}>{numColors[color]}</div>
        <span className={`text-sm font-bold text-${color}-800`}>{level}</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {items.map((item, i) => (
          <div key={i} className="text-center">
            <div className="text-xs text-slate-500">{item.label}</div>
            <div className="text-sm font-bold text-slate-800">{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CascadeVisual({ employeeDept, todayDone, todayTotal, monthPct }: { employeeDept: string; todayDone: number; todayTotal: number; monthPct: number }) {
  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-5 text-white">
      <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
        <ArrowRight size={16} className="text-blue-400" /> Công việc → KPI → Thưởng
      </h3>
      <div className="flex items-center gap-2 text-xs">
        <Step label={`${todayDone}/${todayTotal} tasks`} active />
        <ChevronRight size={12} className="text-slate-500" />
        <Step label={`Tháng: ${monthPct}%`} active={monthPct > 0} />
        <ChevronRight size={12} className="text-slate-500" />
        <Step label={employeeDept} active={monthPct > 30} />
        <ChevronRight size={12} className="text-slate-500" />
        <Step label={`${fmtVND(COMPANY_TARGETS.yearlyRevenue)}`} active={monthPct > 50} />
      </div>
    </div>
  );
}

function Step({ label, active }: { label: string; active: boolean }) {
  return <div className={`px-3 py-1.5 rounded-lg text-[11px] flex-1 text-center ${active ? 'bg-blue-600/30 text-blue-200' : 'bg-white/5 text-slate-500'}`}>{label}</div>;
}
