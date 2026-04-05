"use client";

import { useState, useEffect } from 'react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Legend } from 'recharts';
import { DepartmentDetail } from '@/lib/financial-types';
import { deptColors } from '@/lib/department-utils';

interface DepartmentRadarChartProps {
  departments: DepartmentDetail[];
}

export default function DepartmentRadarChart({ departments }: DepartmentRadarChartProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return <div className="h-[350px] bg-slate-50 rounded-lg animate-pulse" />;

  const data = [
    { metric: 'KPI', ...Object.fromEntries(departments.map(d => [d.department.replace('Phòng ', ''), d.avgKPI])) },
    { metric: 'Hoàn thành CV', ...Object.fromEntries(departments.map(d => [d.department.replace('Phòng ', ''), d.taskCompletion])) },
    { metric: 'Biên LN', ...Object.fromEntries(departments.map(d => [d.department.replace('Phòng ', ''), Math.max(0, d.contributionMargin)])) },
    { metric: 'Nhân sự', ...Object.fromEntries(departments.map(d => [d.department.replace('Phòng ', ''), d.headcount * 15])) },
    { metric: 'Doanh thu', ...Object.fromEntries(departments.map(d => [d.department.replace('Phòng ', ''), Math.min(100, Math.round(d.revenueContribution / 5_000_000))])) },
  ];

  return (
    <div className="h-[350px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
          <PolarRadiusAxis tick={{ fontSize: 9 }} domain={[0, 100]} />
          {departments.slice(0, 4).map(d => {
            const color = deptColors[d.department]?.chart || '#3b82f6';
            return (
              <Radar
                key={d.department}
                name={d.department.replace('Phòng ', '')}
                dataKey={d.department.replace('Phòng ', '')}
                stroke={color}
                fill={color}
                fillOpacity={0.1}
                strokeWidth={2}
              />
            );
          })}
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
