import {
  IncomeStatementMonth,
  BalanceSheet,
  CashFlowMonth,
  FinancialStatements,
  FinancialHealthMetrics,
  DepartmentDetail,
  BusinessMilestone,
} from './financial-types';
import {
  getEmployees,
  getEmployeeCareers,
  getMonthlyPnL,
  getReceivables,
  getPayables,
  getPayrolls,
  getInventory,
  getFinanceSettings,
  getChannelEconomics,
  getTasks,
  getPerformanceRatings,
  getMasterPlans,
} from '@/lib/supabase-data';
import { formatCurrency } from './format';
import { deptNameToSlug } from './department-utils';

// ============ INCOME STATEMENT GENERATOR ============

export async function generateIncomeStatements(): Promise<IncomeStatementMonth[]> {
  const pnlData = await getMonthlyPnL();

  if (!pnlData || pnlData.length === 0) {
    return [];
  }

  return pnlData.map((m: Record<string, number | string>) => {
    const revenueKinhDoanh = (m.revenue_shopee || 0) as number + ((m.revenue_b2b || 0) as number);
    const revenueMarketing = ((m.revenue_website || 0) as number) + ((m.revenue_fbig || 0) as number) + ((m.revenue_tiktok || 0) as number);
    const totalRevenue = (m.total_revenue || 0) as number;
    const remainder = Math.max(0, totalRevenue - revenueKinhDoanh - revenueMarketing);

    const doanhThu = {
      kinhdoanh: revenueKinhDoanh,
      marketing: revenueMarketing,
      cntt: 0,
      khac: remainder,
      tongDoanhThu: totalRevenue,
    };

    const expenseHR = (m.expense_hr || 0) as number;
    const expenseRent = (m.expense_rent || 0) as number;
    const expenseTools = (m.expense_tools || 0) as number;
    const expenseAds = (m.expense_ads || 0) as number;
    const expensePlatformFees = (m.expense_platform_fees || 0) as number;
    const expenseShipping = (m.expense_shipping || 0) as number;
    const expenseOther = (m.expense_other || 0) as number;
    const totalExpenses = (m.total_expenses || 0) as number;

    const chiPhi = {
      nhanSu: expenseHR,
      vanPhong: expenseRent,
      thietBi: expenseTools,
      marketingChi: expenseAds + expensePlatformFees,
      baoHiem: expenseShipping,
      khac: expenseOther,
      tongChiPhi: totalExpenses,
    };

    const ebitda = (m.ebitda || 0) as number;
    const khauHao = 0;
    const loiNhuanTruocThue = ebitda;
    const thueDoanhNghiep = (m.tax_cit || 0) as number;
    const loiNhuanSauThue = (m.net_profit || 0) as number;

    const nganSachDoanhThu = Math.round(totalRevenue * 1.1);
    const nganSachChiPhi = totalExpenses;
    const nganSachLoiNhuan = nganSachDoanhThu - nganSachChiPhi;

    return {
      month: `${m.month}/${m.year}`,
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

export async function generateBalanceSheet(incomeStatements?: IncomeStatementMonth[]): Promise<BalanceSheet> {
  const [receivables, payables, payrolls, inventory, financeSettings, pnlData] = await Promise.all([
    getReceivables(),
    getPayables(),
    getPayrolls(),
    getInventory(),
    getFinanceSettings().catch((e) => { console.warn('[Finance] Không load được cài đặt tài chính:', e.message); return null; }),
    incomeStatements ? Promise.resolve(null) : getMonthlyPnL(),
  ]);

  // If no income statements provided, build month label from pnl
  const statements = incomeStatements || [];
  const lastMonth = statements.length > 0 ? statements[statements.length - 1].month : 'T4/2026';

  // Cumulative net profit from income statements or PnL data
  const cumulativeNetProfit = statements.length > 0
    ? statements.reduce((s, m) => s + m.loiNhuanSauThue, 0)
    : (pnlData || []).reduce((s: number, m: { net_profit: number }) => s + (m.net_profit || 0), 0);

  // Assets
  const phaiThu = receivables.reduce((s: number, r: { amount: number }) => s + (r.amount || 0), 0);
  const hangTonKho = inventory.reduce((s: number, item: { current_stock: number; unit_cost?: number }) => {
    return s + (item.current_stock || 0) * (item.unit_cost || 0);
  }, 0);

  const vonDieuLe = (financeSettings?.charter_capital || 5_000_000_000) as number;
  const loiNhuanGiuLai = cumulativeNetProfit;

  // Derive cash from equity + liabilities structure
  const tienMat = Math.max(0, Math.round(cumulativeNetProfit * 0.4 + vonDieuLe * 0.1));
  const chiPhiTraTruoc = Math.round(tienMat * 0.05);
  const tongNganHan = tienMat + phaiThu + hangTonKho + chiPhiTraTruoc;

  // Non-current assets (simplified -- Teeworld is small)
  const taiSanCoDinh = Math.round(vonDieuLe * 0.3);
  const khauHaoLuyKe = -Math.round(taiSanCoDinh * 0.2);
  const taiSanVoHinh = 0;
  const tongDaiHan = taiSanCoDinh + khauHaoLuyKe + taiSanVoHinh;

  const tongTaiSan = tongNganHan + tongDaiHan;

  // Liabilities
  const phaiTraNganHan = payables.reduce((s: number, p: { amount: number }) => s + (p.amount || 0), 0);
  const luongPhaiTra = payrolls
    .filter((p: { status: string }) => p.status !== 'paid')
    .reduce((s: number, p: { net_salary: number }) => s + (p.net_salary || 0), 0);
  const thuePhaiNop = statements.length > 0 ? statements[statements.length - 1].thueDoanhNghiep : 0;
  const vayNganHan = 0;
  const vayDaiHan = 0;
  const tongNoPhaiTra = phaiTraNganHan + luongPhaiTra + thuePhaiNop + vayNganHan + vayDaiHan;

  // Equity = Assets - Liabilities (force balance)
  const tongVon = tongTaiSan - tongNoPhaiTra;
  const adjustedLoiNhuanGiuLai = tongVon - vonDieuLe;
  const tongNguonVon = tongNoPhaiTra + tongVon;

  return {
    month: lastMonth,
    data: {
      taiSanNganHan: { tienMat, phaiThu, hangTonKho, chiPhiTraTruoc, tongNganHan },
      taiSanDaiHan: { taiSanCoDinh, khauHaoLuyKe, taiSanVoHinh, tongDaiHan },
      tongTaiSan,
      noPhaiTra: { phaiTraNganHan, luongPhaiTra, thuePhaiNop, vayNganHan, vayDaiHan, tongNoPhaiTra },
      vonChuSoHuu: { vonDieuLe, loiNhuanGiuLai: adjustedLoiNhuanGiuLai, tongVon },
      tongNguonVon,
    },
  };
}

// ============ CASH FLOW GENERATOR ============

export async function generateCashFlows(incomeStatements?: IncomeStatementMonth[]): Promise<CashFlowMonth[]> {
  const statements = incomeStatements || (await generateIncomeStatements());
  const financeSettings = await getFinanceSettings().catch((e) => { console.warn('[Finance] Không load được cài đặt tài chính cho cash flow:', e.message); return null; });
  const collectionRate = (financeSettings?.collection_rate || 0.9) as number;

  let soDu = 800_000_000; // Starting cash: 800M VND

  return statements.map((pnl, i) => {
    const soDuDauKy = soDu;

    // Operating activities
    const thuTuDoanhThu = Math.round(pnl.doanhThu.tongDoanhThu * collectionRate);
    const chiLuong = -pnl.chiPhi.nhanSu;
    const chiHoatDong = -(pnl.chiPhi.tongChiPhi - pnl.chiPhi.nhanSu);
    const chiThue = -pnl.thueDoanhNghiep;
    const dongTienKinhDoanh = thuTuDoanhThu + chiLuong + chiHoatDong + chiThue;

    // Investing activities (small equipment purchases every 3 months)
    const muaThietBi = i % 3 === 0 ? -Math.round(pnl.chiPhi.thietBi * 2) : 0;
    const dongTienDauTu = muaThietBi;

    // Financing activities (no major financing for Teeworld)
    const vayMoi = 0;
    const traNo = 0;
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

export async function generateDepartmentDetails(
  costProjections: { department: string; headcount: number; totalCost: number; totalBaseSalary: number; projectedBonusPool: number }[],
  individualPlans: { employeeId: string; status: string; departmentGoalId: string; targetValue: number; currentValue: number }[],
  departmentGoals: { id: string; department: string; name: string; targetValue: number; currentValue: number; unit: string }[]
): Promise<DepartmentDetail[]> {
  const [employees, employeeCareers, tasks, performanceRatings, channelEconomics] = await Promise.all([
    getEmployees(),
    getEmployeeCareers(),
    getTasks(),
    getPerformanceRatings(),
    getChannelEconomics(),
  ]);

  const departments = [...new Set(employees.map((e: { department: string }) => e.department))];
  const activeEmps = employees.filter((e: { status: string }) => e.status === 'Đang làm việc');

  // Channel revenue lookup for department contribution
  const totalChannelRevenue = channelEconomics.reduce((s: number, ch: { monthly_revenue: number }) => s + (ch.monthly_revenue || 0), 0);

  // Revenue weights based on real channel data (Sales = Shopee+B2B, Marketing = Website+FB+TikTok)
  const salesRevenue = channelEconomics
    .filter((ch: { channel_name: string }) => ['Shopee', 'B2B'].some(k => (ch.channel_name || '').includes(k)))
    .reduce((s: number, ch: { monthly_revenue: number }) => s + (ch.monthly_revenue || 0), 0);
  const marketingRevenue = channelEconomics
    .filter((ch: { channel_name: string }) => ['Website', 'Facebook', 'TikTok'].some(k => (ch.channel_name || '').includes(k)))
    .reduce((s: number, ch: { monthly_revenue: number }) => s + (ch.monthly_revenue || 0), 0);

  const revenueByDept: Record<string, number> = {
    'Sales': salesRevenue,
    'Marketing': marketingRevenue,
    'Van hanh': 0,
    'Ke toan': 0,
    'Ban Giam doc': 0,
  };

  return departments.map((dept: string) => {
    const deptEmps = activeEmps.filter((e: { department: string }) => e.department === dept);
    const head = deptEmps.find((e: { role: string }) => e.role.includes('Truong phong') || e.role.includes('CMO') || e.role.includes('CEO') || e.role.includes('Founder'));
    const costProj = costProjections.find(c => c.department === dept);
    const deptGoals = departmentGoals.filter(g => g.department === dept);

    // Real task completion from Supabase tasks
    const deptTasks = tasks.filter((t: { department: string }) => t.department === dept);
    const doneTasks = deptTasks.filter((t: { status: string }) => t.status === 'done').length;
    const taskCompletion = deptTasks.length > 0 ? Math.round((doneTasks / deptTasks.length) * 100) : 0;

    // Real avg KPI from performance_ratings
    const deptEmpIds = deptEmps.map((e: { id: number }) => e.id);
    const deptRatings = performanceRatings.filter((r: { employee_id: number }) => deptEmpIds.includes(r.employee_id));
    const avgKPI = deptRatings.length > 0
      ? Math.round(deptRatings.reduce((s: number, r: { kpi_score: number }) => s + (r.kpi_score || 0), 0) / deptRatings.length)
      : 70;

    const revenueContribution = revenueByDept[dept] || 0;
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
      headId: head ? String(head.id) : '',
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

export async function generateMilestones(): Promise<BusinessMilestone[]> {
  const masterPlans = await getMasterPlans().catch((e) => { console.warn('[Finance] Không load được master plans cho milestones:', e.message); return []; });

  if (masterPlans && masterPlans.length > 0) {
    return masterPlans.map((plan: Record<string, string | number>, idx: number) => {
      const planType = (plan.plan_type || 'milestone') as string;
      let type: BusinessMilestone['type'] = 'milestone';
      if (planType === 'achievement' || planType === 'alert' || planType === 'plan') {
        type = planType as BusinessMilestone['type'];
      }

      return {
        id: String(plan.id || `ms-${idx + 1}`),
        date: (plan.target_date || plan.created_at || '') as string,
        title: (plan.title || plan.name || '') as string,
        description: (plan.description || '') as string,
        type,
        agentRole: (plan.role || 'ceo') as string,
      };
    });
  }

  // Fallback: return empty array if no master plans
  return [];
}

// ============ AGGREGATE GENERATOR ============

export async function generateAllFinancials(): Promise<FinancialStatements> {
  const incomeStatements = await generateIncomeStatements();
  const balanceSheet = await generateBalanceSheet(incomeStatements);
  const cashFlows = await generateCashFlows(incomeStatements);
  return { incomeStatements, balanceSheet, cashFlows };
}
