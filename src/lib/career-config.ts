// Static career framework config — no mock data dependency

export type CareerTrack = "IC" | "Manager";
export type PerformanceRatingTier = "Top" | "Strong" | "Good" | "Weak" | "Poor";

export interface CareerLevel {
  code: string;
  name: string;
  name_vi: string;
  track: CareerTrack;
  is_active: boolean;
  salary_band_min: number;
  salary_band_mid: number;
  salary_band_max: number;
  min_time_months: number;
  required_kpi_percent: number;
  description: string;
  next_level: string | null;
}

export interface PerformanceRating {
  tier: PerformanceRatingTier;
  label: string;
  distribution: number;
  color: string;
  minKPI: number;
}

export const PERFORMANCE_RATINGS: PerformanceRating[] = [
  { tier: "Top", label: "Xuất sắc", distribution: 10, color: "emerald", minKPI: 90 },
  { tier: "Strong", label: "Giỏi", distribution: 20, color: "blue", minKPI: 75 },
  { tier: "Good", label: "Tốt", distribution: 50, color: "green", minKPI: 55 },
  { tier: "Weak", label: "Cần cải thiện", distribution: 15, color: "orange", minKPI: 35 },
  { tier: "Poor", label: "Yếu", distribution: 5, color: "red", minKPI: 0 },
];

export const REVIEW_CYCLE_CONFIG = {
  kpiReviewMonths: 3,
  salaryReviewMonths: 6,
  promotionReviewMonths: 12,
};

export const SALARY_FORMULA_CONFIG = {
  basePercent: 0.80,
  kpiPercent: 0.20,
};

export function getPerformanceRatingTier(kpiScore: number): PerformanceRatingTier {
  if (kpiScore >= 90) return "Top";
  if (kpiScore >= 75) return "Strong";
  if (kpiScore >= 55) return "Good";
  if (kpiScore >= 35) return "Weak";
  return "Poor";
}

export const RATING_COLORS: Record<PerformanceRatingTier, string> = {
  Top: "text-emerald-600",
  Strong: "text-blue-600",
  Good: "text-green-600",
  Weak: "text-orange-600",
  Poor: "text-red-600",
};

export const RATING_BG: Record<PerformanceRatingTier, string> = {
  Top: "bg-emerald-100",
  Strong: "bg-blue-100",
  Good: "bg-green-100",
  Weak: "bg-orange-100",
  Poor: "bg-red-100",
};

export const STATUS_COLORS: Record<string, string> = {
  present: "text-green-500",
  late: "text-orange-500",
  absent: "text-red-500",
  off: "text-gray-400",
  halfday: "text-yellow-500",
  wfh: "text-blue-500",
};

export const STATUS_LABELS: Record<string, string> = {
  present: "✓",
  late: "M",
  absent: "X",
  off: "-",
  halfday: "½",
  wfh: "W",
};

export const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  urgent: { label: "Khẩn cấp", color: "text-red-700", bg: "bg-red-100" },
  high: { label: "Cao", color: "text-orange-700", bg: "bg-orange-100" },
  medium: { label: "Trung bình", color: "text-blue-700", bg: "bg-blue-100" },
  low: { label: "Thấp", color: "text-slate-600", bg: "bg-slate-100" },
};

export const COLUMN_CONFIG: Record<string, { label: string; color: string; bgHeader: string }> = {
  todo: { label: "Chờ làm", color: "text-slate-600", bgHeader: "bg-slate-100 border-slate-300" },
  in_progress: { label: "Đang làm", color: "text-blue-600", bgHeader: "bg-blue-50 border-blue-300" },
  review: { label: "Đang review", color: "text-purple-600", bgHeader: "bg-purple-50 border-purple-300" },
  done: { label: "Hoàn thành", color: "text-green-600", bgHeader: "bg-green-50 border-green-300" },
};
