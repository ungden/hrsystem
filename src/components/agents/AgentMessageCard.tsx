import { AgentMessage } from '@/lib/agent-types';
import AgentAvatar from './AgentAvatar';

interface AgentMessageCardProps {
  message: AgentMessage;
}

const typeConfig: Record<AgentMessage['type'], { label: string; color: string }> = {
  analysis: { label: 'Phân tích', color: 'bg-blue-100 text-blue-700' },
  decision: { label: 'Quyết định', color: 'bg-green-100 text-green-700' },
  alert: { label: 'Cảnh báo', color: 'bg-red-100 text-red-700' },
  recommendation: { label: 'Đề xuất', color: 'bg-purple-100 text-purple-700' },
  question: { label: 'Câu hỏi', color: 'bg-orange-100 text-orange-700' },
};

export default function AgentMessageCard({ message }: AgentMessageCardProps) {
  const config = typeConfig[message.type];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-start gap-3">
        <AgentAvatar role={message.agentRole} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-base font-semibold text-slate-800">{message.agentName}</span>
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${config.color}`}>
              {config.label}
            </span>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">{message.content}</p>
        </div>
      </div>
    </div>
  );
}
