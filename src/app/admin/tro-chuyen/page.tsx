"use client";

import { useState, useEffect } from 'react';
import PageHeader from '@/components/PageHeader';
import AgentChatPanel from '@/components/agents/AgentChatPanel';
import AgentAvatar from '@/components/agents/AgentAvatar';
import { AgentCoordinationState } from '@/lib/agent-types';
import { agentProfiles, allAgentRoles } from '@/lib/agents/agent-profiles';
import { runFullCoordination } from '@/lib/agents/coordinator';

export default function ChatPage() {
  const [state, setState] = useState<AgentCoordinationState | null>(null);

  useEffect(() => {
    runFullCoordination(2026, 'Q2').then(s => setState(s));
  }, []);

  if (!state) {
    return <div className="p-6"><PageHeader title="Trò chuyện với AI Agents" subtitle="Đang tải..." breadcrumbs={[]} /><div className="animate-pulse h-96 bg-slate-100 rounded-xl" /></div>;
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
