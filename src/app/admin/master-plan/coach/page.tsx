"use client";

import { useEffect, useState } from "react";
import { getMasterPlans, updateMasterPlan } from "@/lib/supabase-data";
import MasterPlanView from "@/components/MasterPlanView";
import { Award } from "lucide-react";

export default function CoachMasterPlan() {
  const [plans, setPlans] = useState<never[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    getMasterPlans({ role: "coach", year: 2026 }).then((data) => {
      setPlans(data as never[]);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const handleUpdate = async (id: string, updates: { current_value?: number; status?: string }) => {
    await updateMasterPlan(id, updates);
    load();
  };

  if (loading) return <div className="p-6 flex items-center justify-center h-[60vh]"><div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-600 border-t-transparent" /></div>;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <MasterPlanView
        plans={plans}
        roleName="AI Coach - Hiệu suất & Coaching"
        roleIcon={<Award size={28} className="text-white" />}
        roleColor="bg-gradient-to-r from-cyan-600 to-cyan-700"
        onUpdate={handleUpdate}
      />
    </div>
  );
}
