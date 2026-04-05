"use client";

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { EmployeeCareer } from '@/lib/mock-data';

interface PerformanceTrendLineProps {
  career: EmployeeCareer;
}

export default function PerformanceTrendLine({ career }: PerformanceTrendLineProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const data = career.performanceHistory.map(h => ({
    period: h.period,
    'KPI Score': h.kpiScore,
    'Xếp loại': h.rating,
  }));

  if (!mounted) return <div className="h-[200px] bg-slate-50 rounded-lg animate-pulse" />;

  return (
    <div className="h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="period" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
          <Tooltip />
          <ReferenceLine y={75} stroke="#10b981" strokeDasharray="3 3" label={{ value: "Strong", fontSize: 10, fill: '#10b981' }} />
          <ReferenceLine y={55} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: "Good", fontSize: 10, fill: '#f59e0b' }} />
          <Line type="monotone" dataKey="KPI Score" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 5, fill: '#3b82f6' }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
