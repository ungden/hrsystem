import { CostProjection } from '@/lib/agent-types';
import { formatCurrency } from '@/lib/mock-data';

interface DepartmentCostCardProps {
  projection: CostProjection;
}

export default function DepartmentCostCard({ projection }: DepartmentCostCardProps) {
  const avgCost = projection.headcount > 0 ? Math.round(projection.totalCost / projection.headcount) : 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-800">{projection.department}</h3>
        <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
          {projection.headcount} người
        </span>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-[12px]">
          <span className="text-slate-500">Lương cơ bản</span>
          <span className="text-slate-700 font-medium">{formatCurrency(projection.totalBaseSalary)}</span>
        </div>
        <div className="flex justify-between text-[12px]">
          <span className="text-slate-500">Phụ cấp</span>
          <span className="text-slate-700 font-medium">{formatCurrency(projection.totalAllowances)}</span>
        </div>
        <div className="flex justify-between text-[12px]">
          <span className="text-slate-500">Bảo hiểm</span>
          <span className="text-slate-700 font-medium">{formatCurrency(projection.totalInsurance)}</span>
        </div>
        <div className="flex justify-between text-[12px]">
          <span className="text-slate-500">Thưởng dự kiến</span>
          <span className="text-emerald-600 font-medium">{formatCurrency(projection.projectedBonusPool)}</span>
        </div>
        <div className="border-t border-slate-100 pt-2 mt-2">
          <div className="flex justify-between text-[12px]">
            <span className="text-slate-700 font-semibold">Tổng chi phí</span>
            <span className="text-blue-600 font-bold">{formatCurrency(projection.totalCost)}</span>
          </div>
          <div className="flex justify-between text-[11px] mt-1">
            <span className="text-slate-400">Bình quân/người</span>
            <span className="text-slate-500">{formatCurrency(avgCost)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
