"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  FileBarChart,
  CalendarDays,
  Briefcase,
  BarChart3,
  Settings,
  ChevronDown,
  ChevronRight,
  DollarSign,
  UserCheck,
  ListChecks,
  LogOut,
  ClipboardList,
  Award,
  Kanban,
} from "lucide-react";
import { useState } from "react";

interface MenuItem {
  label: string;
  href?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  section?: string;
  children?: { label: string; href: string; icon: React.ComponentType<{ size?: number; className?: string }> }[];
}

const menuItems: MenuItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    section: "TỔNG QUAN",
  },
  {
    label: "Nhân sự",
    icon: Users,
    section: "QUẢN LÝ",
    children: [
      { label: "Danh sách nhân viên", href: "/nhan-su/danh-sach", icon: UserCheck },
      { label: "Công việc của tôi", href: "/nhan-su/cong-viec-cua-toi", icon: ListChecks },
      { label: "Duyệt lương", href: "/nhan-su/duyet-luong", icon: DollarSign },
      { label: "Chấm công", href: "/nhan-su/cham-cong", icon: CalendarCheck },
      { label: "Giao việc", href: "/nhan-su/kanban", icon: ClipboardList },
      { label: "Bảng điểm", href: "/nhan-su/kanban/bang-diem", icon: Award },
      { label: "Báo cáo nhân sự", href: "/nhan-su/bao-cao", icon: FileBarChart },
    ],
  },
  {
    label: "Nghỉ phép",
    href: "/nghi-phep",
    icon: CalendarDays,
  },
  {
    label: "Tuyển dụng",
    href: "/tuyen-dung",
    icon: Briefcase,
  },
  {
    label: "Báo cáo",
    href: "/reports",
    icon: BarChart3,
  },
  {
    label: "Cài đặt",
    icon: Settings,
    section: "HỆ THỐNG",
    children: [
      { label: "Ca làm việc", href: "/cai-dat/ca-lam-viec", icon: ListChecks },
      { label: "Tài khoản", href: "/cai-dat/tai-khoan", icon: Users },
      { label: "Phân quyền", href: "/cai-dat/phan-quyen", icon: Settings },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [expandedGroups, setExpandedGroups] = useState<string[]>(["Nhân sự"]);

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) =>
      prev.includes(label)
        ? prev.filter((g) => g !== label)
        : [...prev, label]
    );
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

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
          <span className="text-[10px] text-slate-400 leading-tight">Quản lý nhân sự</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isExpanded = expandedGroups.includes(item.label);
          const hasChildren = item.children && item.children.length > 0;
          const isGroupActive = hasChildren && item.children!.some((c) => isActive(c.href));

          // Section label
          let sectionLabel = null;
          if (item.section && item.section !== lastSection) {
            lastSection = item.section;
            sectionLabel = (
              <div className="px-3 pt-4 pb-1.5 first:pt-0">
                <span className="text-[10px] font-semibold text-slate-400 tracking-widest uppercase">
                  {item.section}
                </span>
              </div>
            );
          }

          if (hasChildren) {
            return (
              <div key={item.label}>
                {sectionLabel}
                <div className="mb-0.5">
                  <button
                    onClick={() => toggleGroup(item.label)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 ${
                      isGroupActive
                        ? "text-blue-700 bg-blue-50/80"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                    }`}
                  >
                    <Icon size={18} className={isGroupActive ? "text-blue-600" : "text-slate-400"} />
                    <span className="flex-1 text-left">{item.label}</span>
                    <ChevronDown
                      size={14}
                      className={`text-slate-400 transition-transform duration-200 ${
                        isExpanded ? "rotate-0" : "-rotate-90"
                      }`}
                    />
                  </button>
                  <div
                    className={`overflow-hidden transition-all duration-200 ${
                      isExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
                    }`}
                  >
                    <div className="ml-5 mt-0.5 pl-3 border-l-2 border-slate-100">
                      {item.children!.map((child) => {
                        const ChildIcon = child.icon;
                        const active = isActive(child.href);
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all duration-150 my-0.5 ${
                              active
                                ? "text-blue-700 bg-blue-50/80 font-medium border-l-0"
                                : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                            }`}
                          >
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
          }

          return (
            <div key={item.href}>
              {sectionLabel}
              <Link
                href={item.href!}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 mb-0.5 ${
                  isActive(item.href!)
                    ? "text-blue-700 bg-blue-50/80"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                }`}
              >
                <Icon size={18} className={isActive(item.href!) ? "text-blue-600" : "text-slate-400"} />
                <span>{item.label}</span>
              </Link>
            </div>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-slate-100 p-3">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
            NA
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-slate-700 truncate">Nguyễn Văn Admin</p>
            <p className="text-[11px] text-slate-400 truncate">Quản trị viên</p>
          </div>
          <LogOut size={16} className="text-slate-400 group-hover:text-slate-600 transition-colors flex-shrink-0" />
        </div>
      </div>
    </aside>
  );
}
