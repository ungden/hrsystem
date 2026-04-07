import { createPlainServerClient } from '@/lib/supabase-server';
import { buildDailyContext } from '@/lib/agents/daily-task-context';
import { generateContextualDailyTasks } from '@/lib/agents/agent-skills';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // seconds

function todayVN(): string {
  // Vietnam = UTC+7
  const now = new Date();
  const vnTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return vnTime.toISOString().split('T')[0];
}

function isWeekend(dateStr: string): boolean {
  const d = new Date(dateStr);
  return d.getDay() === 0 || d.getDay() === 6;
}

export async function GET(request: Request) {
  // Verify cron secret (Vercel sends Authorization header)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const date = todayVN();

  if (isWeekend(date)) {
    return Response.json({ message: `${date} là cuối tuần — bỏ qua`, generated: 0, skipped: 0 });
  }

  const supabase = createPlainServerClient();

  // Get active employees
  const { data: employees, error: empErr } = await supabase
    .from('employees')
    .select('id, name, role, department, status')
    .eq('status', 'Đang làm việc')
    .order('id');

  if (empErr) {
    return Response.json({ error: `Query employees failed: ${empErr.message}` }, { status: 500 });
  }

  if (!employees || employees.length === 0) {
    return Response.json({ message: 'Không có nhân viên nào', generated: 0 });
  }

  let generated = 0;
  let skipped = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const emp of employees) {
    try {
      // Check duplicate
      const { data: existing } = await supabase
        .from('tasks')
        .select('id')
        .eq('assignee_id', emp.id)
        .eq('due_date', date)
        .limit(1);

      if (existing && existing.length > 0) {
        skipped++;
        continue;
      }

      const context = await buildDailyContext(emp.id, date);
      await generateContextualDailyTasks(
        { id: emp.id, name: emp.name, role: emp.role, department: emp.department },
        date,
        context,
        supabase,
      );

      // Notify employee about new tasks
      await supabase.from('notifications').insert({
        user_id: emp.id,
        type: 'task_assigned',
        title: `Task mới ngày ${date}`,
        message: `AI Agent đã tạo task cho bạn hôm nay. Vào xem và bắt đầu làm việc!`,
        link: '/employee',
      }).then(() => {});

      generated++;
    } catch (err) {
      failed++;
      errors.push(`${emp.name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return Response.json({
    date,
    totalEmployees: employees.length,
    generated,
    skipped,
    failed,
    errors: errors.length > 0 ? errors : undefined,
  });
}
