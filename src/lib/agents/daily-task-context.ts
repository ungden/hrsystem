/**
 * Daily Task Context Builder
 *
 * Gathers Supabase data to enable smart daily task generation.
 * Provides yesterday's performance, week/month cumulative metrics,
 * and pace calculations so the AI agent can generate contextual tasks.
 *
 * Designed for CLI usage (not browser) — uses @supabase/supabase-js directly.
 */

import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Supabase client (CLI / server-side — not browser)
// ---------------------------------------------------------------------------

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DailyContext {
  employee: { id: number; name: string; role: string; department: string };
  date: string; // YYYY-MM-DD
  yesterday: {
    tasksCompleted: number;
    tasksTotal: number;
    metrics: Record<string, { target: number; actual: number; unit: string }>;
  };
  weekCumulative: Record<string, { target: number; actual: number; remaining: number; daysLeft: number; unit: string }>;
  monthCumulative: Record<string, { target: number; actual: number; pctAchieved: number; unit: string }>;
  pace: {
    workingDaysRemaining: number;
    workingDaysThisMonth: number;
    dailyTargetToHitMonthly: Record<string, number>;
  };
}

interface TaskRow {
  id: string;
  status: string;
  kpi_metric: string | null;
  kpi_target: string | null;
  kpi_unit: string | null;
  week_number: number | null;
  due_date: string;
  assignee_id: number;
}

interface SubmissionRow {
  task_id: string;
  actual_numeric: number | null;
}

interface DailyReportRow {
  id: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Count working days (Mon-Fri) from `date` to end of its month, plus total working days in the month. */
export function getWorkingDaysRemaining(date: string): { remaining: number; total: number } {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = d.getMonth(); // 0-based
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let total = 0;
  let remaining = 0;
  const dayOfDate = d.getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const dow = new Date(year, month, day).getDay();
    if (dow !== 0 && dow !== 6) {
      total++;
      if (day >= dayOfDate) {
        remaining++;
      }
    }
  }

  return { remaining, total };
}

/** Week number within a month: ceil(dayOfMonth / 7). Consistent with existing codebase. */
export function getWeekNumber(date: string): number {
  const dayOfMonth = new Date(date).getDate();
  return Math.ceil(dayOfMonth / 7);
}

/** Parse a kpi_target string into a number (strips non-numeric chars). Returns 0 if unparseable. */
function parseTarget(raw: string | null | undefined): number {
  if (!raw) return 0;
  const cleaned = String(raw).replace(/[^0-9.]/g, '');
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? num : 0;
}

/** Get the previous working day (skip weekends). */
function getPreviousWorkingDay(date: string): string {
  const d = new Date(date);
  d.setDate(d.getDate() - 1);
  // Skip back over weekends
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() - 1);
  }
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// ---------------------------------------------------------------------------
// Main builder
// ---------------------------------------------------------------------------

export async function buildDailyContext(employeeId: number, date: string): Promise<DailyContext> {
  const supabase = getSupabase();

  // 1. Employee info
  const { data: emp, error: empErr } = await supabase
    .from('employees')
    .select('id, name, role, department')
    .eq('id', employeeId)
    .single();
  if (empErr || !emp) {
    throw new Error(`Employee #${employeeId} not found: ${empErr?.message ?? 'no data'}`);
  }

  const d = new Date(date);
  const monthNumber = d.getMonth() + 1; // 1-based
  const currentWeek = getWeekNumber(date);
  const yesterday = getPreviousWorkingDay(date);

  // 2. Yesterday's report + submissions
  const { data: yesterdayReports } = await supabase
    .from('daily_reports')
    .select('id')
    .eq('employee_id', employeeId)
    .eq('report_date', yesterday)
    .limit(1);

  const yesterdayReport: DailyReportRow | null = yesterdayReports?.[0] ?? null;

  // Fetch yesterday's tasks for this employee
  const { data: yesterdayTasks } = await supabase
    .from('tasks')
    .select('id, status, kpi_metric, kpi_target, kpi_unit')
    .eq('assignee_id', employeeId)
    .eq('due_date', yesterday);

  const yTasks = (yesterdayTasks ?? []) as Array<{ id: string; status: string; kpi_metric: string | null; kpi_target: string | null; kpi_unit: string | null }>;

  // Get submissions for yesterday's report
  let yesterdaySubs: SubmissionRow[] = [];
  if (yesterdayReport) {
    const { data: subs } = await supabase
      .from('task_submissions')
      .select('task_id, actual_numeric')
      .eq('daily_report_id', yesterdayReport.id);
    yesterdaySubs = (subs ?? []) as SubmissionRow[];
  }

  // Build yesterday metrics grouped by kpi_metric
  const yesterdayMetrics: Record<string, { target: number; actual: number; unit: string }> = {};
  const subByTaskId = new Map<string, number>();
  for (const sub of yesterdaySubs) {
    subByTaskId.set(sub.task_id, sub.actual_numeric ?? 0);
  }
  for (const task of yTasks) {
    if (!task.kpi_metric) continue;
    const metric = task.kpi_metric;
    const target = parseTarget(task.kpi_target);
    const actual = subByTaskId.get(task.id) ?? 0;
    if (yesterdayMetrics[metric]) {
      yesterdayMetrics[metric].target += target;
      yesterdayMetrics[metric].actual += actual;
    } else {
      yesterdayMetrics[metric] = { target, actual, unit: task.kpi_unit ?? '' };
    }
  }

  const yesterdayData = {
    tasksCompleted: yTasks.filter((t) => t.status === 'done').length,
    tasksTotal: yTasks.length,
    metrics: yesterdayMetrics,
  };

  // 3. Month cumulative — all tasks for this employee this month
  const { data: monthTasks } = await supabase
    .from('tasks')
    .select('id, status, kpi_metric, kpi_target, kpi_unit, week_number, due_date, assignee_id')
    .eq('assignee_id', employeeId)
    .eq('month_number', monthNumber);

  const mTasks = (monthTasks ?? []) as TaskRow[];

  // Monthly targets by kpi_metric
  const monthTargets: Record<string, { target: number; unit: string }> = {};
  for (const task of mTasks) {
    if (!task.kpi_metric) continue;
    const target = parseTarget(task.kpi_target);
    if (monthTargets[task.kpi_metric]) {
      monthTargets[task.kpi_metric].target += target;
    } else {
      monthTargets[task.kpi_metric] = { target, unit: task.kpi_unit ?? '' };
    }
  }

  // Get submitted/approved report IDs for this employee this month
  const monthStart = `${d.getFullYear()}-${String(monthNumber).padStart(2, '0')}-01`;
  const monthEnd = `${d.getFullYear()}-${String(monthNumber).padStart(2, '0')}-${new Date(d.getFullYear(), monthNumber, 0).getDate()}`;

  const { data: monthReports } = await supabase
    .from('daily_reports')
    .select('id')
    .eq('employee_id', employeeId)
    .in('status', ['submitted', 'approved'])
    .gte('report_date', monthStart)
    .lte('report_date', monthEnd);

  const monthReportIds = (monthReports ?? []).map((r: DailyReportRow) => r.id);

  // Get all submissions for those reports, in batches
  const allMonthSubs: SubmissionRow[] = [];
  for (let i = 0; i < monthReportIds.length; i += 100) {
    const batch = monthReportIds.slice(i, i + 100);
    const { data: subs } = await supabase
      .from('task_submissions')
      .select('task_id, actual_numeric')
      .in('daily_report_id', batch);
    if (subs) allMonthSubs.push(...(subs as SubmissionRow[]));
  }

  // Map task_id to kpi_metric for lookups
  const taskMetricMap = new Map<string, string>();
  for (const task of mTasks) {
    if (task.kpi_metric) {
      taskMetricMap.set(task.id, task.kpi_metric);
    }
  }

  // Sum actuals by kpi_metric
  const monthActuals: Record<string, number> = {};
  for (const sub of allMonthSubs) {
    const metric = taskMetricMap.get(sub.task_id);
    if (!metric) continue;
    monthActuals[metric] = (monthActuals[metric] ?? 0) + (sub.actual_numeric ?? 0);
  }

  // Build month cumulative
  const monthCumulative: Record<string, { target: number; actual: number; pctAchieved: number; unit: string }> = {};
  for (const [metric, info] of Object.entries(monthTargets)) {
    const actual = monthActuals[metric] ?? 0;
    const pctAchieved = info.target > 0 ? Math.round((actual / info.target) * 100) : 0;
    monthCumulative[metric] = { target: info.target, actual, pctAchieved, unit: info.unit };
  }

  // 4. Week cumulative — filter tasks by current week_number
  const weekTasks = mTasks.filter((t) => t.week_number === currentWeek);
  const weekTargets: Record<string, { target: number; unit: string }> = {};
  const weekTaskIds = new Set<string>();
  for (const task of weekTasks) {
    weekTaskIds.add(task.id);
    if (!task.kpi_metric) continue;
    const target = parseTarget(task.kpi_target);
    if (weekTargets[task.kpi_metric]) {
      weekTargets[task.kpi_metric].target += target;
    } else {
      weekTargets[task.kpi_metric] = { target, unit: task.kpi_unit ?? '' };
    }
  }

  // Filter month subs to only week tasks
  const weekActuals: Record<string, number> = {};
  for (const sub of allMonthSubs) {
    if (!weekTaskIds.has(sub.task_id)) continue;
    const metric = taskMetricMap.get(sub.task_id);
    if (!metric) continue;
    weekActuals[metric] = (weekActuals[metric] ?? 0) + (sub.actual_numeric ?? 0);
  }

  // Days left in this week (Mon-Fri from today)
  const weekDayStart = (currentWeek - 1) * 7 + 1;
  const weekDayEnd = Math.min(currentWeek * 7, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate());
  let weekDaysLeft = 0;
  for (let day = d.getDate(); day <= weekDayEnd; day++) {
    const dow = new Date(d.getFullYear(), d.getMonth(), day).getDay();
    if (dow !== 0 && dow !== 6) weekDaysLeft++;
  }

  const weekCumulative: Record<string, { target: number; actual: number; remaining: number; daysLeft: number; unit: string }> = {};
  for (const [metric, info] of Object.entries(weekTargets)) {
    const actual = weekActuals[metric] ?? 0;
    weekCumulative[metric] = {
      target: info.target,
      actual,
      remaining: Math.max(0, info.target - actual),
      daysLeft: weekDaysLeft,
      unit: info.unit,
    };
  }

  // 5. Pace calculations
  const { remaining: workingDaysRemaining, total: workingDaysThisMonth } = getWorkingDaysRemaining(date);

  const dailyTargetToHitMonthly: Record<string, number> = {};
  for (const [metric, info] of Object.entries(monthCumulative)) {
    const gap = Math.max(0, info.target - info.actual);
    dailyTargetToHitMonthly[metric] = workingDaysRemaining > 0
      ? Math.ceil(gap / workingDaysRemaining)
      : gap; // If no days left, entire gap is the "daily" target
  }

  return {
    employee: { id: emp.id, name: emp.name, role: emp.role, department: emp.department },
    date,
    yesterday: yesterdayData,
    weekCumulative,
    monthCumulative,
    pace: {
      workingDaysRemaining,
      workingDaysThisMonth,
      dailyTargetToHitMonthly,
    },
  };
}
