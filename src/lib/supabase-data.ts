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
