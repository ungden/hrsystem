"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Users, ChevronDown, LogOut, Brain, MessageCircle,
  ClipboardCheck, BarChart3, Receipt, ClipboardList, Bot,
  Gift, ShoppingCart, DollarSign, Target, Wallet, ScrollText,
  FileSpreadsheet, Building2, GitBranch, CalendarRange,
  Settings2, ListChecks, CalendarCheck, TrendingUp, Map,
  MoreHorizontal,
} from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase";
import NotificationBell from "./NotificationBell";
import { getSelectedEmpId } from "@/lib/employee-context";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  description: string;
}

const primaryItems: NavItem[] = [
  { label: "Tổng quan", href: "/admin", icon: Bot, description: "Chỉ số chính, việc cần làm" },
  { label: "Đội ngũ", href: "/admin/nhan-vien", icon: Users, description: "KPI, phân tích nhân viên" },
  { label: "Duyệt báo cáo", href: "/admin/duyet-bao-cao", icon: ClipboardCheck, description: "Báo cáo hàng ngày" },
  { label: "Kinh doanh", href: "/admin/don-hang", icon: ShoppingCart, description: "Đơn hàng, kho, sản phẩm" },
  { label: "Hỏi AI", href: "/admin/tro-chuyen", icon: MessageCircle, description: "Chat với 11 AI Agents" },
];

const moreItems = [
  { label: "Báo cáo chiến lược", href: "/admin/bao-cao-chien-luoc", icon: Brain },
  { label: "KH vs Thực tế", href: "/admin/ke-hoach-thuc-te", icon: BarChart3 },
  { label: "Bảng lương", href: "/admin/bang-luong", icon: Receipt },
  { label: "Tồn kho", href: "/admin/ton-kho", icon: ClipboardList },
  { label: "Bảng tính thưởng", href: "/admin/bang-thuong", icon: Gift },
  { label: "Báo cáo tài chính", href: "/admin/bao-cao-tai-chinh", icon: FileSpreadsheet },
  { label: "Phòng ban", href: "/admin/phong-ban", icon: Building2 },
  { label: "Mục tiêu", href: "/admin/muc-tieu", icon: Target },
  { label: "Tổng quan OKR", href: "/admin/tong-quan-okr", icon: GitBranch },
  { label: "Kế hoạch chi tiết", href: "/admin/ke-hoach-chi-tiet", icon: CalendarRange },
  { label: "Quản lý chi phí", href: "/admin/chi-phi", icon: Wallet },
  { label: "Dự báo lương thưởng", href: "/admin/luong-thuong", icon: DollarSign },
  { label: "Bảng tổng hợp", href: "/admin/bang-tong-hop", icon: FileSpreadsheet },
  { label: "Nhật ký", href: "/admin/nhat-ky", icon: ScrollText },
  { label: "Nhập số liệu", href: "/admin/nhap-so-lieu", icon: ClipboardCheck },
  { label: "Cấu hình form", href: "/admin/cau-hinh-form", icon: Settings2 },
  { label: "Sản phẩm", href: "/admin/san-pham", icon: Gift },
  { label: "Kế hoạch đặt hàng", href: "/admin/ke-hoach-dat-hang", icon: Receipt },
  { label: "Master Plan", href: "/admin/master-plan", icon: Map },
  { label: "Giao việc (Kanban)", href: "/nhan-su/kanban", icon: ListChecks },
  { label: "Duyệt lương", href: "/nhan-su/duyet-luong", icon: DollarSign },
  { label: "Chấm công", href: "/nhan-su/cham-cong", icon: CalendarCheck },
  { label: "Lộ trình nghề nghiệp", href: "/nhan-su/career-framework", icon: TrendingUp },
  { label: "Báo cáo tổng hợp", href: "/admin/bao-cao-tong-hop", icon: FileSpreadsheet },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [moreExpanded, setMoreExpanded] = useState(false);

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname === href || pathname.startsWith(href + "/");
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-[240px] bg-white border-r border-slate-200/80 flex flex-col z-50 shadow-[2px_0_12px_-4px_rgba(0,0,0,0.06)]">
      {/* Logo + Notification */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-slate-100">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg flex items-center justify-center shadow-md shadow-indigo-500/25">
            <span className="text-white font-bold text-xs">TW</span>
          </div>
          <span className="ml-2.5 font-bold text-slate-800 text-sm tracking-wide">Teeworld</span>
        </div>
        <NotificationBell userId={getSelectedEmpId()} />
      </div>

      {/* Primary Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-3">
        <div className="space-y-1">
          {primaryItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-start gap-3 px-3 py-2.5 rounded-xl text-[13px] transition-all duration-200 ${
                  active
                    ? "text-indigo-700 bg-indigo-50 font-medium shadow-sm"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                }`}
              >
                <div className={`mt-0.5 flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${
                  active
                    ? "bg-gradient-to-br from-indigo-500 to-violet-600 shadow-md shadow-indigo-500/25"
                    : "bg-slate-100"
                }`}>
                  <Icon size={15} className={active ? "text-white" : "text-slate-400"} />
                </div>
                <div className="min-w-0">
                  <span className="block leading-tight">{item.label}</span>
                  <span className={`block text-[10px] leading-tight mt-0.5 ${active ? 'text-indigo-500/70' : 'text-slate-400'}`}>{item.description}</span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* More — collapsed */}
        <div className="mt-4 pt-3 border-t border-slate-100">
          <button
            onClick={() => setMoreExpanded(!moreExpanded)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-all"
          >
            <MoreHorizontal size={16} className="text-slate-400" />
            <span className="flex-1 text-left">Thêm</span>
            <ChevronDown size={14} className={`text-slate-400 transition-transform duration-300 ${moreExpanded ? "rotate-180" : ""}`} />
          </button>
          <div className={`overflow-hidden transition-all duration-300 ${moreExpanded ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"}`}>
            <div className="mt-1 space-y-0.5">
              {moreItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[12px] transition-all ${
                      active
                        ? "text-indigo-700 bg-indigo-50 font-medium"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                    }`}
                  >
                    <Icon size={14} className={active ? "text-indigo-500" : "text-slate-400"} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </nav>

      {/* Switch to Employee Portal */}
      <div className="px-3 pb-2">
        <Link href="/employee" className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[12px] font-medium transition-colors border border-emerald-200/60">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-[8px] font-bold shadow-sm shadow-emerald-500/20">NV</div>
          Employee Portal
        </Link>
      </div>

      {/* User section */}
      <div className="border-t border-slate-100 p-3">
        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors group">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold shadow-md shadow-indigo-500/20">
            AD
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-[13px] font-medium text-slate-700">Admin</p>
          </div>
          <LogOut size={14} className="text-slate-400 group-hover:text-slate-600" />
        </button>
      </div>
    </aside>
  );
}
