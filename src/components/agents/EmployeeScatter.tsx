"use client";

import { useState, useEffect } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis, ReferenceLine } from 'recharts';
import { SalaryProjection } from '@/lib/agent-types';
import { employeeCareers } from '@/lib/mock-data';

interface EmployeeScatterProps {
  projections: SalaryProjection[];
}

export default function EmployeeScatter({ projections }: EmployeeScatterProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const data = projections.map(p => {
    const career = employeeCareers.find(c => c.employeeId === p.employeeId);
    const lastKPI = career?.performanceHistory.slice(-1)[0]?.kpiScore || 60;
    return {
      name: p.employeeName.split(' ').slice(-2).join(' '),
      salary: Math.round(p.projectedTotal / 1_000_000),
      kpi: lastKPI,
      dept: p.department.replace('Phòng ', ''),
    };
  });

  if (!mounted) return <div className="h-[300px] bg-slate-50 rounded-lg animate-pulse" />;

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis type="number" dataKey="kpi" name="KPI" tick={{ fontSize: 10 }} label={{ value: 'KPI Score (%)', position: 'bottom', fontSize: 10, offset: -2 }} domain={[30, 100]} />
          <YAxis type="number" dataKey="salary" name="Lương" tick={{ fontSize: 10 }} tickFormatter={v => `${v}M`} label={{ value: 'Thu nhập (M)', angle: -90, position: 'insideLeft', fontSize: 10 }} />
          <ZAxis range={[40, 60]} />
          <Tooltip
            formatter={(value: number, name: string) => [name === 'kpi' ? `${value}%` : `${value}M VND`, name === 'kpi' ? 'KPI' : 'Thu nhập']}
            labelFormatter={(label: string) => ''}
            content={({ payload }) => {
              if (!payload?.length) return null;
              const d = payload[0].payload;
              return (
                <div className="bg-white border border-slate-200 rounded-lg p-2 shadow-sm text-xs">
                  <p className="font-semibold text-slate-800">{d.name}</p>
                  <p className="text-slate-500">{d.dept}</p>
                  <p className="text-blue-600">KPI: {d.kpi}% | Thu nhập: {d.salary}M</p>
                </div>
              );
            }}
          />
          <ReferenceLine x={75} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'Strong', fontSize: 9, fill: '#10b981' }} />
          <ReferenceLine x={55} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Good', fontSize: 9, fill: '#f59e0b' }} />
          <Scatter data={data} fill="#3b82f6" fillOpacity={0.7} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
