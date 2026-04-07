"use client";

import { useState, useEffect, useMemo } from 'react';
import PageHeader from '@/components/PageHeader';
import AgentMessageCard from '@/components/agents/AgentMessageCard';
import { AgentRole, AgentMessage } from '@/lib/agent-types';
import { allAgentRoles } from '@/lib/agents/agent-profiles';
import { createBrowserClient } from '@supabase/ssr';
import { Loader2 } from 'lucide-react';

export default function ActivityLogPage() {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentFilter, setAgentFilter] = useState<AgentRole | ''>('');
  const [typeFilter, setTypeFilter] = useState<AgentMessage['type'] | ''>('');

  useEffect(() => {
    const sb = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    sb.from('command_center_snapshots')
      .select('data')
      .eq('snapshot_type', 'full')
      .order('generated_at', { ascending: false })
      .limit(1)
      .single()
      .then(({ data: row }) => {
        if (row?.data?.messages) setMessages(row.data.messages as AgentMessage[]);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    let msgs = [...messages];
    if (agentFilter) msgs = msgs.filter(m => m.agentRole === agentFilter);
    if (typeFilter) msgs = msgs.filter(m => m.type === typeFilter);
    return msgs;
  }, [messages, agentFilter, typeFilter]);

  if (loading) return (
    <div className="p-6">
      <PageHeader title="Nhật ký hoạt động" subtitle="Đang tải..." breadcrumbs={[]} />
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
        <span className="ml-2 text-sm text-slate-400">Đang tải dữ liệu...</span>
      </div>
    </div>
  );

  const agentLabels: Record<AgentRole, string> = {
    ceo: 'CEO',
    hr_director: 'HR Director',
    finance: 'CFO',
    dept_manager: 'Trưởng phòng',
    performance_coach: 'Coach',
    channel_optimizer: 'Channel Optimizer',
    inventory_planner: 'Inventory Planner',
    collection_director: 'Collection Director',
    market_research: 'Market Research',
    strategy: 'Strategy Advisor',
    assistant: 'Trợ lý Tổng hợp',
  };

  const typeLabels: Record<AgentMessage['type'], string> = {
    analysis: 'Phân tích',
    decision: 'Quyết định',
    alert: 'Cảnh báo',
    recommendation: 'Đề xuất',
    question: 'Câu hỏi',
  };

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      <PageHeader
        title="Nhật ký hoạt động"
        subtitle="Lịch sử các quyết định và phân tích từ AI Agents"
        breadcrumbs={[
          { label: 'AI Agents', href: '/admin' },
          { label: 'Nhật ký hoạt động' },
        ]}
      />

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap items-center">
        <select
          value={agentFilter}
          onChange={e => setAgentFilter(e.target.value as AgentRole | '')}
          className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm"
        >
          <option value="">Tất cả agents</option>
          {allAgentRoles.map(role => (
            <option key={role} value={role}>{agentLabels[role]}</option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value as AgentMessage['type'] | '')}
          className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm"
        >
          <option value="">Tất cả loại</option>
          {(Object.keys(typeLabels) as AgentMessage['type'][]).map(type => (
            <option key={type} value={type}>{typeLabels[type]}</option>
          ))}
        </select>
        <span className="text-sm text-slate-500">
          {filtered.length} thông báo
        </span>
      </div>

      {/* Messages */}
      <div className="space-y-3">
        {filtered.map(msg => (
          <AgentMessageCard key={msg.id} message={msg} />
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-base">
            Không có thông báo nào phù hợp với bộ lọc.
          </div>
        )}
      </div>
    </div>
  );
}
