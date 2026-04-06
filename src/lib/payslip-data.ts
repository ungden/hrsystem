import { PayslipMonth, EmployeeKPICard, KPIItem } from './cascade-types';
import {
  getEmployees,
  getEmployeeCareers,
  getCareerLevel,
  getPayrolls,
  getPerformanceRatings,
  getFinanceSettings,
} from '@/lib/supabase-data';
import { formatCurrency } from './format';

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

// Bonus tier calculation — uses finance_settings bonus_tiers if available, else defaults
function getBonusTier(kpiScore: number, bonusTiers?: { min: number; tier: string; rate: number }[]): { tier: string; rate: number } {
  if (bonusTiers && bonusTiers.length > 0) {
    // Sort descending by min threshold
    const sorted = [...bonusTiers].sort((a, b) => b.min - a.min);
    for (const t of sorted) {
      if (kpiScore >= t.min) return { tier: t.tier, rate: t.rate };
    }
    return { tier: sorted[sorted.length - 1].tier, rate: sorted[sorted.length - 1].rate };
  }
  // Default tiers
  if (kpiScore >= 95) return { tier: 'Xuat sac', rate: 0.25 };
  if (kpiScore >= 80) return { tier: 'Gioi', rate: 0.20 };
  if (kpiScore >= 65) return { tier: 'Tot', rate: 0.15 };
  if (kpiScore >= 50) return { tier: 'Dat', rate: 0.10 };
  return { tier: 'Can cai thien', rate: 0.05 };
}

// KPI templates per department (expanded with weights)
const deptKPITemplates: Record<string, { name: string; weight: number; target: number; unit: string }[]> = {
  'Sales': [
    { name: 'Doanh so ban hang', weight: 40, target: 200_000_000, unit: 'VND' },
    { name: 'Khach hang moi', weight: 20, target: 8, unit: 'KH' },
    { name: 'Ty le chot deal', weight: 20, target: 30, unit: '%' },
    { name: 'CSAT khach hang', weight: 20, target: 85, unit: '%' },
  ],
  'Marketing': [
    { name: 'Leads generation', weight: 30, target: 100, unit: 'leads' },
    { name: 'Conversion rate', weight: 25, target: 5, unit: '%' },
    { name: 'Chi phi/lead (CAC)', weight: 25, target: 500_000, unit: 'VND' },
    { name: 'Brand engagement', weight: 20, target: 10_000, unit: 'interactions' },
  ],
  'Ke toan': [
    { name: 'Bao cao dung han', weight: 30, target: 15, unit: 'bao cao' },
    { name: 'Do chinh xac so sach', weight: 30, target: 98, unit: '%' },
    { name: 'Xu ly chung tu', weight: 20, target: 300, unit: 'chung tu' },
    { name: 'Doi chieu cong no', weight: 20, target: 50, unit: 'KH' },
  ],
  'Van hanh': [
    { name: 'San xuat dung tien do', weight: 30, target: 50, unit: 'lo hang' },
    { name: 'Ty le loi san pham', weight: 25, target: 2, unit: '%' },
    { name: 'Quan ly kho hang', weight: 25, target: 95, unit: '%' },
    { name: 'Bao tri thiet bi', weight: 20, target: 95, unit: '%' },
  ],
  'Ban Giam doc': [
    { name: 'Doanh thu tong', weight: 40, target: 2_000_000_000, unit: 'VND' },
    { name: 'Loi nhuan rong', weight: 30, target: 15, unit: '%' },
    { name: 'Tang truong', weight: 15, target: 20, unit: '%' },
    { name: 'Hai long nhan su', weight: 15, target: 80, unit: '%' },
  ],
};

export async function generatePayslip(employeeId: string, month: number, year: number = 2026): Promise<PayslipMonth | null> {
  const [employees, employeeCareers, financeSettings, payrollsData, ratingsData] = await Promise.all([
    getEmployees(),
    getEmployeeCareers(),
    getFinanceSettings().catch((e) => { console.warn('[Payslip] Không load được cài đặt tài chính:', e.message); return null; }),
    getPayrolls(`T${month}/${year}`).catch((e) => { console.warn('[Payslip] Không load được bảng lương:', e.message); return []; }),
    getPerformanceRatings({ employee_id: parseInt(employeeId) }).catch((e) => { console.warn('[Payslip] Không load được đánh giá hiệu suất:', e.message); return []; }),
  ]);

  const emp = employees.find((e: { id: number }) => String(e.id) === employeeId);
  if (!emp || emp.status !== 'Đang làm việc') return null;

  const career = employeeCareers.find((c: { employee_id: number }) => c.employee_id === emp.id);
  const baseSalary = career?.current_salary || 12_000_000;

  // Check if real payroll exists for this employee+month
  const existingPayroll = payrollsData.find((p: { employee_id: number }) => p.employee_id === emp.id);

  // Allowances from finance_settings or defaults
  const phuCapAnTrua = (financeSettings?.lunch_allowance || 400_000) as number;
  const phuCapXangXe = (financeSettings?.fuel_allowance || 1_000_000) as number;
  const phuCapDienThoai = parseInt((career?.level_code || 'L3').replace('L', '')) >= 5
    ? ((financeSettings?.phone_allowance || 500_000) as number)
    : 0;

  // Seniority from career data
  const levelStartDate = career?.level_start_date ? new Date(career.level_start_date) : new Date(2024, 0, 1);
  const now = new Date(year, month - 1, 1);
  const yearsOfService = Math.max(1, Math.floor((now.getTime() - levelStartDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)));
  const phuCapThamNien = yearsOfService * 500_000;

  // If real payroll exists, use its data
  if (existingPayroll) {
    const thuNhap = {
      luongCoBan: existingPayroll.base_salary || baseSalary,
      phuCapAnTrua,
      phuCapXangXe,
      phuCapDienThoai,
      phuCapThamNien,
      tongThuNhap: (existingPayroll.gross_salary || 0) as number,
    };
    // Recalculate tongThuNhap if gross_salary seems off
    if (thuNhap.tongThuNhap === 0) {
      thuNhap.tongThuNhap = thuNhap.luongCoBan + thuNhap.phuCapAnTrua + thuNhap.phuCapXangXe + thuNhap.phuCapDienThoai + thuNhap.phuCapThamNien;
    }

    // KPI from real performance ratings
    const latestRating = ratingsData.length > 0 ? ratingsData[ratingsData.length - 1] : null;
    const kpiScore = latestRating?.kpi_score || 70;
    const bonusTiers = financeSettings?.bonus_tiers as { min: number; tier: string; rate: number }[] | undefined;
    const { tier, rate } = getBonusTier(kpiScore, bonusTiers);

    const thuongKPI = existingPayroll.bonus_kpi || Math.round(baseSalary * rate * 0.6 / 100_000) * 100_000;
    const thuongPhongBan = existingPayroll.bonus_dept || Math.round(baseSalary * rate * 0.25 / 100_000) * 100_000;
    const thuongCongTy = existingPayroll.bonus_company || Math.round(baseSalary * rate * 0.15 / 100_000) * 100_000;

    const thuong = {
      thuongKPI,
      kpiAchievement: kpiScore,
      thuongPhongBan,
      thuongCongTy,
      tongThuong: thuongKPI + thuongPhongBan + thuongCongTy,
    };

    const khauTru = {
      bhxh: -(existingPayroll.bhxh || Math.round(Math.min(baseSalary, 36_000_000) * 0.08)),
      bhyt: -(existingPayroll.bhyt || Math.round(Math.min(baseSalary, 36_000_000) * 0.015)),
      bhtn: -(existingPayroll.bhtn || Math.round(Math.min(baseSalary, 36_000_000) * 0.01)),
      thueTNCN: -(existingPayroll.pit || 0),
      tongKhauTru: 0,
    };
    khauTru.tongKhauTru = khauTru.bhxh + khauTru.bhyt + khauTru.bhtn + khauTru.thueTNCN;

    const thucNhan = existingPayroll.net_salary || (thuNhap.tongThuNhap + thuong.tongThuong + khauTru.tongKhauTru);

    let trangThai: PayslipMonth['trangThai'] = 'cho_duyet';
    if (existingPayroll.status === 'paid') trangThai = 'da_thanh_toan';
    else if (existingPayroll.status === 'approved') trangThai = 'da_duyet';

    return {
      month: `T${month}/${year}`,
      monthNum: month,
      year,
      employeeId,
      employeeName: emp.name,
      department: emp.department,
      levelCode: career?.level_code || 'L3',
      chucVu: emp.role,
      thuNhap,
      thuong,
      khauTru,
      thucNhan,
      trangThai,
    };
  }

  // No payroll record: compute from career salary + finance_settings rates
  const thuNhap = {
    luongCoBan: baseSalary,
    phuCapAnTrua,
    phuCapXangXe,
    phuCapDienThoai,
    phuCapThamNien,
    tongThuNhap: 0,
  };
  thuNhap.tongThuNhap = thuNhap.luongCoBan + thuNhap.phuCapAnTrua + thuNhap.phuCapXangXe + thuNhap.phuCapDienThoai + thuNhap.phuCapThamNien;

  // KPI from real performance ratings
  const latestRating = ratingsData.length > 0 ? ratingsData[ratingsData.length - 1] : null;
  const kpiScore = latestRating?.kpi_score || 70;
  const bonusTiers = financeSettings?.bonus_tiers as { min: number; tier: string; rate: number }[] | undefined;
  const { tier, rate } = getBonusTier(kpiScore, bonusTiers);

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

  // Deductions based on base salary only, capped at 36M for BHXH
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

  // Status based on month relative to current
  let trangThai: PayslipMonth['trangThai'] = 'cho_duyet';
  if (month < 3) trangThai = 'da_thanh_toan';
  else if (month === 3) trangThai = 'da_duyet';

  return {
    month: `T${month}/${year}`,
    monthNum: month,
    year,
    employeeId,
    employeeName: emp.name,
    department: emp.department,
    levelCode: career?.level_code || 'L3',
    chucVu: emp.role,
    thuNhap,
    thuong,
    khauTru,
    thucNhan,
    trangThai,
  };
}

export async function generateAllPayslips(month: number, year: number = 2026): Promise<PayslipMonth[]> {
  const employees = await getEmployees();
  const results = await Promise.all(
    employees
      .filter((e: { status: string }) => e.status === 'Đang làm việc')
      .map((e: { id: number }) => generatePayslip(String(e.id), month, year))
  );
  return results.filter((p): p is PayslipMonth => p !== null);
}

export async function generateEmployeePayslipHistory(employeeId: string, year: number = 2026): Promise<PayslipMonth[]> {
  const results = await Promise.all([1, 2, 3, 4].map(m => generatePayslip(employeeId, m, year)));
  return results.filter((p): p is PayslipMonth => p !== null);
}

// ============ KPI SCORECARD ============

export async function generateEmployeeKPICard(employeeId: string, quarter: string = 'Q2/2026'): Promise<EmployeeKPICard | null> {
  const [employees, employeeCareers, ratingsData, financeSettings] = await Promise.all([
    getEmployees(),
    getEmployeeCareers(),
    getPerformanceRatings({ employee_id: parseInt(employeeId) }).catch((e) => { console.warn('[Payslip] Không load được đánh giá hiệu suất cho KPI:', e.message); return []; }),
    getFinanceSettings().catch((e) => { console.warn('[Payslip] Không load được cài đặt tài chính cho KPI:', e.message); return null; }),
  ]);

  const emp = employees.find((e: { id: number }) => String(e.id) === employeeId);
  if (!emp || emp.status !== 'Đang làm việc') return null;

  const career = employeeCareers.find((c: { employee_id: number }) => c.employee_id === emp.id);
  const templates = deptKPITemplates[emp.department] || deptKPITemplates['Ban Giam doc'];

  // Get latest rating for this employee
  const latestRating = ratingsData.length > 0 ? ratingsData[ratingsData.length - 1] : null;
  const overallKpiScore = latestRating?.kpi_score || 70;

  const kpis: KPIItem[] = templates.map((t, i) => {
    // Distribute overall KPI score across individual KPIs with slight variance
    const variance = (i % 2 === 0 ? 5 : -3);
    const achievement = Math.min(120, Math.max(30, overallKpiScore + variance));
    const actual = Math.round(t.target * (achievement / 100));

    // Extract quarter number for monthly progress
    const qNum = parseInt(quarter.replace('Q', ''));
    const monthStart = (qNum - 1) * 3 + 1;
    const monthlyProgress = [
      { month: `T${monthStart}`, value: Math.round(actual * 0.30) },
      { month: `T${monthStart + 1}`, value: Math.round(actual * 0.65) },
      { month: `T${monthStart + 2}`, value: actual },
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

  const bonusTiers = financeSettings?.bonus_tiers as { min: number; tier: string; rate: number }[] | undefined;
  const { tier, rate } = getBonusTier(totalWeightedScore, bonusTiers);
  const baseSalary = career?.current_salary || 12_000_000;
  const bonusAmount = Math.round(baseSalary * rate / 100_000) * 100_000;

  return {
    employeeId,
    employeeName: emp.name,
    department: emp.department,
    period: quarter,
    kpis,
    totalWeightedScore,
    bonusTier: tier,
    bonusRate: rate,
    bonusAmount,
  };
}

export async function generateAllKPICards(quarter: string = 'Q2/2026'): Promise<EmployeeKPICard[]> {
  const employees = await getEmployees();
  const results = await Promise.all(
    employees
      .filter((e: { status: string }) => e.status === 'Đang làm việc')
      .map((e: { id: number }) => generateEmployeeKPICard(String(e.id), quarter))
  );
  return results.filter((k): k is EmployeeKPICard => k !== null);
}
