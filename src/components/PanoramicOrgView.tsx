"use client";

import { useState } from 'react';

interface EmpKPI {
  name: string;
  department: string;
  kpiScore: number;
}

interface DeptInfo {
  name: string;
  headcount: number;
  avgKPI: number;
  completionRate: number;
}

interface Props {
  departments: DeptInfo[];
  employees: EmpKPI[];
}

function kpiGradient(score: number): string {
  if (score >= 80) return 'from-emerald-400 to-teal-500';
  if (score >= 65) return 'from-lime-400 to-green-500';
  if (score >= 50) return 'from-amber-400 to-orange-500';
  return 'from-red-400 to-rose-500';
}

function kpiShadow(score: number): string {
  if (score >= 80) return 'shadow-emerald-400/40';
  if (score >= 65) return 'shadow-lime-400/40';
  if (score >= 50) return 'shadow-amber-400/40';
  return 'shadow-red-400/40';
}

function kpiBorderGradient(score: number): string {
  if (score >= 80) return 'from-emerald-200 to-teal-200';
  if (score >= 65) return 'from-lime-200 to-green-200';
  if (score >= 50) return 'from-amber-200 to-orange-200';
  return 'from-red-200 to-rose-200';
}

function kpiBgGradient(score: number): string {
  if (score >= 80) return 'from-emerald-50/80 to-teal-50/40';
  if (score >= 65) return 'from-lime-50/80 to-green-50/40';
  if (score >= 50) return 'from-amber-50/80 to-orange-50/40';
  return 'from-red-50/80 to-rose-50/40';
}

function kpiBadgeGradient(score: number): string {
  if (score >= 80) return 'from-emerald-500 to-teal-600';
  if (score >= 65) return 'from-lime-500 to-green-600';
  if (score >= 50) return 'from-amber-500 to-orange-600';
  return 'from-red-500 to-rose-600';
}

function kpiLabel(score: number): string {
  if (score >= 80) return 'Xuất sắc';
  if (score >= 65) return 'Tốt';
  if (score >= 50) return 'Cần cải thiện';
  return 'Yếu';
}

function kpiRingColor(score: number): string {
  if (score >= 80) return 'ring-emerald-300/50';
  if (score >= 65) return 'ring-lime-300/50';
  if (score >= 50) return 'ring-amber-300/50';
  return 'ring-red-300/50';
}

const DEPT_ICONS: Record<string, string> = {
  'Sales': '💼',
  'Marketing': '📣',
  'Vận hành': '⚙️',
  'Kế toán': '📊',
  'Ban Giám đốc': '👑',
  'Thiết kế': '🎨',
  'Kho vận': '📦',
};

export default function PanoramicOrgView({ departments, employees }: Props) {
  const [hoveredEmp, setHoveredEmp] = useState<string | null>(null);

  const deptEmployees = new Map<string, EmpKPI[]>();
  employees.forEach(emp => {
    const arr = deptEmployees.get(emp.department) || [];
    arr.push(emp);
    deptEmployees.set(emp.department, arr);
  });

  const sortedDepts = [...departments].sort((a, b) => b.headcount - a.headcount);

  return (
    <div className="rounded-2xl bg-white border border-slate-200/80 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <span className="text-white text-sm">🏢</span>
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800">Toàn cảnh đội ngũ</h2>
            <p className="text-xs text-slate-400">{employees.length} người · {departments.length} phòng ban</p>
          </div>
        </div>

        {/* Legend */}
        <div className="hidden md:flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 shadow-sm shadow-emerald-400/30" /> ≥80
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-gradient-to-br from-lime-400 to-green-500 shadow-sm shadow-lime-400/30" /> ≥65
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm shadow-amber-400/30" /> ≥50
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-gradient-to-br from-red-400 to-rose-500 shadow-sm shadow-red-400/30" /> &lt;50
          </span>
        </div>
      </div>

      {/* Department bubble grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
        {sortedDepts.map(dept => {
          const emps = deptEmployees.get(dept.name) || [];
          const icon = DEPT_ICONS[dept.name] || '📁';

          return (
            <div
              key={dept.name}
              className={`rounded-2xl p-4 bg-gradient-to-br ${kpiBgGradient(dept.avgKPI)} border border-gradient-to-br ${kpiBorderGradient(dept.avgKPI)} transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5`}
              style={{ borderImage: 'none' }}
            >
              {/* Department header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{icon}</span>
                  <span className="text-sm font-bold text-slate-800">{dept.name}</span>
                </div>
                <span className={`text-xs font-bold text-white px-2.5 py-1 rounded-lg bg-gradient-to-r ${kpiBadgeGradient(dept.avgKPI)} shadow-sm`}>
                  KPI {dept.avgKPI || '—'}
                </span>
              </div>

              {/* Employee bubbles */}
              <div className="flex flex-wrap gap-3 min-h-[56px] justify-center py-2">
                {emps.length === 0 ? (
                  <span className="text-xs text-slate-400">Không có dữ liệu</span>
                ) : (
                  emps.map((emp, i) => {
                    const initials = emp.name.split(' ').slice(-1)[0]?.charAt(0) || '?';
                    const firstName = emp.name.split(' ').slice(-1)[0] || emp.name;
                    const isHovered = hoveredEmp === `${dept.name}-${i}`;
                    return (
                      <div
                        key={i}
                        className="relative flex flex-col items-center"
                        onMouseEnter={() => setHoveredEmp(`${dept.name}-${i}`)}
                        onMouseLeave={() => setHoveredEmp(null)}
                      >
                        <div
                          className={`w-12 h-12 rounded-full bg-gradient-to-br ${kpiGradient(emp.kpiScore)} flex items-center justify-center text-white text-sm font-bold shadow-lg ${kpiShadow(emp.kpiScore)} ring-2 ${kpiRingColor(emp.kpiScore)} cursor-pointer transition-all duration-300 ${isHovered ? 'scale-125 ring-4' : 'hover:scale-110'}`}
                        >
                          {initials}
                        </div>
                        <div className="text-[10px] text-slate-500 text-center mt-1.5 w-12 truncate font-medium">{firstName}</div>

                        {/* Tooltip */}
                        {isHovered && (
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-50 animate-fade-in-up" style={{ animationDuration: '0.15s' }}>
                            <div className="bg-slate-900 text-white rounded-xl px-4 py-3 text-xs whitespace-nowrap shadow-xl shadow-slate-900/30">
                              <div className="font-bold text-sm">{emp.name}</div>
                              <div className="text-slate-400 mt-0.5">{emp.department} · KPI: {emp.kpiScore}/100</div>
                              <div className={`font-semibold mt-1 ${emp.kpiScore >= 80 ? 'text-emerald-400' : emp.kpiScore >= 65 ? 'text-lime-400' : emp.kpiScore >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                                {kpiLabel(emp.kpiScore)}
                              </div>
                              <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-slate-900" />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Department stats */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-200/50 text-xs text-slate-500">
                <span>{dept.headcount} người</span>
                <div className="flex items-center gap-2">
                  <div className="w-16 bg-slate-200/60 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${kpiBadgeGradient(dept.avgKPI)} transition-all duration-500`}
                      style={{ width: `${Math.min(dept.completionRate, 100)}%` }}
                    />
                  </div>
                  <span className="font-medium">{dept.completionRate}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Company-wide health bar */}
      <div className="mt-5 pt-5 border-t border-slate-100">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-semibold text-slate-500">Sức khỏe phòng ban</span>
        </div>
        <div className="flex rounded-xl overflow-hidden h-8 shadow-inner bg-slate-100">
          {sortedDepts.map(dept => {
            const widthPct = employees.length > 0
              ? ((deptEmployees.get(dept.name)?.length || 0) / employees.length) * 100
              : 0;
            return (
              <div
                key={dept.name}
                className={`flex items-center justify-center text-[10px] font-bold text-white bg-gradient-to-b ${kpiGradient(dept.avgKPI)} transition-all hover:brightness-110 cursor-default`}
                style={{ width: `${Math.max(widthPct, 8)}%` }}
                title={`${dept.name}: KPI ${dept.avgKPI}, ${dept.headcount} người`}
              >
                {widthPct >= 15 ? dept.name : ''}
              </div>
            );
          })}
        </div>
        <div className="flex mt-1.5">
          {sortedDepts.map(dept => {
            const widthPct = employees.length > 0
              ? ((deptEmployees.get(dept.name)?.length || 0) / employees.length) * 100
              : 0;
            return (
              <div
                key={dept.name}
                className="text-[10px] text-slate-400 text-center font-medium"
                style={{ width: `${Math.max(widthPct, 8)}%` }}
              >
                {widthPct >= 12 ? `${dept.avgKPI}` : ''}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
