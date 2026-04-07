/**
 * Agent Skills — Write operations that agents can execute.
 * Each skill validates inputs and logs actions.
 */
import { AgentAction, AgentRole } from '../agent-types';
import {
  createTask, updateTask, updateMasterPlan,
  getEmployees, getTasks, getTasksWithActuals,
  updateInventoryStock, getInventory,
} from '@/lib/supabase-data';
import type { DailyContext } from './daily-task-context';

const actionLog: AgentAction[] = [];

/** Get working days (Mon-Fri) for a given month in the current year */
function getWorkingDays(monthNumber: number): string[] {
  const year = new Date().getFullYear();
  const daysInMonth = new Date(year, monthNumber, 0).getDate();
  const workingDays: string[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, monthNumber - 1, d);
    const dow = date.getDay();
    if (dow !== 0 && dow !== 6) {
      // Format as YYYY-MM-DD without UTC conversion to avoid timezone shift
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      workingDays.push(`${yyyy}-${mm}-${dd}`);
    }
  }
  return workingDays;
}

/** Pick a due_date from working days, distributing evenly by index */
function pickDueDate(workingDays: string[], index: number): string {
  return workingDays[index % workingDays.length];
}

function logAction(agentRole: AgentRole, actionType: string, description: string, success: boolean, details?: Record<string, unknown>): AgentAction {
  const action: AgentAction = {
    id: `action-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    agentRole,
    actionType,
    description,
    timestamp: new Date().toISOString(),
    success,
    details,
  };
  actionLog.push(action);
  return action;
}

export function getActionLog(): AgentAction[] {
  return [...actionLog];
}

export function clearActionLog(): void {
  actionLog.length = 0;
}

// ============ CEO SKILLS ============

/** CEO can update quarterly targets in master_plans */
export async function ceoAdjustTarget(planId: string, newTarget: number, reason: string): Promise<AgentAction> {
  try {
    await updateMasterPlan(planId, { current_value: newTarget, description: reason });
    return logAction('ceo', 'adjust_target', `CEO điều chỉnh mục tiêu ${planId}: ${newTarget}. Lý do: ${reason}`, true, { planId, newTarget });
  } catch (e) {
    return logAction('ceo', 'adjust_target', `LOI: ${(e as Error).message}`, false, { planId });
  }
}

// ============ HR DIRECTOR SKILLS ============

/** HR can create tasks for employees (with department scoping) */
export async function hrAssignTask(params: {
  title: string; assignee_id: number; priority: string;
  points?: number; month_number?: number; due_date?: string;
  kpi_metric?: string; kpi_target?: string; kpi_unit?: string; created_by: number;
}): Promise<AgentAction> {
  try {
    const employees = await getEmployees();
    const assignee = employees.find((e: { id: number }) => e.id === params.assignee_id);
    if (!assignee) throw new Error(`NV #${params.assignee_id} không tồn tại`);

    // Auto-assign due_date if not provided: pick a working day in the month
    let dueDate = params.due_date;
    if (!dueDate && params.month_number) {
      const workingDays = getWorkingDays(params.month_number);
      // Distribute: use assignee_id + title hash as index for spread
      const hash = params.title.length + params.assignee_id;
      dueDate = pickDueDate(workingDays, hash);
    }

    const task = await createTask({
      ...params,
      due_date: dueDate,
      department: assignee.department,
    });
    return logAction('hr_director', 'assign_task', `HR giao task "${params.title}" cho ${assignee.name} (${dueDate || 'hôm nay'})`, true, { taskId: task.id, assignee: assignee.name, due_date: dueDate });
  } catch (e) {
    return logAction('hr_director', 'assign_task', `LOI: ${(e as Error).message}`, false, { params });
  }
}

/** HR can rebalance workload: move tasks from overloaded to underloaded employees */
export async function hrRebalanceWorkload(fromEmpId: number, toEmpId: number, taskId: string): Promise<AgentAction> {
  try {
    await updateTask(taskId, { assignee_id: toEmpId });
    return logAction('hr_director', 'rebalance', `Chuyển task ${taskId} từ NV#${fromEmpId} sang NV#${toEmpId}`, true, { taskId, fromEmpId, toEmpId });
  } catch (e) {
    return logAction('hr_director', 'rebalance', `LOI: ${(e as Error).message}`, false);
  }
}

/** HR detect overloaded employees */
export async function hrFlagOverloaded(): Promise<{ overloaded: Array<{ id: number; name: string; taskCount: number; points: number }>; actions: AgentAction[] }> {
  const employees = await getEmployees();
  const active = employees.filter((e: { status: string }) => e.status === 'Đang làm việc');
  const allTasks = await getTasksWithActuals();
  const actions: AgentAction[] = [];
  const overloaded: Array<{ id: number; name: string; taskCount: number; points: number }> = [];

  for (const emp of active) {
    const empTasks = allTasks.filter(t => t.assignee_id === emp.id && t.status !== 'done');
    const points = empTasks.reduce((s, t) => s + (t.points || 0), 0);
    if (points > 900) {
      overloaded.push({ id: emp.id, name: emp.name, taskCount: empTasks.length, points });
    }
  }

  if (overloaded.length > 0) {
    actions.push(logAction('hr_director', 'flag_overloaded',
      `Phát hiện ${overloaded.length} NV quá tải: ${overloaded.map(e => `${e.name} (${e.points}pts)`).join(', ')}`, true, { overloaded }));
  }

  return { overloaded, actions };
}

// ============ DEPT MANAGER SKILLS ============

/** Dept Manager can create daily tasks for team members */
export async function deptCreateDailyTasks(managerId: number, monthNumber: number): Promise<AgentAction> {
  try {
    const employees = await getEmployees();
    const manager = employees.find((e: { id: number }) => e.id === managerId);
    if (!manager) throw new Error('Manager không tồn tại');

    const teamMembers = employees.filter((e: { department: string; status: string; id: number }) =>
      e.department === manager.department && e.status === 'Đang làm việc' && e.id !== managerId
    );

    const workingDays = getWorkingDays(monthNumber);
    let created = 0;

    // Department-specific daily task templates with KPI
    const deptTaskTemplates: Record<string, { title: string; kpi_metric?: string; kpi_target?: string; kpi_unit?: string }[]> = {
      'Sales': [
        { title: 'Liên hệ khách hàng mới', kpi_metric: 'contacts', kpi_target: '10', kpi_unit: 'khách' },
        { title: 'Chốt đơn hàng', kpi_metric: 'orders', kpi_target: '3', kpi_unit: 'đơn' },
        { title: 'Chăm sóc khách hàng cũ', kpi_metric: 'followups', kpi_target: '5', kpi_unit: 'khách' },
        { title: 'Tư vấn sản phẩm qua chat', kpi_metric: 'chat_replies', kpi_target: '15', kpi_unit: 'tin nhắn' },
        { title: 'Báo cáo doanh số kênh', kpi_metric: 'channel_reports', kpi_target: '1', kpi_unit: 'báo cáo' },
      ],
      'Marketing': [
        { title: 'Tạo content cho social media', kpi_metric: 'content_pieces', kpi_target: '3', kpi_unit: 'bài' },
        { title: 'Quản lý quảng cáo Facebook/IG', kpi_metric: 'roas', kpi_target: '3', kpi_unit: 'x' },
        { title: 'Phân tích hiệu quả kênh bán', kpi_metric: 'reports', kpi_target: '1', kpi_unit: 'báo cáo' },
        { title: 'Chăm sóc cộng đồng & UGC', kpi_metric: 'community_interactions', kpi_target: '10', kpi_unit: 'tương tác' },
      ],
      'Thiết kế': [
        { title: 'Thiết kế sản phẩm BST mới', kpi_metric: 'designs', kpi_target: '2', kpi_unit: 'mẫu' },
        { title: 'Thiết kế content marketing', kpi_metric: 'marketing_visuals', kpi_target: '3', kpi_unit: 'visual' },
        { title: 'Review chất lượng in/thêu', kpi_metric: 'quality_checks', kpi_target: '5', kpi_unit: 'sản phẩm' },
      ],
      'Vận hành': [
        { title: 'Xử lý đơn hàng & đóng gói', kpi_metric: 'orders_processed', kpi_target: '20', kpi_unit: 'đơn' },
        { title: 'Kiểm kê tồn kho', kpi_metric: 'inventory_checks', kpi_target: '1', kpi_unit: 'lần' },
        { title: 'Quản lý giao vận', kpi_metric: 'shipments_tracked', kpi_target: '15', kpi_unit: 'đơn' },
        { title: 'Cập nhật hệ thống kho', kpi_metric: 'stock_updates', kpi_target: '1', kpi_unit: 'lần' },
      ],
      'Kế toán': [
        { title: 'Ghi nhận thu chi & công nợ', kpi_metric: 'entries', kpi_target: '15', kpi_unit: 'bút toán' },
        { title: 'Đối soát ngân hàng', kpi_metric: 'reconciliations', kpi_target: '1', kpi_unit: 'lần' },
        { title: 'Theo dõi công nợ khách hàng', kpi_metric: 'debt_followups', kpi_target: '5', kpi_unit: 'khách' },
      ],
      'Ban Giám đốc': [
        { title: 'Review doanh thu & KPI ngày hôm trước', kpi_metric: 'kpi_reviews', kpi_target: '1', kpi_unit: 'báo cáo' },
        { title: 'Duyệt nội dung marketing/ads', kpi_metric: 'content_approvals', kpi_target: '3', kpi_unit: 'nội dung' },
        { title: 'Review đơn hàng & tỷ lệ hoàn', kpi_metric: 'order_reviews', kpi_target: '1', kpi_unit: 'báo cáo' },
        { title: 'Họp sync team / coaching', kpi_metric: 'team_syncs', kpi_target: '1', kpi_unit: 'buổi' },
      ],
    };

    const defaultTemplates = [
      { title: 'Nhiệm vụ hàng ngày', kpi_metric: 'tasks_done', kpi_target: '3', kpi_unit: 'việc' },
    ];

    for (const emp of teamMembers) {
      const existingTasks = await getTasks({ assignee_id: emp.id, month_number: monthNumber });
      if (existingTasks.length === 0) {
        const templates = deptTaskTemplates[emp.department] || defaultTemplates;
        const pointsPerTask = Math.round(45 / templates.length); // ~45 pts/day split across templates

        for (let dayIdx = 0; dayIdx < workingDays.length; dayIdx++) {
          const dateStr = workingDays[dayIdx].slice(5); // MM-DD
          for (const tmpl of templates) {
            await createTask({
              title: `${tmpl.title} (${dateStr})`,
              assignee_id: emp.id,
              department: emp.department,
              priority: 'medium',
              points: pointsPerTask,
              month_number: monthNumber,
              due_date: workingDays[dayIdx],
              created_by: managerId,
              kpi_metric: tmpl.kpi_metric,
              kpi_target: tmpl.kpi_target,
              kpi_unit: tmpl.kpi_unit,
            });
            created++;
          }
        }
      }
    }

    return logAction('dept_manager', 'create_daily_tasks',
      `TrP ${manager.name} tạo ${created} task cho ${teamMembers.length} NV T${monthNumber} (phân theo ngày)`, true, { created, month: monthNumber, daysPerEmployee: workingDays.length });
  } catch (e) {
    return logAction('dept_manager', 'create_daily_tasks', `LOI: ${(e as Error).message}`, false);
  }
}

// ============ CONTEXTUAL DAILY TASKS ============

/** Department-specific task templates with adaptive logic */
interface TaskTemplate {
  title: string;
  kpi_metric: string;
  kpi_target: number; // base daily target
  kpi_unit: string;
  points: number;
  contextBuilder: (ctx: DailyContext) => { adjustedTarget: number; contextNote: string; rationale: string; priority: string; titleSuffix: string };
}

function buildAdaptiveInfo(
  ctx: DailyContext,
  metric: string,
  baseTarget: number,
  unit: string,
): { adjustedTarget: number; contextNote: string; rationale: string; priority: string } {
  const month = ctx.monthCumulative[metric];
  const week = ctx.weekCumulative[metric];
  const yesterday = ctx.yesterday.metrics[metric];
  const paceTarget = ctx.pace.dailyTargetToHitMonthly[metric];

  // Start with pace-based target, fall back to base
  let adjustedTarget = paceTarget && paceTarget > 0 ? paceTarget : baseTarget;
  let priority = 'medium';
  const notes: string[] = [];

  if (month) {
    notes.push(`Tháng: ${month.actual}/${month.target} ${unit} (${month.pctAchieved}%)`);
    if (month.pctAchieved < 50 && ctx.pace.workingDaysRemaining <= 10) {
      priority = 'high';
      adjustedTarget = Math.ceil(adjustedTarget * 1.15); // Push 15% harder
      notes.push('Cần tăng tốc để đạt target tháng');
    } else if (month.pctAchieved >= 90) {
      priority = 'low';
      notes.push('Gần đạt target tháng, tập trung chất lượng');
    }
  }

  if (week) {
    notes.push(`Tuần: ${week.actual}/${week.target} ${unit}, còn ${week.remaining} trong ${week.daysLeft} ngày`);
    if (week.daysLeft > 0 && week.remaining > 0) {
      const weekPace = Math.ceil(week.remaining / week.daysLeft);
      if (weekPace > adjustedTarget) adjustedTarget = weekPace;
    }
  }

  if (yesterday) {
    const yPct = yesterday.target > 0 ? Math.round((yesterday.actual / yesterday.target) * 100) : 0;
    if (yPct < 80) {
      notes.push(`Hôm qua: ${yesterday.actual}/${yesterday.target} ${unit} (${yPct}%) — cần bù`);
      if (priority === 'medium') priority = 'high';
    } else if (yPct >= 120) {
      notes.push(`Hôm qua: vượt target (${yPct}%) — tốt!`);
    }
  }

  const rationale = ctx.pace.workingDaysRemaining > 0
    ? `Còn ${ctx.pace.workingDaysRemaining} ngày làm việc. ${month ? `Cần ${adjustedTarget} ${unit}/ngày để đạt ${month.target} ${unit}/tháng.` : ''}`
    : 'Ngày cuối tháng.';

  return {
    adjustedTarget: Math.max(1, adjustedTarget),
    contextNote: notes.join(' | ') || `Target cơ bản: ${baseTarget} ${unit}/ngày`,
    rationale,
    priority,
  };
}

const DEPT_TEMPLATES: Record<string, TaskTemplate[]> = {
  'Sales': [
    {
      title: 'Liên hệ khách hàng mới',
      kpi_metric: 'contacts', kpi_target: 10, kpi_unit: 'khách', points: 15,
      contextBuilder: (ctx) => {
        const info = buildAdaptiveInfo(ctx, 'contacts', 10, 'khách');
        const desc = 'Quét leads từ Website D2C, IG DM, FB Inbox, Shopee chat. Đánh giá tiềm năng (quan tâm BST nào, ngân sách). Ghi nhận vào CRM với tag nguồn kênh. Follow-up trong vòng 2 giờ kể từ lúc khách nhắn.';
        return { ...info, titleSuffix: '', contextNote: `${desc} | ${info.contextNote}`, rationale: `Teeworld cần 10 leads/ngày để duy trì pipeline bán hàng 5 kênh. ${info.rationale}` };
      },
    },
    {
      title: 'Chốt đơn hàng',
      kpi_metric: 'orders', kpi_target: 3, kpi_unit: 'đơn', points: 20,
      contextBuilder: (ctx) => {
        const info = buildAdaptiveInfo(ctx, 'orders', 3, 'đơn');
        const desc = 'Xử lý các đơn hàng đang chờ xác nhận trên tất cả kênh (Website, FB, Shopee, B2B). Xác nhận thanh toán, phối hợp với Kho để đóng gói. Cập nhật trạng thái đơn hàng trên hệ thống và thông báo khách.';
        return { ...info, titleSuffix: '', contextNote: `${desc} | ${info.contextNote}`, rationale: `Mục tiêu 20 tỷ/năm cần trung bình 3 đơn/ngày/nhân viên Sales. ${info.rationale}` };
      },
    },
    {
      title: 'Chăm sóc khách hàng cũ',
      kpi_metric: 'followups', kpi_target: 5, kpi_unit: 'khách', points: 10,
      contextBuilder: (ctx) => {
        const info = buildAdaptiveInfo(ctx, 'followups', 5, 'khách');
        const desc = 'Liên hệ khách đã mua trong 30 ngày qua qua Zalo/điện thoại. Hỏi feedback sản phẩm, giới thiệu BST mới (Saigonese, Happy Sunday, Texture Studio). Ghi chú phản hồi và cơ hội upsell vào CRM.';
        return { ...info, titleSuffix: '', contextNote: `${desc} | ${info.contextNote}`, rationale: `Khách cũ có tỷ lệ chuyển đổi cao gấp 3x khách mới. Chăm sóc 5 khách/ngày duy trì retention rate. ${info.rationale}` };
      },
    },
    {
      title: 'Tư vấn sản phẩm qua chat',
      kpi_metric: 'chat_replies', kpi_target: 15, kpi_unit: 'tin nhắn', points: 10,
      contextBuilder: (ctx) => {
        const info = buildAdaptiveInfo(ctx, 'chat_replies', 15, 'tin nhắn');
        const desc = 'Trả lời tất cả tin nhắn tư vấn trên các kênh (Website livechat, FB Messenger, IG DM, Shopee chat) trong vòng 15 phút. Gợi ý size/form phù hợp, upsell phụ kiện retro/streetwear. Gửi hình thực tế nếu khách yêu cầu.';
        return { ...info, titleSuffix: '', contextNote: `${desc} | ${info.contextNote}`, rationale: `Tốc độ phản hồi chat quyết định tỷ lệ chốt đơn. Target 15 tin/ngày cover 5 kênh bán hàng. ${info.rationale}` };
      },
    },
    {
      title: 'Báo cáo doanh số kênh',
      kpi_metric: 'channel_reports', kpi_target: 1, kpi_unit: 'báo cáo', points: 10,
      contextBuilder: (ctx) => {
        const info = buildAdaptiveInfo(ctx, 'channel_reports', 1, 'báo cáo');
        const desc = 'Tổng hợp doanh thu từng kênh (Website D2C, Facebook, TikTok/IG, Shopee, B2B). So sánh với ngày hôm trước và cùng kỳ tuần trước. Đánh dấu bất thường (kênh giảm >20%, kênh tăng đột biến). Gửi báo cáo cho Ban Giám đốc trước 10h sáng.';
        return { ...info, titleSuffix: '', contextNote: `${desc} | ${info.contextNote}`, rationale: `CEO cần nắm doanh số 5 kênh mỗi ngày để điều phối ngân sách quảng cáo và nhân sự. ${info.rationale}` };
      },
    },
  ],
  'Marketing': [
    {
      title: 'Tạo content cho social media',
      kpi_metric: 'content_pieces', kpi_target: 3, kpi_unit: 'bài', points: 15,
      contextBuilder: (ctx) => {
        const info = buildAdaptiveInfo(ctx, 'content_pieces', 3, 'bài');
        const desc = 'Chụp/quay sản phẩm BST hiện tại (áo, quần, phụ kiện). Viết caption theo brand voice Teeworld (fun, retro Saigonese, có quote hay). Lên lịch đăng bài trên FB, IG, TikTok. Đảm bảo đúng tone các sub-brand: Saigonese, Quote, Happy Sunday, Texture Studio.';
        return { ...info, titleSuffix: '', contextNote: `${desc} | ${info.contextNote}`, rationale: `3 bài/ngày duy trì tần suất xuất hiện trên newsfeed, hỗ trợ mục tiêu doanh thu 20 tỷ/năm. ${info.rationale}` };
      },
    },
    {
      title: 'Quản lý quảng cáo Facebook/IG',
      kpi_metric: 'roas', kpi_target: 3, kpi_unit: 'x', points: 20,
      contextBuilder: (ctx) => {
        const info = buildAdaptiveInfo(ctx, 'roas', 3, 'x');
        const desc = 'Kiểm tra chi phí quảng cáo vs doanh thu từng campaign. Tạm dừng ads ROAS < 2.0, scale budget cho ads ROAS > 4.0. Điều chỉnh audience targeting, thử A/B creative mới. Đảm bảo ROAS tổng >= 3.0 để giữ margin 30%.';
        return { ...info, titleSuffix: '', contextNote: `${desc} | ${info.contextNote}`, rationale: `ROAS 3.0 là ngưỡng tối thiểu để đảm bảo biên lợi nhuận 30%. Website D2C (40.9% margin) ưu tiên scale trước. ${info.rationale}` };
      },
    },
    {
      title: 'Phân tích hiệu quả kênh bán',
      kpi_metric: 'reports', kpi_target: 1, kpi_unit: 'báo cáo', points: 10,
      contextBuilder: (ctx) => {
        const info = buildAdaptiveInfo(ctx, 'reports', 1, 'báo cáo');
        const desc = 'Tổng hợp metrics hàng ngày của 5 kênh: doanh thu, số đơn, AOV (giá trị đơn trung bình), ROAS theo kênh. So sánh xu hướng tuần. Xác định kênh nào cần tăng/giảm ngân sách. Gửi báo cáo cho CEO và Sales trước 11h.';
        return { ...info, titleSuffix: '', contextNote: `${desc} | ${info.contextNote}`, rationale: `Dữ liệu kênh giúp tối ưu phân bổ ngân sách: Website 40.9% > FB 35.1% > B2B 30.7% > TikTok 26.4% > Shopee 18.5% margin. ${info.rationale}` };
      },
    },
    {
      title: 'Chăm sóc cộng đồng & UGC',
      kpi_metric: 'community_interactions', kpi_target: 10, kpi_unit: 'tương tác', points: 10,
      contextBuilder: (ctx) => {
        const info = buildAdaptiveInfo(ctx, 'community_interactions', 10, 'tương tác');
        const desc = 'Trả lời comment trên FB/IG/TikTok trong vòng 1 giờ. Repost ảnh khách mặc đồ Teeworld (UGC) lên story. Tương tác với brand mentions, hashtag #teeworld. Xây dựng cộng đồng yêu thời trang retro/streetwear Sài Gòn.';
        return { ...info, titleSuffix: '', contextNote: `${desc} | ${info.contextNote}`, rationale: `UGC và cộng đồng tạo social proof miễn phí, giảm chi phí quảng cáo dài hạn. 10 tương tác/ngày là mức tối thiểu. ${info.rationale}` };
      },
    },
  ],
  'Thiết kế': [
    {
      title: 'Thiết kế sản phẩm BST mới',
      kpi_metric: 'designs', kpi_target: 2, kpi_unit: 'mẫu', points: 20,
      contextBuilder: (ctx) => {
        const info = buildAdaptiveInfo(ctx, 'designs', 2, 'mẫu');
        const desc = 'Nghiên cứu xu hướng thời trang retro/streetwear hiện tại. Phác thảo mẫu mới cho BST tháng này. Sử dụng AI tools (Banana Pro 2) để iterate nhanh. Chuẩn bị tech pack chi tiết (chất liệu, màu sắc, size chart) cho xưởng sản xuất.';
        return { ...info, titleSuffix: '', contextNote: `${desc} | ${info.contextNote}`, rationale: `12 BST/năm = 1 BST/tháng. Cần 2 mẫu/ngày để kịp timeline ra BST đúng hẹn. ${info.rationale}` };
      },
    },
    {
      title: 'Thiết kế content marketing',
      kpi_metric: 'marketing_visuals', kpi_target: 3, kpi_unit: 'visual', points: 15,
      contextBuilder: (ctx) => {
        const info = buildAdaptiveInfo(ctx, 'marketing_visuals', 3, 'visual');
        const desc = 'Thiết kế banner cho Website/social media, edit ảnh sản phẩm chuyên nghiệp. Đảm bảo nhất quán thương hiệu Teeworld (font, màu, tone retro Saigonese). Xuất file đúng kích thước cho từng platform (FB, IG story, TikTok, Shopee).';
        return { ...info, titleSuffix: '', contextNote: `${desc} | ${info.contextNote}`, rationale: `Marketing cần 3 visual/ngày cho content social media. Chất lượng hình ảnh ảnh hưởng trực tiếp đến tỷ lệ chuyển đổi. ${info.rationale}` };
      },
    },
    {
      title: 'Review chất lượng in/thêu',
      kpi_metric: 'quality_checks', kpi_target: 5, kpi_unit: 'sản phẩm', points: 10,
      contextBuilder: (ctx) => {
        const info = buildAdaptiveInfo(ctx, 'quality_checks', 5, 'sản phẩm');
        const desc = 'Kiểm tra chất lượng in/thêu trên sản phẩm thực tế so với file thiết kế gốc. Đánh giá màu sắc, độ sắc nét, vị trí đặt hình. Đánh dấu lỗi và gửi feedback cho xưởng sản xuất trước khi ship hàng.';
        return { ...info, titleSuffix: '', contextNote: `${desc} | ${info.contextNote}`, rationale: `QC trước khi ship giảm tỷ lệ hoàn hàng. 5 sản phẩm/ngày cover các mẫu đang sản xuất. ${info.rationale}` };
      },
    },
  ],
  'Vận hành': [
    {
      title: 'Xử lý đơn hàng & đóng gói',
      kpi_metric: 'orders_processed', kpi_target: 20, kpi_unit: 'đơn', points: 20,
      contextBuilder: (ctx) => {
        const info = buildAdaptiveInfo(ctx, 'orders_processed', 20, 'đơn');
        const desc = 'Pick sản phẩm từ kho theo danh sách đơn hàng mới. Kiểm tra chất lượng từng item trước khi đóng gói. Đóng gói với vật liệu thương hiệu Teeworld (túi, sticker, thiệp cảm ơn). Dán nhãn vận chuyển và bàn giao cho đơn vị giao hàng.';
        return { ...info, titleSuffix: '', contextNote: `${desc} | ${info.contextNote}`, rationale: `20 đơn/ngày là công suất cần thiết để xử lý đơn hàng từ 5 kênh bán. ${info.rationale}` };
      },
    },
    {
      title: 'Kiểm kê tồn kho',
      kpi_metric: 'inventory_checks', kpi_target: 1, kpi_unit: 'lần', points: 15,
      contextBuilder: (ctx) => {
        const info = buildAdaptiveInfo(ctx, 'inventory_checks', 1, 'lần');
        const desc = 'Đếm số lượng các SKU chủ lực (top 20 sản phẩm bán chạy). Cập nhật tồn kho trên hệ thống. Đánh dấu sản phẩm dưới mức tồn kho tối thiểu (min_stock). Báo cáo cho quản lý để lên kế hoạch nhập hàng.';
        return { ...info, titleSuffix: '', contextNote: `${desc} | ${info.contextNote}`, rationale: `Kiểm kê hàng ngày tránh tình trạng hết hàng hot hoặc tồn kho quá nhiều. ${info.rationale}` };
      },
    },
    {
      title: 'Quản lý giao vận',
      kpi_metric: 'shipments_tracked', kpi_target: 15, kpi_unit: 'đơn', points: 10,
      contextBuilder: (ctx) => {
        const info = buildAdaptiveInfo(ctx, 'shipments_tracked', 15, 'đơn');
        const desc = 'Theo dõi trạng thái các đơn hàng đang vận chuyển. Xử lý đơn hoàn/khiếu nại từ khách hàng. Phối hợp với đơn vị vận chuyển (GHN, GHTK, J&T) giải quyết đơn trễ hoặc thất lạc. Cập nhật trạng thái cho Sales.';
        return { ...info, titleSuffix: '', contextNote: `${desc} | ${info.contextNote}`, rationale: `Theo dõi giao vận giảm tỷ lệ hoàn và tăng trải nghiệm khách hàng. ${info.rationale}` };
      },
    },
    {
      title: 'Cập nhật hệ thống kho',
      kpi_metric: 'stock_updates', kpi_target: 1, kpi_unit: 'lần', points: 10,
      contextBuilder: (ctx) => {
        const info = buildAdaptiveInfo(ctx, 'stock_updates', 1, 'lần');
        const desc = 'Đối chiếu tồn kho thực tế với số liệu trên hệ thống. Sửa chênh lệch nếu có, ghi chú lý do. Chuẩn bị danh sách đặt hàng bổ sung cho các SKU sắp hết. Sync tồn kho lên tất cả kênh bán (Website, Shopee, FB).';
        return { ...info, titleSuffix: '', contextNote: `${desc} | ${info.contextNote}`, rationale: `Sai lệch tồn kho gây oversell hoặc mất doanh thu. Cập nhật hàng ngày là bắt buộc. ${info.rationale}` };
      },
    },
  ],
  'Kế toán': [
    {
      title: 'Ghi nhận thu chi & công nợ',
      kpi_metric: 'entries', kpi_target: 15, kpi_unit: 'bút toán', points: 20,
      contextBuilder: (ctx) => {
        const info = buildAdaptiveInfo(ctx, 'entries', 15, 'bút toán');
        const desc = 'Ghi nhận tất cả giao dịch thu/chi trong ngày từ 5 kênh bán hàng. Đối chiếu với sao kê ngân hàng. Phân loại chi phí (COGS, marketing, vận hành, nhân sự). Cập nhật công nợ nhà cung cấp và khách hàng B2B.';
        return { ...info, titleSuffix: '', contextNote: `${desc} | ${info.contextNote}`, rationale: `Ghi nhận kịp thời giúp CEO nắm dòng tiền thực tế, đảm bảo margin 30%. ${info.rationale}` };
      },
    },
    {
      title: 'Đối soát ngân hàng',
      kpi_metric: 'reconciliations', kpi_target: 1, kpi_unit: 'lần', points: 15,
      contextBuilder: (ctx) => {
        const info = buildAdaptiveInfo(ctx, 'reconciliations', 1, 'lần');
        const desc = 'So sánh sao kê ngân hàng với sổ sách nội bộ. Đánh dấu các giao dịch chênh lệch hoặc chưa ghi nhận. Giải quyết các khoản không khớp trong ngày. Báo cáo cho CFO nếu phát hiện bất thường.';
        return { ...info, titleSuffix: '', contextNote: `${desc} | ${info.contextNote}`, rationale: `Đối soát hàng ngày phát hiện sai sót sớm, tránh tích lũy sai lệch cuối tháng. ${info.rationale}` };
      },
    },
    {
      title: 'Theo dõi công nợ khách hàng',
      kpi_metric: 'debt_followups', kpi_target: 5, kpi_unit: 'khách', points: 10,
      contextBuilder: (ctx) => {
        const info = buildAdaptiveInfo(ctx, 'debt_followups', 5, 'khách');
        const desc = 'Kiểm tra danh sách hóa đơn quá hạn từ khách B2B và đại lý. Gửi nhắc thanh toán qua email/Zalo. Escalate cho CEO nếu công nợ quá hạn >30 ngày. Cập nhật trạng thái thu hồi trên hệ thống.';
        return { ...info, titleSuffix: '', contextNote: `${desc} | ${info.contextNote}`, rationale: `Công nợ quá hạn ảnh hưởng dòng tiền. Theo dõi 5 khách/ngày đảm bảo thu hồi đúng hạn. ${info.rationale}` };
      },
    },
  ],
  'Ban Giám đốc': [
    {
      title: 'Review doanh thu & KPI ngày hôm trước',
      kpi_metric: 'kpi_reviews', kpi_target: 1, kpi_unit: 'báo cáo', points: 15,
      contextBuilder: (ctx) => {
        const info = buildAdaptiveInfo(ctx, 'kpi_reviews', 1, 'báo cáo');
        const desc = 'Xem lại KPI tất cả phòng ban từ ngày hôm trước: doanh thu theo kênh, số đơn, ROAS, tỷ lệ hoàn. Xác định gap giữa thực tế và mục tiêu. Lên kế hoạch can thiệp cho các chỉ số dưới 80% target.';
        return { ...info, titleSuffix: '', contextNote: `${desc} | ${info.contextNote}`, rationale: `CEO cần review KPI mỗi sáng để phản ứng nhanh, giữ nhịp đạt mục tiêu 20 tỷ/năm. ${info.rationale}` };
      },
    },
    {
      title: 'Duyệt nội dung marketing/ads',
      kpi_metric: 'content_approvals', kpi_target: 3, kpi_unit: 'nội dung', points: 10,
      contextBuilder: (ctx) => {
        const info = buildAdaptiveInfo(ctx, 'content_approvals', 3, 'nội dung');
        const desc = 'Review các bài đăng và campaign quảng cáo đang chờ duyệt. Kiểm tra brand voice (retro Saigonese, fun, có quote), hình ảnh, và thông điệp. Approve hoặc yêu cầu chỉnh sửa. Đảm bảo nhất quán thương hiệu Teeworld trên tất cả kênh.';
        return { ...info, titleSuffix: '', contextNote: `${desc} | ${info.contextNote}`, rationale: `Brand consistency quyết định nhận diện thương hiệu. CEO duyệt content đảm bảo đúng định hướng. ${info.rationale}` };
      },
    },
    {
      title: 'Review đơn hàng & tỷ lệ hoàn',
      kpi_metric: 'order_reviews', kpi_target: 1, kpi_unit: 'báo cáo', points: 10,
      contextBuilder: (ctx) => {
        const info = buildAdaptiveInfo(ctx, 'order_reviews', 1, 'báo cáo');
        const desc = 'Kiểm tra tổng đơn hàng ngày hôm trước, tỷ lệ hoàn hàng, khiếu nại từ khách. Phân tích nguyên nhân hoàn (sai size, chất lượng, giao trễ). Chỉ đạo phòng Vận hành và Sales xử lý các vấn đề phát sinh.';
        return { ...info, titleSuffix: '', contextNote: `${desc} | ${info.contextNote}`, rationale: `Tỷ lệ hoàn >5% báo động chất lượng sản phẩm hoặc vận hành. CEO cần theo dõi hàng ngày. ${info.rationale}` };
      },
    },
    {
      title: 'Họp sync team / coaching',
      kpi_metric: 'team_syncs', kpi_target: 1, kpi_unit: 'buổi', points: 10,
      contextBuilder: (ctx) => {
        const info = buildAdaptiveInfo(ctx, 'team_syncs', 1, 'buổi');
        const desc = 'Họp standup nhanh 15 phút với các trưởng phòng. Thảo luận blockers, align ưu tiên trong ngày. Coaching cá nhân cho nhân viên cần hỗ trợ. Đảm bảo toàn team 11 người đồng bộ hướng về mục tiêu tháng.';
        return { ...info, titleSuffix: '', contextNote: `${desc} | ${info.contextNote}`, rationale: `Sync hàng ngày giữ 11 nhân viên aligned, phát hiện và giải quyết vấn đề sớm. ${info.rationale}` };
      },
    },
  ],
};

const DEFAULT_TEMPLATES: TaskTemplate[] = [
  {
    title: 'Nhiệm vụ hàng ngày',
    kpi_metric: 'tasks_done', kpi_target: 3, kpi_unit: 'việc', points: 15,
    contextBuilder: (ctx) => {
      const info = buildAdaptiveInfo(ctx, 'tasks_done', 3, 'việc');
      const desc = 'Hoàn thành các đầu việc được giao trong ngày theo thứ tự ưu tiên. Cập nhật tiến độ trên hệ thống. Báo cáo kết quả cho quản lý trước khi kết thúc ngày làm việc.';
      return { ...info, titleSuffix: '', contextNote: `${desc} | ${info.contextNote}`, rationale: `Mỗi nhân viên cần hoàn thành tối thiểu 3 việc/ngày để đảm bảo tiến độ chung. ${info.rationale}` };
    },
  },
];

/** Generate contextual daily tasks for one employee based on real performance data */
export async function generateContextualDailyTasks(
  employee: { id: number; name: string; role: string; department: string },
  date: string,
  context: DailyContext,
): Promise<AgentAction> {
  try {
    const templates = DEPT_TEMPLATES[employee.department] || DEFAULT_TEMPLATES;
    const dateShort = date.slice(5); // MM-DD
    let created = 0;

    for (const tmpl of templates) {
      const adaptive = tmpl.contextBuilder(context);

      await createTask({
        title: `${tmpl.title}${adaptive.titleSuffix ? ' — ' + adaptive.titleSuffix : ''} (${dateShort})`,
        description: adaptive.contextNote,
        assignee_id: employee.id,
        department: employee.department,
        priority: adaptive.priority,
        points: tmpl.points,
        due_date: date,
        created_by: 1, // AI CEO
        kpi_metric: tmpl.kpi_metric,
        kpi_target: String(adaptive.adjustedTarget),
        kpi_unit: tmpl.kpi_unit,
        context_note: adaptive.contextNote,
        adjusted_target: adaptive.adjustedTarget,
        target_rationale: adaptive.rationale,
        week_cumulative: context.weekCumulative[tmpl.kpi_metric]?.actual ?? 0,
        month_cumulative: context.monthCumulative[tmpl.kpi_metric]?.actual ?? 0,
      });
      created++;
    }

    return logAction('dept_manager', 'generate_contextual_tasks',
      `Tao ${created} task cho ${employee.name} ngay ${date} (adaptive targets)`, true,
      { employeeId: employee.id, date, tasksCreated: created });
  } catch (e) {
    return logAction('dept_manager', 'generate_contextual_tasks',
      `LOI tao task cho ${employee.name}: ${(e as Error).message}`, false);
  }
}

/** Dept Manager can update task priority */
export async function deptUpdatePriority(taskId: string, newPriority: string): Promise<AgentAction> {
  try {
    await updateTask(taskId, { priority: newPriority });
    return logAction('dept_manager', 'update_priority', `Đổi priority task ${taskId} → ${newPriority}`, true, { taskId, newPriority });
  } catch (e) {
    return logAction('dept_manager', 'update_priority', `LOI: ${(e as Error).message}`, false);
  }
}

// ============ COACH SKILLS ============

/** Coach can send reminder (logged as action — actual notification would need push system) */
export async function coachSendReminder(employeeId: number, message: string): Promise<AgentAction> {
  const employees = await getEmployees();
  const emp = employees.find((e: { id: number }) => e.id === employeeId);
  return logAction('performance_coach', 'send_reminder',
    `Reminder cho ${emp?.name || `NV#${employeeId}`}: ${message}`, true, { employeeId, message });
}

/** Coach can recommend promotion */
export async function coachRecommendPromotion(employeeId: number, reason: string): Promise<AgentAction> {
  const employees = await getEmployees();
  const emp = employees.find((e: { id: number }) => e.id === employeeId);
  return logAction('performance_coach', 'recommend_promotion',
    `Đề xuất promotion: ${emp?.name || `NV#${employeeId}`}. Lý do: ${reason}`, true, { employeeId, reason });
}

// ============ INVENTORY PLANNER SKILLS ============

/** Inventory Planner can update stock levels */
export async function inventoryUpdateStock(itemId: number, newStock: number): Promise<AgentAction> {
  try {
    await updateInventoryStock(itemId, newStock);
    return logAction('inventory_planner', 'update_stock', `Cập nhật tồn kho item#${itemId}: ${newStock}`, true, { itemId, newStock });
  } catch (e) {
    return logAction('inventory_planner', 'update_stock', `LOI: ${(e as Error).message}`, false);
  }
}

/** Inventory Planner can flag low stock items */
export async function inventoryFlagLowStock(): Promise<{ alerts: Array<{ name: string; stock: number; min: number }>; actions: AgentAction[] }> {
  const inventory = await getInventory();
  const alerts: Array<{ name: string; stock: number; min: number }> = [];
  const actions: AgentAction[] = [];

  for (const item of inventory) {
    if (item.current_stock < (item.min_stock || 50)) {
      alerts.push({ name: item.item_name, stock: item.current_stock, min: item.min_stock || 50 });
    }
  }

  if (alerts.length > 0) {
    actions.push(logAction('inventory_planner', 'flag_low_stock',
      `${alerts.length} item dưới mức tồn kho tối thiểu: ${alerts.map(a => `${a.name} (${a.stock}/${a.min})`).join(', ')}`, true, { alerts }));
  }

  return { alerts, actions };
}
