import { DepartmentDetail } from '@/lib/financial-types';
import { deptColors } from '@/lib/department-utils';

interface KPIHeatmapGridProps {
  departments: DepartmentDetail[];
}

function getHeatColor(value: number, max: number = 100): string {
  const ratio = Math.min(value / max, 1);
  if (ratio >= 0.8) return 'bg-green-500 text-white';
  if (ratio >= 0.6) return 'bg-green-300 text-green-900';
  if (ratio >= 0.4) return 'bg-yellow-300 text-yellow-900';
  if (ratio >= 0.2) return 'bg-orange-300 text-orange-900';
  return 'bg-red-300 text-red-900';
}

const metrics = [
  { key: 'avgKPI', label: 'KPI TB', max: 100 },
  { key: 'taskCompletion', label: 'Hoàn thành CV', max: 100 },
  { key: 'contributionMargin', label: 'Biên LN', max: 100 },
  { key: 'headcount', label: 'Nhân sự', max: 10 },
] as const;

export default function KPIHeatmapGrid({ departments }: KPIHeatmapGridProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr>
            <th className="text-left text-[11px] text-slate-500 uppercase tracking-wider pb-2 pr-3 min-w-[140px]">Phòng ban</th>
            {metrics.map(m => (
              <th key={m.key} className="text-center text-[11px] text-slate-500 uppercase tracking-wider pb-2 px-2 min-w-[90px]">{m.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {departments.map(dept => (
            <tr key={dept.department}>
              <td className="py-1.5 pr-3">
                <span className={`text-[12px] font-medium ${deptColors[dept.department]?.text || 'text-slate-700'}`}>
                  {dept.department.replace('Phòng ', '')}
                </span>
              </td>
              {metrics.map(m => {
                const value = dept[m.key] as number;
                const displayValue = m.key === 'headcount' ? value : `${value}%`;
                return (
                  <td key={m.key} className="py-1.5 px-1">
                    <div className={`text-center text-[11px] font-semibold rounded-md py-1.5 ${getHeatColor(value, m.max)}`}>
                      {displayValue}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
