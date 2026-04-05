"use client";

import { IncomeStatementMonth } from '@/lib/financial-types';
import { formatCurrency } from '@/lib/mock-data';

interface IncomeStatementTableProps {
  statements: IncomeStatementMonth[];
  compact?: boolean;
}

function Row({ label, values, bold, indent, color }: { label: string; values: number[]; bold?: boolean; indent?: boolean; color?: string }) {
  return (
    <tr className={`${bold ? 'font-bold border-t border-slate-200' : ''} ${color || ''}`}>
      <td className={`py-1.5 pr-3 text-[12px] ${indent ? 'pl-6' : 'pl-2'} ${bold ? 'text-slate-800' : 'text-slate-600'}`}>
        {label}
      </td>
      {values.map((v, i) => (
        <td key={i} className={`py-1.5 px-2 text-right text-[11px] ${bold ? 'text-slate-800' : 'text-slate-600'} ${v < 0 ? 'text-red-600' : ''}`}>
          {formatCurrency(Math.abs(v))}
          {v < 0 && ' (-)'}
        </td>
      ))}
    </tr>
  );
}

export default function IncomeStatementTable({ statements, compact }: IncomeStatementTableProps) {
  const data = compact ? statements.slice(-6) : statements;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-slate-200">
            <th className="pb-2 pr-3 text-left text-[10px] text-slate-500 uppercase tracking-wider pl-2 min-w-[160px]">Khoản mục</th>
            {data.map(m => (
              <th key={m.month} className="pb-2 px-2 text-right text-[10px] text-slate-500 uppercase tracking-wider min-w-[90px]">{m.month}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <Row label="DOANH THU" values={data.map(m => m.doanhThu.tongDoanhThu)} bold />
          <Row label="Kinh doanh" values={data.map(m => m.doanhThu.kinhdoanh)} indent />
          <Row label="Marketing" values={data.map(m => m.doanhThu.marketing)} indent />
          <Row label="CNTT/Dịch vụ" values={data.map(m => m.doanhThu.cntt)} indent />
          <Row label="Khác" values={data.map(m => m.doanhThu.khac)} indent />

          <Row label="CHI PHÍ HOẠT ĐỘNG" values={data.map(m => m.chiPhi.tongChiPhi)} bold />
          <Row label="Nhân sự" values={data.map(m => m.chiPhi.nhanSu)} indent />
          <Row label="Văn phòng" values={data.map(m => m.chiPhi.vanPhong)} indent />
          <Row label="Thiết bị" values={data.map(m => m.chiPhi.thietBi)} indent />
          <Row label="Marketing" values={data.map(m => m.chiPhi.marketingChi)} indent />
          <Row label="Bảo hiểm" values={data.map(m => m.chiPhi.baoHiem)} indent />
          <Row label="Chi phí khác" values={data.map(m => m.chiPhi.khac)} indent />

          <Row label="EBITDA" values={data.map(m => m.ebitda)} bold color="text-blue-700" />
          <Row label="Khấu hao" values={data.map(m => -m.khauHao)} indent />
          <Row label="LỢI NHUẬN TRƯỚC THUẾ" values={data.map(m => m.loiNhuanTruocThue)} bold />
          <Row label="Thuế TNDN (20%)" values={data.map(m => -m.thueDoanhNghiep)} indent />
          <Row label="LỢI NHUẬN SAU THUẾ" values={data.map(m => m.loiNhuanSauThue)} bold color={data[data.length - 1]?.loiNhuanSauThue >= 0 ? 'text-green-700' : 'text-red-700'} />
        </tbody>
      </table>
    </div>
  );
}
