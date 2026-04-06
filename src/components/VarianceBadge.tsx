import type { VarianceStatus } from '@/lib/supabase-data';

const config: Record<VarianceStatus, { bg: string; text: string; label: string }> = {
  exceeded: { bg: 'bg-green-100', text: 'text-green-700', label: 'Vượt KH' },
  met:      { bg: 'bg-blue-100',  text: 'text-blue-700',  label: 'Đạt KH' },
  near:     { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Gần đạt' },
  below:    { bg: 'bg-red-100',   text: 'text-red-700',   label: 'Dưới KH' },
  missing:  { bg: 'bg-slate-100', text: 'text-slate-500', label: 'Chưa BC' },
};

export default function VarianceBadge({ status, size = 'sm' }: { status: VarianceStatus; size?: 'sm' | 'xs' }) {
  const c = config[status];
  const cls = size === 'xs' ? 'text-[8px] px-1.5 py-0.5' : 'text-[10px] px-2 py-0.5';
  return (
    <span className={`${cls} rounded-full font-medium ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}
