"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  kanbanTasks,
  employees,
  taskCategories,
  departments,
  KanbanTask,
  TaskStatus,
  TaskPriority,
  priorityConfig,
} from "@/lib/mock-data";
import PageHeader from "@/components/PageHeader";
import KanbanColumn from "@/components/KanbanColumn";
import { Plus } from "lucide-react";

const statusOrder: TaskStatus[] = ["todo", "in_progress", "review", "done"];

export default function KanbanPage() {
  const [tasks, setTasks] = useState<KanbanTask[]>(kanbanTasks);
  const [filterDepartment, setFilterDepartment] = useState("");
  const [filterEmployee, setFilterEmployee] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  // New task form state
  const [newTitle, setNewTitle] = useState("");
  const [newAssignee, setNewAssignee] = useState("");
  const [newPoints, setNewPoints] = useState(100);
  const [newPriority, setNewPriority] = useState<TaskPriority>("medium");
  const [newCategory, setNewCategory] = useState(taskCategories[0]);

  const activeEmployees = useMemo(
    () => employees.filter((e) => e.trangThai === "dang_lam"),
    []
  );

  const empMap = useMemo(
    () => new Map(employees.map((e) => [e.id, e])),
    []
  );

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (filterDepartment && empMap.get(t.assigneeId)?.phongBan !== filterDepartment) return false;
      if (filterEmployee && t.assigneeId !== filterEmployee) return false;
      if (filterPriority && t.priority !== filterPriority) return false;
      if (filterCategory && t.category !== filterCategory) return false;
      return true;
    });
  }, [tasks, filterDepartment, filterEmployee, filterPriority, filterCategory, empMap]);

  // Move task left/right
  const handleMoveTask = (taskId: string, direction: "left" | "right") => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;
        const currentIndex = statusOrder.indexOf(task.status);
        const newIndex =
          direction === "right" ? currentIndex + 1 : currentIndex - 1;
        if (newIndex < 0 || newIndex >= statusOrder.length) return task;
        return { ...task, status: statusOrder[newIndex] };
      })
    );
  };

  // Add new task
  const handleAddTask = () => {
    if (!newTitle.trim() || !newAssignee) return;

    const newTask: KanbanTask = {
      id: `task-new-${Date.now()}`,
      title: newTitle.trim(),
      description: "",
      assigneeId: newAssignee,
      assignedBy: "Người dùng",
      status: "todo",
      priority: newPriority,
      points: newPoints,
      dueDate: "30/04/2026",
      createdAt: "30/03/2026",
      category: newCategory,
    };

    setTasks((prev) => [newTask, ...prev]);
    setNewTitle("");
    setNewAssignee("");
    setNewPoints(100);
    setNewPriority("medium");
    setNewCategory(taskCategories[0]);
    setShowAddForm(false);
  };

  return (
    <div>
      <PageHeader
        title="Giao việc"
        breadcrumbs={[{ label: "Nhân sự" }, { label: "Giao việc" }]}
      />

      {/* Tab switcher */}
      <div className="flex items-center gap-2 mb-4">
        <span className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white">
          Kanban board
        </span>
        <Link
          href="/admin/bang-thuong"
          className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
        >
          Bảng điểm
        </Link>
      </div>

      {/* Filters + Add button */}
      <div className="flex items-center gap-3 flex-wrap mb-4">
        <select
          value={filterDepartment}
          onChange={(e) => {
            setFilterDepartment(e.target.value);
            setFilterEmployee("");
          }}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Tất cả phòng ban</option>
          {departments.map((dept) => (
            <option key={dept} value={dept}>
              {dept}
            </option>
          ))}
        </select>

        <select
          value={filterEmployee}
          onChange={(e) => setFilterEmployee(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Tất cả nhân viên</option>
          {activeEmployees
            .filter((emp) => !filterDepartment || emp.phongBan === filterDepartment)
            .map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name}
              </option>
            ))}
        </select>

        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Tất cả độ ưu tiên</option>
          {(Object.keys(priorityConfig) as TaskPriority[]).map((key) => (
            <option key={key} value={key}>
              {priorityConfig[key].label}
            </option>
          ))}
        </select>

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Tất cả danh mục</option>
          {taskCategories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Thêm
        </button>
      </div>

      {/* Add task form */}
      {showAddForm && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4 space-y-3">
          <h3 className="text-sm font-semibold text-slate-700">
            Thêm công việc mới
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="Tiêu đề công việc"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 col-span-1 sm:col-span-2 lg:col-span-3"
            />
            <select
              value={newAssignee}
              onChange={(e) => setNewAssignee(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Chọn nhân viên</option>
              {activeEmployees
                .filter((emp) => !filterDepartment || emp.phongBan === filterDepartment)
                .map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
            </select>
            <select
              value={newPoints}
              onChange={(e) => setNewPoints(Number(e.target.value))}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {[100, 200, 300, 400, 500, 600, 800, 1000].map((p) => (
                <option key={p} value={p}>
                  {p} điểm
                </option>
              ))}
            </select>
            <select
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {(Object.keys(priorityConfig) as TaskPriority[]).map((key) => (
                <option key={key} value={key}>
                  {priorityConfig[key].label}
                </option>
              ))}
            </select>
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {taskCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <button
              onClick={handleAddTask}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Thêm
            </button>
          </div>
        </div>
      )}

      {/* Kanban columns */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {statusOrder.map((status, index) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={filteredTasks.filter((t) => t.status === status)}
            employees={employees}
            onMoveTask={handleMoveTask}
            isFirst={index === 0}
            isLast={index === statusOrder.length - 1}
          />
        ))}
      </div>
    </div>
  );
}
