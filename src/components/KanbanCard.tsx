"use client";

import { KanbanTask, priorityConfig } from "@/lib/mock-data";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

interface KanbanCardProps {
  task: KanbanTask;
  employeeName: string;
  onMove: (direction: "left" | "right") => void;
  isFirst: boolean;
  isLast: boolean;
}

export default function KanbanCard({
  task,
  employeeName,
  onMove,
  isFirst,
  isLast,
}: KanbanCardProps) {
  const priority = priorityConfig[task.priority];
  const initial = employeeName.charAt(0).toUpperCase();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 hover:shadow-md transition-shadow">
      {/* Title */}
      <h4 className="text-sm font-medium text-slate-800 line-clamp-2 mb-2">
        {task.title}
      </h4>

      {/* Assignee */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-medium flex-shrink-0">
          {initial}
        </div>
        <span className="text-xs text-slate-500 truncate">{employeeName}</span>
      </div>

      {/* Priority + Points + Category */}
      <div className="flex items-center gap-1.5 flex-wrap mb-2">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${priority.bg} ${priority.color}`}
        >
          {priority.label}
        </span>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
          {task.points} điểm
        </span>
        <span className="text-xs text-slate-400">{task.category}</span>
      </div>

      {/* Due date */}
      <div className="flex items-center gap-1 text-xs text-slate-400 mb-2">
        <Calendar className="w-3 h-3" />
        <span>{task.dueDate}</span>
      </div>

      {/* Move buttons */}
      <div className="flex items-center justify-between">
        <div>
          {!isFirst && (
            <button
              onClick={() => onMove("left")}
              className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              title="Di chuyển sang trái"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>
        <div>
          {!isLast && (
            <button
              onClick={() => onMove("right")}
              className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              title="Di chuyển sang phải"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
