import { AgentStatus } from '@/lib/agent-types';

interface AgentStatusIndicatorProps {
  status: AgentStatus;
}

const statusConfig: Record<AgentStatus, { color: string; label: string; animate?: boolean }> = {
  idle: { color: 'bg-slate-300', label: 'Chờ' },
  thinking: { color: 'bg-blue-500', label: 'Đang xử lý', animate: true },
  done: { color: 'bg-green-500', label: 'Hoàn thành' },
  error: { color: 'bg-red-500', label: 'Lỗi' },
};

export default function AgentStatusIndicator({ status }: AgentStatusIndicatorProps) {
  const config = statusConfig[status];
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${config.color} ${config.animate ? 'animate-pulse' : ''}`} />
      <span className="text-[11px] text-slate-500">{config.label}</span>
    </span>
  );
}
