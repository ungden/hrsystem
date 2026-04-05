import {
  IncomeStatementMonth,
  BalanceSheet,
  CashFlowMonth,
  FinancialStatements,
  FinancialHealthMetrics,
  DepartmentDetail,
  BusinessMilestone,
} from './financial-types';
import { employees, employeeCareers, departments, formatCurrency } from './mock-data';
import { deptNameToSlug } from './department-utils';

// Deterministic pseudo-random
function prand(seed: number, n: number): number {
  return ((seed * 17 + n * 31 + seed * n * 7) % 1000) / 1000;
}

// ============ INCOME STATEMENT GENERATOR ============

const months = ['T4/2025', 'T5/2025', 'T6/2025', 'T7/2025', 'T8/2025', 'T9/2025', 'T10/2025', 'T11/2025', 'T12/2025', 'T1/2026', 'T2/2026', 'T3/2026'];

// Revenue by channel (not department — only Sales/Marketing generate revenue)
const revenueWeights: Record<string, number> = {
  'Sales': 0.55,
  'Marketing': 0.45,
  'Vận hành': 0,
  'Kế toán': 0,
  'Ban Giám đốc': 0,
};

export function generateIncomeStatements(): IncomeStatementMonth[] {
  const activeEmps = employees.filter(e => e.trangThai !== 'da_nghi');
  const totalMonthlySalary = employeeCareers.reduce((s, c) => s + c.currentSalary, 0);
  const baseMonthlyRevenue = Math.round(totalMonthlySalary * 3.5);

  return months.map((month, i) => {
    const seed = i + 100;
    // Revenue grows slightly month over month with seasonal variation
    const seasonalFactor = 1 + (Math.sin(i * 0.8) * 0.08);
    const growthFactor = 1 + (i * 0.015); // 1.5% monthly growth
    const monthRevenue = Math.round(baseMonthlyRevenue * seasonalFactor * growthFactor);

    const doanhThu = {
      kinhdoanh: Math.round(monthRevenue * (0.45 + prand(seed, 1) * 0.05)),
      marketing: Math.round(monthRevenue * (0.20 + prand(seed, 2) * 0.03)),
      cntt: Math.round(monthRevenue * (0.18 + prand(seed, 3) * 0.02)),
      khac: Math.round(monthRevenue * (0.08 + prand(seed, 4) * 0.02)),
      tongDoanhThu: 0,
    };
    doanhThu.tongDoanhThu = doanhThu.kinhdoanh + doanhThu.marketing + doanhThu.cntt + doanhThu.khac;

    // HR costs from real salary data + allowances
    const nhanSuCost = totalMonthlySalary + (activeEmps.length * 1_400_000); // salary + allowances
    const insuranceCost = Math.round(totalMonthlySalary * 0.08);

    const chiPhi = {
      nhanSu: nhanSuCost,
      vanPhong: Math.round(doanhThu.tongDoanhThu * (0.06 + prand(seed, 5) * 0.02)),
      thietBi: Math.round(doanhThu.tongDoanhThu * 0.03),
      marketingChi: Math.round(doanhThu.tongDoanhThu * (0.04 + prand(seed, 6) * 0.02)),
      baoHiem: insuranceCost,
      khac: Math.round(doanhThu.tongDoanhThu * (0.02 + prand(seed, 7) * 0.01)),
      tongChiPhi: 0,
    };
    chiPhi.tongChiPhi = chiPhi.nhanSu + chiPhi.vanPhong + chiPhi.thietBi + chiPhi.marketingChi + chiPhi.baoHiem + chiPhi.khac;

    const ebitda = doanhThu.tongDoanhThu - chiPhi.tongChiPhi;
    const khauHao = Math.round(doanhThu.tongDoanhThu * 0.02);
    const loiNhuanTruocThue = ebitda - khauHao;
    const thueDoanhNghiep = loiNhuanTruocThue > 0 ? Math.round(loiNhuanTruocThue * 0.20) : 0;
    const loiNhuanSauThue = loiNhuanTruocThue - thueDoanhNghiep;

    // Budget (slightly higher targets)
    const nganSachDoanhThu = Math.round(doanhThu.tongDoanhThu * (1.05 + prand(seed, 8) * 0.05));
    const nganSachChiPhi = Math.round(chiPhi.tongChiPhi * 0.95);
    const nganSachLoiNhuan = nganSachDoanhThu - nganSachChiPhi;

    return {
      month,
      doanhThu,
      chiPhi,
      ebitda,
      khauHao,
      loiNhuanTruocThue,
      thueDoanhNghiep,
      loiNhuanSauThue,
      nganSachDoanhThu,
      nganSachChiPhi,
      nganSachLoiNhuan,
    };
  });
}

// ============ BALANCE SHEET GENERATOR ============

export function generateBalanceSheet(incomeStatements: IncomeStatementMonth[]): BalanceSheet {
  const totalRevenue = incomeStatements.reduce((s, m) => s + m.doanhThu.tongDoanhThu, 0);
  const totalProfit = incomeStatements.reduce((s, m) => s + m.loiNhuanSauThue, 0);
  const lastMonth = incomeStatements[incomeStatements.length - 1];

  // Current Assets
  const tienMat = Math.round(totalRevenue * 0.08 + totalProfit * 0.3);
  const phaiThu = Math.round(lastMonth.doanhThu.tongDoanhThu * 0.35); // ~35% of monthly revenue
  const hangTonKho = Math.round(totalRevenue * 0.01);
  const chiPhiTraTruoc = Math.round(lastMonth.chiPhi.vanPhong * 2);
  const tongNganHan = tienMat + phaiThu + hangTonKho + chiPhiTraTruoc;

  // Non-current Assets
  const taiSanCoDinh = Math.round(totalRevenue * 0.15);
  const khauHaoLuyKe = -Math.round(taiSanCoDinh * 0.3);
  const taiSanVoHinh = Math.round(totalRevenue * 0.03);
  const tongDaiHan = taiSanCoDinh + khauHaoLuyKe + taiSanVoHinh;

  const tongTaiSan = tongNganHan + tongDaiHan;

  // Liabilities
  const phaiTraNganHan = Math.round(lastMonth.chiPhi.tongChiPhi * 0.25);
  const luongPhaiTra = Math.round(lastMonth.chiPhi.nhanSu * 0.5);
  const thuePhaiNop = Math.round(lastMonth.thueDoanhNghiep * 2);
  const vayNganHan = Math.round(totalRevenue * 0.02);
  const vayDaiHan = Math.round(totalRevenue * 0.08);
  const tongNoPhaiTra = phaiTraNganHan + luongPhaiTra + thuePhaiNop + vayNganHan + vayDaiHan;

  // Equity = Assets - Liabilities (guarantees balance)
  const vonDieuLe = 5_000_000_000; // 5 billion VND charter capital
  const loiNhuanGiuLai = tongTaiSan - tongNoPhaiTra - vonDieuLe;
  const tongVon = vonDieuLe + loiNhuanGiuLai;
  const tongNguonVon = tongNoPhaiTra + tongVon;

  return {
    month: lastMonth.month,
    data: {
      taiSanNganHan: { tienMat, phaiThu, hangTonKho, chiPhiTraTruoc, tongNganHan },
      taiSanDaiHan: { taiSanCoDinh, khauHaoLuyKe, taiSanVoHinh, tongDaiHan },
      tongTaiSan,
      noPhaiTra: { phaiTraNganHan, luongPhaiTra, thuePhaiNop, vayNganHan, vayDaiHan, tongNoPhaiTra },
      vonChuSoHuu: { vonDieuLe, loiNhuanGiuLai, tongVon },
      tongNguonVon,
    },
  };
}

// ============ CASH FLOW GENERATOR ============

export function generateCashFlows(incomeStatements: IncomeStatementMonth[]): CashFlowMonth[] {
  let soDu = 800_000_000; // Starting cash: 800M VND

  return incomeStatements.map((pnl, i) => {
    const seed = i + 200;
    const soDuDauKy = soDu;

    // Operating activities
    const thuTuDoanhThu = Math.round(pnl.doanhThu.tongDoanhThu * (0.85 + prand(seed, 1) * 0.10)); // 85-95% collected
    const chiLuong = -pnl.chiPhi.nhanSu;
    const chiHoatDong = -(pnl.chiPhi.vanPhong + pnl.chiPhi.thietBi + pnl.chiPhi.marketingChi + pnl.chiPhi.khac);
    const chiThue = -pnl.thueDoanhNghiep;
    const dongTienKinhDoanh = thuTuDoanhThu + chiLuong + chiHoatDong + chiThue;

    // Investing activities
    const muaThietBi = i % 3 === 0 ? -Math.round(pnl.doanhThu.tongDoanhThu * 0.05) : 0;
    const dongTienDauTu = muaThietBi;

    // Financing activities
    const vayMoi = i === 0 ? 200_000_000 : 0;
    const traNo = -Math.round(15_000_000 + prand(seed, 3) * 5_000_000);
    const dongTienTaiChinh = vayMoi + traNo;

    const dongTienRong = dongTienKinhDoanh + dongTienDauTu + dongTienTaiChinh;
    const soDuCuoiKy = soDuDauKy + dongTienRong;
    soDu = soDuCuoiKy;

    return {
      month: pnl.month,
      hoatDongKinhDoanh: { thuTuDoanhThu, chiLuong, chiHoatDong, chiThue, dongTienKinhDoanh },
      hoatDongDauTu: { muaThietBi, dongTienDauTu },
      hoatDongTaiChinh: { vayMoi, traNo, dongTienTaiChinh },
      dongTienRong,
      soDuDauKy,
      soDuCuoiKy,
    };
  });
}

// ============ FINANCIAL HEALTH METRICS ============

export function calculateFinancialHealth(
  incomeStatements: IncomeStatementMonth[],
  balanceSheet: BalanceSheet
): FinancialHealthMetrics {
  const bs = balanceSheet.data;
  const lastPnL = incomeStatements[incomeStatements.length - 1];
  const prevPnL = incomeStatements.length > 1 ? incomeStatements[incomeStatements.length - 2] : lastPnL;

  const currentLiabilities = bs.noPhaiTra.phaiTraNganHan + bs.noPhaiTra.luongPhaiTra + bs.noPhaiTra.thuePhaiNop + bs.noPhaiTra.vayNganHan;

  return {
    currentRatio: currentLiabilities > 0 ? Math.round((bs.taiSanNganHan.tongNganHan / currentLiabilities) * 100) / 100 : 0,
    debtToEquity: bs.vonChuSoHuu.tongVon > 0 ? Math.round((bs.noPhaiTra.tongNoPhaiTra / bs.vonChuSoHuu.tongVon) * 100) / 100 : 0,
    profitMargin: lastPnL.doanhThu.tongDoanhThu > 0 ? Math.round((lastPnL.loiNhuanSauThue / lastPnL.doanhThu.tongDoanhThu) * 100) : 0,
    operatingMargin: lastPnL.doanhThu.tongDoanhThu > 0 ? Math.round((lastPnL.ebitda / lastPnL.doanhThu.tongDoanhThu) * 100) : 0,
    revenueGrowth: prevPnL.doanhThu.tongDoanhThu > 0
      ? Math.round(((lastPnL.doanhThu.tongDoanhThu - prevPnL.doanhThu.tongDoanhThu) / prevPnL.doanhThu.tongDoanhThu) * 100)
      : 0,
    burnRate: lastPnL.chiPhi.tongChiPhi,
  };
}

// ============ DEPARTMENT DETAIL GENERATOR ============

export function generateDepartmentDetails(
  costProjections: { department: string; headcount: number; totalCost: number; totalBaseSalary: number; projectedBonusPool: number }[],
  individualPlans: { employeeId: string; status: string; departmentGoalId: string; targetValue: number; currentValue: number }[],
  departmentGoals: { id: string; department: string; name: string; targetValue: number; currentValue: number; unit: string }[]
): DepartmentDetail[] {
  const activeEmps = employees.filter(e => e.trangThai !== 'da_nghi');

  return departments.map(dept => {
    const deptEmps = activeEmps.filter(e => e.phongBan === dept);
    const head = deptEmps.find(e => e.chucVu === 'Trưởng phòng');
    const costProj = costProjections.find(c => c.department === dept);
    const deptGoals = departmentGoals.filter(g => g.department === dept);
    const deptPlans = individualPlans.filter(p => {
      const emp = activeEmps.find(e => e.id === p.employeeId);
      return emp?.phongBan === dept;
    });

    const completedPlans = deptPlans.filter(p => p.status === 'completed').length;
    const taskCompletion = deptPlans.length > 0 ? Math.round((completedPlans / deptPlans.length) * 100) : 0;

    // Avg KPI from employee careers
    const deptCareers = employeeCareers.filter(c => deptEmps.some(e => e.id === c.employeeId));
    const avgKPI = deptCareers.length > 0
      ? Math.round(deptCareers.reduce((s, c) => {
          const last = c.performanceHistory.slice(-1)[0];
          return s + (last?.kpiScore || 60);
        }, 0) / deptCareers.length)
      : 60;

    const totalMonthlySalary = employeeCareers.reduce((s, c) => s + c.currentSalary, 0);
    const baseRevenue = Math.round(totalMonthlySalary * 3.5);
    const revWeight = revenueWeights[dept] || 0.05;
    const revenueContribution = Math.round(baseRevenue * revWeight);
    const deptCost = costProj?.totalCost || 0;
    const contributionMargin = revenueContribution > 0
      ? Math.round(((revenueContribution - deptCost) / revenueContribution) * 100)
      : 0;

    const kpiMetrics = deptGoals.slice(0, 4).map(g => ({
      name: g.name.split(':').pop()?.trim() || g.name,
      value: g.currentValue,
      target: g.targetValue,
      unit: g.unit,
    }));

    return {
      department: dept,
      slug: deptNameToSlug[dept] || '',
      headName: head?.name || 'N/A',
      headId: head?.id || '',
      headcount: deptEmps.length,
      avgKPI,
      taskCompletion,
      totalCost: deptCost,
      revenueContribution,
      contributionMargin,
      kpiMetrics,
    };
  });
}

// ============ BUSINESS MILESTONES ============

export function generateMilestones(): BusinessMilestone[] {
  return [
    { id: 'ms-1', date: '01/04/2025', title: 'Khởi động năm tài chính', description: 'Bắt đầu năm tài chính mới, thiết lập mục tiêu và ngân sách', type: 'milestone', agentRole: 'ceo' },
    { id: 'ms-2', date: '15/05/2025', title: 'Đạt 100 khách hàng', description: 'Phòng Kinh doanh đạt mốc 100 khách hàng hoạt động', type: 'achievement', agentRole: 'dept_manager' },
    { id: 'ms-3', date: '01/07/2025', title: 'Review giữa năm', description: 'Đánh giá hiệu suất nửa đầu năm, điều chỉnh chiến lược Q3-Q4', type: 'milestone', agentRole: 'hr_director' },
    { id: 'ms-4', date: '20/08/2025', title: 'Ra mắt sản phẩm mới', description: 'Phòng CNTT hoàn thành và triển khai tính năng mới', type: 'achievement', agentRole: 'dept_manager' },
    { id: 'ms-5', date: '01/10/2025', title: 'Đánh giá KPI Q3', description: 'CEO và HR Director review KPI toàn bộ nhân sự Q3/2025', type: 'milestone', agentRole: 'performance_coach' },
    { id: 'ms-6', date: '15/11/2025', title: 'Cảnh báo chi phí vượt ngân sách', description: 'CFO phát hiện chi phí marketing vượt 12% so với kế hoạch', type: 'alert', agentRole: 'finance' },
    { id: 'ms-7', date: '01/01/2026', title: 'Bắt đầu năm mới 2026', description: 'Cập nhật mục tiêu kinh doanh và kế hoạch tuyển dụng', type: 'milestone', agentRole: 'ceo' },
    { id: 'ms-8', date: '15/02/2026', title: 'Tuyển dụng 2 nhân sự CNTT', description: 'Hoàn thành tuyển dụng bổ sung nhân sự cho dự án mới', type: 'achievement', agentRole: 'hr_director' },
    { id: 'ms-9', date: '01/04/2026', title: 'Kế hoạch Q2/2026', description: 'AI Agents thiết lập mục tiêu và phân bổ nhiệm vụ Q2', type: 'plan', agentRole: 'ceo' },
    { id: 'ms-10', date: '30/06/2026', title: 'Mục tiêu doanh thu Q2', description: 'Deadline hoàn thành mục tiêu doanh thu quý 2', type: 'plan', agentRole: 'ceo' },
  ];
}

// ============ AGGREGATE GENERATOR ============

export function generateAllFinancials(): FinancialStatements {
  const incomeStatements = generateIncomeStatements();
  const balanceSheet = generateBalanceSheet(incomeStatements);
  const cashFlows = generateCashFlows(incomeStatements);
  return { incomeStatements, balanceSheet, cashFlows };
}
