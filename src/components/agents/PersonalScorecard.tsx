import { IndividualPlan } from '@/lib/agent-types';
import ProgressRing from './ProgressRing';

interface PersonalScorecardProps {
  plans: IndividualPlan[];
  avgKPI: number;
}

export default function PersonalScorecard({ plans, avgKPI }: PersonalScorecardProps) {
  const completed = plans.filter(p => p.status === 'completed').length;
  const atRisk = plans.filter(p => p.status === 'at_risk').length;
  const totalPoints = plans.reduce((s, p) => s + p.points, 0);
  const earnedPoints = plans.filter(p => p.status === 'completed').reduce((s, p) => s + p.points, 0);
  const completionRate = plans.length > 0 ? Math.round((completed / plans.length) * 100) : 0;

  const metrics = [
    { label: 'KPI trung bình', value: `${avgKPI}%`, percent: avgKPI, color: avgKPI >= 75 ? '#10b981' : avgKPI >= 55 ? '#3b82f6' : '#f59e0b' },
    { label: 'Hoàn thành CV', value: `${completed}/${plans.length}`, percent: completionRate, color: completionRate >= 80 ? '#10b981' : '#3b82f6' },
    { label: 'Điểm tích lũy', value: `${earnedPoints}/${totalPoints}`, percent: totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0, color: '#8b5cf6' },
    { label: 'Nhiệm vụ rủi ro', value: `${atRisk}`, percent: plans.length > 0 ? 100 - (atRisk / plans.length) * 100 : 100, color: atRisk > 0 ? '#ef4444' : '#10b981' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {metrics.map(m => (
        <div key={m.label} className="bg-white rounded-xl border border-slate-200 p-3 text-center">
          <div className="flex justify-center mb-1.5">
            <ProgressRing percent={m.percent} size={48} strokeWidth={4} color={m.color} />
          </div>
          <p className="text-sm font-bold text-slate-800">{m.value}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">{m.label}</p>
        </div>
      ))}
    </div>
  );
}
