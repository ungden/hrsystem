import { createBrowserClient } from '@supabase/ssr';

// ============ SUPABASE DATA FETCHERS ============
// Lazy init to avoid build-time errors when env vars aren't available

function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );
}

export async function getEmployees() {
  const { data, error } = await getSupabase().from('employees').select('*').order('id');
  if (error) throw error;
  return data || [];
}

export async function getEmployee(id: number) {
  const { data, error } = await getSupabase().from('employees').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function getTasks(filters?: { assignee_id?: number; status?: string; department?: string; month_number?: number }, supabaseClient?: unknown) {
  const supabase = (supabaseClient || getSupabase()) as ReturnType<typeof getSupabase>;
  let query = supabase.from('tasks').select('*');
  if (filters?.assignee_id) query = query.eq('assignee_id', filters.assignee_id);
  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.department) query = query.eq('department', filters.department);
  if (filters?.month_number) query = query.eq('month_number', filters.month_number);
  const { data, error } = await query.order('due_date');
  if (error) throw error;
  return data || [];
}

export async function getTaskStats(assignee_id?: number) {
  const tasks = assignee_id ? await getTasks({ assignee_id }) : await getTasks();
  return {
    total: tasks.length,
    done: tasks.filter((t: { status: string }) => t.status === 'done').length,
    in_progress: tasks.filter((t: { status: string }) => t.status === 'in_progress').length,
    todo: tasks.filter((t: { status: string }) => t.status === 'todo').length,
  };
}

export async function getDeals() {
  const { data, error } = await getSupabase().from('deals').select('*').order('date');
  if (error) throw error;
  return data || [];
}

export async function getKPIs() {
  const { data, error } = await getSupabase().from('kpis').select('*').order('id');
  if (error) throw error;
  return data || [];
}

export async function getExpenses() {
  const { data, error } = await getSupabase().from('expenses').select('*').order('id');
  if (error) throw error;
  return data || [];
}

export async function getChannelEconomics() {
  const { data, error } = await getSupabase().from('channel_economics').select('*').order('revenue_share', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getMonthlyPnL() {
  const { data, error } = await getSupabase().from('monthly_pnl').select('*').order('year').order('month');
  if (error) throw error;
  return data || [];
}

export async function getPayrolls(month?: string) {
  let query = getSupabase().from('payrolls').select('*');
  if (month) query = query.eq('month', month);
  const { data, error } = await query.order('employee_id');
  if (error) throw error;
  return data || [];
}

export async function getCustomers() {
  const { data, error } = await getSupabase().from('customers').select('*');
  if (error) throw error;
  return data || [];
}

export async function getPartners() {
  const { data, error } = await getSupabase().from('partners').select('*');
  if (error) throw error;
  return data || [];
}

export async function getReceivables() {
  const { data, error } = await getSupabase().from('receivables').select('*');
  if (error) throw error;
  return data || [];
}

export async function getPayables() {
  const { data, error } = await getSupabase().from('payables').select('*');
  if (error) throw error;
  return data || [];
}

export async function getFinanceSettings() {
  const { data, error } = await getSupabase().from('finance_settings').select('*').single();
  if (error) throw error;
  return data;
}

export async function getRoadmap() {
  const { data, error } = await getSupabase().from('roadmaps').select('*').order('id').limit(1).single();
  if (error) return null;
  return data;
}

// ============ DASHBOARD AGGREGATES ============

export async function getDashboardData() {
  const [employees, tasks, deals, kpis, expenses, channels, pnl, payrolls] = await Promise.all([
    getEmployees(),
    getTasks(),
    getDeals(),
    getKPIs(),
    getExpenses(),
    getChannelEconomics(),
    getMonthlyPnL(),
    getPayrolls(),
  ]);

  const totalRevenue = pnl.reduce((s: number, m: { total_revenue: number }) => s + (m.total_revenue || 0), 0);
  const totalProfit = pnl.reduce((s: number, m: { net_profit: number }) => s + (m.net_profit || 0), 0);
  const totalHRCost = employees.reduce((s: number, e: { base_salary: number }) => s + (e.base_salary || 0), 0);
  const tasksDone = tasks.filter((t: { status: string }) => t.status === 'done').length;
  const tasksTotal = tasks.length;

  return {
    employees,
    tasks,
    deals,
    kpis,
    expenses,
    channels,
    pnl,
    payrolls,
    summary: {
      headcount: employees.length,
      totalRevenue,
      totalProfit,
      profitMargin: totalRevenue > 0 ? Math.round(totalProfit / totalRevenue * 100) : 0,
      totalHRCost,
      tasksDone,
      tasksTotal,
      completionRate: tasksTotal > 0 ? Math.round(tasksDone / tasksTotal * 100) : 0,
      dealsTotal: deals.reduce((s: number, d: { amount: number }) => s + (d.amount || 0), 0),
      dealsDone: deals.filter((d: { stage: string }) => d.stage === 'Đã hoàn thành').reduce((s: number, d: { amount: number }) => s + (d.amount || 0), 0),
    },
  };
}

// ============ MUTATIONS ============

export async function updateTaskStatus(taskId: string, status: string) {
  const { error } = await getSupabase().from('tasks').update({ status }).eq('id', taskId);
  if (error) throw error;
}

export async function updateEmployee(id: number, updates: Record<string, unknown>) {
  const { error } = await getSupabase().from('employees').update(updates).eq('id', id);
  if (error) throw error;
}

export async function addExpense(expense: { title: string; amount: number; category: string; date: string }) {
  const { error } = await getSupabase().from('expenses').insert(expense);
  if (error) throw error;
}

export async function addDeal(deal: { title: string; company: string; amount: number; stage: string; date: string }) {
  const { error } = await getSupabase().from('deals').insert(deal);
  if (error) throw error;
}

export async function addSelfTask(task: {
  title: string; assignee_id: number; department: string; priority: string;
  month_number: number; points: number; ai_point_reason: string;
}) {
  const supabase = getSupabase();

  // Validate: employee must exist and be active
  const { data: emp } = await supabase.from('employees').select('id, department, status')
    .eq('id', task.assignee_id).single();
  if (!emp) throw new Error(`Nhân viên #${task.assignee_id} không tồn tại`);
  if (emp.status !== 'Đang làm việc') throw new Error(`Nhân viên không còn làm việc`);

  // Self-added points cap: max 30pts per task, max 100pts/month buffer
  if (task.points > 30) {
    throw new Error(`Task tự thêm tối đa 30 điểm (bạn nhập ${task.points})`);
  }

  const existingSelfTasks = await getTasks({ assignee_id: task.assignee_id, month_number: task.month_number });
  const selfPoints = existingSelfTasks
    .filter((t: { source: string }) => t.source === 'self_added')
    .reduce((s: number, t: { points: number }) => s + (t.points || 0), 0);
  if (selfPoints + task.points > 100) {
    throw new Error(`Đã dùng ${selfPoints}/100 điểm tự thêm tháng ${task.month_number}. Không đủ cho ${task.points} điểm nữa.`);
  }

  const selfDueDate = new Date().toISOString().split('T')[0];
  const selfDayOfMonth = new Date().getDate();
  const selfWeekNum = Math.ceil(selfDayOfMonth / 7);

  const { data, error } = await supabase.from('tasks').insert({
    ...task,
    department: emp.department, // Always use employee's actual department
    status: 'todo',
    source: 'self_added',
    category: 'daily',
    due_date: selfDueDate,
    week_number: selfWeekNum,
  }).select().single();
  if (error) throw error;
  return data;
}

export async function getEmployeePointStats(employeeId: number, monthNumber?: number) {
  const filters: Record<string, number> = { assignee_id: employeeId };
  if (monthNumber) filters.month_number = monthNumber;
  const tasks = await getTasks(filters);
  const totalPoints = tasks.reduce((s: number, t: { points: number }) => s + (t.points || 0), 0);
  const earnedPoints = tasks.filter((t: { status: string }) => t.status === 'done')
    .reduce((s: number, t: { points: number }) => s + (t.points || 0), 0);
  return { totalPoints, earnedPoints, taskCount: tasks.length };
}

// ============ DAILY REPORTS ============

export async function getDailyReports(filters?: { employee_id?: number; status?: string; department?: string; date_from?: string; date_to?: string }) {
  let query = getSupabase().from('daily_reports').select('*');
  if (filters?.employee_id) query = query.eq('employee_id', filters.employee_id);
  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.department) query = query.eq('department', filters.department);
  if (filters?.date_from) query = query.gte('report_date', filters.date_from);
  if (filters?.date_to) query = query.lte('report_date', filters.date_to);
  const { data, error } = await query.order('report_date', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getDailyReport(id: string) {
  const { data, error } = await getSupabase().from('daily_reports').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function getDailyReportByDate(employeeId: number, date: string) {
  const { data } = await getSupabase().from('daily_reports').select('*')
    .eq('employee_id', employeeId).eq('report_date', date).maybeSingle();
  return data;
}

export async function createDailyReport(report: { employee_id: number; report_date: string; department: string }) {
  const { data, error } = await getSupabase().from('daily_reports').insert(report).select().single();
  if (error) throw error;
  return data;
}

export async function updateDailyReport(id: string, updates: Record<string, unknown>) {
  const { error } = await getSupabase().from('daily_reports').update(updates).eq('id', id);
  if (error) throw error;
}

export async function submitDailyReport(id: string) {
  const { error } = await getSupabase().from('daily_reports').update({
    status: 'submitted',
    submitted_at: new Date().toISOString(),
  }).eq('id', id);
  if (error) throw error;
}

export async function approveDailyReport(id: string, reviewerId: number, notes?: string) {
  const supabase = getSupabase();

  // Validate: reviewer must be the employee's manager or CEO (id=1)
  const { data: report } = await supabase.from('daily_reports').select('employee_id').eq('id', id).single();
  if (!report) throw new Error('Report không tồn tại');

  if (reviewerId !== 1) { // CEO can approve anyone
    const { data: employee } = await supabase.from('employees').select('manager_id').eq('id', report.employee_id).single();
    if (!employee || employee.manager_id !== reviewerId) {
      throw new Error('Bạn không có quyền duyệt báo cáo của nhân viên này');
    }
  }

  const { error } = await supabase.from('daily_reports').update({
    status: 'approved',
    reviewed_by: reviewerId,
    reviewed_at: new Date().toISOString(),
    review_notes: notes || null,
  }).eq('id', id);
  if (error) throw error;
}

export async function rejectDailyReport(id: string, reviewerId: number, notes: string) {
  const { error } = await getSupabase().from('daily_reports').update({
    status: 'rejected',
    reviewed_by: reviewerId,
    reviewed_at: new Date().toISOString(),
    review_notes: notes,
  }).eq('id', id);
  if (error) throw error;
}

// ============ TASK SUBMISSIONS ============

export async function getTaskSubmissions(dailyReportId: string) {
  const { data, error } = await getSupabase().from('task_submissions').select('*')
    .eq('daily_report_id', dailyReportId);
  if (error) throw error;
  return data || [];
}

export async function upsertTaskSubmission(sub: {
  daily_report_id: string; task_id: string; actual_value: string; actual_numeric?: number | null; notes?: string;
}) {
  const supabase = getSupabase();

  // Validate: task must belong to the employee who owns the daily report
  const { data: report } = await supabase.from('daily_reports').select('employee_id').eq('id', sub.daily_report_id).single();
  if (!report) throw new Error('Daily report không tồn tại');

  const { data: task } = await supabase.from('tasks').select('assignee_id').eq('id', sub.task_id).single();
  if (!task) throw new Error('Task không tồn tại');

  if (task.assignee_id !== report.employee_id) {
    throw new Error(`Bạn không có quyền submit cho task này. Task được giao cho nhân viên #${task.assignee_id}`);
  }

  const { data, error } = await supabase.from('task_submissions').upsert(sub, {
    onConflict: 'daily_report_id,task_id',
  }).select().single();
  if (error) throw error;
  return data;
}

// ============ AGGREGATED ACTUALS (Plan vs Actual) ============

export interface AggregatedActual {
  totalActual: number;
  count: number;
  latestValue: string;
}

/** Fetch ALL task_submissions in one query, only from submitted/approved reports */
export async function getAllTaskSubmissions(filters?: {
  employee_id?: number;
  department?: string;
}) {
  // Join task_submissions with daily_reports to filter by report status
  let reportQuery = getSupabase().from('daily_reports').select('id')
    .in('status', ['submitted', 'approved']);
  if (filters?.employee_id) reportQuery = reportQuery.eq('employee_id', filters.employee_id);
  if (filters?.department) reportQuery = reportQuery.eq('department', filters.department);

  const { data: reports, error: rErr } = await reportQuery;
  if (rErr) throw rErr;
  if (!reports || reports.length === 0) return [];

  const reportIds = reports.map((r: { id: string }) => r.id);

  // Fetch submissions in batches of 100 report IDs to avoid URL length limits
  const allSubs: Array<{ task_id: string; actual_value: string; actual_numeric: number | null }> = [];
  for (let i = 0; i < reportIds.length; i += 100) {
    const batch = reportIds.slice(i, i + 100);
    const { data, error } = await getSupabase().from('task_submissions').select('task_id, actual_value, actual_numeric')
      .in('daily_report_id', batch);
    if (error) throw error;
    if (data) allSubs.push(...data);
  }
  return allSubs;
}

/** Core: aggregate actual_numeric by task_id → Map.
 *  Only counts submissions from reports owned by the task's assigned employee.
 *  This prevents cross-employee data pollution. */
export async function getAggregatedActuals(taskIds: string[]): Promise<Map<string, AggregatedActual>> {
  const result = new Map<string, AggregatedActual>();
  if (taskIds.length === 0) return result;

  const supabase = getSupabase();

  // Build a map of task_id → assignee_id for ownership validation
  const taskAssignees = new Map<string, number>();
  for (let i = 0; i < taskIds.length; i += 100) {
    const batch = taskIds.slice(i, i + 100);
    const { data: tasks } = await supabase.from('tasks').select('id, assignee_id').in('id', batch);
    if (tasks) tasks.forEach((t: { id: string; assignee_id: number }) => taskAssignees.set(t.id, t.assignee_id));
  }

  // Get all approved/submitted reports with employee_id
  const { data: reports, error: rErr } = await supabase.from('daily_reports').select('id, employee_id')
    .in('status', ['submitted', 'approved']);
  if (rErr) throw rErr;
  if (!reports || reports.length === 0) return result;

  // Map report_id → employee_id for validation
  const reportOwners = new Map<string, number>();
  reports.forEach((r: { id: string; employee_id: number }) => reportOwners.set(r.id, r.employee_id));

  const reportIds = reports.map((r: { id: string }) => r.id);

  // Fetch submissions in batches
  const allSubs: Array<{ task_id: string; actual_value: string; actual_numeric: number | null; daily_report_id: string }> = [];
  for (let i = 0; i < reportIds.length; i += 100) {
    const batch = reportIds.slice(i, i + 100);
    const { data, error } = await supabase.from('task_submissions').select('task_id, actual_value, actual_numeric, daily_report_id')
      .in('daily_report_id', batch);
    if (error) throw error;
    if (data) allSubs.push(...data);
  }

  // Aggregate by task_id — ONLY if report owner matches task assignee
  for (const sub of allSubs) {
    if (!taskIds.includes(sub.task_id)) continue;

    // Validate: report must belong to the task's assigned employee
    const taskAssignee = taskAssignees.get(sub.task_id);
    const reportOwner = reportOwners.get(sub.daily_report_id);
    if (taskAssignee !== undefined && reportOwner !== undefined && taskAssignee !== reportOwner) {
      continue; // Skip cross-employee submissions
    }

    const existing = result.get(sub.task_id);
    if (existing) {
      existing.totalActual += sub.actual_numeric || 0;
      existing.count++;
      if (sub.actual_value) existing.latestValue = sub.actual_value;
    } else {
      result.set(sub.task_id, {
        totalActual: sub.actual_numeric || 0,
        count: 1,
        latestValue: sub.actual_value || '',
      });
    }
  }
  return result;
}

export type VarianceStatus = 'exceeded' | 'met' | 'near' | 'below' | 'missing';

/** Compute variance status from target vs actual */
export function computeVariance(target: number, actual: number | null): VarianceStatus {
  if (actual === null || actual === undefined) return 'missing';
  if (target <= 0) return actual > 0 ? 'exceeded' : 'missing';
  const ratio = actual / target;
  if (ratio >= 1.1) return 'exceeded';
  if (ratio >= 0.9) return 'met';
  if (ratio >= 0.7) return 'near';
  return 'below';
}

export interface TaskWithActual {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  points: number;
  category: string;
  due_date: string;
  assignee_id: number;
  department: string;
  month_number?: number | null;
  week_number?: number | null;
  kpi_metric?: string | null;
  kpi_target?: string | null;
  kpi_unit?: string | null;
  links?: Array<{ url: string; title: string }>;
  // Aggregated actual data
  actualTotal: number | null;
  actualCount: number;
  varianceStatus: VarianceStatus;
}

/** Convenience: getTasks + getAggregatedActuals → enriched tasks */
export async function getTasksWithActuals(filters?: Record<string, unknown>): Promise<TaskWithActual[]> {
  const tasks = await getTasks(filters);
  const taskIds = tasks.map((t: { id: string }) => t.id);
  const actuals = await getAggregatedActuals(taskIds);

  return tasks.map((t: { id: string; title: string; status: string; priority: string; points: number; category: string; due_date: string; assignee_id: number; department: string; month_number?: number | null; week_number?: number | null; kpi_metric?: string | null; kpi_target?: string | null; kpi_unit?: string | null }) => {
    const actual = actuals.get(t.id);
    const targetNum = t.kpi_target ? parseFloat(String(t.kpi_target).replace(/[^0-9.]/g, '')) : 0;
    return {
      ...t,
      actualTotal: actual ? actual.totalActual : null,
      actualCount: actual ? actual.count : 0,
      varianceStatus: t.kpi_target
        ? computeVariance(targetNum, actual?.totalActual ?? null)
        : ('missing' as VarianceStatus),
    };
  });
}

// ============ ATTACHMENTS ============

export async function getAttachments(filters: { task_submission_id?: string; daily_report_id?: string; task_id?: string }) {
  let query = getSupabase().from('attachments').select('*');
  if (filters.task_submission_id) query = query.eq('task_submission_id', filters.task_submission_id);
  if (filters.daily_report_id) query = query.eq('daily_report_id', filters.daily_report_id);
  if (filters.task_id) query = query.eq('task_id', filters.task_id);
  const { data, error } = await query.order('created_at');
  if (error) throw error;
  return data || [];
}

export async function uploadEvidence(file: File, meta: { daily_report_id: string; task_submission_id?: string; uploaded_by: number }) {
  const supabase = getSupabase();
  const date = new Date().toISOString().split('T')[0];
  const path = `${meta.uploaded_by}/${date}/${Date.now()}_${file.name}`;

  const { error: uploadError } = await supabase.storage.from('evidence').upload(path, file);
  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage.from('evidence').getPublicUrl(path);

  const { data, error } = await supabase.from('attachments').insert({
    daily_report_id: meta.daily_report_id,
    task_submission_id: meta.task_submission_id || null,
    file_name: file.name,
    file_type: file.type,
    file_size: file.size,
    storage_path: path,
    uploaded_by: meta.uploaded_by,
  }).select().single();
  if (error) throw error;
  return { ...data, url: publicUrl };
}

export async function deleteAttachment(id: string, storagePath: string) {
  const supabase = getSupabase();
  await supabase.storage.from('evidence').remove([storagePath]);
  const { error } = await supabase.from('attachments').delete().eq('id', id);
  if (error) throw error;
}

// ============ PRODUCTS ============

export async function getProducts(filters?: { status?: string; category?: string; collection?: string }) {
  let query = getSupabase().from('products').select('*');
  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.category) query = query.eq('category', filters.category);
  if (filters?.collection) query = query.eq('collection', filters.collection);
  const { data, error } = await query.order('id');
  if (error) throw error;
  return data || [];
}

export async function addProduct(product: Record<string, unknown>) {
  const { data, error } = await getSupabase().from('products').insert(product).select().single();
  if (error) throw error;
  return data;
}

export async function updateProduct(id: number, updates: Record<string, unknown>) {
  const { error } = await getSupabase().from('products').update(updates).eq('id', id);
  if (error) throw error;
}

// ============ ORDERS ============

export async function getOrders(filters?: { status?: string; channel?: string }) {
  let query = getSupabase().from('orders').select('*');
  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.channel) query = query.eq('channel', filters.channel);
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getOrderItems(orderId: number) {
  const { data, error } = await getSupabase().from('order_items').select('*').eq('order_id', orderId);
  if (error) throw error;
  return data || [];
}

export async function addOrder(order: Record<string, unknown>) {
  const { data, error } = await getSupabase().from('orders').insert(order).select().single();
  if (error) throw error;
  return data;
}

export async function addOrderItems(items: Record<string, unknown>[]) {
  const { error } = await getSupabase().from('order_items').insert(items);
  if (error) throw error;
}

export async function updateOrderStatus(id: number, status: string) {
  const { error } = await getSupabase().from('orders').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

// ============ INVENTORY ============

export async function getInventory() {
  const { data, error } = await getSupabase().from('inventory').select('*').order('category').order('item_name');
  if (error) throw error;
  return data || [];
}

export async function updateInventoryStock(id: number, newStock: number) {
  const status = newStock <= 0 ? 'out_of_stock' : newStock <= 50 ? 'low_stock' : 'in_stock';
  const { error } = await getSupabase().from('inventory').update({ current_stock: newStock, status }).eq('id', id);
  if (error) throw error;
}

export async function addInventoryItem(item: Record<string, unknown>) {
  const { data, error } = await getSupabase().from('inventory').insert(item).select().single();
  if (error) throw error;
  return data;
}

// ============ LEAVE REQUESTS ============

export async function getLeaveRequests(filters?: { employee_id?: number; status?: string }) {
  let query = getSupabase().from('leave_requests').select('*');
  if (filters?.employee_id) query = query.eq('employee_id', filters.employee_id);
  if (filters?.status) query = query.eq('status', filters.status);
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createLeaveRequest(req: { employee_id: number; leave_type: string; start_date: string; end_date: string; days: number; reason: string }) {
  const { data, error } = await getSupabase().from('leave_requests').insert(req).select().single();
  if (error) throw error;
  return data;
}

export async function approveLeaveRequest(id: number, approverId: number) {
  const { error } = await getSupabase().from('leave_requests').update({
    status: 'approved', approved_by: approverId, approved_at: new Date().toISOString(),
  }).eq('id', id);
  if (error) throw error;
}

export async function rejectLeaveRequest(id: number, approverId: number, reason: string) {
  const { error } = await getSupabase().from('leave_requests').update({
    status: 'rejected', approved_by: approverId, approved_at: new Date().toISOString(), reject_reason: reason,
  }).eq('id', id);
  if (error) throw error;
}

// ============ DAILY METRICS (NV nhập số liệu kênh bán) ============

export async function getDailyMetrics(filters?: { date_from?: string; date_to?: string; channel?: string }) {
  let query = getSupabase().from('daily_metrics').select('*');
  if (filters?.date_from) query = query.gte('report_date', filters.date_from);
  if (filters?.date_to) query = query.lte('report_date', filters.date_to);
  if (filters?.channel) query = query.eq('channel', filters.channel);
  const { data, error } = await query.order('report_date', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getDailyMetricsByDate(date: string) {
  const { data, error } = await getSupabase().from('daily_metrics').select('*').eq('report_date', date);
  if (error) throw error;
  return data || [];
}

// ============ FORM TEMPLATES ============

export async function getFormTemplates() {
  const { data, error } = await getSupabase().from('report_form_templates').select('*').eq('is_active', true).order('id');
  if (error) throw error;
  return data || [];
}

export async function getFormTemplateForEmployee(role: string, department: string, employeeId?: number) {
  // Priority: employee-specific > role > department
  const templates = await getFormTemplates();
  // 1. Check employee-specific
  if (employeeId) {
    const empTemplate = templates.find((t: { target_type: string; target_value: string }) =>
      t.target_type === 'employee' && t.target_value === String(employeeId));
    if (empTemplate) return empTemplate;
  }
  // 2. Check role match (using getRoleInputKey logic)
  const roleKey = _matchRoleKey(role);
  const roleTemplate = templates.find((t: { target_type: string; target_value: string }) =>
    t.target_type === 'role' && t.target_value === roleKey);
  if (roleTemplate) return roleTemplate;
  // 3. Check department
  const deptTemplate = templates.find((t: { target_type: string; target_value: string }) =>
    t.target_type === 'department' && t.target_value === department);
  if (deptTemplate) return deptTemplate;
  return null;
}

function _matchRoleKey(role: string): string {
  if (role.includes('CEO') || role.includes('Founder')) return 'CEO';
  if (role.includes('CMO')) return 'CMO';
  if (role.includes('Ads Specialist')) return 'Ads Specialist';
  if (role.includes('Design') || role.includes('Banana')) return 'Design Lead';
  if (role.includes('Trưởng phòng Marketing')) return 'Marketing Manager';
  if (role.includes('Trưởng nhóm Sales')) return 'Sales Lead';
  if (role.includes('Quản lý đơn hàng') || role.includes('Sàn TMĐT')) return 'Order Manager';
  if (role.includes('CSKH') || role.includes('Telesales')) return 'CSKH';
  if (role.includes('Quản lý Sản xuất') || role.includes('Kho')) return 'Production';
  if (role.includes('In ấn') || role.includes('Đóng gói')) return 'Production';
  if (role.includes('Kế toán') || role.includes('HR')) return 'Accounting';
  return 'CEO';
}

export async function upsertFormTemplate(template: { id?: number; name: string; target_type: string; target_value: string; fields: unknown[] }) {
  if (template.id) {
    const { error } = await getSupabase().from('report_form_templates').update({
      name: template.name, target_type: template.target_type, target_value: template.target_value,
      fields: template.fields, updated_at: new Date().toISOString(),
    }).eq('id', template.id);
    if (error) throw error;
  } else {
    const { error } = await getSupabase().from('report_form_templates').insert({
      name: template.name, target_type: template.target_type, target_value: template.target_value,
      fields: template.fields,
    });
    if (error) throw error;
  }
}

export async function deleteFormTemplate(id: number) {
  const { error } = await getSupabase().from('report_form_templates').delete().eq('id', id);
  if (error) throw error;
}

export async function upsertDailyMetric(metric: {
  report_date: string; channel: string; entered_by: number;
  revenue?: number; orders_count?: number; returns_count?: number;
  ad_spend?: number; platform_fee?: number; shipping_cost?: number;
  other_cost?: number; new_customers?: number; notes?: string;
}) {
  const avg = metric.orders_count && metric.orders_count > 0 && metric.revenue
    ? Math.round(metric.revenue / metric.orders_count) : 0;
  const { data, error } = await getSupabase().from('daily_metrics').upsert({
    ...metric,
    avg_order_value: avg,
  }, { onConflict: 'report_date,channel' }).select().single();
  if (error) throw error;
  return data;
}

// ============ MASTER PLANS ============

export async function getMasterPlans(filters?: { role?: string; plan_type?: string; quarter?: string; year?: number }) {
  let query = getSupabase().from('master_plans').select('*');
  if (filters?.role) query = query.eq('role', filters.role);
  if (filters?.plan_type) query = query.eq('plan_type', filters.plan_type);
  if (filters?.quarter) query = query.eq('quarter', filters.quarter);
  if (filters?.year) query = query.eq('year', filters.year);
  const { data, error } = await query.order('created_at');
  if (error) throw error;
  return data || [];
}

export async function updateMasterPlan(id: string, updates: { current_value?: number; status?: string; description?: string }, updatedBy?: number) {
  const supabase = getSupabase();

  // Validate: current_value must not exceed target_value
  if (updates.current_value !== undefined) {
    const { data: plan } = await supabase.from('master_plans').select('target_value, role').eq('id', id).single();
    if (plan && updates.current_value > plan.target_value * 1.5) {
      throw new Error(`Giá trị thực tế (${updates.current_value}) vượt quá 150% mục tiêu (${plan.target_value}). Kiểm tra lại.`);
    }
    if (updates.current_value < 0) {
      throw new Error('Giá trị thực tế không thể âm');
    }
  }

  const { error } = await supabase.from('master_plans').update({
    ...updates,
    updated_at: new Date().toISOString(),
  }).eq('id', id);
  if (error) throw error;
}

// ============ TASK CRUD (Kanban) ============

export async function createTask(task: {
  title: string; assignee_id: number; department: string; priority: string;
  points?: number; category?: string; description?: string; due_date?: string;
  created_by?: number; month_number?: number;
  kpi_metric?: string; kpi_target?: string; kpi_unit?: string;
  context_note?: string; adjusted_target?: number; target_rationale?: string;
  week_cumulative?: number; month_cumulative?: number; channel?: string;
}, supabaseClient?: unknown) {
  const supabase = (supabaseClient || getSupabase()) as ReturnType<typeof getSupabase>;

  // Validate: assignee must exist and be active
  const { data: assignee } = await supabase.from('employees').select('id, department, status')
    .eq('id', task.assignee_id).single();
  if (!assignee) throw new Error(`Nhân viên #${task.assignee_id} không tồn tại`);
  if (assignee.status !== 'Đang làm việc') throw new Error(`Nhân viên #${task.assignee_id} không còn làm việc`);

  // Validate: task department must match assignee's department
  if (task.department && task.department !== assignee.department) {
    throw new Error(`Nhân viên thuộc ${assignee.department}, không thể giao task phòng ${task.department}`);
  }

  // Validate: creator must be manager of assignee's department or CEO
  if (task.created_by && task.created_by !== 1) { // CEO (id=1) can create for anyone
    const { data: emp } = await supabase.from('employees').select('manager_id').eq('id', task.assignee_id).single();
    if (emp && emp.manager_id !== task.created_by) {
      // Check if creator is in same department (peer managers)
      const { data: creator } = await supabase.from('employees').select('department').eq('id', task.created_by).single();
      if (!creator || creator.department !== assignee.department) {
        throw new Error('Bạn chỉ được giao task cho nhân viên trong phòng ban của mình');
      }
    }
  }

  // Validate: KPI target must be a valid positive number if provided
  if (task.kpi_target) {
    const targetNum = parseFloat(String(task.kpi_target).replace(/[^0-9.]/g, ''));
    if (isNaN(targetNum) || targetNum <= 0) {
      throw new Error(`KPI target "${task.kpi_target}" không hợp lệ. Phải là số dương.`);
    }
  }

  // Resolve due_date first, then derive month/week from it
  const dueDate = task.due_date || new Date().toISOString().split('T')[0];
  const dueDateObj = new Date(dueDate + 'T00:00:00'); // Local timezone, no UTC shift

  // Derive month_number from due_date (authoritative source) if not explicitly set
  const monthNum = task.month_number || (dueDateObj.getMonth() + 1);
  if (monthNum < 1 || monthNum > 12) {
    throw new Error(`Tháng ${monthNum} không hợp lệ. Phải từ 1-12.`);
  }

  // Auto-calculate week_number from due_date (ISO week within month: 1-5)
  const dayOfMonth = dueDateObj.getDate();
  const weekNum = Math.ceil(dayOfMonth / 7);

  // Warning: check monthly point budget (900 pts planned)
  const existingTasks = await getTasks({ assignee_id: task.assignee_id, month_number: monthNum }, supabaseClient);
  const existingPoints = existingTasks.reduce((s: number, t: { points: number; source: string }) =>
    t.source === 'planned' ? s + (t.points || 0) : s, 0);
  const newPoints = task.points || 0;
  if (existingPoints + newPoints > 1000) {
    console.warn(`[POINT BUDGET] NV#${task.assignee_id} T${monthNum}: ${existingPoints}+${newPoints}=${existingPoints + newPoints} pts (vượt budget 900)`);
  }

  const { data, error } = await supabase.from('tasks').insert({
    ...task,
    department: assignee.department, // Always use assignee's actual department
    status: 'todo',
    source: 'planned',
    month_number: monthNum,
    week_number: weekNum,
    due_date: dueDate,
  }).select().single();
  if (error) throw error;
  return data;
}

export async function updateTask(id: string, updates: Record<string, unknown>) {
  // Validate: if changing assignee_id, new assignee must exist and be active
  if (updates.assignee_id) {
    const { data: assignee } = await getSupabase().from('employees').select('id, department, status')
      .eq('id', updates.assignee_id).single();
    if (!assignee) throw new Error(`Nhân viên #${updates.assignee_id} không tồn tại`);
    if (assignee.status !== 'Đang làm việc') throw new Error(`Nhân viên không còn làm việc`);
    // Auto-correct department to match assignee
    updates.department = assignee.department;
  }

  // Validate KPI target if being updated
  if (updates.kpi_target) {
    const targetNum = parseFloat(String(updates.kpi_target).replace(/[^0-9.]/g, ''));
    if (isNaN(targetNum) || targetNum <= 0) {
      throw new Error(`KPI target "${updates.kpi_target}" không hợp lệ`);
    }
  }

  const { error } = await getSupabase().from('tasks').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteTask(id: string) {
  // Delete attachments first
  const attachments = await getAttachments({ task_id: id });
  for (const att of attachments) {
    await deleteAttachment(att.id, att.storage_path);
  }
  // Delete comments
  await getSupabase().from('task_comments').delete().eq('task_id', id);
  // Delete task
  const { error } = await getSupabase().from('tasks').delete().eq('id', id);
  if (error) throw error;
}

// ============ TASK COMMENTS ============

export async function getTaskComments(taskId: string) {
  const { data, error } = await getSupabase().from('task_comments').select('*').eq('task_id', taskId).order('created_at');
  if (error) throw error;
  return data || [];
}

export async function addTaskComment(comment: { task_id: string; author_id: number; content: string; mentions?: number[] }) {
  const { data, error } = await getSupabase().from('task_comments').insert(comment).select().single();
  if (error) throw error;
  return data;
}

export async function deleteTaskComment(id: string) {
  const { error } = await getSupabase().from('task_comments').delete().eq('id', id);
  if (error) throw error;
}

// ============ SUBTASKS ============

export interface SubTask {
  id: string;
  title: string;
  assignee_id?: number;
  done: boolean;
  created_at: string;
}

export async function getSubTasks(taskId: string): Promise<SubTask[]> {
  const { data, error } = await getSupabase().from('tasks').select('subtasks').eq('id', taskId).single();
  if (error) throw error;
  return (data?.subtasks as SubTask[]) || [];
}

export async function updateSubTasks(taskId: string, subtasks: SubTask[]): Promise<void> {
  const { error } = await getSupabase().from('tasks').update({ subtasks }).eq('id', taskId);
  if (error) throw error;
}

// ============ TASK ATTACHMENTS ============

export async function uploadTaskAttachment(file: File, meta: { task_id: string; uploaded_by: number }) {
  const supabase = getSupabase();
  const date = new Date().toISOString().split('T')[0];
  const path = `tasks/${meta.task_id}/${Date.now()}_${file.name}`;
  const { error: uploadError } = await supabase.storage.from('evidence').upload(path, file);
  if (uploadError) throw uploadError;
  const { data: { publicUrl } } = supabase.storage.from('evidence').getPublicUrl(path);
  const { data, error } = await supabase.from('attachments').insert({
    task_id: meta.task_id,
    file_name: file.name,
    file_type: file.type,
    file_size: file.size,
    storage_path: path,
    uploaded_by: meta.uploaded_by,
  }).select().single();
  if (error) throw error;
  return { ...data, url: publicUrl };
}

// ============ ATTENDANCE ============

export async function checkIn(employeeId: number) {
  const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const isLate = hour > 8 || (hour === 8 && minute > 30);
  const { data, error } = await getSupabase().from('attendance').upsert({
    employee_id: employeeId,
    date: today,
    check_in: now.toISOString(),
    status: isLate ? 'late' : 'present',
  }, { onConflict: 'employee_id,date' }).select().single();
  if (error) throw error;
  return data;
}

export async function checkOut(employeeId: number) {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await getSupabase().from('attendance').update({
    check_out: new Date().toISOString(),
  }).eq('employee_id', employeeId).eq('date', today).select().single();
  if (error) throw error;
  return data;
}

export async function getAttendanceByMonth(employeeId: number, month: number, year: number) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;
  const { data, error } = await getSupabase().from('attendance').select('*')
    .eq('employee_id', employeeId)
    .gte('date', startDate).lte('date', endDate).order('date');
  if (error) throw error;
  return data || [];
}

// ============ CAREER FRAMEWORK ============

export async function getCareerLevels() {
  const { data, error } = await getSupabase().from('career_levels').select('*').order('code');
  if (error) throw error;
  return data || [];
}

export async function getCareerLevel(code: string) {
  const { data, error } = await getSupabase().from('career_levels').select('*').eq('code', code).maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateCareerLevel(code: string, updates: Record<string, unknown>) {
  const { error } = await getSupabase().from('career_levels').update(updates).eq('code', code);
  if (error) throw error;
}

export async function getEmployeeCareers(filters?: { employee_id?: number }) {
  let query = getSupabase().from('employee_careers').select('*');
  if (filters?.employee_id) query = query.eq('employee_id', filters.employee_id);
  const { data, error } = await query.order('employee_id');
  if (error) throw error;
  return data || [];
}

export async function getEmployeeCareer(employeeId: number) {
  const { data, error } = await getSupabase().from('employee_careers').select('*').eq('employee_id', employeeId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateEmployeeCareer(employeeId: number, updates: Record<string, unknown>) {
  const { error } = await getSupabase().from('employee_careers').update({
    ...updates, updated_at: new Date().toISOString(),
  }).eq('employee_id', employeeId);
  if (error) throw error;
}

export async function getPerformanceRatings(filters?: { employee_id?: number; period?: string }) {
  let query = getSupabase().from('performance_ratings').select('*');
  if (filters?.employee_id) query = query.eq('employee_id', filters.employee_id);
  if (filters?.period) query = query.eq('period', filters.period);
  const { data, error } = await query.order('period');
  if (error) throw error;
  return data || [];
}

export async function upsertPerformanceRating(rating: { employee_id: number; period: string; kpi_score: number; tier: string }) {
  const { data, error } = await getSupabase().from('performance_ratings').upsert(rating, {
    onConflict: 'employee_id,period',
  }).select().single();
  if (error) throw error;
  return data;
}

export async function calculatePromotionReadiness(employeeId: number) {
  const [career, levels, ratings] = await Promise.all([
    getEmployeeCareer(employeeId),
    getCareerLevels(),
    getPerformanceRatings({ employee_id: employeeId }),
  ]);
  if (!career) return null;

  const level = levels.find((l: { code: string }) => l.code === career.level_code);
  if (!level) return null;

  const now = new Date();
  const levelStart = new Date(career.level_start_date);
  const timeServed = (now.getFullYear() - levelStart.getFullYear()) * 12 + (now.getMonth() - levelStart.getMonth());
  const timeRequired = level.min_time_months;
  const timeReady = timeServed >= timeRequired;

  const recentRatings = ratings.slice(-3);
  const avgKPIScore = recentRatings.length > 0
    ? Math.round(recentRatings.reduce((s: number, r: { kpi_score: number }) => s + r.kpi_score, 0) / recentRatings.length)
    : 0;
  const kpiReady = avgKPIScore >= level.required_kpi_percent;

  const getTier = (score: number) => {
    if (score >= 90) return "Top";
    if (score >= 75) return "Strong";
    if (score >= 55) return "Good";
    if (score >= 35) return "Weak";
    return "Poor";
  };
  const currentRating = getTier(avgKPIScore);

  const bandRange = level.salary_band_max - level.salary_band_min;
  const salaryPosition = bandRange > 0
    ? Math.round(((career.current_salary - level.salary_band_min) / bandRange) * 100)
    : 50;

  const nextLevel = level.next_level ? levels.find((l: { code: string }) => l.code === level.next_level) || null : null;

  const missingCriteria: string[] = [];
  if (!timeReady) missingCriteria.push(`Cần thêm ${timeRequired - timeServed} tháng tại cấp bậc hiện tại`);
  if (!kpiReady) missingCriteria.push(`Cần nâng điểm KPI lên ${level.required_kpi_percent}% (hiện tại ${avgKPIScore}%)`);
  if (currentRating === "Weak" || currentRating === "Poor") missingCriteria.push(`Xếp loại hiệu suất cần đạt mức Tốt trở lên`);

  const overallReady = timeReady && kpiReady && currentRating !== "Weak" && currentRating !== "Poor";

  return {
    timeServed, timeRequired, timeReady, avgKPIScore, kpiReady, currentRating,
    salaryPosition: Math.max(0, Math.min(100, salaryPosition)),
    missingCriteria, overallReady, nextLevel,
  };
}

// ============ ATTENDANCE (ADMIN - ALL EMPLOYEES) ============

export async function getAllAttendanceByMonth(month: number, year: number) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;
  const { data, error } = await getSupabase().from('attendance').select('*')
    .gte('date', startDate).lte('date', endDate).order('date');
  if (error) throw error;
  return data || [];
}

// ============ EMPLOYEE SCORING (hybrid: performance_ratings + task data) ============

export async function calculateEmployeeScores(monthNumber?: number) {
  const [employees, tasks, ratingsData] = await Promise.all([
    getEmployees(),
    getTasks(monthNumber ? { month_number: monthNumber } : undefined),
    getSupabase().from('performance_ratings').select('employee_id, kpi_score, period')
      .order('created_at', { ascending: false }),
  ]);

  const ratings = ratingsData.data || [];

  // Build a map of latest performance rating per employee
  const ratingMap = new Map<number, number>();
  // Determine current period for matching (e.g., "T4/2026" for month 4)
  const currentPeriod = monthNumber ? `T${monthNumber}/2026` : null;
  const currentQuarter = monthNumber ? `Q${Math.ceil(monthNumber / 3)}/2026` : null;

  ratings.forEach((r: { employee_id: number; kpi_score: number; period: string }) => {
    // Prefer current month rating, then current quarter, then any latest
    if (!ratingMap.has(r.employee_id)) {
      ratingMap.set(r.employee_id, r.kpi_score);
    }
    // Override with more specific period match
    if (currentPeriod && r.period === currentPeriod) {
      ratingMap.set(r.employee_id, r.kpi_score);
    } else if (currentQuarter && r.period === currentQuarter && !ratings.some(
      (r2: { employee_id: number; period: string }) => r2.employee_id === r.employee_id && r2.period === currentPeriod
    )) {
      ratingMap.set(r.employee_id, r.kpi_score);
    }
  });

  // Task-based scoring
  const scoreMap = new Map<number, { done: number; total: number; points: number; totalPoints: number }>();
  employees.filter((e: { status: string }) => e.status === 'Đang làm việc').forEach((emp: { id: number }) => {
    scoreMap.set(emp.id, { done: 0, total: 0, points: 0, totalPoints: 0 });
  });

  tasks.forEach((task: { assignee_id: number; points: number; status: string }) => {
    const entry = scoreMap.get(task.assignee_id);
    if (entry) {
      entry.total++;
      entry.totalPoints += task.points || 0;
      if (task.status === 'done') {
        entry.done++;
        entry.points += task.points || 0;
      }
    }
  });

  return employees
    .filter((e: { status: string }) => e.status === 'Đang làm việc')
    .map((emp: { id: number; name: string; department: string; role: string; base_salary: number }) => {
      const entry = scoreMap.get(emp.id) || { done: 0, total: 0, points: 0, totalPoints: 0 };
      const ratingScore = ratingMap.get(emp.id);

      // Hybrid KPI: use performance_rating as primary (AI-assessed, holistic)
      // If employee has tasks, blend: 70% rating + 30% task completion
      // If no tasks, use 100% rating. If no rating, use task-based only.
      let scorePercent: number;
      if (ratingScore !== undefined && entry.total > 0) {
        const taskPct = entry.totalPoints > 0
          ? Math.min(Math.round((entry.points / entry.totalPoints) * 100), 100)
          : 0;
        scorePercent = Math.round(ratingScore * 0.7 + taskPct * 0.3);
      } else if (ratingScore !== undefined) {
        scorePercent = ratingScore;
      } else if (entry.total > 0) {
        scorePercent = entry.totalPoints > 0
          ? Math.min(Math.round((entry.points / entry.totalPoints) * 100), 100)
          : 0;
      } else {
        scorePercent = 0;
      }

      return {
        employee: emp,
        totalPoints: entry.points,
        maxPoints: entry.totalPoints,
        completedTasks: entry.done,
        totalTasks: entry.total,
        scorePercent,
        salaryPercent: scorePercent,
      };
    });
}

// ============ NOTIFICATIONS ============

export async function getNotifications(userId: number, limit = 20) {
  const { data, error } = await getSupabase()
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function getUnreadNotificationCount(userId: number): Promise<number> {
  const { count, error } = await getSupabase()
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);
  if (error) throw error;
  return count || 0;
}

export async function markNotificationRead(id: number) {
  const { error } = await getSupabase()
    .from('notifications')
    .update({ read: true })
    .eq('id', id);
  if (error) throw error;
}

export async function markAllNotificationsRead(userId: number) {
  const { error } = await getSupabase()
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);
  if (error) throw error;
}

export async function createNotification(notification: {
  user_id: number;
  type: 'task_assigned' | 'report_submitted' | 'report_approved' | 'alert' | 'system';
  title: string;
  message?: string;
  link?: string;
}, supabaseClient?: unknown) {
  const supabase = (supabaseClient || getSupabase()) as ReturnType<typeof getSupabase>;
  const { error } = await supabase.from('notifications').insert(notification);
  if (error) throw error;
}

// ============ CEO TODOS ============

export async function getCEOTodos(status?: string) {
  let q = getSupabase().from('ceo_todos').select('*').order('is_urgent', { ascending: false }).order('created_at', { ascending: false });
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function createCEOTodo(title: string, category = 'general', is_urgent = false) {
  const { data, error } = await getSupabase().from('ceo_todos').insert({ title, category, is_urgent }).select().single();
  if (error) throw error;
  return data;
}

export async function toggleCEOTodo(id: string) {
  const { data: existing } = await getSupabase().from('ceo_todos').select('status').eq('id', id).single();
  const newStatus = existing?.status === 'done' ? 'todo' : 'done';
  const { error } = await getSupabase().from('ceo_todos').update({
    status: newStatus,
    completed_at: newStatus === 'done' ? new Date().toISOString() : null,
  }).eq('id', id);
  if (error) throw error;
}

export async function deleteCEOTodo(id: string) {
  const { error } = await getSupabase().from('ceo_todos').delete().eq('id', id);
  if (error) throw error;
}
