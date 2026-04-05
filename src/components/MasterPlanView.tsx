"use client";

import { useState } from "react";
import { Target, TrendingUp, Clock, CheckCircle2, AlertTriangle, ChevronDown, ChevronRight, Edit3, Save } from "lucide-react";

interface Plan {
  id: string;
  role: string;
  plan_type: string;
  title: string;
  category: string | null;
  description: string | null;
  target_value: number | null;
  target_unit: string | null;
  current_value: number | null;
  status: string;
  priority: string;
  quarter: string | null;
  year: number;
  metadata: Record<string, unknown> | null;
}

const STATUS_MAP: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  completed: { label: "Hoàn thành", color: "text-green-700 bg-green-50 border-green-200", icon: CheckCircle2 },
  in_progress: { label: "Đang thực hiện", color: "text-blue-700 bg-blue-50 border-blue-200", icon: TrendingUp },
  planned: { label: "Kế hoạch", color: "text-slate-600 bg-slate-50 border-slate-200", icon: Clock },
  at_risk: { label: "Rủi ro", color: "text-red-700 bg-red-50 border-red-200", icon: AlertTriangle },
};

const PRIORITY_COLOR: Record<string, string> = {
  high: "text-red-600",
  medium: "text-amber-600",
  low: "text-slate-500",
};

function formatValue(val: number | null, unit: string | null): string {
  if (val === null || val === undefined) return "—";
  if (unit === "VND") {
    if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(1)} tỷ`;
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(0)}M`;
    if (val >= 1_000) return `${(val / 1_000).toFixed(0)}K`;
    return val.toLocaleString("vi-VN");
  }
  if (unit === "VND doanh thu") {
    if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(1)} tỷ`;
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(0)}M`;
    return val.toLocaleString("vi-VN");
  }
  if (unit === "VND/áo") return `${val.toLocaleString("vi-VN")}đ/áo`;
  return `${val} ${unit || ""}`;
}

function ProgressBar({ current, target }: { current: number; target: number }) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-medium text-slate-600 w-10 text-right">{pct}%</span>
    </div>
  );
}

export default function MasterPlanView({
  plans,
  roleName,
  roleIcon,
  roleColor,
  onUpdate,
}: {
  plans: Plan[];
  roleName: string;
  roleIcon: React.ReactNode;
  roleColor: string;
  onUpdate?: (id: string, updates: { current_value?: number; status?: string }) => void;
}) {
  const masterPlans = plans.filter((p) => p.plan_type === "master");
  const detailPlans = plans.filter((p) => p.plan_type === "detail");
  const [expandedCats, setExpandedCats] = useState<string[]>(["all"]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);
  const [editStatus, setEditStatus] = useState<string>("");

  const categories = [...new Set(masterPlans.map((p) => p.category || "Khác"))];

  const toggleCat = (cat: string) => {
    setExpandedCats((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));
  };

  const startEdit = (plan: Plan) => {
    setEditingId(plan.id);
    setEditValue(plan.current_value || 0);
    setEditStatus(plan.status);
  };

  const saveEdit = (plan: Plan) => {
    if (onUpdate) onUpdate(plan.id, { current_value: editValue, status: editStatus });
    setEditingId(null);
  };

  // Summary stats
  const totalMaster = masterPlans.length;
  const completed = masterPlans.filter((p) => p.status === "completed").length;
  const inProgress = masterPlans.filter((p) => p.status === "in_progress").length;
  const atRisk = masterPlans.filter((p) => p.status === "at_risk").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`rounded-2xl p-6 ${roleColor}`}>
        <div className="flex items-center gap-3 mb-4">
          {roleIcon}
          <div>
            <h1 className="text-xl font-bold text-white">{roleName}</h1>
            <p className="text-white/80 text-sm">Master Plan & Detail Plan 2026</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white/20 backdrop-blur rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-white">{totalMaster}</div>
            <div className="text-xs text-white/80">Mục tiêu</div>
          </div>
          <div className="bg-white/20 backdrop-blur rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-white">{inProgress}</div>
            <div className="text-xs text-white/80">Đang làm</div>
          </div>
          <div className="bg-white/20 backdrop-blur rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-white">{completed}</div>
            <div className="text-xs text-white/80">Hoàn thành</div>
          </div>
          <div className="bg-white/20 backdrop-blur rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-white">{atRisk}</div>
            <div className="text-xs text-white/80">Rủi ro</div>
          </div>
        </div>
      </div>

      {/* Master Plans by Category */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Target size={20} className="text-blue-600" /> Master Plan
        </h2>
        {categories.map((cat) => {
          const catPlans = masterPlans.filter((p) => (p.category || "Khác") === cat);
          const isExpanded = expandedCats.includes(cat) || expandedCats.includes("all");
          return (
            <div key={cat} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <button
                onClick={() => toggleCat(cat)}
                className="w-full flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors"
              >
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <span className="font-semibold text-slate-700">{cat}</span>
                <span className="text-xs text-slate-400 ml-auto">{catPlans.length} mục tiêu</span>
              </button>
              {isExpanded && (
                <div className="border-t border-slate-100">
                  {catPlans.map((plan) => {
                    const st = STATUS_MAP[plan.status] || STATUS_MAP.planned;
                    const StIcon = st.icon;
                    const isEditing = editingId === plan.id;
                    return (
                      <div key={plan.id} className="px-5 py-4 border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                        <div className="flex items-start gap-3">
                          <StIcon size={18} className={st.color.split(" ")[0]} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-slate-800 text-sm">{plan.title}</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${st.color}`}>{st.label}</span>
                              {plan.priority && (
                                <span className={`text-[10px] font-medium ${PRIORITY_COLOR[plan.priority]}`}>
                                  ● {plan.priority === "high" ? "Cao" : plan.priority === "medium" ? "TB" : "Thấp"}
                                </span>
                              )}
                              {plan.quarter && (
                                <span className="text-[10px] text-slate-400">{plan.quarter}</span>
                              )}
                            </div>
                            {plan.description && (
                              <p className="text-xs text-slate-500 mt-1">{plan.description}</p>
                            )}
                            {plan.target_value !== null && plan.target_value > 0 && (
                              <div className="mt-2">
                                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                                  <span>Tiến độ: {formatValue(plan.current_value, plan.target_unit)}</span>
                                  <span>Mục tiêu: {formatValue(plan.target_value, plan.target_unit)}</span>
                                </div>
                                <ProgressBar current={plan.current_value || 0} target={plan.target_value} />
                              </div>
                            )}
                            {isEditing && (
                              <div className="mt-2 flex items-center gap-2 flex-wrap">
                                <input
                                  type="number"
                                  value={editValue}
                                  onChange={(e) => setEditValue(Number(e.target.value))}
                                  className="w-32 text-xs border rounded px-2 py-1"
                                  placeholder="Giá trị hiện tại"
                                />
                                <select
                                  value={editStatus}
                                  onChange={(e) => setEditStatus(e.target.value)}
                                  className="text-xs border rounded px-2 py-1"
                                >
                                  <option value="planned">Kế hoạch</option>
                                  <option value="in_progress">Đang làm</option>
                                  <option value="completed">Hoàn thành</option>
                                  <option value="at_risk">Rủi ro</option>
                                </select>
                                <button
                                  onClick={() => saveEdit(plan)}
                                  className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                                >
                                  <Save size={12} className="inline mr-1" />Lưu
                                </button>
                              </div>
                            )}
                          </div>
                          {onUpdate && !isEditing && (
                            <button onClick={() => startEdit(plan)} className="text-slate-400 hover:text-blue-600">
                              <Edit3 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Detail Plans */}
      {detailPlans.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <TrendingUp size={20} className="text-emerald-600" /> Detail Plan
          </h2>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 text-xs">
                    <th className="text-left px-4 py-3 font-medium">Nhiệm vụ</th>
                    <th className="text-left px-4 py-3 font-medium">Danh mục</th>
                    <th className="text-center px-4 py-3 font-medium">Quý</th>
                    <th className="text-right px-4 py-3 font-medium">Mục tiêu</th>
                    <th className="text-center px-4 py-3 font-medium">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {detailPlans.map((plan) => {
                    const st = STATUS_MAP[plan.status] || STATUS_MAP.planned;
                    return (
                      <tr key={plan.id} className="border-t border-slate-50 hover:bg-slate-50/50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-800">{plan.title}</div>
                          {plan.description && <div className="text-xs text-slate-500 mt-0.5">{plan.description}</div>}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{plan.category}</td>
                        <td className="px-4 py-3 text-center text-slate-600">{plan.quarter}</td>
                        <td className="px-4 py-3 text-right font-medium text-slate-700">
                          {formatValue(plan.target_value, plan.target_unit)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-[11px] px-2 py-0.5 rounded-full border ${st.color}`}>{st.label}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
