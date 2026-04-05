"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Layers,
  Users,
  TrendingUp,
  Award,
  Clock,
  Target,
  ChevronDown,
  ArrowRight,
  BookOpen,
  Lightbulb,
  GraduationCap,
  Calculator,
  Star,
  Calendar,
  MessageCircleQuestion,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";
import { formatCurrency } from "@/lib/format";
import {
  PERFORMANCE_RATINGS,
  REVIEW_CYCLE_CONFIG,
  SALARY_FORMULA_CONFIG,
  type CareerLevel,
} from "@/lib/career-config";
import {
  getCareerLevels,
  getEmployeeCareers,
  getEmployees,
  calculatePromotionReadiness,
} from "@/lib/supabase-data";

type TabKey = "huong_dan" | "khung_cap_bac" | "thang_luong" | "quy_tac" | "phan_bo";

const tabs: { key: TabKey; label: string }[] = [
  { key: "huong_dan", label: "Hướng dẫn" },
  { key: "khung_cap_bac", label: "Khung cấp bậc" },
  { key: "thang_luong", label: "Thang lương" },
  { key: "quy_tac", label: "Quy tắc thăng tiến" },
  { key: "phan_bo", label: "Phân bố nhân sự" },
];

interface GuideSection {
  id: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  content: React.ReactNode;
}

const guideSections: GuideSection[] = [
  {
    id: "cap_bac",
    icon: GraduationCap,
    title: "Hệ thống cấp bậc là gì?",
    content: (
      <div className="space-y-3 text-sm text-slate-600">
        <p>Công ty sử dụng <strong>hệ thống 16 cấp bậc</strong> (L1 - L15), hiện tại đang dùng <strong>6 cấp đầu</strong> (L1 - L6). Khi công ty phát triển sẽ mở thêm các cấp cao hơn.</p>
        <div className="bg-slate-50 rounded-lg p-3">
          <p className="font-medium text-slate-700 mb-2">Có 2 hướng phát triển (Track):</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-purple-50 rounded-md p-2.5">
              <p className="font-medium text-purple-700">IC (Chuyên gia)</p>
              <p className="text-xs text-purple-500 mt-1">Phát triển chuyên môn sâu, không cần quản lý người. Phù hợp với người giỏi kỹ thuật/nghiệp vụ.</p>
            </div>
            <div className="bg-indigo-50 rounded-md p-2.5">
              <p className="font-medium text-indigo-700">Manager (Quản lý)</p>
              <p className="text-xs text-indigo-500 mt-1">Quản lý team, chịu trách nhiệm KPI nhóm. Phù hợp với người có khả năng lãnh đạo.</p>
            </div>
          </div>
        </div>
        <div className="flex items-start gap-2 bg-blue-50 rounded-lg p-3">
          <Lightbulb size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-blue-600"><strong>Lưu ý:</strong> Hai track có mức lương tương đương. Bạn không cần trở thành manager để tăng lương - có thể phát triển theo hướng chuyên gia.</p>
        </div>
      </div>
    ),
  },
  {
    id: "tinh_luong",
    icon: Calculator,
    title: "Cách tính lương",
    content: (
      <div className="space-y-3 text-sm text-slate-600">
        <p>Tổng thu nhập hàng tháng được tính theo công thức:</p>
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <p className="text-lg font-bold text-slate-800">Tổng lương = Lương cơ bản (80%) + Lương KPI (20%) + Thưởng vượt KPI</p>
        </div>
        <div className="bg-green-50 rounded-lg p-3">
          <p className="font-medium text-green-700 mb-2">Ví dụ: Chuyên viên L4, lương 24.000.000đ/tháng</p>
          <table className="w-full text-xs">
            <tbody className="divide-y divide-green-100">
              <tr><td className="py-1.5">Lương cơ bản (80%)</td><td className="py-1.5 text-right font-medium">19.200.000đ</td></tr>
              <tr><td className="py-1.5">Lương KPI (20%) - đạt 100% KPI</td><td className="py-1.5 text-right font-medium">4.800.000đ</td></tr>
              <tr><td className="py-1.5">Nếu KPI đạt 70%</td><td className="py-1.5 text-right font-medium text-orange-600">3.360.000đ</td></tr>
              <tr><td className="py-1.5">Nếu KPI đạt 120%</td><td className="py-1.5 text-right font-medium text-green-600">5.760.000đ + Bonus</td></tr>
            </tbody>
          </table>
        </div>
        <p>Mỗi cấp bậc có <strong>khung lương</strong> (Min - Mid - Max). Bạn có thể được tăng lương mà không cần thăng cấp, miễn là chưa vượt Max của khung hiện tại.</p>
      </div>
    ),
  },
  {
    id: "thang_tien",
    icon: TrendingUp,
    title: "Điều kiện thăng tiến",
    content: (
      <div className="space-y-3 text-sm text-slate-600">
        <p>Để được xét thăng tiến, bạn cần đáp ứng <strong>cả 3 tiêu chí</strong>:</p>
        <div className="space-y-2">
          <div className="flex items-start gap-2 bg-slate-50 rounded-lg p-3">
            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center flex-shrink-0">1</span>
            <div>
              <p className="font-medium text-slate-700">Thời gian tối thiểu tại cấp bậc hiện tại</p>
              <p className="text-xs text-slate-500 mt-0.5">L1→L2: 6 tháng | L2→L3: 12 tháng | L3→L4: 18 tháng | L4→L5: 24 tháng | L5→L6: 24 tháng</p>
            </div>
          </div>
          <div className="flex items-start gap-2 bg-slate-50 rounded-lg p-3">
            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center flex-shrink-0">2</span>
            <div>
              <p className="font-medium text-slate-700">Điểm KPI trung bình đạt mức yêu cầu</p>
              <p className="text-xs text-slate-500 mt-0.5">Tính trung bình 3 quý gần nhất. Mỗi cấp yêu cầu khác nhau (L3: 60%, L4: 70%, L5: 75%, L6: 80%)</p>
            </div>
          </div>
          <div className="flex items-start gap-2 bg-slate-50 rounded-lg p-3">
            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center flex-shrink-0">3</span>
            <div>
              <p className="font-medium text-slate-700">Xếp loại hiệu suất đạt mức "Tốt" trở lên</p>
              <p className="text-xs text-slate-500 mt-0.5">Không được ở mức "Cần cải thiện" hoặc "Yếu"</p>
            </div>
          </div>
        </div>
        <div className="flex items-start gap-2 bg-orange-50 rounded-lg p-3">
          <Lightbulb size={16} className="text-orange-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-orange-600"><strong>Quan trọng:</strong> Đủ điều kiện không đồng nghĩa với tự động thăng tiến. Việc thăng tiến được xét <strong>1 lần/năm</strong> và cần được phê duyệt bởi quản lý.</p>
        </div>
      </div>
    ),
  },
  {
    id: "xep_loai",
    icon: Star,
    title: "Xếp loại hiệu suất",
    content: (
      <div className="space-y-3 text-sm text-slate-600">
        <p>Nhân viên được xếp loại thành <strong>5 mức</strong> dựa trên điểm KPI:</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-3 py-2 text-left">Xếp loại</th>
                <th className="px-3 py-2 text-center">Điểm KPI</th>
                <th className="px-3 py-2 text-center">Tỷ lệ</th>
                <th className="px-3 py-2 text-left">Ý nghĩa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr><td className="px-3 py-2"><span className="text-emerald-600 font-medium">Xuất sắc (Top)</span></td><td className="px-3 py-2 text-center">{">"}= 90%</td><td className="px-3 py-2 text-center">10%</td><td className="px-3 py-2">Ưu tiên thăng tiến, thưởng cao nhất</td></tr>
              <tr><td className="px-3 py-2"><span className="text-blue-600 font-medium">Giỏi (Strong)</span></td><td className="px-3 py-2 text-center">{">"}= 75%</td><td className="px-3 py-2 text-center">20%</td><td className="px-3 py-2">Đủ điều kiện thăng tiến, thưởng tốt</td></tr>
              <tr><td className="px-3 py-2"><span className="text-green-600 font-medium">Tốt (Good)</span></td><td className="px-3 py-2 text-center">{">"}= 55%</td><td className="px-3 py-2 text-center">50%</td><td className="px-3 py-2">Đáp ứng yêu cầu, tăng lương bình thường</td></tr>
              <tr><td className="px-3 py-2"><span className="text-orange-600 font-medium">Cần cải thiện (Weak)</span></td><td className="px-3 py-2 text-center">{">"}= 35%</td><td className="px-3 py-2 text-center">15%</td><td className="px-3 py-2">Cần kế hoạch cải thiện, không đủ ĐK thăng tiến</td></tr>
              <tr><td className="px-3 py-2"><span className="text-red-600 font-medium">Yếu (Poor)</span></td><td className="px-3 py-2 text-center">{"<"} 35%</td><td className="px-3 py-2 text-center">5%</td><td className="px-3 py-2">Cảnh báo, xem xét chuyển vị trí</td></tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500">Tỷ lệ phân bổ là mục tiêu công ty, không phải quota cứng. Thực tế có thể dao động.</p>
      </div>
    ),
  },
  {
    id: "chu_ky",
    icon: Calendar,
    title: "Chu kỳ đánh giá",
    content: (
      <div className="space-y-3 text-sm text-slate-600">
        <p>Công ty áp dụng 3 chu kỳ đánh giá khác nhau:</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="font-medium text-blue-700">Đánh giá KPI</p>
            <p className="text-2xl font-bold text-blue-800 my-1">Mỗi quý</p>
            <p className="text-xs text-blue-500">Review mục tiêu KPI, cập nhật điểm. Kết quả ảnh hưởng đến lương KPI tháng đó.</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <p className="font-medium text-green-700">Xét lương</p>
            <p className="text-2xl font-bold text-green-800 my-1">6 tháng</p>
            <p className="text-xs text-green-500">Xem xét tăng lương trong khung hiện tại dựa trên hiệu suất. Không cần thăng cấp.</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-3">
            <p className="font-medium text-purple-700">Xét thăng tiến</p>
            <p className="text-2xl font-bold text-purple-800 my-1">1 năm</p>
            <p className="text-xs text-purple-500">Xem xét thăng cấp bậc cho nhân viên đủ điều kiện. Cần phê duyệt quản lý.</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "faq",
    icon: MessageCircleQuestion,
    title: "Câu hỏi thường gặp",
    content: (
      <div className="space-y-4 text-sm text-slate-600">
        <div>
          <p className="font-medium text-slate-700">Ở cùng level lâu có được tăng lương không?</p>
          <p className="text-xs text-slate-500 mt-1">Có. Mỗi level có khung lương Min - Mid - Max. Bạn có thể được tăng lương mỗi 6 tháng miễn là chưa đạt Max. Ví dụ: L5 có khung 25M - 33M - 40M, bạn có thể ở L5 nhiều năm và lương tăng từ 25M lên 40M.</p>
        </div>
        <div>
          <p className="font-medium text-slate-700">IC và Manager khác gì nhau?</p>
          <p className="text-xs text-slate-500 mt-1">IC (Individual Contributor) phát triển chuyên môn, không quản lý người. Manager quản lý team. Hai track có mức lương tương đương - bạn không cần làm manager để có thu nhập cao.</p>
        </div>
        <div>
          <p className="font-medium text-slate-700">Tại sao điểm KPI của tôi thấp?</p>
          <p className="text-xs text-slate-500 mt-1">Điểm KPI được tính từ các mục tiêu được giao (task points trên Kanban + KPI phòng ban). Hãy kiểm tra tab "Công việc của tôi" để xem chi tiết và hoàn thành task đúng hạn.</p>
        </div>
        <div>
          <p className="font-medium text-slate-700">Lương tôi nằm ở đâu trong khung?</p>
          <p className="text-xs text-slate-500 mt-1">Vào trang Career Profile cá nhân (click tên trong Danh sách nhân viên) để xem vị trí lương trong khung. Mục "Vị trí trong khung lương" sẽ hiện thanh trượt cho thấy lương bạn so với Min/Mid/Max.</p>
        </div>
        <div>
          <p className="font-medium text-slate-700">Tôi đủ điều kiện thăng tiến nhưng chưa được thăng?</p>
          <p className="text-xs text-slate-500 mt-1">Đủ điều kiện là bước đầu tiên. Thăng tiến còn phụ thuộc vào nhu cầu tổ chức, ngân sách, và phê duyệt của quản lý. Chu kỳ xét thăng tiến diễn ra 1 lần/năm.</p>
        </div>
        <div>
          <p className="font-medium text-slate-700">Tôi có thể chuyển từ IC sang Manager không?</p>
          <p className="text-xs text-slate-500 mt-1">Có thể, nhưng cần trao đổi với quản lý trực tiếp. Chuyển track không đồng nghĩa với thăng tiến - bạn sẽ ở cùng level nhưng chuyển sang vai trò quản lý.</p>
        </div>
      </div>
    ),
  },
];

const LEVEL_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#ec4899"];

const RATING_BAR_COLORS: Record<string, string> = {
  emerald: "bg-emerald-400",
  blue: "bg-blue-400",
  green: "bg-green-400",
  orange: "bg-orange-400",
  red: "bg-red-400",
};

interface EmployeeData {
  id: number;
  name: string;
  department: string;
  role: string;
  base_salary: number;
  status: string;
}

interface EmployeeCareerData {
  employee_id: number;
  level_code: string;
  track: string;
  level_start_date: string;
  current_salary: number;
  promotion_eligible_date: string | null;
}

interface ReadinessResult {
  overallReady: boolean;
  avgKPIScore: number;
}

export default function CareerFrameworkPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("huong_dan");
  const [showFutureLevels, setShowFutureLevels] = useState(false);
  const [expandedGuides, setExpandedGuides] = useState<string[]>(["cap_bac"]);
  const [loading, setLoading] = useState(true);

  const [allLevels, setAllLevels] = useState<CareerLevel[]>([]);
  const [activeLevels, setActiveLevels] = useState<CareerLevel[]>([]);
  const [futureLevels, setFutureLevels] = useState<CareerLevel[]>([]);
  const [employees, setEmployees] = useState<EmployeeData[]>([]);
  const [activeEmployees, setActiveEmployees] = useState<EmployeeData[]>([]);
  const [employeeCareers, setEmployeeCareers] = useState<EmployeeCareerData[]>([]);
  const [eligibleCount, setEligibleCount] = useState(0);
  const [avgKPI, setAvgKPI] = useState(0);
  const [levelDistribution, setLevelDistribution] = useState<{ name: string; value: number; color: string }[]>([]);
  const [readinessMap, setReadinessMap] = useState<Map<number, ReadinessResult | null>>(new Map());

  const toggleGuide = (id: string) => {
    setExpandedGuides((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [levelsData, empsData, careersData] = await Promise.all([
        getCareerLevels(),
        getEmployees(),
        getEmployeeCareers(),
      ]);

      setAllLevels(levelsData);
      const active = levelsData.filter((l: CareerLevel) => l.is_active);
      const future = levelsData.filter((l: CareerLevel) => !l.is_active);
      setActiveLevels(active);
      setFutureLevels(future);

      setEmployees(empsData);
      const activeEmps = empsData.filter((e: EmployeeData) => e.status !== "inactive");
      setActiveEmployees(activeEmps);
      setEmployeeCareers(careersData);

      // Calculate level distribution
      const counts: Record<string, number> = {};
      active.forEach((l: CareerLevel) => (counts[l.code] = 0));
      careersData.forEach((c: EmployeeCareerData) => {
        if (counts[c.level_code] !== undefined) counts[c.level_code]++;
      });
      setLevelDistribution(
        active.map((l: CareerLevel, i: number) => ({
          name: `${l.code} - ${l.name_vi}`,
          value: counts[l.code] || 0,
          color: LEVEL_COLORS[i % LEVEL_COLORS.length],
        }))
      );

      // Calculate promotion readiness for each active employee
      const readinessEntries = await Promise.all(
        activeEmps.map(async (emp: EmployeeData) => {
          const r = await calculatePromotionReadiness(emp.id);
          return [emp.id, r] as [number, ReadinessResult | null];
        })
      );
      const rMap = new Map(readinessEntries);
      setReadinessMap(rMap);

      // Count eligible
      let eligible = 0;
      let totalKPI = 0;
      let kpiCount = 0;
      rMap.forEach((r) => {
        if (r?.overallReady) eligible++;
        if (r && r.avgKPIScore > 0) {
          totalKPI += r.avgKPIScore;
          kpiCount++;
        }
      });
      setEligibleCount(eligible);
      setAvgKPI(kpiCount > 0 ? Math.round(totalKPI / kpiCount) : 0);
    } catch (err) {
      console.error("Error loading career framework data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  // Salary band chart data
  const salaryChartData = activeLevels.map((l) => ({
    name: l.code,
    min: l.salary_band_min / 1_000_000,
    mid: l.salary_band_mid / 1_000_000,
    max: l.salary_band_max / 1_000_000,
  }));

  return (
    <div>
      <PageHeader
        title="Lộ trình nghề nghiệp"
        subtitle="Khung cấp bậc, thang lương và quy tắc thăng tiến"
        breadcrumbs={[
          { label: "Nhân sự", href: "/nhan-su/danh-sach" },
          { label: "Lộ trình nghề nghiệp" },
        ]}
        actions={
          <Link
            href="/nhan-su/career-framework/admin"
            className="flex items-center gap-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-2 transition-colors"
          >
            Quản lý
          </Link>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Layers} label="Cấp bậc đang dùng" value={activeLevels.length} color="blue" />
        <StatCard icon={Users} label="Nhân viên có lộ trình" value={employeeCareers.length} color="green" />
        <StatCard icon={TrendingUp} label="Đủ điều kiện thăng tiến" value={eligibleCount} color="orange" />
        <StatCard icon={Award} label="KPI trung bình" value={`${avgKPI}%`} color="purple" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "huong_dan" && (
        <div className="space-y-3">
          <div className="bg-white rounded-xl border border-slate-200 p-5 mb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <BookOpen size={20} className="text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Hướng dẫn sử dụng hệ thống Lộ trình nghề nghiệp</h3>
                <p className="text-xs text-slate-400 mt-0.5">Click vào từng mục bên dưới để xem chi tiết. Dành cho nhân viên mới và HR.</p>
              </div>
            </div>
          </div>
          {guideSections.map((section) => {
            const SectionIcon = section.icon;
            const isExpanded = expandedGuides.includes(section.id);
            return (
              <div key={section.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <button
                  onClick={() => toggleGuide(section.id)}
                  className="w-full px-5 py-4 flex items-center gap-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <SectionIcon size={16} className="text-blue-600" />
                  </div>
                  <span className="flex-1 text-left text-sm font-medium text-slate-800">{section.title}</span>
                  <ChevronDown
                    size={16}
                    className={`text-slate-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                  />
                </button>
                <div className={`overflow-hidden transition-all duration-200 ${isExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"}`}>
                  <div className="px-5 pb-5 pt-0 border-t border-slate-100">
                    <div className="pt-4">{section.content}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === "khung_cap_bac" && (
        <div className="space-y-4">
          {/* Active levels */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">Cấp bậc đang sử dụng</h3>
              <p className="text-xs text-slate-400 mt-0.5">Hệ thống 16 cấp, hiện dùng {activeLevels.length} cấp đầu</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
                    <th className="px-5 py-3 text-left">Cấp bậc</th>
                    <th className="px-5 py-3 text-left">Chức danh</th>
                    <th className="px-5 py-3 text-left">Track</th>
                    <th className="px-5 py-3 text-right">Lương Min</th>
                    <th className="px-5 py-3 text-right">Lương Mid</th>
                    <th className="px-5 py-3 text-right">Lương Max</th>
                    <th className="px-5 py-3 text-center">Thời gian tối thiểu</th>
                    <th className="px-5 py-3 text-center">KPI yêu cầu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeLevels.map((level) => (
                    <tr key={level.code} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center justify-center w-10 h-7 rounded-md bg-blue-100 text-blue-700 text-xs font-bold">
                          {level.code}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div>
                          <p className="text-sm font-medium text-slate-800">{level.name_vi}</p>
                          <p className="text-xs text-slate-400">{level.name}</p>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          level.track === "IC"
                            ? "bg-purple-50 text-purple-600"
                            : "bg-indigo-50 text-indigo-600"
                        }`}>
                          {level.track === "IC" ? "Chuyên gia" : "Quản lý"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right text-sm text-slate-600">
                        {formatCurrency(level.salary_band_min)}
                      </td>
                      <td className="px-5 py-3.5 text-right text-sm font-medium text-slate-800">
                        {formatCurrency(level.salary_band_mid)}
                      </td>
                      <td className="px-5 py-3.5 text-right text-sm text-slate-600">
                        {formatCurrency(level.salary_band_max)}
                      </td>
                      <td className="px-5 py-3.5 text-center text-sm text-slate-600">
                        {level.min_time_months} tháng
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className="text-sm font-medium text-blue-600">{level.required_kpi_percent}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Future levels (collapsed) */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <button
              onClick={() => setShowFutureLevels(!showFutureLevels)}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
            >
              <div>
                <h3 className="font-semibold text-slate-500">Cấp bậc tương lai (sau này)</h3>
                <p className="text-xs text-slate-400 mt-0.5">{futureLevels.length} cấp sẽ mở khi công ty phát triển</p>
              </div>
              <ChevronDown
                size={18}
                className={`text-slate-400 transition-transform ${showFutureLevels ? "rotate-180" : ""}`}
              />
            </button>
            {showFutureLevels && (
              <div className="border-t border-slate-100 overflow-x-auto">
                <table className="w-full">
                  <tbody className="divide-y divide-slate-100">
                    {futureLevels.map((level) => (
                      <tr key={level.code} className="text-slate-400">
                        <td className="px-5 py-3">
                          <span className="inline-flex items-center justify-center w-10 h-7 rounded-md bg-slate-100 text-slate-400 text-xs font-bold">
                            {level.code}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-sm">{level.name_vi} ({level.name})</td>
                        <td className="px-5 py-3 text-sm">{level.track === "IC" ? "Chuyên gia" : "Quản lý"}</td>
                        <td className="px-5 py-3 text-right text-sm">
                          {formatCurrency(level.salary_band_min)} - {formatCurrency(level.salary_band_max)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "thang_luong" && (
        <div className="space-y-6">
          {/* Salary band chart */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-1">Biểu đồ thang lương</h3>
            <p className="text-xs text-slate-400 mb-4">Đơn vị: triệu VND/tháng</p>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salaryChartData} barGap={0} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: number) => `${value}M`}
                    contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0" }}
                  />
                  <Legend />
                  <Bar dataKey="min" name="Min" fill="#93c5fd" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="mid" name="Mid" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="max" name="Max" fill="#1d4ed8" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Salary formula */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-4">Công thức lương</h3>
            <div className="flex flex-wrap gap-3">
              <div className="flex-1 min-w-[200px] bg-blue-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-blue-700">{SALARY_FORMULA_CONFIG.basePercent * 100}%</p>
                <p className="text-xs text-blue-500 mt-1">Lương cơ bản</p>
              </div>
              <div className="flex items-center text-slate-300 text-xl font-bold">+</div>
              <div className="flex-1 min-w-[200px] bg-green-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-green-700">{SALARY_FORMULA_CONFIG.kpiPercent * 100}%</p>
                <p className="text-xs text-green-500 mt-1">Lương KPI</p>
              </div>
              <div className="flex items-center text-slate-300 text-xl font-bold">+</div>
              <div className="flex-1 min-w-[200px] bg-orange-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-orange-700">Bonus</p>
                <p className="text-xs text-orange-500 mt-1">Thưởng vượt KPI</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "quy_tac" && (
        <div className="space-y-6">
          {/* Level progression timeline */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-4">Lộ trình thăng tiến</h3>
            <div className="flex items-center justify-between overflow-x-auto pb-2">
              {activeLevels.map((level, i) => (
                <div key={level.code} className="flex items-center">
                  <div className="flex flex-col items-center min-w-[100px]">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center border-2 border-blue-400">
                      <span className="text-sm font-bold text-blue-700">{level.code}</span>
                    </div>
                    <p className="text-xs font-medium text-slate-700 mt-2 text-center">{level.name_vi}</p>
                    <p className="text-[10px] text-slate-400">{level.name}</p>
                  </div>
                  {i < activeLevels.length - 1 && (
                    <div className="flex flex-col items-center mx-2">
                      <ArrowRight size={16} className="text-slate-300" />
                      <span className="text-[10px] text-slate-400 mt-0.5 whitespace-nowrap">
                        {level.min_time_months} tháng
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Performance rating distribution */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-4">Xếp loại hiệu suất</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
                    <th className="px-5 py-3 text-left">Xếp loại</th>
                    <th className="px-5 py-3 text-center">Tỷ lệ phân bổ</th>
                    <th className="px-5 py-3 text-center">Điểm KPI tối thiểu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {PERFORMANCE_RATINGS.map((r) => (
                    <tr key={r.tier}>
                      <td className="px-5 py-3">
                        <StatusBadge status={`rating_${r.tier.toLowerCase()}`} />
                      </td>
                      <td className="px-5 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${RATING_BAR_COLORS[r.color] || "bg-slate-400"}`}
                              style={{ width: `${r.distribution * 2}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-slate-700">{r.distribution}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-center text-sm text-slate-600">
                        {r.minKPI > 0 ? `>= ${r.minKPI}%` : `< 35%`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Review cycle */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-4">Chu kỳ đánh giá</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target size={18} className="text-blue-600" />
                  <span className="text-sm font-medium text-blue-700">Đánh giá KPI</span>
                </div>
                <p className="text-2xl font-bold text-blue-800">Mỗi quý</p>
                <p className="text-xs text-blue-500 mt-1">{REVIEW_CYCLE_CONFIG.kpiReviewMonths} tháng/lần</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock size={18} className="text-green-600" />
                  <span className="text-sm font-medium text-green-700">Xét lương</span>
                </div>
                <p className="text-2xl font-bold text-green-800">6 tháng</p>
                <p className="text-xs text-green-500 mt-1">{REVIEW_CYCLE_CONFIG.salaryReviewMonths} tháng/lần</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp size={18} className="text-purple-600" />
                  <span className="text-sm font-medium text-purple-700">Xét thăng tiến</span>
                </div>
                <p className="text-2xl font-bold text-purple-800">1 năm</p>
                <p className="text-xs text-purple-500 mt-1">{REVIEW_CYCLE_CONFIG.promotionReviewMonths} tháng/lần</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "phan_bo" && (
        <div className="space-y-6">
          {/* Pie chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-800 mb-4">Phân bố theo cấp bậc</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={levelDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {levelDistribution.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Summary cards */}
            <div className="space-y-3">
              {levelDistribution.map((item) => (
                <div key={item.name} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm font-medium text-slate-700">{item.name}</span>
                  </div>
                  <span className="text-lg font-bold text-slate-800">{item.value} người</span>
                </div>
              ))}
            </div>
          </div>

          {/* Employee list by level */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">Danh sách nhân viên theo cấp bậc</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
                    <th className="px-5 py-3 text-left">Nhân viên</th>
                    <th className="px-5 py-3 text-left">Phòng ban</th>
                    <th className="px-5 py-3 text-center">Cấp bậc</th>
                    <th className="px-5 py-3 text-center">Track</th>
                    <th className="px-5 py-3 text-center">Thăng tiến</th>
                    <th className="px-5 py-3 text-center">Chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeEmployees.map((emp) => {
                    const career = employeeCareers.find((c) => c.employee_id === emp.id);
                    const level = career ? activeLevels.find((l) => l.code === career.level_code) : null;
                    const readiness = readinessMap.get(emp.id);
                    return (
                      <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                              {emp.name.split(" ").pop()?.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-800">{emp.name}</p>
                              <p className="text-xs text-slate-400">{emp.role}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-sm text-slate-600">{emp.department}</td>
                        <td className="px-5 py-3 text-center">
                          {level && (
                            <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">
                              {level.code} - {level.name_vi}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-center">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            career?.track === "IC"
                              ? "bg-purple-50 text-purple-600"
                              : "bg-indigo-50 text-indigo-600"
                          }`}>
                            {career?.track === "IC" ? "Chuyên gia" : "Quản lý"}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-center">
                          <StatusBadge status={readiness?.overallReady ? "du_dieu_kien" : "chua_du_dieu_kien"} />
                        </td>
                        <td className="px-5 py-3 text-center">
                          <Link
                            href={`/nhan-su/career/${emp.id}`}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Xem chi tiết
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
