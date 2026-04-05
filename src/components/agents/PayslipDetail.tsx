import { PayslipMonth } from '@/lib/cascade-types';
import { formatCurrency } from '@/lib/mock-data';

interface PayslipDetailProps {
  payslip: PayslipMonth;
}

function Row({ label, value, bold, indent, negative }: { label: string; value: number; bold?: boolean; indent?: boolean; negative?: boolean }) {
  return (
    <div className={`flex justify-between py-1.5 ${bold ? 'font-semibold border-t border-slate-200 pt-2 mt-1' : ''}`}>
      <span className={`text-[13px] ${indent ? 'pl-6' : 'pl-2'} ${bold ? 'text-slate-800' : 'text-slate-600'}`}>{label}</span>
      <span className={`text-[13px] font-medium ${negative ? 'text-red-600' : bold ? 'text-slate-800' : 'text-slate-700'}`}>
        {negative && '-'}{formatCurrency(Math.abs(value))}
      </span>
    </div>
  );
}

export default function PayslipDetail({ payslip }: PayslipDetailProps) {
  const p = payslip;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      {/* Header */}
      <div className="text-center border-b border-slate-200 pb-4 mb-4">
        <h2 className="text-lg font-bold text-slate-800">BẢNG LƯƠNG {p.month.toUpperCase()}</h2>
        <div className="flex items-center justify-center gap-4 mt-2 text-sm text-slate-600">
          <span>{p.employeeName}</span>
          <span className="text-slate-300">|</span>
          <span>{p.chucVu}</span>
          <span className="text-slate-300">|</span>
          <span>{p.department}</span>
          <span className="text-slate-300">|</span>
          <span className="bg-blue-100 text-blue-700 text-[10px] font-semibold px-1.5 py-0.5 rounded">{p.levelCode}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Income & Bonus */}
        <div>
          {/* I. Thu nhập */}
          <h3 className="text-sm font-bold text-blue-700 mb-2 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-700">I</span>
            THU NHẬP
          </h3>
          <div className="bg-blue-50/50 rounded-lg p-3 mb-4">
            <Row label="Lương cơ bản" value={p.thuNhap.luongCoBan} indent />
            <Row label="Phụ cấp ăn trưa" value={p.thuNhap.phuCapAnTrua} indent />
            <Row label="Phụ cấp xăng xe" value={p.thuNhap.phuCapXangXe} indent />
            {p.thuNhap.phuCapDienThoai > 0 && <Row label="Phụ cấp điện thoại" value={p.thuNhap.phuCapDienThoai} indent />}
            {p.thuNhap.phuCapThamNien > 0 && <Row label="Phụ cấp thâm niên" value={p.thuNhap.phuCapThamNien} indent />}
            <Row label="Tổng thu nhập" value={p.thuNhap.tongThuNhap} bold />
          </div>

          {/* II. Thưởng */}
          <h3 className="text-sm font-bold text-emerald-700 mb-2 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-[10px] font-bold text-emerald-700">II</span>
            THƯỞNG
            <span className="text-[10px] font-normal bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
              KPI đạt {p.thuong.kpiAchievement}%
            </span>
          </h3>
          <div className="bg-emerald-50/50 rounded-lg p-3">
            <Row label={`Thưởng KPI (đạt ${p.thuong.kpiAchievement}%)`} value={p.thuong.thuongKPI} indent />
            <Row label="Thưởng phòng ban" value={p.thuong.thuongPhongBan} indent />
            <Row label="Thưởng công ty" value={p.thuong.thuongCongTy} indent />
            <Row label="Tổng thưởng" value={p.thuong.tongThuong} bold />
          </div>
        </div>

        {/* Right: Deductions & Total */}
        <div>
          {/* III. Khấu trừ */}
          <h3 className="text-sm font-bold text-red-700 mb-2 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center text-[10px] font-bold text-red-700">III</span>
            KHẤU TRỪ
          </h3>
          <div className="bg-red-50/50 rounded-lg p-3 mb-4">
            <Row label="BHXH (8%)" value={p.khauTru.bhxh} indent negative />
            <Row label="BHYT (1.5%)" value={p.khauTru.bhyt} indent negative />
            <Row label="BHTN (1%)" value={p.khauTru.bhtn} indent negative />
            <Row label="Thuế TNCN" value={p.khauTru.thueTNCN} indent negative />
            <Row label="Tổng khấu trừ" value={Math.abs(p.khauTru.tongKhauTru)} bold negative />
          </div>

          {/* IV. Thực nhận */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-5 text-white">
            <h3 className="text-sm font-bold text-blue-100 mb-1 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">IV</span>
              THỰC NHẬN
            </h3>
            <p className="text-3xl font-bold text-center mt-2">{formatCurrency(p.thucNhan)} <span className="text-lg text-blue-200">đ</span></p>
            <p className="text-center text-blue-200 text-xs mt-1">
              = {formatCurrency(p.thuNhap.tongThuNhap)} + {formatCurrency(p.thuong.tongThuong)} - {formatCurrency(Math.abs(p.khauTru.tongKhauTru))}
            </p>
          </div>

          {/* Status */}
          <div className="mt-4 flex justify-end">
            <span className={`text-xs font-medium px-3 py-1 rounded-full ${
              p.trangThai === 'da_thanh_toan' ? 'bg-green-100 text-green-700' :
              p.trangThai === 'da_duyet' ? 'bg-blue-100 text-blue-700' :
              'bg-orange-100 text-orange-700'
            }`}>
              {p.trangThai === 'da_thanh_toan' ? 'Đã thanh toán' : p.trangThai === 'da_duyet' ? 'Đã duyệt' : 'Chờ duyệt'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
