"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import AdminSidebar from "@/components/AdminSidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed top-4 left-4 z-[60] md:hidden w-10 h-10 bg-white rounded-xl border border-slate-200 flex items-center justify-center shadow-sm"
      >
        <Menu size={20} className="text-slate-600" />
      </button>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-[55] md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'block' : 'hidden'} md:block`}>
        <AdminSidebar />
        <button
          onClick={() => setSidebarOpen(false)}
          className="fixed top-4 left-[268px] z-[70] md:hidden w-8 h-8 bg-white rounded-full border border-slate-200 flex items-center justify-center shadow-sm"
        >
          <X size={16} className="text-slate-500" />
        </button>
      </div>

      <main className="md:ml-[260px] min-h-screen pt-14 md:pt-0">
        {children}
      </main>
    </>
  );
}
