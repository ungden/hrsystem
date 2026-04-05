import { EmployeeKPICard } from '@/lib/cascade-types';
import { formatCurrency } from '@/lib/mock-data';

interface BonusCalculationSheetProps {
  cards: EmployeeKPICard[];
}

const tierColors: Record<string, string> = {
  'Xuất sắc': 'bg-green-100 text-green-700',
  'Giỏi': 'bg-blue-100 text-blue-700',
  'Tốt': 'bg-emerald-100 text-emerald-700',
  'Đạt': 'bg-slate-100 text-slate-700',
  'Cần cải thiện': 'bg-orange-100 text-orange-700',
};

export default function BonusCalculationSheet({ cards }: BonusCalculationSheetProps) {
  const sorted = [...cards].sort((a, b) => b.totalWeightedScore - a.totalWeightedScore);
  const totalBonus = sorted.reduce((s, c) => s + c.bonusAmount, 0);

  // Tier distribution
  const tierCounts: Record<string, number> = {};
  sorted.forEach(c => { tierCounts[c.bonusTier] = (tierCounts[c.bonusTier] || 0) + 1; });

  return (
    <div>
      {/* Tier Distribution */}
      <div className="flex gap-3 mb-4 flex-wrap">
        {Object.entries(tierCounts).map(([tier, count]) => (
          <div key={tier} className={`px-4 py-2 rounded-lg ${tierColors[tier] || 'bg-slate-100 text-slate-700'}`}>
            <p className="text-lg font-bold">{count}</p>
            <p className="text-[10px]">{tier}</p>
          </div>
        ))}
        <div className="px-4 py-2 rounded-lg bg-blue-50 text-blue-700 ml-auto">
          <p className="text-lg font-bold">{formatCurrency(totalBonus)}</p>
          <p className="text-[10px]">Tổng quỹ thưởng</p>
        </div>
      </div>

      {/* Bonus Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] text-slate-500 uppercase tracking-wider border-b-2 border-slate-200">
              <th className="pb-2 pr-2">#</th>
              <th className="pb-2 pr-2">Nhân viên</th>
              <th className="pb-2 pr-2">Phòng ban</th>
              <th className="pb-2 pr-2 text-center">KPI%</th>
              <th className="pb-2 pr-2 text-center">Xếp loại</th>
              <th className="pb-2 pr-2 text-center">Hệ số</th>
              <th className="pb-2 pr-2 text-right">KPI Bonus</th>
              <th className="pb-2 pr-2 text-right">PB Bonus</th>
              <th className="pb-2 pr-2 text-right">CT Bonus</th>
              <th className="pb-2 text-right">Tổng thưởng</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((c, i) => {
              const kpiBonus = Math.round(c.bonusAmount * 0.6);
              const pbBonus = Math.round(c.bonusAmount * 0.25);
              const ctBonus = c.bonusAmount - kpiBonus - pbBonus;
              return (
                <tr key={c.employeeId} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="py-2 pr-2 text-[12px] text-slate-400 font-bold">{i + 1}</td>
                  <td className="py-2 pr-2 text-[12px] font-medium text-slate-700">{c.employeeName}</td>
                  <td className="py-2 pr-2 text-[11px] text-slate-500">{c.department.replace('Phòng ', '')}</td>
                  <td className="py-2 pr-2 text-center">
                    <span className={`text-[12px] font-bold ${c.totalWeightedScore >= 80 ? 'text-green-600' : c.totalWeightedScore >= 60 ? 'text-blue-600' : 'text-orange-600'}`}>
                      {c.totalWeightedScore}%
                    </span>
                  </td>
                  <td className="py-2 pr-2 text-center">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${tierColors[c.bonusTier] || ''}`}>
                      {c.bonusTier}
                    </span>
                  </td>
                  <td className="py-2 pr-2 text-center text-[12px] text-slate-600">{Math.round(c.bonusRate * 100)}%</td>
                  <td className="py-2 pr-2 text-right text-[12px] text-slate-700">{formatCurrency(kpiBonus)}</td>
                  <td className="py-2 pr-2 text-right text-[12px] text-slate-600">{formatCurrency(pbBonus)}</td>
                  <td className="py-2 pr-2 text-right text-[12px] text-slate-600">{formatCurrency(ctBonus)}</td>
                  <td className="py-2 text-right text-[12px] font-bold text-emerald-600">{formatCurrency(c.bonusAmount)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-200 font-bold text-[12px]">
              <td colSpan={6} className="py-2 pr-2 text-slate-800">Tổng cộng</td>
              <td className="py-2 pr-2 text-right text-slate-700">{formatCurrency(Math.round(totalBonus * 0.6))}</td>
              <td className="py-2 pr-2 text-right text-slate-600">{formatCurrency(Math.round(totalBonus * 0.25))}</td>
              <td className="py-2 pr-2 text-right text-slate-600">{formatCurrency(totalBonus - Math.round(totalBonus * 0.6) - Math.round(totalBonus * 0.25))}</td>
              <td className="py-2 text-right text-emerald-700">{formatCurrency(totalBonus)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Bonus Tiers Legend */}
      <div className="mt-4 bg-slate-50 rounded-lg p-3">
        <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Bảng hệ số thưởng</h4>
        <div className="grid grid-cols-5 gap-2 text-[11px]">
          <div className="text-center"><span className="font-bold text-green-600">25%</span><br/>Xuất sắc (≥95%)</div>
          <div className="text-center"><span className="font-bold text-blue-600">20%</span><br/>Giỏi (≥80%)</div>
          <div className="text-center"><span className="font-bold text-emerald-600">15%</span><br/>Tốt (≥65%)</div>
          <div className="text-center"><span className="font-bold text-slate-600">10%</span><br/>Đạt (≥50%)</div>
          <div className="text-center"><span className="font-bold text-orange-600">5%</span><br/>Cần CT (&lt;50%)</div>
        </div>
      </div>
    </div>
  );
}
