"use client";

import { useState, useEffect, useRef } from "react";
import {
  X, Edit3, Save, Trash2, Upload, Link2, MessageCircle,
  Calendar, User, AlertTriangle, Loader2, FileText, Camera,
  Send, Plus, ExternalLink, Paperclip, ListChecks, Square, CheckSquare,
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

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  urgent: { label: "Khẩn cấp", color: "bg-red-100 text-red-700" },
  high: { label: "Cao", color: "bg-orange-100 text-orange-700" },
  medium: { label: "Trung bình", color: "bg-blue-100 text-blue-700" },
  low: { label: "Thấp", color: "bg-slate-100 text-slate-600" },
};

const STATUS_OPTIONS = [
  { value: "todo", label: "Chờ làm" },
  { value: "in_progress", label: "Đang làm" },
  { value: "review", label: "Review" },
  { value: "done", label: "Hoàn thành" },
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
  const [activeTab, setActiveTab] = useState<"detail" | "subtasks" | "files" | "comments">("detail");

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

  async function updateSubtaskAssignee(id: string, assigneeId: number | undefined) {
    const updated = subtasks.map(s => s.id === id ? { ...s, assignee_id: assigneeId } : s);
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
  const isImage = (type: string) => type?.startsWith("image/");
  const filteredMentionEmps = employees.filter(e =>
    e.name.toLowerCase().includes(mentionFilter)
  ).slice(0, 5);

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-start justify-center pt-10 px-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl mb-10" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {editingTitle ? (
              <input
                autoFocus
                value={title}
                onChange={e => setTitle(e.target.value)}
                onBlur={() => setEditingTitle(false)}
                onKeyDown={e => e.key === "Enter" && setEditingTitle(false)}
                className="text-lg font-bold text-slate-800 border-b-2 border-blue-500 outline-none flex-1"
              />
            ) : (
              <h2
                className="text-lg font-bold text-slate-800 truncate cursor-pointer hover:text-blue-700 flex-1"
                onClick={() => setEditingTitle(true)}
              >
                {title}
                <Edit3 size={14} className="inline ml-2 text-slate-400" />
              </h2>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 px-5">
          {[
            { key: "detail" as const, label: "Chi tiết", icon: Edit3 },
            { key: "subtasks" as const, label: `Việc chi tiết (${subtasks.length})`, icon: ListChecks },
            { key: "files" as const, label: `Đính kèm (${attachments.length})`, icon: Paperclip },
            { key: "comments" as const, label: `Bình luận (${comments.length})`, icon: MessageCircle },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <tab.icon size={14} /> {tab.label}
            </button>
          ))}
        </div>

        <div className="p-5 max-h-[65vh] overflow-y-auto">
          {/* DETAIL TAB */}
          {activeTab === "detail" && (
            <div className="space-y-4">
              {/* Properties grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 font-medium">Trạng thái</label>
                  <select value={status} onChange={e => setStatus(e.target.value)}
                    className="w-full mt-1 text-sm border rounded-lg px-3 py-2">
                    {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-medium">Ưu tiên</label>
                  <select value={priority} onChange={e => setPriority(e.target.value)}
                    className="w-full mt-1 text-sm border rounded-lg px-3 py-2">
                    {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-medium">Người thực hiện</label>
                  <select value={assigneeId} onChange={e => setAssigneeId(Number(e.target.value))}
                    className="w-full mt-1 text-sm border rounded-lg px-3 py-2">
                    <option value={0}>-- Chọn --</option>
                    {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-medium">Hạn hoàn thành</label>
                  <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                    className="w-full mt-1 text-sm border rounded-lg px-3 py-2" />
                </div>
              </div>

              {/* Points + Category */}
              <div className="flex gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-500">Điểm:</span>
                  <span className="font-bold text-amber-600">{task.points || 0} pts</span>
                </div>
                {task.category && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-slate-500">Danh mục:</span>
                    <span className="font-medium text-slate-700">{task.category}</span>
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="text-xs text-slate-500 font-medium">Mô tả</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Thêm mô tả..."
                  className="w-full mt-1 text-sm border rounded-lg px-3 py-2 resize-none"
                />
              </div>

              {/* Links */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-slate-500 font-medium flex items-center gap-1">
                    <Link2 size={12} /> Liên kết ({links.length})
                  </label>
                  <button onClick={() => setShowLinkForm(!showLinkForm)}
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-0.5">
                    <Plus size={12} /> Thêm link
                  </button>
                </div>
                {showLinkForm && (
                  <div className="flex gap-2 mb-2">
                    <input placeholder="URL" value={newLinkUrl} onChange={e => setNewLinkUrl(e.target.value)}
                      className="flex-1 text-xs border rounded px-2 py-1.5" />
                    <input placeholder="Tiêu đề (tùy chọn)" value={newLinkTitle} onChange={e => setNewLinkTitle(e.target.value)}
                      className="flex-1 text-xs border rounded px-2 py-1.5" />
                    <button onClick={addLink} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700">Thêm</button>
                  </div>
                )}
                {links.length > 0 && (
                  <div className="space-y-1">
                    {links.map((link, i) => (
                      <div key={i} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-1.5 group">
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
                )}
              </div>
            </div>
          )}

          {/* SUBTASKS TAB */}
          {activeTab === "subtasks" && (
            <div className="space-y-4">
              {/* Progress */}
              {subtasks.length > 0 && (
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${subtasks.length > 0 ? Math.round((subtasksDone / subtasks.length) * 100) : 0}%` }} />
                  </div>
                  <span className="text-xs text-slate-500 font-medium">{subtasksDone}/{subtasks.length}</span>
                </div>
              )}

              {/* Subtask list */}
              {subtasks.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">Chưa có việc chi tiết</p>
              ) : (
                <div className="space-y-1">
                  {subtasks.map(st => {
                    const stAssignee = employees.find(e => e.id === st.assignee_id);
                    return (
                      <div key={st.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg group transition-colors ${st.done ? 'bg-green-50/50' : 'hover:bg-slate-50'}`}>
                        <button onClick={() => toggleSubtask(st.id)} className="flex-shrink-0">
                          {st.done ? (
                            <CheckSquare size={18} className="text-green-500" />
                          ) : (
                            <Square size={18} className="text-slate-300 hover:text-blue-400" />
                          )}
                        </button>
                        <span className={`text-sm flex-1 min-w-0 ${st.done ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                          {st.title}
                        </span>
                        <select
                          value={st.assignee_id || 0}
                          onChange={e => updateSubtaskAssignee(st.id, Number(e.target.value) || undefined)}
                          className="text-[10px] border border-slate-200 rounded px-1.5 py-1 bg-white w-24 truncate opacity-60 group-hover:opacity-100"
                        >
                          <option value={0}>-- Giao --</option>
                          {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                        </select>
                        {stAssignee && (
                          <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[9px] font-bold flex-shrink-0" title={stAssignee.name}>
                            {stAssignee.name.charAt(0)}
                          </div>
                        )}
                        <button onClick={() => deleteSubtask(st.id)}
                          className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 flex-shrink-0">
                          <X size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add new subtask */}
              <div className="flex gap-2">
                <input
                  value={newSubtaskTitle}
                  onChange={e => setNewSubtaskTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addSubtask(); } }}
                  placeholder="Thêm việc chi tiết..."
                  className="flex-1 text-sm border rounded-lg px-3 py-2"
                />
                <button onClick={addSubtask} disabled={!newSubtaskTitle.trim() || savingSubtasks}
                  className="flex items-center gap-1 text-sm font-medium text-white bg-blue-600 px-3 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  <Plus size={14} /> Thêm
                </button>
              </div>
            </div>
          )}

          {/* FILES TAB */}
          {activeTab === "files" && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <button onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-1.5 text-sm text-blue-600 bg-blue-50 rounded-lg px-3 py-2 hover:bg-blue-100">
                  <Upload size={14} /> Tải file
                </button>
                <button onClick={() => {
                  if (fileRef.current) {
                    fileRef.current.setAttribute("capture", "environment");
                    fileRef.current.click();
                    setTimeout(() => fileRef.current?.removeAttribute("capture"), 100);
                  }
                }}
                  className="flex items-center gap-1.5 text-sm text-emerald-600 bg-emerald-50 rounded-lg px-3 py-2 hover:bg-emerald-100">
                  <Camera size={14} /> Chụp ảnh
                </button>
                {uploading && <Loader2 size={16} className="animate-spin text-blue-500 self-center" />}
              </div>
              <input ref={fileRef} type="file" accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx" multiple
                onChange={e => handleUpload(e.target.files)} className="hidden" />

              {attachments.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">Chưa có file đính kèm</p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {attachments.map(att => (
                    <div key={att.id} className="relative group">
                      {isImage(att.file_type) ? (
                        <a href={att.url} target="_blank" rel="noopener noreferrer">
                          <div className="aspect-square rounded-lg bg-slate-100 border overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={att.url} alt={att.file_name} className="w-full h-full object-cover" />
                          </div>
                        </a>
                      ) : (
                        <a href={att.url} target="_blank" rel="noopener noreferrer"
                          className="aspect-square rounded-lg bg-slate-50 border flex items-center justify-center">
                          <FileText size={24} className="text-slate-400" />
                        </a>
                      )}
                      <button onClick={() => handleDeleteAttachment(att)}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <X size={10} />
                      </button>
                      <p className="text-[9px] text-slate-400 text-center truncate mt-1">{att.file_name}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* COMMENTS TAB */}
          {activeTab === "comments" && (
            <div className="space-y-4">
              {/* Comment list */}
              {comments.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">Chưa có bình luận</p>
              ) : (
                <div className="space-y-3">
                  {comments.map(c => {
                    const author = employees.find(e => e.id === c.author_id);
                    return (
                      <div key={c.id} className="flex gap-3 group">
                        <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
                          {author?.name?.charAt(0) || "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-800">{author?.name || "Unknown"}</span>
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
                          {c.mentions?.length > 0 && (
                            <div className="flex gap-1 mt-1">
                              {c.mentions.map(mId => {
                                const m = employees.find(e => e.id === mId);
                                return m ? (
                                  <span key={mId} className="text-[10px] text-blue-600 bg-blue-50 rounded px-1.5 py-0.5">@{m.name}</span>
                                ) : null;
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Comment input */}
              <div className="relative">
                <textarea
                  ref={commentInputRef}
                  value={commentText}
                  onChange={e => handleCommentInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
                  placeholder="Nhập bình luận... (dùng @ để tag)"
                  rows={2}
                  className="w-full text-sm border rounded-lg px-3 py-2 resize-none pr-10"
                />
                <button onClick={handleAddComment}
                  className="absolute right-2 bottom-2 p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
                  <Send size={14} />
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
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
          <div>
            {!confirmDelete ? (
              <button onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-50">
                <Trash2 size={14} /> Xoá task
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-600 flex items-center gap-1">
                  <AlertTriangle size={12} /> Chắc chắn?
                </span>
                <button onClick={handleDelete} disabled={deleting}
                  className="text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700">
                  {deleting ? <Loader2 size={12} className="animate-spin" /> : "Xoá"}
                </button>
                <button onClick={() => setConfirmDelete(false)}
                  className="text-xs text-slate-500 hover:text-slate-700">Huỷ</button>
              </div>
            )}
          </div>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-1.5 text-sm font-medium text-white bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Lưu thay đổi
          </button>
        </div>
      </div>
    </div>
  );
}
