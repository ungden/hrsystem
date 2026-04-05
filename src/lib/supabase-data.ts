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

export async function getTasks(filters?: { assignee_id?: number; status?: string; department?: string; month_number?: number }) {
  let query = getSupabase().from('tasks').select('*');
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
  const { data, error } = await getSupabase().from('tasks').insert({
    ...task,
    status: 'todo',
    source: 'self_added',
    category: 'daily',
    due_date: new Date().toISOString().split('T')[0],
  }).select().single();
  if (error) throw error;
  return data;
}

export async function getEmployeePointStats(employeeId: number, monthNumber: number) {
  const tasks = await getTasks({ assignee_id: employeeId, month_number: monthNumber });
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
  const { error } = await getSupabase().from('daily_reports').update({
    status: notes?.includes('AI auto') ? 'approved' : 'approved',
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
  const { data, error } = await getSupabase().from('task_submissions').upsert(sub, {
    onConflict: 'daily_report_id,task_id',
  }).select().single();
  if (error) throw error;
  return data;
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

export async function updateMasterPlan(id: string, updates: { current_value?: number; status?: string; description?: string }) {
  const { error } = await getSupabase().from('master_plans').update({
    ...updates, updated_at: new Date().toISOString(),
  }).eq('id', id);
  if (error) throw error;
}

// ============ TASK CRUD (Kanban) ============

export async function createTask(task: {
  title: string; assignee_id: number; department: string; priority: string;
  points?: number; category?: string; description?: string; due_date?: string;
  created_by?: number; month_number?: number;
}) {
  const { data, error } = await getSupabase().from('tasks').insert({
    ...task,
    status: 'todo',
    source: 'planned',
    month_number: task.month_number || new Date().getMonth() + 1,
    due_date: task.due_date || new Date().toISOString().split('T')[0],
  }).select().single();
  if (error) throw error;
  return data;
}

export async function updateTask(id: string, updates: Record<string, unknown>) {
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

// ============ EMPLOYEE SCORING (from Supabase tasks) ============

export async function calculateEmployeeScores(monthNumber?: number) {
  const [employees, tasks] = await Promise.all([
    getEmployees(),
    getTasks(monthNumber ? { month_number: monthNumber } : undefined),
  ]);

  const scoreMap = new Map<number, { done: number; total: number; points: number; totalPoints: number }>();
  employees.filter((e: { status: string }) => e.status === 'active').forEach((emp: { id: number }) => {
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
    .filter((e: { status: string }) => e.status === 'active')
    .map((emp: { id: number; name: string; department: string; role: string; base_salary: number }) => {
      const entry = scoreMap.get(emp.id) || { done: 0, total: 0, points: 0, totalPoints: 0 };
      const maxPoints = Math.max(entry.totalPoints, 1000);
      const scorePercent = maxPoints > 0 ? Math.min(Math.round((entry.points / maxPoints) * 100), 100) : 0;
      return {
        employee: emp,
        totalPoints: entry.points,
        maxPoints,
        completedTasks: entry.done,
        totalTasks: entry.total,
        scorePercent,
        salaryPercent: scorePercent,
      };
    });
}
