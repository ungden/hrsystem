"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ListChecks,
  CalendarCheck,
  DollarSign,
  Target,
  User,
  LogOut,
  Shield,
} from "lucide-react";
import { createClient } from "@/lib/supabase";

const menuItems = [
  { label: "Dashboard", href: "/employee", icon: LayoutDashboard },
  { label: "Công việc của tôi", href: "/employee/cong-viec", icon: ListChecks },
  { label: "Chấm công", href: "/employee/cham-cong", icon: CalendarCheck },
  { label: "Bảng lương", href: "/employee/luong", icon: DollarSign },
  { label: "KPI & Mục tiêu", href: "/employee/kpi", icon: Target },
  { label: "Hồ sơ cá nhân", href: "/employee/ho-so", icon: User },
];

export default function EmployeeSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string) => {
    if (href === '/employee') return pathname === '/employee';
    return pathname === href || pathname.startsWith(href + "/");
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-[260px] bg-white border-r border-slate-200/80 flex flex-col z-50 shadow-[2px_0_8px_-2px_rgba(0,0,0,0.05)]">
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-slate-100">
        <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-sm">
          <span className="text-white font-bold text-sm">HR</span>
        </div>
        <div className="ml-3">
          <span className="font-bold text-slate-800 text-[15px] leading-tight block">HR System</span>
          <span className="text-[10px] text-emerald-500 leading-tight">Employee Portal</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <div className="px-3 pb-1.5">
          <span className="text-[10px] font-semibold text-slate-400 tracking-widest uppercase">MENU</span>
        </div>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 mb-0.5 ${
                active
                  ? "text-emerald-700 bg-emerald-50/80"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              <Icon size={18} className={active ? "text-emerald-600" : "text-slate-400"} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Switch to Admin (visible for admin role users) */}
      <div className="px-3 pb-2">
        <Link href="/admin" className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-[12px] font-medium transition-colors">
          <Shield size={14} />
          Chuyển sang Admin Panel
        </Link>
      </div>

      {/* User section */}
      <div className="border-t border-slate-100 p-3">
        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors group">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
            NV
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-[13px] font-medium text-slate-700 truncate">Bui Van Duong</p>
            <p className="text-[11px] text-slate-400 truncate">Nhân viên</p>
          </div>
          <LogOut size={16} className="text-slate-400 group-hover:text-slate-600 transition-colors flex-shrink-0" />
        </button>
      </div>
    </aside>
  );
}
