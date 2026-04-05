import { FinancialHealthMetrics } from '@/lib/financial-types';
import ProgressRing from './ProgressRing';

interface FinancialHealthGaugesProps {
  metrics: FinancialHealthMetrics;
}

interface GaugeCardProps {
  label: string;
  value: string;
  percent: number;
  color: string;
  description: string;
}

function GaugeCard({ label, value, percent, color, description }: GaugeCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
      <div className="flex justify-center mb-2">
        <ProgressRing percent={Math.min(percent, 100)} size={56} strokeWidth={5} color={color} />
      </div>
      <p className="text-lg font-bold text-slate-800">{value}</p>
      <p className="text-xs font-medium text-slate-600 mt-0.5">{label}</p>
      <p className="text-[10px] text-slate-400 mt-1">{description}</p>
    </div>
  );
}

export default function FinancialHealthGauges({ metrics }: FinancialHealthGaugesProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <GaugeCard
        label="Current Ratio"
        value={`${metrics.currentRatio}x`}
        percent={metrics.currentRatio * 50}
        color={metrics.currentRatio >= 1.5 ? '#10b981' : metrics.currentRatio >= 1 ? '#f59e0b' : '#ef4444'}
        description="TS ngắn hạn / Nợ NH"
      />
      <GaugeCard
        label="Nợ/Vốn CSH"
        value={`${metrics.debtToEquity}x`}
        percent={100 - metrics.debtToEquity * 30}
        color={metrics.debtToEquity <= 1 ? '#10b981' : metrics.debtToEquity <= 2 ? '#f59e0b' : '#ef4444'}
        description="Tổng nợ / Vốn CSH"
      />
      <GaugeCard
        label="Biên LN ròng"
        value={`${metrics.profitMargin}%`}
        percent={metrics.profitMargin * 3}
        color={metrics.profitMargin >= 15 ? '#10b981' : metrics.profitMargin >= 5 ? '#f59e0b' : '#ef4444'}
        description="LN sau thuế / DT"
      />
      <GaugeCard
        label="Biên EBITDA"
        value={`${metrics.operatingMargin}%`}
        percent={metrics.operatingMargin * 2}
        color={metrics.operatingMargin >= 20 ? '#10b981' : metrics.operatingMargin >= 10 ? '#3b82f6' : '#f59e0b'}
        description="EBITDA / Doanh thu"
      />
      <GaugeCard
        label="Tăng trưởng DT"
        value={`${metrics.revenueGrowth > 0 ? '+' : ''}${metrics.revenueGrowth}%`}
        percent={50 + metrics.revenueGrowth * 5}
        color={metrics.revenueGrowth >= 5 ? '#10b981' : metrics.revenueGrowth >= 0 ? '#3b82f6' : '#ef4444'}
        description="MoM revenue growth"
      />
      <GaugeCard
        label="Burn Rate"
        value={`${Math.round(metrics.burnRate / 1_000_000)}M`}
        percent={60}
        color="#8b5cf6"
        description="Chi phí HĐ/tháng"
      />
    </div>
  );
}
