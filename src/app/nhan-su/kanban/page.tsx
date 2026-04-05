"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Plus, Loader2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import KanbanColumn from "@/components/KanbanColumn";
import TaskDetailModal from "@/components/TaskDetailModal";
import { getTasks, getEmployees, updateTaskStatus, createTask } from "@/lib/supabase-data";

type TaskStatus = "todo" | "in_progress" | "review" | "done";

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  points?: number;
  category?: string;
  due_date?: string;
  assignee_id?: number;
  department?: string;
  links?: Array<{ url: string; title: string }>;
  _attachmentCount?: number;
  _commentCount?: number;
}

interface Employee {
  id: number;
  name: string;
  department: string;
  status?: string;
}

const STATUS_ORDER: TaskStatus[] = ["todo", "in_progress", "review", "done"];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Thấp" },
  { value: "medium", label: "Trung bình" },
  { value: "high", label: "Cao" },
  { value: "urgent", label: "Khẩn cấp" },
];

const CATEGORIES = ["Báo cáo", "Dự án", "Hành chính", "Kỹ thuật", "Kinh doanh", "Nhân sự", "Marketing", "Vận hành"];

export default function KanbanPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDepartment, setFilterDepartment] = useState("");
  const [filterEmployee, setFilterEmployee] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // New task form
  const [newTitle, setNewTitle] = useState("");
  const [newAssignee, setNewAssignee] = useState(0);
  const [newPoints, setNewPoints] = useState(100);
  const [newPriority, setNewPriority] = useState("medium");
  const [newCategory, setNewCategory] = useState(CATEGORIES[0]);

  async function loadData() {
    try {
      const [taskData, empData] = await Promise.all([
        getTasks({ month_number: filterMonth }),
        getEmployees(),
      ]);
      setTasks(taskData);
      setEmployees(empData);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  useEffect(() => { loadData(); }, [filterMonth]);

  const departments = useMemo(() => [...new Set(employees.map(e => e.department))], [employees]);
  const activeEmployees = useMemo(() => employees.filter(e => e.status === "active"), [employees]);

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (filterDepartment) {
        const emp = employees.find(e => e.id === t.assignee_id);
        if (!emp || emp.department !== filterDepartment) return false;
      }
      if (filterEmployee && t.assignee_id !== Number(filterEmployee)) return false;
      if (filterPriority && t.priority !== filterPriority) return false;
      if (filterCategory && t.category !== filterCategory) return false;
      return true;
    });
  }, [tasks, filterDepartment, filterEmployee, filterPriority, filterCategory, employees]);

  async function handleMoveTask(taskId: string, direction: "left" | "right") {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const currentIndex = STATUS_ORDER.indexOf(task.status as TaskStatus);
    const newIndex = direction === "right" ? currentIndex + 1 : currentIndex - 1;
    if (newIndex < 0 || newIndex >= STATUS_ORDER.length) return;
    const newStatus = STATUS_ORDER[newIndex];
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    try {
      await updateTaskStatus(taskId, newStatus);
    } catch (e) {
      console.error(e);
      loadData();
    }
  }

  async function handleAddTask() {
    if (!newTitle.trim() || !newAssignee) return;
    const emp = employees.find(e => e.id === newAssignee);
    try {
      await createTask({
        title: newTitle.trim(),
        assignee_id: newAssignee,
        department: emp?.department || "",
        priority: newPriority,
        points: newPoints,
        category: newCategory,
        month_number: filterMonth,
      });
      setNewTitle("");
      setNewAssignee(0);
      setNewPoints(100);
      setNewPriority("medium");
      setNewCategory(CATEGORIES[0]);
      setShowAddForm(false);
      loadData();
    } catch (e) { console.error(e); }
  }

  if (loading) {
    return <div className="p-6 flex items-center justify-center h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;
  }

  return (
    <div>
      <PageHeader title="Giao việc" breadcrumbs={[{ label: "Nhân sự" }, { label: "Giao việc" }]} />

      {/* Tab switcher */}
      <div className="flex items-center gap-2 mb-4">
        <span className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white">Kanban board</span>
        <Link href="/admin/bang-thuong" className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors">
          Bảng điểm
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap mb-4">
        <select value={filterMonth} onChange={e => setFilterMonth(Number(e.target.value))}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700">
          {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => <option key={m} value={m}>Tháng {m}</option>)}
        </select>

        <select value={filterDepartment} onChange={e => { setFilterDepartment(e.target.value); setFilterEmployee(""); }}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700">
          <option value="">Tất cả phòng ban</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        <select value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700">
          <option value="">Tất cả nhân viên</option>
          {activeEmployees.filter(e => !filterDepartment || e.department === filterDepartment)
            .map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>

        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700">
          <option value="">Tất cả ưu tiên</option>
          {PRIORITY_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>

        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700">
          <option value="">Tất cả danh mục</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <button onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" /> Thêm
        </button>

        <span className="text-xs text-slate-400 ml-auto">{filteredTasks.length} tasks</span>
      </div>

      {/* Add task form */}
      {showAddForm && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4 space-y-3">
          <h3 className="text-sm font-semibold text-slate-700">Thêm công việc mới</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <input type="text" placeholder="Tiêu đề công việc" value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 col-span-1 sm:col-span-2 lg:col-span-3" />
            <select value={newAssignee} onChange={e => setNewAssignee(Number(e.target.value))}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white">
              <option value={0}>Chọn nhân viên</option>
              {activeEmployees.filter(e => !filterDepartment || e.department === filterDepartment)
                .map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            <select value={newPoints} onChange={e => setNewPoints(Number(e.target.value))}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white">
              {[10, 20, 30, 50, 80, 100, 150, 200].map(p => <option key={p} value={p}>{p} điểm</option>)}
            </select>
            <select value={newPriority} onChange={e => setNewPriority(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white">
              {PRIORITY_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            <select value={newCategory} onChange={e => setNewCategory(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white">
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={handleAddTask}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
              Thêm
            </button>
          </div>
        </div>
      )}

      {/* Kanban columns */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STATUS_ORDER.map((status, index) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={filteredTasks.filter(t => t.status === status)}
            employees={employees}
            onMoveTask={handleMoveTask}
            onClickTask={(task) => setSelectedTask(task)}
            isFirst={index === 0}
            isLast={index === STATUS_ORDER.length - 1}
          />
        ))}
      </div>

      {/* Task detail modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          employees={employees}
          onClose={() => setSelectedTask(null)}
          onUpdate={() => { setSelectedTask(null); loadData(); }}
        />
      )}
    </div>
  );
}
