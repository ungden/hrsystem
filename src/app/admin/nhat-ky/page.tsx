"use client";

import { useState, useMemo } from 'react';
import PageHeader from '@/components/PageHeader';
import AgentMessageCard from '@/components/agents/AgentMessageCard';
import { AgentRole, AgentMessage } from '@/lib/agent-types';
import { allAgentRoles } from '@/lib/agents/agent-profiles';
import { runFullCoordination } from '@/lib/agents/coordinator';

export default function ActivityLogPage() {
  const state = useMemo(() => runFullCoordination(2026, 'Q2'), []);
  const [agentFilter, setAgentFilter] = useState<AgentRole | ''>('');
  const [typeFilter, setTypeFilter] = useState<AgentMessage['type'] | ''>('');

  const filtered = useMemo(() => {
    let msgs = [...state.messages];
    if (agentFilter) {
      msgs = msgs.filter(m => m.agentRole === agentFilter);
    }
    if (typeFilter) {
      msgs = msgs.filter(m => m.type === typeFilter);
    }
    return msgs;
  }, [state.messages, agentFilter, typeFilter]);

  const agentLabels: Record<AgentRole, string> = {
    ceo: 'CEO',
    hr_director: 'HR Director',
    finance: 'CFO',
    dept_manager: 'Trưởng phòng',
    performance_coach: 'Coach',
  };

  const typeLabels: Record<AgentMessage['type'], string> = {
    analysis: 'Phân tích',
    decision: 'Quyết định',
    alert: 'Cảnh báo',
    recommendation: 'Đề xuất',
    question: 'Câu hỏi',
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Nhật ký hoạt động"
        subtitle="Lịch sử các quyết định và phân tích từ AI Agents"
        breadcrumbs={[
          { label: 'AI Agents', href: '/admin' },
          { label: 'Nhật ký hoạt động' },
        ]}
      />

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <select
          value={agentFilter}
          onChange={e => setAgentFilter(e.target.value as AgentRole | '')}
          className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Tất cả agents</option>
          {allAgentRoles.map(role => (
            <option key={role} value={role}>{agentLabels[role]}</option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value as AgentMessage['type'] | '')}
          className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">Tất cả loại</option>
          {(Object.keys(typeLabels) as AgentMessage['type'][]).map(type => (
            <option key={type} value={type}>{typeLabels[type]}</option>
          ))}
        </select>
        <span className="text-sm text-slate-500 self-center">
          {filtered.length} thông báo
        </span>
      </div>

      {/* Messages */}
      <div className="space-y-2">
        {filtered.map(msg => (
          <AgentMessageCard key={msg.id} message={msg} />
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-sm">
            Không có thông báo nào phù hợp với bộ lọc.
          </div>
        )}
      </div>
    </div>
  );
}
