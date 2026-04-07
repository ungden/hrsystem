/**
 * generate-daily-tasks.ts
 *
 * CLI script chạy hàng ngày để tạo task cho tất cả nhân viên đang làm việc.
 * Sử dụng DailyContext để AI agent hiểu hiệu suất hôm qua, chỉ số tuần/tháng,
 * và tốc độ — từ đó tạo task thông minh, phù hợp ngữ cảnh.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/generate-daily-tasks.ts [--date=2026-04-07]
 */

import { createClient } from '@supabase/supabase-js';
import { buildDailyContext } from '../src/lib/agents/daily-task-context';
import { generateContextualDailyTasks } from '../src/lib/agents/agent-skills';

// ---------------------------------------------------------------------------
// Supabase client (CLI — không dùng trình duyệt)
// ---------------------------------------------------------------------------

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error('❌ Thiếu biến môi trường NEXT_PUBLIC_SUPABASE_URL hoặc NEXT_PUBLIC_SUPABASE_ANON_KEY');
    console.error('   Chạy lại với: npx tsx --env-file=.env.local scripts/generate-daily-tasks.ts');
    process.exit(1);
  }

  return createClient(url, key);
}

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

function parseDate(args: string[]): string {
  for (const arg of args) {
    const match = arg.match(/^--date=(\d{4}-\d{2}-\d{2})$/);
    if (match) return match[1];
  }
  // Mặc định: ngày hôm nay theo timezone local
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// ---------------------------------------------------------------------------
// Weekend check
// ---------------------------------------------------------------------------

function isWeekend(dateStr: string): boolean {
  const d = new Date(dateStr);
  const dow = d.getDay();
  return dow === 0 || dow === 6;
}

function getWeekdayNameVi(dateStr: string): string {
  const dow = new Date(dateStr).getDay();
  const names = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  return names[dow];
}

// ---------------------------------------------------------------------------
// Types
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

interface EmployeeResult {
  name: string;
  department: string;
  status: 'tạo thành công' | 'đã có task' | 'lỗi';
  detail?: string;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const date = parseDate(process.argv.slice(2));

  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║     TẠO TASK HÀNG NGÀY — TEEWORLD HR SYSTEM    ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');
  console.log(`📅 Ngày: ${date} (${getWeekdayNameVi(date)})`);
  console.log('');

  // --- Weekend check ---
  if (isWeekend(date)) {
    console.warn(`⚠️  CẢNH BÁO: ${date} là ${getWeekdayNameVi(date)} — ngày cuối tuần!`);
    console.warn('   Không tạo task cho ngày nghỉ. Thoát chương trình.');
    console.log('');
    process.exit(0);
  }

  const supabase = getSupabase();

  // 1. Lấy danh sách nhân viên đang làm việc
  const { data: employees, error: empErr } = await supabase
    .from('employees')
    .select('id, name, role, department, status')
    .eq('status', 'Đang làm việc')
    .order('id');

  if (empErr) {
    console.error(`❌ Lỗi khi truy vấn nhân viên: ${empErr.message}`);
    process.exit(1);
  }

  if (!employees || employees.length === 0) {
    console.log('⚠️  Không tìm thấy nhân viên nào đang làm việc. Thoát.');
    return;
  }

  const activeEmployees = employees as EmployeeRow[];
  console.log(`👥 Tìm thấy ${activeEmployees.length} nhân viên đang làm việc`);
  console.log(`${'─'.repeat(55)}`);
  console.log('');

  let generated = 0;
  let skipped = 0;
  let failed = 0;
  const results: EmployeeResult[] = [];

  // 2. Xử lý từng nhân viên
  for (const emp of activeEmployees) {
    const prefix = `  [${String(emp.id).padStart(2, ' ')}] ${emp.name.padEnd(20)} (${emp.department})`;

    try {
      // Kiểm tra task đã tồn tại cho ngày này chưa
      const { data: existing } = await supabase
        .from('tasks')
        .select('id')
        .eq('assignee_id', emp.id)
        .eq('due_date', date)
        .limit(1);

      const existingTasks = (existing ?? []) as TaskExistenceRow[];
      if (existingTasks.length > 0) {
        console.log(`${prefix} — ⏭️  đã có task, bỏ qua`);
        skipped++;
        results.push({ name: emp.name, department: emp.department, status: 'đã có task' });
        continue;
      }

      // Xây dựng ngữ cảnh (context)
      const context = await buildDailyContext(emp.id, date);

      // Tạo task qua AI agent (truyền supabase client cho server context)
      await generateContextualDailyTasks(
        { id: emp.id, name: emp.name, role: emp.role, department: emp.department },
        date,
        context,
        supabase,
      );

      console.log(`${prefix} — ✅ tạo task thành công`);
      generated++;
      results.push({ name: emp.name, department: emp.department, status: 'tạo thành công' });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`${prefix} — ❌ lỗi: ${message}`);
      failed++;
      results.push({ name: emp.name, department: emp.department, status: 'lỗi', detail: message });
    }
  }

  // 3. Bảng tổng kết
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                     BẢNG TỔNG KẾT                          ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log(`║  Ngày:              ${date.padEnd(40)}║`);
  console.log(`║  Tổng nhân viên:    ${String(activeEmployees.length).padEnd(40)}║`);
  console.log(`║  ✅ Tạo thành công:  ${String(generated).padEnd(39)}║`);
  console.log(`║  ⏭️  Đã có (bỏ qua): ${String(skipped).padEnd(39)}║`);
  console.log(`║  ❌ Lỗi:            ${String(failed).padEnd(40)}║`);
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log('║  CHI TIẾT TỪNG NHÂN VIÊN                                   ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');

  for (const r of results) {
    const statusIcon = r.status === 'tạo thành công' ? '✅' : r.status === 'đã có task' ? '⏭️' : '❌';
    const line = `${statusIcon} ${r.name.padEnd(18)} ${r.department.padEnd(14)} ${r.status}`;
    console.log(`║  ${line.padEnd(60)}║`);
    if (r.detail) {
      console.log(`║     → ${r.detail.slice(0, 53).padEnd(53)}║`);
    }
  }

  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  if (failed > 0) {
    console.log(`⚠️  Có ${failed} nhân viên bị lỗi. Kiểm tra log phía trên để xử lý.`);
    console.log('');
  }

  console.log('🏁 Hoàn tất.');
  console.log('');
}

main().catch((err) => {
  console.error('💥 Lỗi nghiêm trọng:', err);
  process.exit(1);
});
