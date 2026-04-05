"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Users,
  CalendarCheck,
  ChevronDown,
  DollarSign,
  ListChecks,
  LogOut,
  ClipboardList,
  TrendingUp,
  Settings2,
  Brain,
  Target,
  Wallet,
  MessageCircle,
  ScrollText,
  Bot,
  FileSpreadsheet,
  Building2,
  GitBranch,
  CalendarRange,
  Receipt,
  Gift,
  BarChart3,
  ClipboardCheck,
  Megaphone,
  ShoppingCart,
  Award,
  Map,
} from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase";

interface MenuItem {
  label: string;
  href?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  section?: string;
  children?: { label: string; href: string; icon: React.ComponentType<{ size?: number; className?: string }> }[];
}

const menuItems: MenuItem[] = [
  {
    label: "AI Agents",
    icon: Brain,
    section: "ĐIỀU HÀNH",
    children: [
      { label: "Trung tâm điều hành", href: "/admin", icon: Bot },
      { label: "Báo cáo tài chính", href: "/admin/bao-cao-tai-chinh", icon: FileSpreadsheet },
      { label: "Tổng quan OKR", href: "/admin/tong-quan-okr", icon: GitBranch },
      { label: "Phòng ban", href: "/admin/phong-ban", icon: Building2 },
      { label: "Nhân viên", href: "/admin/nhan-vien", icon: Users },
      { label: "Kế hoạch chi tiết", href: "/admin/ke-hoach-chi-tiet", icon: CalendarRange },
      { label: "Bảng lương", href: "/admin/bang-luong", icon: Receipt },
      { label: "Bảng tính thưởng", href: "/admin/bang-thuong", icon: Gift },
      { label: "KH vs Thực tế", href: "/admin/ke-hoach-thuc-te", icon: BarChart3 },
      { label: "Duyệt báo cáo", href: "/admin/duyet-bao-cao", icon: ClipboardCheck },
      { label: "Mục tiêu kinh doanh", href: "/admin/muc-tieu", icon: Target },
      { label: "Quản lý chi phí", href: "/admin/chi-phi", icon: Wallet },
      { label: "Dự báo lương thưởng", href: "/admin/luong-thuong", icon: DollarSign },
      { label: "Trò chuyện AI", href: "/admin/tro-chuyen", icon: MessageCircle },
      { label: "Nhật ký hoạt động", href: "/admin/nhat-ky", icon: ScrollText },
    ],
  },
  {
    label: "Master Plan",
    icon: Map,
    section: "KẾ HOẠCH",
    children: [
      { label: "Tổng quan", href: "/admin/master-plan", icon: BarChart3 },
      { label: "CEO", href: "/admin/master-plan/ceo", icon: Brain },
      { label: "CFO", href: "/admin/master-plan/cfo", icon: DollarSign },
      { label: "HR Director", href: "/admin/master-plan/hr-director", icon: Users },
      { label: "Marketing", href: "/admin/master-plan/marketing", icon: Megaphone },
      { label: "Sales", href: "/admin/master-plan/sales", icon: ShoppingCart },
      { label: "Operations", href: "/admin/master-plan/operations", icon: Settings2 },
      { label: "AI Coach", href: "/admin/master-plan/coach", icon: Award },
    ],
  },
  {
    label: "Vận hành",
    icon: ClipboardList,
    section: "QUẢN LÝ",
    children: [
      { label: "Nhập số liệu", href: "/admin/nhap-so-lieu", icon: ClipboardCheck },
      { label: "Cấu hình form", href: "/admin/cau-hinh-form", icon: Settings2 },
      { label: "Đơn hàng", href: "/admin/don-hang", icon: Receipt },
      { label: "Sản phẩm", href: "/admin/san-pham", icon: Gift },
      { label: "Tồn kho", href: "/admin/ton-kho", icon: ClipboardList },
      { label: "Kế hoạch đặt hàng", href: "/admin/ke-hoach-dat-hang", icon: Receipt },
      { label: "Giao việc (Kanban)", href: "/nhan-su/kanban", icon: ListChecks },
      { label: "Duyệt lương", href: "/nhan-su/duyet-luong", icon: DollarSign },
      { label: "Chấm công", href: "/nhan-su/cham-cong", icon: CalendarCheck },
      { label: "Lộ trình nghề nghiệp", href: "/nhan-su/career-framework", icon: TrendingUp },
      { label: "Quản lý Career", href: "/nhan-su/career-framework/admin", icon: Settings2 },
    ],
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [expandedGroups, setExpandedGroups] = useState<string[]>(["AI Agents"]);

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) =>
      prev.includes(label) ? prev.filter((g) => g !== label) : [...prev, label]
    );
  };

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname === href || pathname.startsWith(href + "/");
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  let lastSection = "";

  return (
    <aside className="fixed left-0 top-0 h-screen w-[260px] bg-white border-r border-slate-200/80 flex flex-col z-50 shadow-[2px_0_8px_-2px_rgba(0,0,0,0.05)]">
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-slate-100">
        <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-sm">
          <span className="text-white font-bold text-sm">HR</span>
        </div>
        <div className="ml-3">
          <span className="font-bold text-slate-800 text-[15px] leading-tight block">HR System</span>
          <span className="text-[10px] text-slate-400 leading-tight">Admin Panel</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isExpanded = expandedGroups.includes(item.label);
          const hasChildren = item.children && item.children.length > 0;
          const isGroupActive = hasChildren && item.children!.some((c) => isActive(c.href));

          let sectionLabel = null;
          if (item.section && item.section !== lastSection) {
            lastSection = item.section;
            sectionLabel = (
              <div className="px-3 pt-4 pb-1.5 first:pt-0">
                <span className="text-[10px] font-semibold text-slate-400 tracking-widest uppercase">{item.section}</span>
              </div>
            );
          }

          return (
            <div key={item.label}>
              {sectionLabel}
              <div className="mb-0.5">
                <button
                  onClick={() => toggleGroup(item.label)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 ${
                    isGroupActive ? "text-blue-700 bg-blue-50/80" : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                  }`}
                >
                  <Icon size={18} className={isGroupActive ? "text-blue-600" : "text-slate-400"} />
                  <span className="flex-1 text-left">{item.label}</span>
                  <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${isExpanded ? "rotate-0" : "-rotate-90"}`} />
                </button>
                <div className={`overflow-hidden transition-all duration-200 ${isExpanded ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"}`}>
                  <div className="ml-5 mt-0.5 pl-3 border-l-2 border-slate-100">
                    {item.children!.map((child) => {
                      const ChildIcon = child.icon;
                      const active = isActive(child.href);
                      return (
                        <Link key={child.href} href={child.href}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all duration-150 my-0.5 ${
                            active ? "text-blue-700 bg-blue-50/80 font-medium" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                          }`}>
                          <ChildIcon size={15} className={active ? "text-blue-600" : "text-slate-400"} />
                          <span>{child.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </nav>

      {/* Switch to Employee Portal */}
      <div className="px-3 pb-2">
        <Link href="/employee" className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[12px] font-medium transition-colors">
          <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[8px] font-bold">NV</div>
          Chuyển sang Employee Portal
        </Link>
      </div>

      {/* User section */}
      <div className="border-t border-slate-100 p-3">
        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors group">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
            AD
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-[13px] font-medium text-slate-700 truncate">Admin</p>
            <p className="text-[11px] text-slate-400 truncate">Quản trị viên</p>
          </div>
          <LogOut size={16} className="text-slate-400 group-hover:text-slate-600 transition-colors flex-shrink-0" />
        </button>
      </div>
    </aside>
  );
}
