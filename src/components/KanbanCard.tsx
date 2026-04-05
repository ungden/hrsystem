"use client";

import { ChevronLeft, ChevronRight, Calendar, Paperclip, MessageCircle, Link2 } from "lucide-react";

interface Task {
  id: string;
  title: string;
  priority: string;
  points?: number;
  category?: string;
  due_date?: string;
  assignee_id?: number;
  links?: Array<{ url: string; title: string }>;
  _attachmentCount?: number;
  _commentCount?: number;
}

const PRIORITY_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  urgent: { label: "Khẩn cấp", bg: "bg-red-100", color: "text-red-700" },
  high: { label: "Cao", bg: "bg-orange-100", color: "text-orange-700" },
  medium: { label: "Trung bình", bg: "bg-blue-100", color: "text-blue-700" },
  low: { label: "Thấp", bg: "bg-slate-100", color: "text-slate-600" },
};

export default function KanbanCard({
  task,
  employeeName,
  onMove,
  onClick,
  isFirst,
  isLast,
}: {
  task: Task;
  employeeName: string;
  onMove: (direction: "left" | "right") => void;
  onClick: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const initial = employeeName.charAt(0).toUpperCase();
  const hasLinks = task.links && task.links.length > 0;
  const attachCount = task._attachmentCount || 0;
  const commentCount = task._commentCount || 0;

  return (
    <div
      className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <h4 className="text-sm font-medium text-slate-800 line-clamp-2 mb-2">{task.title}</h4>

      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-medium flex-shrink-0">
          {initial}
        </div>
        <span className="text-xs text-slate-500 truncate">{employeeName}</span>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap mb-2">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${priority.bg} ${priority.color}`}>
          {priority.label}
        </span>
        {task.points ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
            {task.points} pts
          </span>
        ) : null}
        {task.category && <span className="text-xs text-slate-400">{task.category}</span>}
      </div>

      {/* Indicators */}
      <div className="flex items-center gap-2.5 mb-2">
        {task.due_date && (
          <span className="flex items-center gap-1 text-xs text-slate-400">
            <Calendar className="w-3 h-3" /> {task.due_date}
          </span>
        )}
        {attachCount > 0 && (
          <span className="flex items-center gap-0.5 text-xs text-slate-400">
            <Paperclip className="w-3 h-3" /> {attachCount}
          </span>
        )}
        {commentCount > 0 && (
          <span className="flex items-center gap-0.5 text-xs text-slate-400">
            <MessageCircle className="w-3 h-3" /> {commentCount}
          </span>
        )}
        {hasLinks && (
          <span className="flex items-center text-xs text-blue-400">
            <Link2 className="w-3 h-3" />
          </span>
        )}
      </div>

      {/* Move buttons */}
      <div className="flex items-center justify-between" onClick={e => e.stopPropagation()}>
        <div>
          {!isFirst && (
            <button onClick={() => onMove("left")}
              className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>
        <div>
          {!isLast && (
            <button onClick={() => onMove("right")}
              className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
