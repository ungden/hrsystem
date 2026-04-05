"use client";

import { useEffect, useState } from "react";
import { getMasterPlans, updateMasterPlan } from "@/lib/supabase-data";
import MasterPlanView from "@/components/MasterPlanView";
import { DollarSign, TrendingUp, TrendingDown } from "lucide-react";

interface CashFlowPlan {
  id: string;
  title: string;
  description: string | null;
  target_value: number | null;
  status: string;
  metadata: { thu?: number; chi?: number } | null;
}

function formatB(val: number): string {
  if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(1)} tỷ`;
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(0)}M`;
  return val.toLocaleString("vi-VN");
}

export default function CFOMasterPlan() {
  const [plans, setPlans] = useState<never[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    getMasterPlans({ role: "cfo", year: 2026 }).then((data) => {
      setPlans(data as never[]);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const handleUpdate = async (id: string, updates: { current_value?: number; status?: string }) => {
    await updateMasterPlan(id, updates);
    load();
  };

  if (loading) return <div className="p-6 flex items-center justify-center h-[60vh]"><div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-600 border-t-transparent" /></div>;

  // Cash flow detail plans
  const cashFlowPlans = (plans as unknown as CashFlowPlan[]).filter(
    (p: CashFlowPlan) => p.title.startsWith("Cash Flow")
  );

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <MasterPlanView
        plans={plans}
        roleName="AI CFO - Tài chính & Dòng tiền"
        roleIcon={<DollarSign size={28} className="text-white" />}
        roleColor="bg-gradient-to-r from-emerald-600 to-teal-700"
        onUpdate={handleUpdate}
      />

      {/* Cash Flow Chart */}
      {cashFlowPlans.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-bold text-slate-800 mb-4">Dòng tiền hàng tháng 2026</h3>
          <div className="space-y-3">
            {cashFlowPlans.map((cf) => {
              const thu = cf.metadata?.thu || 0;
              const chi = cf.metadata?.chi || 0;
              const surplus = cf.target_value || 0;
              const maxVal = Math.max(thu, chi);
              return (
                <div key={cf.id} className="flex items-center gap-3">
                  <div className="w-28 text-xs font-medium text-slate-600 shrink-0">{cf.title.replace("Cash Flow ", "")}</div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <TrendingUp size={12} className="text-green-500 shrink-0" />
                      <div className="flex-1 h-4 bg-slate-100 rounded overflow-hidden">
                        <div className="h-full bg-green-500 rounded" style={{ width: `${(thu / maxVal) * 100}%` }} />
                      </div>
                      <span className="text-xs text-green-700 w-16 text-right shrink-0">{formatB(thu)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingDown size={12} className="text-red-400 shrink-0" />
                      <div className="flex-1 h-4 bg-slate-100 rounded overflow-hidden">
                        <div className="h-full bg-red-400 rounded" style={{ width: `${(chi / maxVal) * 100}%` }} />
                      </div>
                      <span className="text-xs text-red-600 w-16 text-right shrink-0">{formatB(chi)}</span>
                    </div>
                  </div>
                  <div className={`w-20 text-right text-xs font-bold shrink-0 ${surplus >= 0 ? "text-green-700" : "text-red-700"}`}>
                    +{formatB(surplus)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
