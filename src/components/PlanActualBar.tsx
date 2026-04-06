const barColors: Record<string, string> = {
  exceeded: 'bg-green-500',
  met: 'bg-blue-500',
  near: 'bg-orange-400',
  below: 'bg-red-400',
  missing: 'bg-slate-300',
};

export default function PlanActualBar({ target, actual, status }: {
  target: number;
  actual: number | null;
  status: string;
}) {
  const pct = target > 0 && actual !== null ? Math.min(Math.round((actual / target) * 100), 150) : 0;
  const displayPct = Math.min(pct, 100);
  const color = barColors[status] || barColors.missing;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[8px] text-slate-400">KH: {target}</span>
        <span className={`text-[8px] font-bold ${actual !== null ? 'text-slate-700' : 'text-slate-300'}`}>
          {actual !== null ? `TT: ${actual}` : '—'}
          {pct > 0 && ` (${pct}%)`}
        </span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${displayPct}%` }} />
      </div>
    </div>
  );
}
