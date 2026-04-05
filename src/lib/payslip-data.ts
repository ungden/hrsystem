import { PayslipMonth, EmployeeKPICard, KPIItem } from './cascade-types';
import { employees, employeeCareers, getCareerLevel, formatCurrency } from './mock-data';

function prand(seed: number, n: number): number {
  return ((seed * 17 + n * 31 + seed * n * 7) % 1000) / 1000;
}

// Vietnamese personal income tax brackets (monthly)
function calculatePIT(taxableIncome: number): number {
  if (taxableIncome <= 0) return 0;
  // Simplified: 11M deduction + 4.4M/dependent
  const personalDeduction = 11_000_000;
  const taxable = Math.max(0, taxableIncome - personalDeduction);

  if (taxable <= 5_000_000) return Math.round(taxable * 0.05);
  if (taxable <= 10_000_000) return Math.round(250_000 + (taxable - 5_000_000) * 0.10);
  if (taxable <= 18_000_000) return Math.round(750_000 + (taxable - 10_000_000) * 0.15);
  if (taxable <= 32_000_000) return Math.round(1_950_000 + (taxable - 18_000_000) * 0.20);
  if (taxable <= 52_000_000) return Math.round(4_750_000 + (taxable - 32_000_000) * 0.25);
  return Math.round(9_750_000 + (taxable - 52_000_000) * 0.30);
}

// Bonus tier calculation
function getBonusTier(kpiScore: number): { tier: string; rate: number } {
  if (kpiScore >= 95) return { tier: 'Xuất sắc', rate: 0.25 };
  if (kpiScore >= 80) return { tier: 'Giỏi', rate: 0.20 };
  if (kpiScore >= 65) return { tier: 'Tốt', rate: 0.15 };
  if (kpiScore >= 50) return { tier: 'Đạt', rate: 0.10 };
  return { tier: 'Cần cải thiện', rate: 0.05 };
}

// KPI templates per department (expanded with weights)
const deptKPITemplates: Record<string, { name: string; weight: number; target: number; unit: string }[]> = {
  'Phòng Kinh doanh': [
    { name: 'Doanh số bán hàng', weight: 40, target: 200_000_000, unit: 'VND' },
    { name: 'Khách hàng mới', weight: 20, target: 8, unit: 'KH' },
    { name: 'Tỷ lệ chốt deal', weight: 20, target: 30, unit: '%' },
    { name: 'CSAT khách hàng', weight: 20, target: 85, unit: '%' },
  ],
  'Phòng CNTT': [
    { name: 'Feature delivery', weight: 30, target: 12, unit: 'feature' },
    { name: 'Bug resolution rate', weight: 25, target: 90, unit: '%' },
    { name: 'Code review participation', weight: 20, target: 20, unit: 'PR' },
    { name: 'System uptime', weight: 25, target: 99, unit: '%' },
  ],
  'Phòng Kế toán': [
    { name: 'Báo cáo đúng hạn', weight: 30, target: 15, unit: 'báo cáo' },
    { name: 'Độ chính xác sổ sách', weight: 30, target: 98, unit: '%' },
    { name: 'Xử lý chứng từ', weight: 20, target: 300, unit: 'chứng từ' },
    { name: 'Đối chiếu công nợ', weight: 20, target: 50, unit: 'KH' },
  ],
  'Phòng Nhân sự': [
    { name: 'Tuyển dụng thành công', weight: 30, target: 5, unit: 'người' },
    { name: 'Đào tạo hoàn thành', weight: 25, target: 8, unit: 'khóa' },
    { name: 'Employee satisfaction', weight: 25, target: 80, unit: '%' },
    { name: 'Thời gian xử lý đơn', weight: 20, target: 2, unit: 'ngày' },
  ],
  'Phòng Hành chính': [
    { name: 'Xử lý hồ sơ đúng hạn', weight: 30, target: 50, unit: 'hồ sơ' },
    { name: 'Tiết kiệm chi phí VP', weight: 25, target: 10, unit: '%' },
    { name: 'Sự kiện tổ chức', weight: 25, target: 3, unit: 'sự kiện' },
    { name: 'Bảo trì CSVC', weight: 20, target: 95, unit: '%' },
  ],
  'Phòng Marketing': [
    { name: 'Leads generation', weight: 30, target: 100, unit: 'leads' },
    { name: 'Conversion rate', weight: 25, target: 5, unit: '%' },
    { name: 'Chi phí/lead (CAC)', weight: 25, target: 500_000, unit: 'VND' },
    { name: 'Brand engagement', weight: 20, target: 10_000, unit: 'interactions' },
  ],
};

export function generatePayslip(employeeId: string, month: number, year: number = 2026): PayslipMonth | null {
  const emp = employees.find(e => e.id === employeeId);
  if (!emp || emp.trangThai === 'da_nghi') return null;

  const career = employeeCareers.find(c => c.employeeId === employeeId);
  const baseSalary = career?.currentSalary || 12_000_000;
  const level = getCareerLevel(career?.levelCode || 'L3');
  const seed = parseInt(employeeId) * 100 + month;

  // Seniority allowance: 500k per year of service
  const joinYear = parseInt(emp.ngayVaoLam.split('/')[2]);
  const yearsOfService = Math.max(0, year - joinYear);
  const phuCapThamNien = yearsOfService * 500_000;

  // Thu nhập
  const thuNhap = {
    luongCoBan: baseSalary,
    phuCapAnTrua: 400_000,
    phuCapXangXe: 1_000_000,
    phuCapDienThoai: (career?.levelCode || 'L3') >= 'L5' ? 500_000 : 0,
    phuCapThamNien,
    tongThuNhap: 0,
  };
  thuNhap.tongThuNhap = thuNhap.luongCoBan + thuNhap.phuCapAnTrua + thuNhap.phuCapXangXe + thuNhap.phuCapDienThoai + thuNhap.phuCapThamNien;

  // KPI achievement for this month
  const kpiScore = Math.round(55 + prand(seed, 1) * 40); // 55-95%
  const { tier, rate } = getBonusTier(kpiScore);

  // Thưởng
  const thuongKPI = Math.round(baseSalary * rate * 0.6 / 100_000) * 100_000;
  const thuongPhongBan = Math.round(baseSalary * rate * 0.25 / 100_000) * 100_000;
  const thuongCongTy = Math.round(baseSalary * rate * 0.15 / 100_000) * 100_000;
  const thuong = {
    thuongKPI,
    kpiAchievement: kpiScore,
    thuongPhongBan,
    thuongCongTy,
    tongThuong: thuongKPI + thuongPhongBan + thuongCongTy,
  };

  // Khấu trừ (based on base salary only, capped at 36M for BHXH)
  const bhxhBase = Math.min(baseSalary, 36_000_000);
  const bhxh = -Math.round(bhxhBase * 0.08);
  const bhyt = -Math.round(bhxhBase * 0.015);
  const bhtn = -Math.round(bhxhBase * 0.01);
  const taxableIncome = thuNhap.tongThuNhap + thuong.tongThuong + bhxh + bhyt + bhtn;
  const thueTNCN = -calculatePIT(taxableIncome);

  const khauTru = {
    bhxh,
    bhyt,
    bhtn,
    thueTNCN,
    tongKhauTru: bhxh + bhyt + bhtn + thueTNCN,
  };

  const thucNhan = thuNhap.tongThuNhap + thuong.tongThuong + khauTru.tongKhauTru;

  // Status based on month
  let trangThai: PayslipMonth['trangThai'] = 'cho_duyet';
  if (month < 3) trangThai = 'da_thanh_toan';
  else if (month === 3) trangThai = 'da_duyet';

  return {
    month: `T${month}/${year}`,
    monthNum: month,
    year,
    employeeId,
    employeeName: emp.name,
    department: emp.phongBan,
    levelCode: career?.levelCode || 'L3',
    chucVu: emp.chucVu,
    thuNhap,
    thuong,
    khauTru,
    thucNhan,
    trangThai,
  };
}

export function generateAllPayslips(month: number, year: number = 2026): PayslipMonth[] {
  return employees
    .filter(e => e.trangThai !== 'da_nghi')
    .map(e => generatePayslip(e.id, month, year))
    .filter((p): p is PayslipMonth => p !== null);
}

export function generateEmployeePayslipHistory(employeeId: string, year: number = 2026): PayslipMonth[] {
  return [1, 2, 3, 4].map(m => generatePayslip(employeeId, m, year)).filter((p): p is PayslipMonth => p !== null);
}

// ============ KPI SCORECARD ============

export function generateEmployeeKPICard(employeeId: string, quarter: string = 'Q2/2026'): EmployeeKPICard | null {
  const emp = employees.find(e => e.id === employeeId);
  if (!emp || emp.trangThai === 'da_nghi') return null;

  const career = employeeCareers.find(c => c.employeeId === employeeId);
  const seed = parseInt(employeeId) * 50;
  const templates = deptKPITemplates[emp.phongBan] || deptKPITemplates['Phòng Hành chính'];

  const kpis: KPIItem[] = templates.map((t, i) => {
    const achievement = Math.round(50 + prand(seed + i, i + 1) * 55); // 50-105%
    const actual = Math.round(t.target * (achievement / 100));

    // Monthly progress (simulate 3 months of the quarter)
    const monthlyProgress = [
      { month: 'T4', value: Math.round(actual * (0.25 + prand(seed, i + 10) * 0.1)) },
      { month: 'T5', value: Math.round(actual * (0.55 + prand(seed, i + 20) * 0.1)) },
      { month: 'T6', value: actual },
    ];

    let status: KPIItem['status'] = 'behind';
    if (achievement >= 100) status = 'exceeded';
    else if (achievement >= 85) status = 'met';
    else if (achievement >= 65) status = 'near';

    return {
      id: `kpi-${employeeId}-${i}`,
      name: t.name,
      weight: t.weight,
      target: t.target,
      actual,
      unit: t.unit,
      achievement,
      monthlyProgress,
      status,
    };
  });

  const totalWeightedScore = Math.round(
    kpis.reduce((s, k) => s + k.achievement * (k.weight / 100), 0)
  );

  const { tier, rate } = getBonusTier(totalWeightedScore);
  const baseSalary = career?.currentSalary || 12_000_000;
  const bonusAmount = Math.round(baseSalary * rate / 100_000) * 100_000;

  return {
    employeeId,
    employeeName: emp.name,
    department: emp.phongBan,
    period: quarter,
    kpis,
    totalWeightedScore,
    bonusTier: tier,
    bonusRate: rate,
    bonusAmount,
  };
}

export function generateAllKPICards(quarter: string = 'Q2/2026'): EmployeeKPICard[] {
  return employees
    .filter(e => e.trangThai !== 'da_nghi')
    .map(e => generateEmployeeKPICard(e.id, quarter))
    .filter((k): k is EmployeeKPICard => k !== null);
}
