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

  return (
    <div className="p-6">
      <PageHeader
        title="Trò chuyện với AI Agents"
        subtitle="Đặt câu hỏi về mục tiêu, chi phí, nhân sự và nhận phân tích từ các AI agents"
        breadcrumbs={[
          { label: 'AI Agents', href: '/admin' },
          { label: 'Trò chuyện AI' },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Agent List - Left sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">AI Agents</h3>
            <div className="space-y-2">
              {allAgentRoles.map(role => {
                const profile = agentProfiles[role];
                return (
                  <div key={role} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                    <AgentAvatar role={role} size="sm" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-700 truncate">{profile.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{profile.title}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick tips */}
            <div className="mt-4 pt-4 border-t border-slate-100">
              <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Gợi ý câu hỏi</h4>
              <div className="space-y-1 text-[11px] text-slate-500">
                <p>&bull; &quot;Doanh thu Q2 như thế nào?&quot;</p>
                <p>&bull; &quot;Chi phí phòng CNTT&quot;</p>
                <p>&bull; &quot;Ai đang gặp rủi ro?&quot;</p>
                <p>&bull; &quot;Lương thưởng dự kiến&quot;</p>
                <p>&bull; &quot;Tình hình Phòng Kinh doanh&quot;</p>
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
