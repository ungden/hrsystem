"use client";

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import PageHeader from '@/components/PageHeader';
import AgentAvatar from '@/components/agents/AgentAvatar';
import { AgentCoordinationState } from '@/lib/agent-types';
import { agentProfiles, allAgentRoles } from '@/lib/agents/agent-profiles';
import { createBrowserClient } from '@supabase/ssr';
import { Loader2 } from 'lucide-react';

// Lazy-load the heavy chat panel (includes chat-engine, workflow-engine, all agent imports)
const AgentChatPanel = dynamic(() => import('@/components/agents/AgentChatPanel'), {
  loading: () => (
    <div className="h-[700px] bg-slate-900 rounded-xl flex items-center justify-center">
      <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
    </div>
  ),
});

/**
 * Load AgentCoordinationState from Supabase snapshot instead of running 11 agents.
 * runFullCoordination() takes 5-10s. Supabase read takes <500ms.
 */
function useSnapshotState() {
  const [state, setState] = useState<AgentCoordinationState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const sb = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    sb.from('command_center_snapshots')
      .select('data')
      .eq('snapshot_type', 'full')
      .order('generated_at', { ascending: false })
      .limit(1)
      .single()
      .then(({ data: row, error: err }) => {
        if (err || !row) {
          setError(err?.message || 'Chưa có snapshot');
          setLoading(false);
          return;
        }

        const d = row.data as Record<string, unknown>;

        // Reconstruct AgentCoordinationState from snapshot
        const coordState: AgentCoordinationState = {
          currentQuarter: (d.currentQuarter as AgentCoordinationState['currentQuarter']) || { year: 2026, quarter: 'Q2' },
          businessTargets: (d.businessTargets as AgentCoordinationState['businessTargets']) || [],
          departmentGoals: (d.departmentGoals as AgentCoordinationState['departmentGoals']) || [],
          individualPlans: (d.individualPlans as AgentCoordinationState['individualPlans']) || [],
          costProjections: (d.costProjections as AgentCoordinationState['costProjections']) || [],
          salaryProjections: (d.salaryProjections as AgentCoordinationState['salaryProjections']) || [],
          messages: (d.messages as AgentCoordinationState['messages']) || [],
          agentStatuses: (d.agentStatuses as AgentCoordinationState['agentStatuses']) || ({} as AgentCoordinationState['agentStatuses']),
          chatHistory: [],  // Always fresh per session
          actions: (d.actions as AgentCoordinationState['actions']) || [],
          financials: (d.financials as AgentCoordinationState['financials']) || { incomeStatements: [], balanceSheet: { month: '', data: { tongTaiSan: 0, taiSanNganHan: { tienMat: 0, khoanPhaiThu: 0, hangTonKho: 0, taiSanNganHanKhac: 0, tongTaiSanNganHan: 0 }, taiSanDaiHan: { taiSanCoDinh: 0, taiSanVoHinh: 0, dauTuDaiHan: 0, tongTaiSanDaiHan: 0 }, noPhaiTra: { noNganHan: 0, noDaiHan: 0, tongNoPhaiTra: 0 }, vonChuSoHuu: { vonDieuLe: 0, loiNhuanGiuLai: 0, tongVon: 0 } } }, cashFlow: { month: '', data: { kinhDoanh: { loiNhuan: 0, khauHao: 0, bienDongVonLuuDong: 0, tongKinhDoanh: 0 }, dauTu: { muaTaiSan: 0, dauTuKhac: 0, tongDauTu: 0 }, taiChinh: { vayNgan: 0, traNo: 0, tongTaiChinh: 0 }, bienDongTienRong: 0, tienDauKy: 0, tienCuoiKy: 0 } } },
          financialHealth: (d.financialHealth as AgentCoordinationState['financialHealth']) || { currentRatio: 0, debtToEquity: 0, profitMargin: 0, operatingMargin: 0, revenueGrowth: 0, burnRate: 0 },
          departmentDetails: (d.departmentDetails as AgentCoordinationState['departmentDetails']) || [],
          milestones: (d.milestones as AgentCoordinationState['milestones']) || [],
          channelAnalysis: (d.channelAnalysis as AgentCoordinationState['channelAnalysis']) || [],
          inventoryForecasts: (d.inventoryForecasts as AgentCoordinationState['inventoryForecasts']) || [],
          stockAlerts: (d.stockAlerts as AgentCoordinationState['stockAlerts']) || [],
          collectionPlans: (d.collectionPlans as AgentCoordinationState['collectionPlans']) || [],
          marketResearch: d.marketResearch as AgentCoordinationState['marketResearch'],
          strategyReport: d.strategyReport as AgentCoordinationState['strategyReport'],
        };

        setState(coordState);
        setLoading(false);
      });
  }, []);

  return { state, setState, loading, error };
}

export default function ChatPage() {
  const { state, setState, loading, error } = useSnapshotState();

  if (loading) {
    return (
      <div className="p-6">
        <PageHeader title="Trò chuyện với AI Agents" subtitle="Đang tải..." breadcrumbs={[]} />
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
          <span className="ml-2 text-sm text-slate-400">Đang tải dữ liệu từ Supabase...</span>
        </div>
      </div>
    );
  }

  if (error || !state) {
    return (
      <div className="p-6">
        <PageHeader title="Trò chuyện với AI Agents" subtitle="" breadcrumbs={[]} />
        <div className="flex items-center justify-center h-96 text-center">
          <div>
            <p className="text-sm text-slate-600 mb-2">Chưa có dữ liệu AI Agent</p>
            <p className="text-xs text-slate-400 mb-3">{error}</p>
            <code className="block text-[11px] bg-slate-100 text-slate-600 px-3 py-2 rounded-lg font-mono">
              npx tsx --env-file=.env.local scripts/push-snapshot.ts
            </code>
          </div>
        </div>
      </div>
    );
  }

  const wf = state.workflowRun;
  const phaseLabels: Record<string, string> = {
    idle: 'Chờ', strategy: 'Chiến lược', proposals: 'Đề xuất',
    review: 'Review', debate: 'Thảo luận', execution: 'Thực thi',
    monitoring: 'Giám sát', complete: 'Hoàn tất',
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Trò chuyện với AI Agents"
        subtitle="Đặt câu hỏi hoặc gõ /workflow để khởi chạy bộ máy vận hành"
        breadcrumbs={[
          { label: 'AI Agents', href: '/admin' },
          { label: 'Trò chuyện AI' },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Agent List + Workflow Status - Left sidebar */}
        <div className="lg:col-span-1 space-y-4">
          {/* Workflow Status Card */}
          <div className={`rounded-xl border p-4 ${wf?.phase === 'complete' ? 'bg-emerald-50 border-emerald-200' : wf ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
            <h3 className="text-sm font-semibold text-slate-800 mb-2">Workflow</h3>
            {wf ? (
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${wf.phase === 'complete' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                  <span className="text-slate-600">{phaseLabels[wf.phase] || wf.phase}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-white/60 rounded p-1.5 text-center">
                    <div className="font-bold text-emerald-600">{wf.approvedProposals.length}</div>
                    <div className="text-slate-400">Duyệt</div>
                  </div>
                  <div className="bg-white/60 rounded p-1.5 text-center">
                    <div className="font-bold text-red-500">{wf.rejectedProposals.length}</div>
                    <div className="text-slate-400">Từ chối</div>
                  </div>
                  <div className="bg-white/60 rounded p-1.5 text-center">
                    <div className="font-bold text-cyan-600">{wf.debates.length}</div>
                    <div className="text-slate-400">Debates</div>
                  </div>
                  <div className="bg-white/60 rounded p-1.5 text-center">
                    <div className="font-bold text-slate-600">{wf.timeline.length}</div>
                    <div className="text-slate-400">Events</div>
                  </div>
                </div>
                {wf.strategy && (
                  <div className="text-[10px] text-slate-500 mt-1">
                    Focus: <span className="font-medium text-slate-700">{wf.strategy.focus.toUpperCase()}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs text-slate-500">
                <p>Chưa chạy workflow.</p>
                <p className="mt-1 text-amber-600 font-medium">Gõ /workflow để bắt đầu</p>
              </div>
            )}
          </div>

          {/* Agent List */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">AI Agents</h3>
            <div className="space-y-2">
              {allAgentRoles.map(role => {
                const profile = agentProfiles[role];
                const hasProposal = wf?.proposals.some(p => p.agentRole === role);
                const isApproved = wf?.proposals.some(p => p.agentRole === role && p.status === 'approved');
                const isRejected = wf?.proposals.some(p => p.agentRole === role && p.status === 'rejected');

                return (
                  <div key={role} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                    <AgentAvatar role={role} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-700 truncate">{profile.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{profile.title}</p>
                    </div>
                    {hasProposal && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                        isApproved ? 'bg-emerald-100 text-emerald-700' :
                        isRejected ? 'bg-red-100 text-red-700' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {isApproved ? 'OK' : isRejected ? 'X' : '...'}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Quick tips */}
            <div className="mt-4 pt-4 border-t border-slate-100">
              <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Gợi ý</h4>
              <div className="space-y-1 text-[11px] text-slate-500">
                <p>&bull; <span className="text-amber-600 font-medium">/workflow</span> — Chạy bộ máy</p>
                <p>&bull; /proposals — Xem đề xuất</p>
                <p>&bull; /status — Trạng thái</p>
                <p>&bull; /timeline — Lịch sử</p>
                <p>&bull; /overview — Tổng quan</p>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Panel - Main area */}
        <div className="lg:col-span-3">
          <AgentChatPanel state={state} onStateUpdate={setState} />
        </div>
      </div>
    </div>
  );
}
