// ============ TARGET CASCADE: Annual → Q → Monthly → Weekly → Daily ============

export type CascadeLevel = 'annual' | 'quarterly' | 'monthly' | 'weekly' | 'daily';

export interface AnnualTarget {
  id: string;
  year: number;
  name: string;
  category: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  quarters: QuarterlyMilestone[];
}

export interface QuarterlyMilestone {
  id: string;
  quarter: string; // "Q1", "Q2"
  targetValue: number;
  currentValue: number;
  months: MonthlyPlan[];
}

export interface MonthlyPlan {
  id: string;
  month: string; // "T4/2026"
  monthNum: number; // 4
  targetValue: number;
  currentValue: number;
  status: 'completed' | 'on_track' | 'at_risk' | 'behind' | 'upcoming';
  weeks: WeeklySprint[];
}

export interface WeeklySprint {
  id: string;
  weekNum: number; // 1-4
  label: string; // "Tuần 1"
  startDate: string;
  endDate: string;
  targetValue: number;
  currentValue: number;
  days: DailyTask[];
}

export interface DailyTask {
  id: string;
  date: string; // "07/04/2026"
  dayOfWeek: string; // "Thứ 2"
  tasks: TaskItem[];
  totalTarget: number;
  totalActual: number;
  status: 'completed' | 'in_progress' | 'upcoming' | 'missed';
}

export interface TaskItem {
  id: string;
  title: string;
  kpiMetric: string;
  targetValue: number;
  actualValue: number;
  unit: string;
  completed: boolean;
}

// Employee-level cascade
export interface EmployeeCascade {
  employeeId: string;
  employeeName: string;
  department: string;
  annualTargets: AnnualTarget[];
}

// ============ DETAILED PAYSLIP ============

export interface PayslipMonth {
  month: string; // "T4/2026"
  monthNum: number;
  year: number;
  employeeId: string;
  employeeName: string;
  department: string;
  levelCode: string;
  chucVu: string;

  // I. Thu nhập
  thuNhap: {
    luongCoBan: number;
    phuCapAnTrua: number;
    phuCapXangXe: number;
    phuCapDienThoai: number;
    phuCapThamNien: number;
    tongThuNhap: number;
  };

  // II. Thưởng
  thuong: {
    thuongKPI: number;
    kpiAchievement: number; // 0-100%
    thuongPhongBan: number;
    thuongCongTy: number;
    tongThuong: number;
  };

  // III. Khấu trừ
  khauTru: {
    bhxh: number;       // 8%
    bhyt: number;       // 1.5%
    bhtn: number;       // 1%
    thueTNCN: number;   // progressive tax
    tongKhauTru: number;
  };

  // IV. Thực nhận
  thucNhan: number;

  trangThai: 'cho_duyet' | 'da_duyet' | 'da_thanh_toan';
}

// ============ KPI SCORECARD ============

export interface EmployeeKPICard {
  employeeId: string;
  employeeName: string;
  department: string;
  period: string; // "Q2/2026"
  kpis: KPIItem[];
  totalWeightedScore: number;
  bonusTier: string; // "Xuất sắc", "Giỏi", "Tốt", "Cần cải thiện"
  bonusRate: number; // 0.05 - 0.25
  bonusAmount: number;
}

export interface KPIItem {
  id: string;
  name: string;
  weight: number; // % weight (all KPIs sum to 100)
  target: number;
  actual: number;
  unit: string;
  achievement: number; // actual/target * 100
  monthlyProgress: { month: string; value: number }[];
  status: 'exceeded' | 'met' | 'near' | 'behind';
}
