/**
 * generate-daily-tasks.ts
 *
 * CLI script that generates contextual daily tasks for all active employees.
 * Uses DailyContext to inform the AI agent about yesterday's performance,
 * week/month cumulative metrics, and pace — so generated tasks are smart.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/generate-daily-tasks.ts [--date=2026-04-07]
 */

import { createClient } from '@supabase/supabase-js';
import { buildDailyContext } from '../src/lib/agents/daily-task-context';
import { generateContextualDailyTasks } from '../src/lib/agents/agent-skills';

// ---------------------------------------------------------------------------
// Supabase client (CLI — not browser)
// ---------------------------------------------------------------------------

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

function parseDate(args: string[]): string {
  for (const arg of args) {
    const match = arg.match(/^--date=(\d{4}-\d{2}-\d{2})$/);
    if (match) return match[1];
  }
  // Default to today in local timezone
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

interface EmployeeRow {
  id: number;
  name: string;
  role: string;
  department: string;
  status: string;
}

interface TaskExistenceRow {
  id: string;
}

async function main(): Promise<void> {
  const date = parseDate(process.argv.slice(2));
  console.log(`\n📅 Generating daily tasks for ${date}\n`);

  const supabase = getSupabase();

  // 1. Get all active employees
  const { data: employees, error: empErr } = await supabase
    .from('employees')
    .select('id, name, role, department, status')
    .eq('status', 'Đang làm việc')
    .order('id');

  if (empErr) {
    console.error('❌ Failed to fetch employees:', empErr.message);
    process.exit(1);
  }

  if (!employees || employees.length === 0) {
    console.log('⚠️  No active employees found. Exiting.');
    return;
  }

  const activeEmployees = employees as EmployeeRow[];
  console.log(`👥 Found ${activeEmployees.length} active employees\n`);

  let generated = 0;
  let skipped = 0;
  let failed = 0;

  // 2. Process each employee
  for (const emp of activeEmployees) {
    const prefix = `  [${emp.id}] ${emp.name} (${emp.department})`;

    try {
      // Check if tasks already exist for this employee + date
      const { data: existing } = await supabase
        .from('tasks')
        .select('id')
        .eq('assignee_id', emp.id)
        .eq('due_date', date)
        .limit(1);

      const existingTasks = (existing ?? []) as TaskExistenceRow[];
      if (existingTasks.length > 0) {
        console.log(`${prefix} — skipped (tasks already exist)`);
        skipped++;
        continue;
      }

      // Build context
      const context = await buildDailyContext(emp.id, date);

      // Generate tasks via AI agent
      await generateContextualDailyTasks(
        { id: emp.id, name: emp.name, role: emp.role, department: emp.department },
        date,
        context,
      );

      console.log(`${prefix} — ✅ tasks generated`);
      generated++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`${prefix} — ❌ ${message}`);
      failed++;
    }
  }

  // 3. Summary
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`📊 Summary for ${date}:`);
  console.log(`   Generated: ${generated}`);
  console.log(`   Skipped:   ${skipped}`);
  console.log(`   Failed:    ${failed}`);
  console.log(`   Total:     ${activeEmployees.length}\n`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
