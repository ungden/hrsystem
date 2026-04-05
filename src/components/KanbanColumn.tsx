"use client";

import KanbanCard from "./KanbanCard";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  points?: number;
  category?: string;
  due_date?: string;
  assignee_id?: number;
  description?: string;
  department?: string;
  links?: Array<{ url: string; title: string }>;
  _attachmentCount?: number;
  _commentCount?: number;
}

interface Employee {
  id: number;
  name: string;
}

type TaskStatus = "todo" | "in_progress" | "review" | "done";

const COLUMN_CONFIG: Record<TaskStatus, { label: string; bgHeader: string; color: string }> = {
  todo: { label: "Chờ làm", bgHeader: "bg-slate-100", color: "text-slate-700" },
  in_progress: { label: "Đang làm", bgHeader: "bg-blue-50", color: "text-blue-700" },
  review: { label: "Đang review", bgHeader: "bg-purple-50", color: "text-purple-700" },
  done: { label: "Hoàn thành", bgHeader: "bg-green-50", color: "text-green-700" },
};

export default function KanbanColumn({
  status,
  tasks,
  employees,
  onMoveTask,
  onClickTask,
  isFirst,
  isLast,
}: {
  status: TaskStatus;
  tasks: Task[];
  employees: Employee[];
  onMoveTask: (taskId: string, direction: "left" | "right") => void;
  onClickTask: (task: Task) => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const config = COLUMN_CONFIG[status];

  const getEmployeeName = (assigneeId?: number): string => {
    if (!assigneeId) return "Chưa giao";
    const emp = employees.find((e) => e.id === assigneeId);
    return emp ? emp.name : "Không rõ";
  };

  return (
    <div className="flex-1 min-w-[280px] flex flex-col">
      <div className={`rounded-t-xl p-3 border-b-2 ${config.bgHeader} flex items-center justify-between`}>
        <h3 className={`font-semibold ${config.color}`}>{config.label}</h3>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-600">{tasks.length}</span>
      </div>
      <div className="bg-white/50 rounded-b-xl p-2 flex-1 overflow-y-auto max-h-[calc(100vh-320px)] space-y-2">
        {tasks.map((task) => (
          <KanbanCard
            key={task.id}
            task={task}
            employeeName={getEmployeeName(task.assignee_id)}
            onMove={(direction) => onMoveTask(task.id, direction)}
            onClick={() => onClickTask(task)}
            isFirst={isFirst}
            isLast={isLast}
          />
        ))}
        {tasks.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-4">Chưa có công việc</p>
        )}
      </div>
    </div>
  );
}
