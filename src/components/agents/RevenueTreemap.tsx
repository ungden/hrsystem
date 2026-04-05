"use client";

import { useState, useEffect } from 'react';
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';
import { IncomeStatementMonth } from '@/lib/financial-types';

interface RevenueTreemapProps {
  statement: IncomeStatementMonth;
}

const COLORS = ['#f59e0b', '#ec4899', '#10b981', '#8b5cf6'];

interface TreemapContentProps {
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  value: number;
  index: number;
}

function CustomContent({ x, y, width, height, name, value, index }: TreemapContentProps) {
  if (width < 40 || height < 30) return null;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={COLORS[index % COLORS.length]} rx={4} opacity={0.9} />
      <text x={x + width / 2} y={y + height / 2 - 6} textAnchor="middle" fill="#fff" fontSize={11} fontWeight="bold">
        {name}
      </text>
      <text x={x + width / 2} y={y + height / 2 + 10} textAnchor="middle" fill="#fff" fontSize={10} opacity={0.8}>
        {Math.round(value)}M
      </text>
    </g>
  );
}

export default function RevenueTreemap({ statement }: RevenueTreemapProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const data = [
    { name: 'Kinh doanh', value: Math.round(statement.doanhThu.kinhdoanh / 1_000_000) },
    { name: 'Marketing', value: Math.round(statement.doanhThu.marketing / 1_000_000) },
    { name: 'CNTT', value: Math.round(statement.doanhThu.cntt / 1_000_000) },
    { name: 'Khác', value: Math.round(statement.doanhThu.khac / 1_000_000) },
  ];

  if (!mounted) return <div className="h-[250px] bg-slate-50 rounded-lg animate-pulse" />;

  return (
    <div className="h-[250px]">
      <ResponsiveContainer width="100%" height="100%">
        <Treemap
          data={data}
          dataKey="value"
          nameKey="name"
          aspectRatio={4 / 3}
          content={<CustomContent x={0} y={0} width={0} height={0} name="" value={0} index={0} />}
        >
          <Tooltip formatter={(value: number) => [`${value}M VND`, 'Doanh thu']} />
        </Treemap>
      </ResponsiveContainer>
    </div>
  );
}
