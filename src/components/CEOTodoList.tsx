"use client";

import { useState, useEffect } from 'react';
import { Plus, Check, X, Flame, ChevronDown, ChevronUp } from 'lucide-react';
import { getCEOTodos, createCEOTodo, toggleCEOTodo, deleteCEOTodo } from '@/lib/supabase-data';

interface Todo {
  id: string;
  title: string;
  category: string;
  is_urgent: boolean;
  status: string;
  created_at: string;
  completed_at: string | null;
}

const CAT_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  strategy: { label: 'Chiến lược', bg: 'bg-purple-100', text: 'text-purple-700' },
  people: { label: 'Nhân sự', bg: 'bg-violet-100', text: 'text-violet-700' },
  finance: { label: 'Tài chính', bg: 'bg-blue-100', text: 'text-blue-700' },
  operations: { label: 'Vận hành', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  general: { label: 'Chung', bg: 'bg-slate-100', text: 'text-slate-600' },
};

export default function CEOTodoList() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newCat, setNewCat] = useState('general');
  const [newUrgent, setNewUrgent] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try { setTodos(await getCEOTodos()); } catch (e) { console.error(e); }
  }

  async function handleAdd() {
    if (!newTitle.trim() || adding) return;
    setAdding(true);
    try {
      const todo = await createCEOTodo(newTitle.trim(), newCat, newUrgent);
      setTodos(prev => [todo, ...prev]);
      setNewTitle('');
      setNewUrgent(false);
    } catch (e) { console.error(e); }
    setAdding(false);
  }

  async function handleToggle(id: string) {
    setTodos(prev => prev.map(t => t.id === id ? {
      ...t,
      status: t.status === 'done' ? 'todo' : 'done',
      completed_at: t.status === 'done' ? null : new Date().toISOString(),
    } : t));
    try { await toggleCEOTodo(id); } catch (e) { console.error(e); load(); }
  }

  async function handleDelete(id: string) {
    setTodos(prev => prev.filter(t => t.id !== id));
    try { await deleteCEOTodo(id); } catch (e) { console.error(e); load(); }
  }

  const active = todos.filter(t => t.status === 'todo');
  const done = todos.filter(t => t.status === 'done');

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <span className="text-lg">📋</span> Việc của tôi
        </h2>
        {active.length > 0 && (
          <span className="text-xs text-slate-400">{active.length} việc</span>
        )}
      </div>

      {/* Quick-add bar */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
          <input
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="Thêm việc cần làm..."
            className="flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
          />
          <button
            onClick={() => setNewUrgent(!newUrgent)}
            title="Đánh dấu khẩn"
            className={`p-1 rounded ${newUrgent ? 'text-red-500 bg-red-50' : 'text-slate-300 hover:text-slate-400'}`}
          >
            <Flame size={14} />
          </button>
          <select
            value={newCat}
            onChange={e => setNewCat(e.target.value)}
            className="bg-transparent text-xs text-slate-500 outline-none cursor-pointer"
          >
            {Object.entries(CAT_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleAdd}
          disabled={!newTitle.trim() || adding}
          className="bg-blue-600 text-white rounded-lg px-3 py-2 hover:bg-blue-700 disabled:opacity-50"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Active todos */}
      {active.length === 0 && done.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-3">Chưa có việc nào. Thêm việc ở trên!</p>
      ) : (
        <div className="space-y-1">
          {active.map(todo => (
            <div key={todo.id} className="flex items-center gap-2.5 py-2 px-2 rounded-lg hover:bg-slate-50 group">
              <button onClick={() => handleToggle(todo.id)} className="w-5 h-5 rounded-full border-2 border-slate-300 hover:border-blue-500 flex-shrink-0" />
              {todo.is_urgent && <Flame size={13} className="text-red-500 flex-shrink-0" />}
              <span className="flex-1 text-sm text-slate-700">{todo.title}</span>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${CAT_CONFIG[todo.category]?.bg || 'bg-slate-100'} ${CAT_CONFIG[todo.category]?.text || 'text-slate-600'}`}>
                {CAT_CONFIG[todo.category]?.label || todo.category}
              </span>
              <button onClick={() => handleDelete(todo.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Completed todos */}
      {done.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <button onClick={() => setShowDone(!showDone)} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600">
            {showDone ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {done.length} việc đã xong
          </button>
          {showDone && (
            <div className="mt-2 space-y-1">
              {done.slice(0, 10).map(todo => (
                <div key={todo.id} className="flex items-center gap-2.5 py-1.5 px-2 group">
                  <button onClick={() => handleToggle(todo.id)} className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <Check size={11} className="text-emerald-600" />
                  </button>
                  <span className="flex-1 text-sm text-slate-400 line-through">{todo.title}</span>
                  <button onClick={() => handleDelete(todo.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
