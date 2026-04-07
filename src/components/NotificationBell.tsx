"use client";

import { useState, useEffect, useRef } from 'react';
import { Bell, Check, CheckCheck, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/lib/supabase-data';

interface Notification {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
}

const typeColors: Record<string, string> = {
  task_assigned: 'bg-blue-100 text-blue-700',
  report_submitted: 'bg-emerald-100 text-emerald-700',
  report_approved: 'bg-green-100 text-green-700',
  alert: 'bg-amber-100 text-amber-700',
  system: 'bg-slate-100 text-slate-700',
};

const typeLabels: Record<string, string> = {
  task_assigned: 'Task mới',
  report_submitted: 'Báo cáo',
  report_approved: 'Duyệt',
  alert: 'Cảnh báo',
  system: 'Hệ thống',
};

export default function NotificationBell({ userId }: { userId: number }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Load unread count on mount + poll every 60s
  useEffect(() => {
    let mounted = true;

    async function loadCount() {
      try {
        const count = await getUnreadNotificationCount(userId);
        if (mounted) setUnreadCount(count);
      } catch {
        // Silently fail — table might not exist yet
      }
    }

    loadCount();
    const interval = setInterval(loadCount, 60000);
    return () => { mounted = false; clearInterval(interval); };
  }, [userId]);

  // Load notifications when panel opens
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getNotifications(userId, 15)
      .then((data) => setNotifications(data as Notification[]))
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  }, [open, userId]);

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  async function handleMarkRead(id: number) {
    try {
      await markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { /* ignore */ }
  }

  async function handleMarkAllRead() {
    try {
      await markAllNotificationsRead(userId);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch { /* ignore */ }
  }

  function handleClickNotification(n: Notification) {
    if (!n.read) handleMarkRead(n.id);
    if (n.link) {
      setOpen(false);
      router.push(n.link);
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors"
        title="Thông báo"
      >
        <Bell size={20} className="text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-h-96 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h3 className="font-semibold text-sm text-slate-800">Thông báo</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <CheckCheck size={12} />
                Đọc tất cả
              </button>
            )}
          </div>

          {/* List */}
          <div className="overflow-y-auto max-h-80">
            {loading ? (
              <div className="p-6 text-center text-sm text-slate-400">Đang tải...</div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-400">Chưa có thông báo</div>
            ) : (
              notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => handleClickNotification(n)}
                  className={`w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors ${!n.read ? 'bg-blue-50/50' : ''}`}
                >
                  <div className="flex items-start gap-2">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${typeColors[n.type] || 'bg-slate-100 text-slate-600'}`}>
                      {typeLabels[n.type] || n.type}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!n.read ? 'font-medium text-slate-800' : 'text-slate-600'}`}>
                        {n.title}
                      </p>
                      {n.message && (
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{n.message}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-slate-400">{timeAgo(n.created_at)}</span>
                        {n.link && <ExternalLink size={10} className="text-slate-300" />}
                      </div>
                    </div>
                    {!n.read && (
                      <span
                        onClick={(e) => { e.stopPropagation(); handleMarkRead(n.id); }}
                        className="p-1 hover:bg-blue-100 rounded"
                        title="Đánh dấu đã đọc"
                      >
                        <Check size={12} className="text-blue-500" />
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
