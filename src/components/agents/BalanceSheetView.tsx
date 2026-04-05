"use client";

import { BalanceSheet } from '@/lib/financial-types';
import { formatCurrency } from '@/lib/format';
import { CheckCircle2 } from 'lucide-react';

interface BalanceSheetViewProps {
  balanceSheet: BalanceSheet;
}

function BSRow({ label, value, bold, indent, negative }: { label: string; value: number; bold?: boolean; indent?: boolean; negative?: boolean }) {
  return (
    <div className={`flex justify-between py-1 ${bold ? 'font-semibold border-t border-slate-200 pt-2' : ''}`}>
      <span className={`text-[12px] ${indent ? 'pl-4' : ''} ${bold ? 'text-slate-800' : 'text-slate-600'}`}>{label}</span>
      <span className={`text-[12px] ${negative ? 'text-red-600' : bold ? 'text-slate-800' : 'text-slate-700'} font-medium`}>
        {negative && '('}{formatCurrency(Math.abs(value))}{negative && ')'}
      </span>
    </div>
  );
}

export default function BalanceSheetView({ balanceSheet }: BalanceSheetViewProps) {
  const bs = balanceSheet.data;
  const isBalanced = bs.tongTaiSan === bs.tongNguonVon;

  return (
    <div>
      {/* Balance indicator */}
      <div className={`flex items-center gap-2 mb-4 px-3 py-2 rounded-lg ${isBalanced ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
        <CheckCircle2 size={16} className={isBalanced ? 'text-green-600' : 'text-red-600'} />
        <span className={`text-xs font-medium ${isBalanced ? 'text-green-700' : 'text-red-700'}`}>
          {isBalanced ? 'Bảng cân đối: Tài sản = Nguồn vốn' : 'CẢNH BÁO: Bảng không cân đối!'}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assets */}
        <div className="bg-blue-50/50 rounded-xl border border-blue-100 p-4">
          <h3 className="text-sm font-bold text-blue-800 mb-3">TÀI SẢN</h3>

          <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Tài sản ngắn hạn</h4>
          <BSRow label="Tiền mặt & tương đương" value={bs.taiSanNganHan.tienMat} indent />
          <BSRow label="Phải thu khách hàng" value={bs.taiSanNganHan.phaiThu} indent />
          <BSRow label="Hàng tồn kho" value={bs.taiSanNganHan.hangTonKho} indent />
          <BSRow label="Chi phí trả trước" value={bs.taiSanNganHan.chiPhiTraTruoc} indent />
          <BSRow label="Tổng TS ngắn hạn" value={bs.taiSanNganHan.tongNganHan} bold />

          <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 mt-3">Tài sản dài hạn</h4>
          <BSRow label="Tài sản cố định" value={bs.taiSanDaiHan.taiSanCoDinh} indent />
          <BSRow label="Khấu hao lũy kế" value={bs.taiSanDaiHan.khauHaoLuyKe} indent negative />
          <BSRow label="Tài sản vô hình" value={bs.taiSanDaiHan.taiSanVoHinh} indent />
          <BSRow label="Tổng TS dài hạn" value={bs.taiSanDaiHan.tongDaiHan} bold />

          <div className="mt-3 pt-2 border-t-2 border-blue-300">
            <BSRow label="TỔNG TÀI SẢN" value={bs.tongTaiSan} bold />
          </div>
        </div>

        {/* Liabilities + Equity */}
        <div className="bg-amber-50/50 rounded-xl border border-amber-100 p-4">
          <h3 className="text-sm font-bold text-amber-800 mb-3">NGUỒN VỐN</h3>

          <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Nợ phải trả</h4>
          <BSRow label="Phải trả ngắn hạn" value={bs.noPhaiTra.phaiTraNganHan} indent />
          <BSRow label="Lương phải trả" value={bs.noPhaiTra.luongPhaiTra} indent />
          <BSRow label="Thuế phải nộp" value={bs.noPhaiTra.thuePhaiNop} indent />
          <BSRow label="Vay ngắn hạn" value={bs.noPhaiTra.vayNganHan} indent />
          <BSRow label="Vay dài hạn" value={bs.noPhaiTra.vayDaiHan} indent />
          <BSRow label="Tổng nợ phải trả" value={bs.noPhaiTra.tongNoPhaiTra} bold />

          <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 mt-3">Vốn chủ sở hữu</h4>
          <BSRow label="Vốn điều lệ" value={bs.vonChuSoHuu.vonDieuLe} indent />
          <BSRow label="Lợi nhuận giữ lại" value={bs.vonChuSoHuu.loiNhuanGiuLai} indent />
          <BSRow label="Tổng vốn CSH" value={bs.vonChuSoHuu.tongVon} bold />

          <div className="mt-3 pt-2 border-t-2 border-amber-300">
            <BSRow label="TỔNG NGUỒN VỐN" value={bs.tongNguonVon} bold />
          </div>
        </div>
      </div>
    </div>
  );
}
