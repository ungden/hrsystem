"use client";

import { useEffect, useState } from "react";
import { getMasterPlans, updateMasterPlan } from "@/lib/supabase-data";
import MasterPlanView from "@/components/MasterPlanView";
import { Settings } from "lucide-react";

export default function OperationsMasterPlan() {
  const [plans, setPlans] = useState<never[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    getMasterPlans({ role: "operations_manager", year: 2026 }).then((data) => {
      setPlans(data as never[]);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const handleUpdate = async (id: string, updates: { current_value?: number; status?: string }) => {
    await updateMasterPlan(id, updates);
    load();
  };

  if (loading) return <div className="p-6 flex items-center justify-center h-[60vh]"><div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-600 border-t-transparent" /></div>;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <MasterPlanView
        plans={plans}
        roleName="Operations Manager - Vận hành & Sản xuất"
        roleIcon={<Settings size={28} className="text-white" />}
        roleColor="bg-gradient-to-r from-slate-600 to-slate-700"
        onUpdate={handleUpdate}
      />
    </div>
  );
}
