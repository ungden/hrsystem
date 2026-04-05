"use client";

import { useState, useEffect } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis, ReferenceLine } from 'recharts';
import { SalaryProjection } from '@/lib/agent-types';

interface EmployeeScatterProps {
  projections: SalaryProjection[];
  careers: { employee_id: number; level_code: string; current_salary: number }[];
}

export default function EmployeeScatter({ projections, careers }: EmployeeScatterProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const data = projections.map(p => {
    const career = careers.find(c => String(c.employee_id) === String(p.employeeId));
    const salary = career?.current_salary
      ? Math.round(career.current_salary / 1_000_000)
      : Math.round(p.projectedTotal / 1_000_000);
    return {
      name: p.employeeName.split(' ').slice(-2).join(' '),
      salary,
      kpi: p.completionRate || 60,
      dept: p.department.replace('Phòng ', ''),
    };
  });

  if (!mounted) return <div className="h-[300px] bg-slate-50 rounded-lg animate-pulse" />;

  if (!projections.length) {
    return (
      <div className="h-[300px] flex items-center justify-center bg-slate-50 rounded-lg">
        <p className="text-sm text-slate-400">Chưa có dữ liệu</p>
      </div>
    );
  }

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis type="number" dataKey="kpi" name="KPI" tick={{ fontSize: 10 }} label={{ value: 'KPI Score (%)', position: 'bottom', fontSize: 10, offset: -2 }} domain={[30, 100]} />
          <YAxis type="number" dataKey="salary" name="Lương" tick={{ fontSize: 10 }} tickFormatter={v => `${v}M`} label={{ value: 'Thu nhập (M)', angle: -90, position: 'insideLeft', fontSize: 10 }} />
          <ZAxis range={[40, 60]} />
          <Tooltip
            content={({ payload }: { payload?: Array<{ payload?: Record<string, unknown> }> }) => {
              if (!payload?.length || !payload[0].payload) return null;
              const d = payload[0].payload as { name: string; dept: string; kpi: number; salary: number };
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
