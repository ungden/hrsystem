import { BusinessMilestone } from '@/lib/financial-types';
import { Flag, Trophy, AlertTriangle, Calendar } from 'lucide-react';

interface BusinessMilestoneTimelineProps {
  milestones: BusinessMilestone[];
}

const typeConfig: Record<BusinessMilestone['type'], { icon: typeof Flag; color: string; bg: string }> = {
  achievement: { icon: Trophy, color: 'text-green-600', bg: 'bg-green-100' },
  plan: { icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-100' },
  alert: { icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-100' },
  milestone: { icon: Flag, color: 'text-purple-600', bg: 'bg-purple-100' },
};

export default function BusinessMilestoneTimeline({ milestones }: BusinessMilestoneTimelineProps) {
  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-slate-200" />

      <div className="space-y-4">
        {milestones.map((ms, i) => {
          const config = typeConfig[ms.type];
          const Icon = config.icon;
          return (
            <div key={ms.id} className="relative flex gap-4 pl-0">
              {/* Dot */}
              <div className={`relative z-10 w-10 h-10 rounded-full ${config.bg} flex items-center justify-center flex-shrink-0`}>
                <Icon size={16} className={config.color} />
              </div>
              {/* Content */}
              <div className="flex-1 pb-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400 font-medium">{ms.date}</span>
                </div>
                <p className="text-sm font-medium text-slate-800 mt-0.5">{ms.title}</p>
                <p className="text-[12px] text-slate-500 mt-0.5">{ms.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
