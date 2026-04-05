// ============ FINANCIAL STATEMENTS TYPES ============

export interface RevenueBreakdown {
  kinhdoanh: number;
  marketing: number;
  cntt: number;
  khac: number;
  tongDoanhThu: number;
}

export interface ExpenseBreakdown {
  nhanSu: number;
  vanPhong: number;
  thietBi: number;
  marketingChi: number;
  baoHiem: number;
  khac: number;
  tongChiPhi: number;
}

export interface IncomeStatementMonth {
  month: string; // "T1/2026"
  doanhThu: RevenueBreakdown;
  chiPhi: ExpenseBreakdown;
  ebitda: number;
  khauHao: number;
  loiNhuanTruocThue: number;
  thueDoanhNghiep: number;
  loiNhuanSauThue: number;
  // Budget for comparison
  nganSachDoanhThu: number;
  nganSachChiPhi: number;
  nganSachLoiNhuan: number;
}

export interface BalanceSheetSection {
  taiSanNganHan: {
    tienMat: number;
    phaiThu: number;
    hangTonKho: number;
    chiPhiTraTruoc: number;
    tongNganHan: number;
  };
  taiSanDaiHan: {
    taiSanCoDinh: number;
    khauHaoLuyKe: number;
    taiSanVoHinh: number;
    tongDaiHan: number;
  };
  tongTaiSan: number;
  noPhaiTra: {
    phaiTraNganHan: number;
    luongPhaiTra: number;
    thuePhaiNop: number;
    vayNganHan: number;
    vayDaiHan: number;
    tongNoPhaiTra: number;
  };
  vonChuSoHuu: {
    vonDieuLe: number;
    loiNhuanGiuLai: number;
    tongVon: number;
  };
  tongNguonVon: number;
}

export interface BalanceSheet {
  month: string;
  data: BalanceSheetSection;
}

export interface CashFlowMonth {
  month: string;
  hoatDongKinhDoanh: {
    thuTuDoanhThu: number;
    chiLuong: number;
    chiHoatDong: number;
    chiThue: number;
    dongTienKinhDoanh: number;
  };
  hoatDongDauTu: {
    muaThietBi: number;
    dongTienDauTu: number;
  };
  hoatDongTaiChinh: {
    vayMoi: number;
    traNo: number;
    dongTienTaiChinh: number;
  };
  dongTienRong: number;
  soDuDauKy: number;
  soDuCuoiKy: number;
}

export interface FinancialStatements {
  incomeStatements: IncomeStatementMonth[];
  balanceSheet: BalanceSheet;
  cashFlows: CashFlowMonth[];
}

export interface FinancialHealthMetrics {
  currentRatio: number;       // Current Assets / Current Liabilities
  debtToEquity: number;       // Total Debt / Equity
  profitMargin: number;       // Net Profit / Revenue %
  operatingMargin: number;    // EBITDA / Revenue %
  revenueGrowth: number;      // MoM %
  burnRate: number;           // Monthly cash burn
}

export interface DepartmentDetail {
  department: string;
  slug: string;
  headName: string;
  headId: string;
  headcount: number;
  avgKPI: number;
  taskCompletion: number;
  totalCost: number;
  revenueContribution: number;
  contributionMargin: number;
  kpiMetrics: { name: string; value: number; target: number; unit: string }[];
}

export interface BusinessMilestone {
  id: string;
  date: string;
  title: string;
  description: string;
  type: 'achievement' | 'plan' | 'alert' | 'milestone';
  agentRole: string;
}
