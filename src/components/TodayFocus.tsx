"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  AlertTriangle, Target, Package, UserX, ArrowRight,
  Plus, Check, X, Flame, ChevronDown, ChevronUp,
} from 'lucide-react';
import { getCEOTodos, createCEOTodo, toggleCEOTodo, deleteCEOTodo } from '@/lib/supabase-data';

interface SystemAlert {
  icon: React.ReactNode;
  count: number;
  label: string;
  href: string;
  color: 'red' | 'amber';
}

interface Todo {
  id: string;
  title: string;
  category: string;
  is_urgent: boolean;
  status: string;
  created_at: string;
  completed_at: string | null;
}

interface TodayFocusProps {
  alerts: SystemAlert[];
}

const CAT_COLORS: Record<string, string> = {
  strategy: 'text-purple-600',
  people: 'text-violet-600',
  finance: 'text-blue-600',
  operations: 'text-emerald-600',
  general: 'text-slate-500',
};

const CAT_LABELS: Record<string, string> = {
  strategy: 'Chiến lược',
  people: 'Nhân sự',
  finance: 'Tài chính',
  operations: 'Vận hành',
  general: 'Chung',
};

const CAT_DOTS: Record<string, string> = {
  strategy: 'bg-purple-400',
  people: 'bg-violet-400',
  finance: 'bg-blue-400',
  operations: 'bg-emerald-400',
  general: 'bg-slate-400',
};

export default function TodayFocus({ alerts }: TodayFocusProps) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newCat, setNewCat] = useState('general');
  const [newUrgent, setNewUrgent] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => { loadTodos(); }, []);

  async function loadTodos() {
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
    try { await toggleCEOTodo(id); } catch (e) { console.error(e); loadTodos(); }
  }

  async function handleDelete(id: string) {
    setTodos(prev => prev.filter(t => t.id !== id));
    try { await deleteCEOTodo(id); } catch (e) { console.error(e); loadTodos(); }
  }

  const active = todos.filter(t => t.status === 'todo');
  const done = todos.filter(t => t.status === 'done');
  const totalItems = alerts.length + active.length;

  return (
    <div className="rounded-2xl bg-white border border-slate-200/80 p-5 shadow-sm animate-fade-in-up">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
            <span className="text-white text-xs font-bold">📋</span>
          </div>
          <h2 className="text-base font-bold text-slate-800">Hôm nay</h2>
        </div>
        {totalItems > 0 && (
          <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">{totalItems} việc</span>
        )}
      </div>

      {/* System alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2 mb-4 stagger-children">
          {alerts.map((alert, i) => {
            const isRed = alert.color === 'red';
            return (
              <Link
                key={i}
                href={alert.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 border ${
                  isRed
                    ? 'bg-gradient-to-r from-red-50 to-rose-50/50 border-red-200/60 hover:border-red-300 hover:shadow-md hover:shadow-red-100'
                    : 'bg-gradient-to-r from-amber-50 to-yellow-50/50 border-amber-200/60 hover:border-amber-300 hover:shadow-md hover:shadow-amber-100'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isRed ? 'bg-red-100' : 'bg-amber-100'}`}>
                  <span className={isRed ? 'text-red-600' : 'text-amber-600'}>{alert.icon}</span>
                </div>
                <span className={`flex-1 text-sm font-semibold ${isRed ? 'text-red-800' : 'text-amber-800'}`}>
                  {alert.count} {alert.label}
                </span>
                <ArrowRight size={14} className="text-slate-300" />
              </Link>
            );
          })}
        </div>
      )}

      {/* Divider */}
      {alerts.length > 0 && active.length > 0 && (
        <div className="border-t border-dashed border-slate-200 my-4" />
      )}

      {/* Personal todos */}
      {active.length > 0 && (
        <div className="space-y-1 mb-4">
          {active.map(todo => (
            <div key={todo.id} className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-slate-50/80 group transition-colors">
              <button
                onClick={() => handleToggle(todo.id)}
                className="w-5 h-5 rounded-full border-2 border-slate-300 hover:border-indigo-500 hover:bg-indigo-50 flex-shrink-0 transition-colors"
              />
              {todo.is_urgent && <Flame size={14} className="text-red-500 flex-shrink-0 drop-shadow-[0_0_3px_rgba(239,68,68,0.4)]" />}
              <span className="flex-1 text-sm text-slate-700 font-medium">{todo.title}</span>
              <span className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${CAT_DOTS[todo.category] || 'bg-slate-400'}`} />
                <span className={`text-[10px] font-semibold ${CAT_COLORS[todo.category] || 'text-slate-500'}`}>
                  {CAT_LABELS[todo.category] || ''}
                </span>
              </span>
              <button onClick={() => handleDelete(todo.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Quick-add bar */}
      <div className="flex gap-2">
        <div className="flex-1 flex items-center gap-2 bg-slate-50/80 border border-slate-200 rounded-xl px-4 py-2.5 focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all">
          <input
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="+ Thêm việc..."
            className="flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
          />
          <button
            onClick={() => setNewUrgent(!newUrgent)}
            title="Đánh dấu khẩn"
            className={`p-1.5 rounded-lg transition-colors ${newUrgent ? 'text-red-500 bg-red-50' : 'text-slate-300 hover:text-slate-400'}`}
          >
            <Flame size={14} />
          </button>
          <select
            value={newCat}
            onChange={e => setNewCat(e.target.value)}
            className="bg-transparent text-xs text-slate-500 outline-none cursor-pointer"
          >
            {Object.entries(CAT_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleAdd}
          disabled={!newTitle.trim() || adding}
          className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl px-4 py-2.5 hover:shadow-lg hover:shadow-indigo-500/25 disabled:opacity-50 transition-all"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* All OK message */}
      {alerts.length === 0 && active.length === 0 && done.length === 0 && (
        <div className="text-center py-4 mt-2">
          <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-2">
            <Check size={18} className="text-emerald-500" />
          </div>
          <p className="text-sm text-emerald-600 font-medium">Mọi thứ ổn! Không có vấn đề nào cần xử lý.</p>
        </div>
      )}

      {/* Completed todos */}
      {done.length > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-100">
          <button onClick={() => setShowDone(!showDone)} className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors">
            {showDone ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {done.length} đã xong
          </button>
          {showDone && (
            <div className="mt-2 space-y-1">
              {done.slice(0, 10).map(todo => (
                <div key={todo.id} className="flex items-center gap-3 py-2 px-3 group rounded-lg">
                  <button onClick={() => handleToggle(todo.id)} className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <Check size={11} className="text-emerald-600" />
                  </button>
                  <span className="flex-1 text-sm text-slate-400 line-through">{todo.title}</span>
                  <button onClick={() => handleDelete(todo.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all">
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

// ─── Helper: derive system alerts from CData ──────────────────────────────

export function deriveAlerts(data: {
  messages: any[];
  businessTargets: any[];
  stockAlerts: any[];
  report: any;
}): SystemAlert[] {
  const items: SystemAlert[] = [];
  const { messages, businessTargets, stockAlerts, report: r } = data;

  const alertCount = messages.filter((m: any) => m.type === 'alert').length;
  if (alertCount > 0) {
    items.push({
      icon: <AlertTriangle size={16} />, count: alertCount,
      label: 'cảnh báo từ AI', href: '/admin/bao-cao-chien-luoc', color: 'red',
    });
  }

  const atRisk = r?.employees?.atRisk?.length || 0;
  if (atRisk > 0) {
    items.push({
      icon: <UserX size={16} />, count: atRisk,
      label: 'NV cần chú ý', href: '/admin/nhan-vien', color: 'amber',
    });
  }

  const criticalStock = stockAlerts.filter((a: any) => a.status === 'critical' || a.status === 'low').length;
  if (criticalStock > 0) {
    items.push({
      icon: <Package size={16} />, count: criticalStock,
      label: 'mặt hàng sắp hết', href: '/admin/ton-kho', color: 'amber',
    });
  }

  const behindTargets = businessTargets.filter((t: any) => t.status === 'behind').length;
  if (behindTargets > 0) {
    items.push({
      icon: <Target size={16} />, count: behindTargets,
      label: 'mục tiêu đang chậm', href: '/admin/muc-tieu', color: 'red',
    });
  }

  return items;
}
