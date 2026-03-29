"use client";

import { KanbanTask, TaskStatus, Employee, columnConfig } from "@/lib/mock-data";
import KanbanCard from "./KanbanCard";

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: KanbanTask[];
  employees: Employee[];
  onMoveTask: (taskId: string, direction: "left" | "right") => void;
  isFirst: boolean;
  isLast: boolean;
}

export default function KanbanColumn({
  status,
  tasks,
  employees,
  onMoveTask,
  isFirst,
  isLast,
}: KanbanColumnProps) {
  const config = columnConfig[status];

  const getEmployeeName = (assigneeId: string): string => {
    const emp = employees.find((e) => e.id === assigneeId);
    return emp ? emp.name : "Không rõ";
  };

  return (
    <div className="flex-1 min-w-[280px] flex flex-col">
      {/* Header */}
      <div
        className={`rounded-t-xl p-3 border-b-2 ${config.bgHeader} flex items-center justify-between`}
      >
        <h3 className={`font-semibold ${config.color}`}>{config.label}</h3>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-600">
          {tasks.length}
        </span>
      </div>

      {/* Body */}
      <div className="bg-white/50 rounded-b-xl p-2 flex-1 overflow-y-auto max-h-[calc(100vh-320px)] space-y-2">
        {tasks.map((task) => (
          <KanbanCard
            key={task.id}
            task={task}
            employeeName={getEmployeeName(task.assigneeId)}
            onMove={(direction) => onMoveTask(task.id, direction)}
            isFirst={isFirst}
            isLast={isLast}
          />
        ))}
        {tasks.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-4">
            Chưa có công việc
          </p>
        )}
      </div>
    </div>
  );
}
