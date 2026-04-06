"use client";

import { useState, useEffect, useRef } from "react";
import {
  X, Edit3, Save, Trash2, Upload, Link2, MessageCircle,
  Calendar, User, AlertTriangle, Loader2, FileText, Camera,
  Send, Plus, ExternalLink, Paperclip, ListChecks, Square, CheckSquare,
  Tag, Clock, Users, LayoutList,
} from "lucide-react";
import {
  updateTask, deleteTask, getTaskComments, addTaskComment,
  deleteTaskComment, getAttachments, uploadTaskAttachment,
  deleteAttachment, getEmployees, getSubTasks, updateSubTasks,
  type SubTask,
} from "@/lib/supabase-data";
import { getSelectedEmpId } from '@/lib/employee-context';

interface TaskData {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  assignee_id?: number;
  due_date?: string;
  points?: number;
  category?: string;
  department?: string;
  links?: Array<{ url: string; title: string }>;
}

interface Comment {
  id: string;
  author_id: number;
  content: string;
  mentions: number[];
  created_at: string;
}

interface Attachment {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  url?: string;
}

interface Employee {
  id: number;
  name: string;
  department: string;
}

const PRIORITY_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  urgent: { label: "Khẩn cấp", color: "bg-red-100 text-red-700", dot: "bg-red-500" },
  high: { label: "Cao", color: "bg-orange-100 text-orange-700", dot: "bg-orange-500" },
  medium: { label: "Trung bình", color: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
  low: { label: "Thấp", color: "bg-slate-100 text-slate-600", dot: "bg-slate-400" },
};

const STATUS_OPTIONS = [
  { value: "todo", label: "Chờ làm", color: "bg-slate-500" },
  { value: "in_progress", label: "Đang làm", color: "bg-blue-500" },
  { value: "review", label: "Review", color: "bg-purple-500" },
  { value: "done", label: "Hoàn thành", color: "bg-green-500" },
];

export default function TaskDetailModal({
  task,
  employees,
  onClose,
  onUpdate,
}: {
  task: TaskData;
  employees: Employee[];
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [editingDesc, setEditingDesc] = useState(false);
  const [status, setStatus] = useState(task.status);
  const [priority, setPriority] = useState(task.priority);
  const [assigneeId, setAssigneeId] = useState(task.assignee_id || 0);
  const [dueDate, setDueDate] = useState(task.due_date || "");
  const [links, setLinks] = useState<Array<{ url: string; title: string }>>(task.links || []);
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newLinkTitle, setNewLinkTitle] = useState("");
  const [showLinkForm, setShowLinkForm] = useState(false);

  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [selectedMentions, setSelectedMentions] = useState<number[]>([]);

  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [subtasks, setSubtasks] = useState<SubTask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [savingSubtasks, setSavingSubtasks] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadComments();
    loadAttachments();
    loadSubtasks();
  }, []);

  async function loadComments() {
    try {
      const data = await getTaskComments(task.id);
      setComments(data);
    } catch (e) { console.error(e); }
  }

  async function loadAttachments() {
    try {
      const data = await getAttachments({ task_id: task.id });
      setAttachments(data.map((a: Attachment) => ({
        ...a,
        url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/evidence/${a.storage_path}`,
      })));
    } catch (e) { console.error(e); }
  }

  async function loadSubtasks() {
    try {
      const data = await getSubTasks(task.id);
      setSubtasks(data);
    } catch (e) { console.error(e); }
  }

  async function addSubtask() {
    if (!newSubtaskTitle.trim()) return;
    const newSub: SubTask = {
      id: `st-${Date.now()}`,
      title: newSubtaskTitle.trim(),
      done: false,
      created_at: new Date().toISOString(),
    };
    const updated = [...subtasks, newSub];
    setSubtasks(updated);
    setNewSubtaskTitle("");
    setSavingSubtasks(true);
    try { await updateSubTasks(task.id, updated); } catch (e) { console.error(e); }
    setSavingSubtasks(false);
  }

  async function toggleSubtask(id: string) {
    const updated = subtasks.map(s => s.id === id ? { ...s, done: !s.done } : s);
    setSubtasks(updated);
    try { await updateSubTasks(task.id, updated); } catch (e) { console.error(e); }
  }

  async function deleteSubtask(id: string) {
    const updated = subtasks.filter(s => s.id !== id);
    setSubtasks(updated);
    try { await updateSubTasks(task.id, updated); } catch (e) { console.error(e); }
  }

  async function updateSubtaskAssignee(id: string, assignee: number | undefined) {
    const updated = subtasks.map(s => s.id === id ? { ...s, assignee_id: assignee } : s);
    setSubtasks(updated);
    try { await updateSubTasks(task.id, updated); } catch (e) { console.error(e); }
  }

  const subtasksDone = subtasks.filter(s => s.done).length;

  async function handleSave() {
    setSaving(true);
    try {
      await updateTask(task.id, {
        title, description, status, priority,
        assignee_id: assigneeId, due_date: dueDate || null,
        links,
      });
      onUpdate();
    } catch (e) { console.error(e); }
    setSaving(false);
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteTask(task.id);
      onUpdate();
      onClose();
    } catch (e) { console.error(e); }
    setDeleting(false);
  }

  async function handleUpload(fileList: FileList | null) {
    if (!fileList) return;
    setUploading(true);
    try {
      for (const file of Array.from(fileList)) {
        if (file.size > 10 * 1024 * 1024) { alert("Max 10MB"); continue; }
        const result = await uploadTaskAttachment(file, { task_id: task.id, uploaded_by: getSelectedEmpId() });
        setAttachments(prev => [...prev, result]);
      }
    } catch (e) { console.error(e); }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleDeleteAttachment(att: Attachment) {
    try {
      await deleteAttachment(att.id, att.storage_path);
      setAttachments(prev => prev.filter(a => a.id !== att.id));
    } catch (e) { console.error(e); }
  }

  async function handleAddComment() {
    if (!commentText.trim()) return;
    try {
      await addTaskComment({
        task_id: task.id,
        author_id: getSelectedEmpId(),
        content: commentText,
        mentions: selectedMentions,
      });
      setCommentText("");
      setSelectedMentions([]);
      loadComments();
    } catch (e) { console.error(e); }
  }

  async function handleDeleteComment(id: string) {
    try {
      await deleteTaskComment(id);
      setComments(prev => prev.filter(c => c.id !== id));
    } catch (e) { console.error(e); }
  }

  function handleCommentInput(value: string) {
    setCommentText(value);
    const lastAt = value.lastIndexOf("@");
    if (lastAt >= 0) {
      const after = value.substring(lastAt + 1);
      if (!after.includes(" ") && after.length < 20) {
        setMentionFilter(after.toLowerCase());
        setShowMentionDropdown(true);
        return;
      }
    }
    setShowMentionDropdown(false);
  }

  function insertMention(emp: Employee) {
    const lastAt = commentText.lastIndexOf("@");
    const before = commentText.substring(0, lastAt);
    setCommentText(`${before}@${emp.name} `);
    setSelectedMentions(prev => [...new Set([...prev, emp.id])]);
    setShowMentionDropdown(false);
    commentInputRef.current?.focus();
  }

  function addLink() {
    if (!newLinkUrl.trim()) return;
    setLinks(prev => [...prev, { url: newLinkUrl, title: newLinkTitle || newLinkUrl }]);
    setNewLinkUrl("");
    setNewLinkTitle("");
    setShowLinkForm(false);
  }

  const assignee = employees.find(e => e.id === assigneeId);
  const statusConfig = STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0];
  const priorityConfig = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.medium;
  const isImage = (type: string) => type?.startsWith("image/");
  const filteredMentionEmps = employees.filter(e =>
    e.name.toLowerCase().includes(mentionFilter)
  ).slice(0, 5);

  // Cover image = first image attachment
  const coverImage = attachments.find(a => isImage(a.file_type));

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-start justify-center pt-8 px-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-slate-100 rounded-xl w-full max-w-3xl shadow-2xl mb-10" onClick={e => e.stopPropagation()}>

        {/* Cover image (like Trello) */}
        {coverImage && (
          <div className="h-36 rounded-t-xl overflow-hidden bg-slate-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverImage.url} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        {/* Header with title */}
        <div className="px-5 pt-4 pb-2 flex items-start gap-3">
          <LayoutList size={22} className="text-slate-400 mt-1 shrink-0" />
          <div className="flex-1 min-w-0">
            {editingTitle ? (
              <input
                autoFocus
                value={title}
                onChange={e => setTitle(e.target.value)}
                onBlur={() => setEditingTitle(false)}
                onKeyDown={e => e.key === "Enter" && setEditingTitle(false)}
                className="text-lg font-bold text-slate-800 border-b-2 border-blue-500 outline-none w-full bg-transparent"
              />
            ) : (
              <h2
                className="text-lg font-bold text-slate-800 cursor-pointer hover:text-blue-700"
                onClick={() => setEditingTitle(true)}
              >
                {title}
              </h2>
            )}
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded text-white ${statusConfig.color}`}>{statusConfig.label}</span>
              {task.category && <span className="text-[10px] text-slate-400">{task.category}</span>}
              {task.points ? <span className="text-[10px] font-bold text-amber-600">{task.points} pts</span> : null}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 shrink-0">
            <X size={20} />
          </button>
        </div>

        {/* Main body: left content + right sidebar (Trello-style) */}
        <div className="flex gap-4 px-5 pb-5">

          {/* ===== LEFT: Content sections ===== */}
          <div className="flex-1 min-w-0 space-y-5">

            {/* Members row */}
            {assignee && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 font-medium uppercase">Thành viên</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold" title={assignee.name}>
                    {assignee.name.charAt(0)}
                  </div>
                  <span className="text-xs text-slate-600">{assignee.name}</span>
                </div>
              </div>
            )}

            {/* Due date row */}
            {dueDate && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 font-medium uppercase">Ngày hết hạn</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                  new Date(dueDate) < new Date() && status !== 'done' ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-700'
                }`}>
                  {new Date(dueDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </span>
              </div>
            )}

            {/* ── Mô tả ── */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Edit3 size={16} className="text-slate-500" />
                <h3 className="text-sm font-bold text-slate-700">Mô tả</h3>
              </div>
              {editingDesc ? (
                <div>
                  <textarea
                    autoFocus
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={4}
                    placeholder="Thêm mô tả chi tiết hơn..."
                    className="w-full text-sm border rounded-lg px-3 py-2 resize-none bg-white"
                  />
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => setEditingDesc(false)} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded font-medium hover:bg-blue-700">Lưu</button>
                    <button onClick={() => { setDescription(task.description || ""); setEditingDesc(false); }} className="text-xs text-slate-500 px-3 py-1.5 hover:text-slate-700">Huỷ</button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => setEditingDesc(true)}
                  className={`text-sm rounded-lg px-3 py-3 cursor-pointer min-h-[56px] ${
                    description ? 'text-slate-700 bg-white hover:bg-slate-50' : 'text-slate-400 bg-slate-200/60 hover:bg-slate-200'
                  }`}
                >
                  {description || "Thêm mô tả chi tiết hơn..."}
                </div>
              )}
            </div>

            {/* ── Việc cần làm (Checklist) ── */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ListChecks size={16} className="text-slate-500" />
                <h3 className="text-sm font-bold text-slate-700">Việc cần làm</h3>
                {subtasks.length > 0 && (
                  <span className="text-[10px] text-slate-400 ml-auto">{subtasksDone}/{subtasks.length}</span>
                )}
              </div>

              {/* Progress bar */}
              {subtasks.length > 0 && (
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] text-slate-400 w-7">{subtasks.length > 0 ? Math.round((subtasksDone / subtasks.length) * 100) : 0}%</span>
                  <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${subtasksDone === subtasks.length && subtasks.length > 0 ? 'bg-green-500' : 'bg-blue-500'}`}
                      style={{ width: `${subtasks.length > 0 ? Math.round((subtasksDone / subtasks.length) * 100) : 0}%` }} />
                  </div>
                </div>
              )}

              {/* Subtask items */}
              <div className="space-y-0.5">
                {subtasks.map(st => {
                  const stAssignee = employees.find(e => e.id === st.assignee_id);
                  return (
                    <div key={st.id} className={`flex items-center gap-2 px-2 py-1.5 rounded-md group transition-colors ${st.done ? 'bg-green-50/60' : 'hover:bg-white'}`}>
                      <button onClick={() => toggleSubtask(st.id)} className="shrink-0">
                        {st.done ? <CheckSquare size={16} className="text-green-500" /> : <Square size={16} className="text-slate-300 hover:text-blue-400" />}
                      </button>
                      <span className={`text-sm flex-1 min-w-0 ${st.done ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{st.title}</span>
                      {stAssignee && (
                        <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[9px] font-bold shrink-0" title={stAssignee.name}>
                          {stAssignee.name.charAt(0)}
                        </div>
                      )}
                      <select
                        value={st.assignee_id || 0}
                        onChange={e => updateSubtaskAssignee(st.id, Number(e.target.value) || undefined)}
                        className="text-[10px] border rounded px-1 py-0.5 bg-white w-20 truncate opacity-0 group-hover:opacity-100"
                      >
                        <option value={0}>Giao</option>
                        {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                      </select>
                      <button onClick={() => deleteSubtask(st.id)}
                        className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 shrink-0">
                        <X size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Add subtask input */}
              <div className="flex gap-2 mt-2">
                <input
                  value={newSubtaskTitle}
                  onChange={e => setNewSubtaskTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addSubtask(); } }}
                  placeholder="Thêm mục..."
                  className="flex-1 text-sm border rounded-lg px-3 py-1.5 bg-white"
                />
                <button onClick={addSubtask} disabled={!newSubtaskTitle.trim() || savingSubtasks}
                  className="text-xs font-medium text-white bg-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  Thêm
                </button>
              </div>
            </div>

            {/* ── Đính kèm ── */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Paperclip size={16} className="text-slate-500" />
                <h3 className="text-sm font-bold text-slate-700">Các tập tin đính kèm</h3>
                <button onClick={() => fileRef.current?.click()} className="text-xs text-slate-500 hover:text-blue-600 ml-auto font-medium">Thêm</button>
              </div>
              <input ref={fileRef} type="file" accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx" multiple
                onChange={e => handleUpload(e.target.files)} className="hidden" />
              {uploading && <div className="flex items-center gap-2 mb-2"><Loader2 size={14} className="animate-spin text-blue-500" /><span className="text-xs text-slate-400">Đang tải...</span></div>}

              {attachments.length > 0 ? (
                <div className="space-y-2">
                  {attachments.map(att => (
                    <div key={att.id} className="flex items-center gap-3 bg-white rounded-lg p-2 group hover:shadow-sm">
                      {isImage(att.file_type) ? (
                        <a href={att.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                          <div className="w-20 h-14 rounded bg-slate-100 overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={att.url} alt={att.file_name} className="w-full h-full object-cover" />
                          </div>
                        </a>
                      ) : (
                        <a href={att.url} target="_blank" rel="noopener noreferrer"
                          className="w-20 h-14 rounded bg-slate-100 flex items-center justify-center shrink-0">
                          <FileText size={20} className="text-slate-400" />
                        </a>
                      )}
                      <div className="flex-1 min-w-0">
                        <a href={att.url} target="_blank" rel="noopener noreferrer"
                          className="text-sm font-medium text-slate-700 hover:text-blue-600 truncate block">{att.file_name}</a>
                        <span className="text-[10px] text-slate-400">{(att.file_size / 1024).toFixed(0)} KB</span>
                      </div>
                      <button onClick={() => handleDeleteAttachment(att)}
                        className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 shrink-0 p-1">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-2">Chưa có file đính kèm</p>
              )}
            </div>

            {/* ── Liên kết ── */}
            {(links.length > 0 || showLinkForm) && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Link2 size={16} className="text-slate-500" />
                  <h3 className="text-sm font-bold text-slate-700">Liên kết</h3>
                </div>
                {showLinkForm && (
                  <div className="flex gap-2 mb-2">
                    <input placeholder="URL" value={newLinkUrl} onChange={e => setNewLinkUrl(e.target.value)}
                      className="flex-1 text-xs border rounded px-2 py-1.5 bg-white" />
                    <input placeholder="Tiêu đề" value={newLinkTitle} onChange={e => setNewLinkTitle(e.target.value)}
                      className="flex-1 text-xs border rounded px-2 py-1.5 bg-white" />
                    <button onClick={addLink} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700">Thêm</button>
                  </div>
                )}
                <div className="space-y-1">
                  {links.map((link, i) => (
                    <div key={i} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 group">
                      <ExternalLink size={12} className="text-blue-500 shrink-0" />
                      <a href={link.url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline truncate flex-1">{link.title}</a>
                      <button onClick={() => setLinks(prev => prev.filter((_, idx) => idx !== i))}
                        className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Nhận xét và hoạt động ── */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <MessageCircle size={16} className="text-slate-500" />
                <h3 className="text-sm font-bold text-slate-700">Nhận xét và hoạt động</h3>
              </div>

              {/* Comment input */}
              <div className="relative mb-3">
                <div className="flex gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
                    {employees.find(e => e.id === getSelectedEmpId())?.name?.charAt(0) || "?"}
                  </div>
                  <div className="flex-1 relative">
                    <textarea
                      ref={commentInputRef}
                      value={commentText}
                      onChange={e => handleCommentInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
                      placeholder="Viết bình luận..."
                      rows={2}
                      className="w-full text-sm border rounded-lg px-3 py-2 resize-none bg-white pr-10"
                    />
                    <button onClick={handleAddComment}
                      className="absolute right-2 bottom-2 p-1 rounded bg-blue-600 text-white hover:bg-blue-700">
                      <Send size={12} />
                    </button>

                    {/* Mention dropdown */}
                    {showMentionDropdown && filteredMentionEmps.length > 0 && (
                      <div className="absolute bottom-full left-0 mb-1 w-60 bg-white border rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                        {filteredMentionEmps.map(emp => (
                          <button key={emp.id} onClick={() => insertMention(emp)}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-bold">
                              {emp.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-medium text-slate-800">{emp.name}</div>
                              <div className="text-[10px] text-slate-400">{emp.department}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Comment list */}
              <div className="space-y-3">
                {comments.map(c => {
                  const author = employees.find(e => e.id === c.author_id);
                  return (
                    <div key={c.id} className="flex gap-2 group">
                      <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
                        {author?.name?.charAt(0) || "?"}
                      </div>
                      <div className="flex-1 min-w-0 bg-white rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800">{author?.name || "Unknown"}</span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(c.created_at).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                          </span>
                          <button onClick={() => handleDeleteComment(c.id)}
                            className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 ml-auto">
                            <X size={12} />
                          </button>
                        </div>
                        <p className="text-sm text-slate-600 mt-0.5 whitespace-pre-wrap">
                          {c.content.split(/(@\S+)/g).map((part, i) =>
                            part.startsWith("@") ? (
                              <span key={i} className="text-blue-600 font-medium bg-blue-50 rounded px-0.5">{part}</span>
                            ) : part
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ===== RIGHT SIDEBAR: Actions (Trello-style) ===== */}
          <div className="w-44 shrink-0 space-y-3">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Thao tác</p>

            {/* Status */}
            <div>
              <label className="text-[10px] text-slate-500 font-medium block mb-1">Trạng thái</label>
              <select value={status} onChange={e => setStatus(e.target.value)}
                className="w-full text-xs border rounded-lg px-2 py-1.5 bg-white">
                {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="text-[10px] text-slate-500 font-medium block mb-1">Ưu tiên</label>
              <select value={priority} onChange={e => setPriority(e.target.value)}
                className="w-full text-xs border rounded-lg px-2 py-1.5 bg-white">
                {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>

            {/* Assignee */}
            <div>
              <label className="text-[10px] text-slate-500 font-medium block mb-1">Thành viên</label>
              <select value={assigneeId} onChange={e => setAssigneeId(Number(e.target.value))}
                className="w-full text-xs border rounded-lg px-2 py-1.5 bg-white">
                <option value={0}>-- Chọn --</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>

            {/* Due date */}
            <div>
              <label className="text-[10px] text-slate-500 font-medium block mb-1">Ngày</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                className="w-full text-xs border rounded-lg px-2 py-1.5 bg-white" />
            </div>

            {/* Action buttons */}
            <div className="space-y-1.5 pt-2 border-t border-slate-200">
              <button onClick={() => fileRef.current?.click()}
                className="w-full flex items-center gap-2 text-xs text-slate-600 bg-white hover:bg-slate-50 rounded-lg px-3 py-2 border border-slate-200 transition-colors">
                <Paperclip size={13} /> Đính kèm
              </button>
              <button onClick={() => {
                if (fileRef.current) {
                  fileRef.current.setAttribute("capture", "environment");
                  fileRef.current.click();
                  setTimeout(() => fileRef.current?.removeAttribute("capture"), 100);
                }
              }}
                className="w-full flex items-center gap-2 text-xs text-slate-600 bg-white hover:bg-slate-50 rounded-lg px-3 py-2 border border-slate-200 transition-colors">
                <Camera size={13} /> Chụp ảnh
              </button>
              <button onClick={() => setShowLinkForm(!showLinkForm)}
                className="w-full flex items-center gap-2 text-xs text-slate-600 bg-white hover:bg-slate-50 rounded-lg px-3 py-2 border border-slate-200 transition-colors">
                <Link2 size={13} /> Liên kết
              </button>
            </div>

            {/* Save + Delete */}
            <div className="space-y-1.5 pt-2 border-t border-slate-200">
              <button onClick={handleSave} disabled={saving}
                className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-blue-600 px-3 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                Lưu thay đổi
              </button>
              {!confirmDelete ? (
                <button onClick={() => setConfirmDelete(true)}
                  className="w-full flex items-center justify-center gap-1.5 text-xs text-red-500 hover:text-red-700 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors">
                  <Trash2 size={13} /> Xoá thẻ
                </button>
              ) : (
                <div className="bg-red-50 rounded-lg p-2 space-y-1.5">
                  <p className="text-[10px] text-red-600 flex items-center gap-1"><AlertTriangle size={10} /> Chắc chắn xoá?</p>
                  <div className="flex gap-1">
                    <button onClick={handleDelete} disabled={deleting}
                      className="flex-1 text-[10px] bg-red-600 text-white px-2 py-1 rounded font-medium hover:bg-red-700">
                      {deleting ? "..." : "Xoá"}
                    </button>
                    <button onClick={() => setConfirmDelete(false)}
                      className="flex-1 text-[10px] text-slate-500 px-2 py-1 rounded hover:bg-white">Huỷ</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
