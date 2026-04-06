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

const actionLog: AgentAction[] = [];

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
  points?: number; month_number?: number; kpi_metric?: string;
  kpi_target?: string; kpi_unit?: string; created_by: number;
}): Promise<AgentAction> {
  try {
    const employees = await getEmployees();
    const assignee = employees.find((e: { id: number }) => e.id === params.assignee_id);
    if (!assignee) throw new Error(`NV #${params.assignee_id} không tồn tại`);

    const task = await createTask({
      ...params,
      department: assignee.department,
    });
    return logAction('hr_director', 'assign_task', `HR giao task "${params.title}" cho ${assignee.name}`, true, { taskId: task.id, assignee: assignee.name });
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

    let created = 0;
    for (const emp of teamMembers) {
      const existingTasks = await getTasks({ assignee_id: emp.id, month_number: monthNumber });
      if (existingTasks.length === 0) {
        // Create a placeholder task
        await createTask({
          title: `Nhiệm vụ T${monthNumber} - ${emp.name}`,
          assignee_id: emp.id,
          department: emp.department,
          priority: 'medium',
          points: 90,
          month_number: monthNumber,
          created_by: managerId,
        });
        created++;
      }
    }

    return logAction('dept_manager', 'create_daily_tasks',
      `TrP ${manager.name} tạo ${created} task cho ${teamMembers.length} NV T${monthNumber}`, true, { created, month: monthNumber });
  } catch (e) {
    return logAction('dept_manager', 'create_daily_tasks', `LOI: ${(e as Error).message}`, false);
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
