import { AgentRole, AgentStatus, AgentMessage } from '@/lib/agent-types';
import { agentProfiles, allAgentRoles } from '@/lib/agents/agent-profiles';
import AgentAvatar from './AgentAvatar';
import AgentStatusIndicator from './AgentStatusIndicator';

interface AgentDashboardGridProps {
  statuses: Record<AgentRole, AgentStatus>;
  messages: AgentMessage[];
}

export default function AgentDashboardGrid({ statuses, messages }: AgentDashboardGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
      {allAgentRoles.map(role => {
        const profile = agentProfiles[role];
        const lastMsg = [...messages].reverse().find(m => m.agentRole === role);
        const msgCount = messages.filter(m => m.agentRole === role).length;

        return (
          <div key={role} className={`${profile.bgColor} rounded-xl border border-slate-200 p-4`}>
            <div className="flex items-center gap-2 mb-2">
              <AgentAvatar role={role} size="sm" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-800 truncate">{profile.name}</p>
                <p className="text-[10px] text-slate-500 truncate">{profile.title}</p>
              </div>
            </div>
            <AgentStatusIndicator status={statuses[role]} />
            <p className="text-[11px] text-slate-500 mt-2 line-clamp-2">
              {lastMsg ? lastMsg.content.slice(0, 80) + '...' : profile.description}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">{msgCount} thông báo</p>
          </div>
        );
      })}
    </div>
  );
}
