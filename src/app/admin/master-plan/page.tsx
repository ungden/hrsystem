"use client";

import { useEffect, useState } from "react";
import { getMasterPlans } from "@/lib/supabase-data";
import { Brain, DollarSign, Users, Megaphone, ShoppingCart, Settings, Award, TrendingUp, CheckCircle2, Clock, AlertTriangle, ChevronRight } from "lucide-react";
import Link from "next/link";

interface Plan {
  id: string;
  role: string;
  plan_type: string;
  title: string;
  category: string | null;
  status: string;
  target_value: number | null;
  target_unit: string | null;
  current_value: number | null;
  quarter: string | null;
}

const ROLES = [
  { key: "ceo", label: "CEO", sublabel: "Chiến lược tổng thể", icon: Brain, color: "from-purple-600 to-indigo-700", href: "/admin/master-plan/ceo" },
  { key: "cfo", label: "CFO", sublabel: "Tài chính & Dòng tiền", icon: DollarSign, color: "from-emerald-600 to-teal-700", href: "/admin/master-plan/cfo" },
  { key: "hr_director", label: "HR Director", sublabel: "Nhân sự & Phát triển", icon: Users, color: "from-blue-600 to-blue-700", href: "/admin/master-plan/hr-director" },
  { key: "marketing_manager", label: "Marketing Manager", sublabel: "Marketing & Thương hiệu", icon: Megaphone, color: "from-pink-600 to-rose-700", href: "/admin/master-plan/marketing" },
  { key: "sales_manager", label: "Sales Manager", sublabel: "Bán hàng & Khách hàng", icon: ShoppingCart, color: "from-amber-600 to-orange-700", href: "/admin/master-plan/sales" },
  { key: "operations_manager", label: "Operations Manager", sublabel: "Vận hành & Sản xuất", icon: Settings, color: "from-slate-600 to-slate-700", href: "/admin/master-plan/operations" },
  { key: "coach", label: "AI Coach", sublabel: "Hiệu suất & Coaching", icon: Award, color: "from-cyan-600 to-cyan-700", href: "/admin/master-plan/coach" },
];

function formatVND(val: number): string {
  if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(1)} tỷ`;
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(0)}M`;
  return val.toLocaleString("vi-VN");
}

export default function MasterPlanDashboard() {
  const [allPlans, setAllPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMasterPlans({ year: 2026 }).then((data) => {
      setAllPlans(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  // Overall stats
  const totalPlans = allPlans.filter((p) => p.plan_type === "master").length;
  const completed = allPlans.filter((p) => p.plan_type === "master" && p.status === "completed").length;
  const inProgress = allPlans.filter((p) => p.plan_type === "master" && p.status === "in_progress").length;
  const planned = allPlans.filter((p) => p.plan_type === "master" && p.status === "planned").length;
  const atRisk = allPlans.filter((p) => p.plan_type === "master" && p.status === "at_risk").length;

  // Revenue target
  const revenuePlan = allPlans.find((p) => p.role === "ceo" && p.title.includes("Doanh thu năm"));
  const revenueTarget = revenuePlan?.target_value || 20_000_000_000;
  const revenueCurrent = revenuePlan?.current_value || 0;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-1">Executive Dashboard</h1>
        <p className="text-slate-300 text-sm mb-5">Tổng quan Master Plan & Detail Plan - Teeworld 2026</p>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
            <div className="text-3xl font-bold">{totalPlans}</div>
            <div className="text-xs text-slate-300 mt-1">Tổng mục tiêu</div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
            <TrendingUp size={20} className="mx-auto text-blue-400 mb-1" />
            <div className="text-2xl font-bold">{inProgress}</div>
            <div className="text-xs text-slate-300">Đang thực hiện</div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
            <CheckCircle2 size={20} className="mx-auto text-green-400 mb-1" />
            <div className="text-2xl font-bold">{completed}</div>
            <div className="text-xs text-slate-300">Hoàn thành</div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
            <Clock size={20} className="mx-auto text-slate-400 mb-1" />
            <div className="text-2xl font-bold">{planned}</div>
            <div className="text-xs text-slate-300">Kế hoạch</div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
            <AlertTriangle size={20} className="mx-auto text-red-400 mb-1" />
            <div className="text-2xl font-bold">{atRisk}</div>
            <div className="text-xs text-slate-300">Rủi ro</div>
          </div>
        </div>

        {/* Revenue progress */}
        <div className="mt-5 bg-white/10 backdrop-blur rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Doanh thu 2026</span>
            <span className="text-sm">{formatVND(revenueCurrent)} / {formatVND(revenueTarget)}</span>
          </div>
          <div className="h-3 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all"
              style={{ width: `${Math.min(100, Math.round((revenueCurrent / revenueTarget) * 100))}%` }}
            />
          </div>
        </div>
      </div>

      {/* Role Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {ROLES.map((role) => {
          const Icon = role.icon;
          const rolePlans = allPlans.filter((p) => p.role === role.key);
          const masterCount = rolePlans.filter((p) => p.plan_type === "master").length;
          const detailCount = rolePlans.filter((p) => p.plan_type === "detail").length;
          const roleCompleted = rolePlans.filter((p) => p.status === "completed").length;
          const roleInProgress = rolePlans.filter((p) => p.status === "in_progress").length;
          const total = rolePlans.length;
          const pct = total > 0 ? Math.round((roleCompleted / total) * 100) : 0;

          return (
            <Link
              key={role.key}
              href={role.href}
              className="bg-white rounded-xl border border-slate-200 hover:shadow-lg hover:border-slate-300 transition-all group overflow-hidden"
            >
              <div className={`bg-gradient-to-r ${role.color} p-4`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <Icon size={22} className="text-white" />
                  </div>
                  <div>
                    <div className="font-bold text-white">{role.label}</div>
                    <div className="text-xs text-white/80">{role.sublabel}</div>
                  </div>
                  <ChevronRight size={18} className="text-white/60 ml-auto group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                  <span>{masterCount} master + {detailCount} detail</span>
                  <span>{pct}% done</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-3">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${role.color}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 text-blue-600">
                    <TrendingUp size={12} /> {roleInProgress} đang làm
                  </span>
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 size={12} /> {roleCompleted} xong
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* All Plans Summary Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800">Tất cả mục tiêu Master Plan</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-xs">
                <th className="text-left px-4 py-3 font-medium">Vai trò</th>
                <th className="text-left px-4 py-3 font-medium">Mục tiêu</th>
                <th className="text-left px-4 py-3 font-medium">Danh mục</th>
                <th className="text-center px-4 py-3 font-medium">Quý</th>
                <th className="text-right px-4 py-3 font-medium">Target</th>
                <th className="text-center px-4 py-3 font-medium">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {allPlans
                .filter((p) => p.plan_type === "master")
                .map((plan) => {
                  const role = ROLES.find((r) => r.key === plan.role);
                  const statusMap: Record<string, string> = {
                    completed: "text-green-700 bg-green-50",
                    in_progress: "text-blue-700 bg-blue-50",
                    planned: "text-slate-600 bg-slate-50",
                    at_risk: "text-red-700 bg-red-50",
                  };
                  const statusLabel: Record<string, string> = {
                    completed: "Xong", in_progress: "Đang làm", planned: "KH", at_risk: "Rủi ro",
                  };
                  return (
                    <tr key={plan.id} className="border-t border-slate-50 hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded bg-gradient-to-r ${role?.color || ""} text-white`}>
                          {role?.label || plan.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">{plan.title}</td>
                      <td className="px-4 py-3 text-slate-600">{plan.category}</td>
                      <td className="px-4 py-3 text-center text-slate-600">{plan.quarter || "—"}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-700">
                        {plan.target_value ? (plan.target_unit === "VND" ? formatVND(plan.target_value) : `${plan.target_value} ${plan.target_unit || ""}`) : "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full ${statusMap[plan.status] || ""}`}>
                          {statusLabel[plan.status] || plan.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
