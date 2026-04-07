import { AgentRole } from '@/lib/agent-types';
import { agentProfiles } from '@/lib/agents/agent-profiles';

interface AgentAvatarProps {
  role: AgentRole;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

const sizeMap = {
  xs: 'w-5 h-5 text-[8px]',
  sm: 'w-7 h-7 text-[10px]',
  md: 'w-9 h-9 text-xs',
  lg: 'w-12 h-12 text-sm',
};

export default function AgentAvatar({ role, size = 'md' }: AgentAvatarProps) {
  const profile = agentProfiles[role];
  return (
    <div className={`${sizeMap[size]} ${profile.color} rounded-full flex items-center justify-center text-white font-bold shadow-sm flex-shrink-0`}>
      {profile.avatar}
    </div>
  );
}
