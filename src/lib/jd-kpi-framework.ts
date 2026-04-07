/**
 * Job Description & KPI Framework
 *
 * Defines JD, KPIs, and bonus rules for each role at Teeworld.
 * KPI cascade: Company → Department → Individual → Weekly/Daily
 */

export interface KPIItem {
  name: string;
  target: string;
  unit: string;
  weight: number; // % weight in total KPI
  category: 'revenue' | 'growth' | 'efficiency' | 'quality';
}

export interface JobDescription {
  role: string;
  department: string;
  summary: string;
  responsibilities: string[];
  kpis: KPIItem[];
  bonusRules: string;
}

// Company-level targets (CEO sets these)
export const COMPANY_TARGETS = {
  yearlyRevenue: 20_000_000_000,
  yearlyProfit: 6_000_000_000,
  profitMargin: 30,
  bstPerYear: 12,
  channels: 5,
  headcount: 10,
};

// Department targets derived from company
export const DEPT_TARGETS: Record<string, { revenueShare: number; keyMetric: string; keyTarget: string }> = {
  'Marketing': { revenueShare: 78, keyMetric: 'Traffic & Conversion', keyTarget: '500K visits/tháng, CVR >2%' },
  'Sales': { revenueShare: 22, keyMetric: 'Đơn hàng & CSKH', keyTarget: '1,000 đơn/tháng, CS >4.5★' },
  'Vận hành': { revenueShare: 0, keyMetric: 'Fulfillment & QC', keyTarget: '<24h xử lý, return <1%' },
  'Kế toán': { revenueShare: 0, keyMetric: 'Báo cáo & Compliance', keyTarget: 'Đúng hạn 100%, sai sót 0' },
  'Ban Giám đốc': { revenueShare: 0, keyMetric: 'Chiến lược & Điều hành', keyTarget: '20 tỷ DT, 30% margin' },
};

// Role-specific JDs
const JD_DATABASE: Record<string, Omit<JobDescription, 'role' | 'department'>> = {
  'CEO / Founder': {
    summary: 'Điều hành tổng thể Teeworld, đặt chiến lược kinh doanh, quản lý P&L, phát triển thương hiệu graphic tees.',
    responsibilities: [
      'Đặt mục tiêu doanh thu và lợi nhuận hàng năm/quý',
      'Quyết định chiến lược kênh bán hàng (D2C, Marketplace, B2B)',
      'Phê duyệt BST mới và chiến lược brand (Saigonese, Quote, Happy Sunday)',
      'Quản lý dòng tiền và phân bổ ngân sách',
      'Review hiệu suất nhân viên và phê duyệt thưởng/thăng chức',
    ],
    kpis: [
      { name: 'Doanh thu tháng', target: '1.67 tỷ', unit: 'VND', weight: 40, category: 'revenue' },
      { name: 'Biên lợi nhuận ròng', target: '30%', unit: '%', weight: 25, category: 'revenue' },
      { name: 'Ra mắt BST đúng hạn', target: '1 BST/tháng', unit: 'BST', weight: 15, category: 'growth' },
      { name: 'Review & phê duyệt báo cáo', target: '100%', unit: '%', weight: 10, category: 'quality' },
      { name: 'Họp chiến lược tuần', target: '4 buổi/tháng', unit: 'buổi', weight: 10, category: 'efficiency' },
    ],
    bonusRules: 'Thưởng theo lợi nhuận công ty: 5% lợi nhuận vượt target.',
  },

  'Lead Marketing - Website & SEO & AI Design': {
    summary: 'Phụ trách toàn bộ marketing digital: website, SEO, Facebook/Instagram Ads, AI design. Đảm bảo traffic và conversion.',
    responsibilities: [
      'Quản lý & tối ưu website Teeworld (traffic, UX, conversion)',
      'Chạy & tối ưu Facebook/Instagram Ads (ROAS >3x)',
      'SEO: keyword research, content optimization, Google ranking',
      'AI Design: tạo mẫu áo mới bằng Banana Pro 2 / Midjourney',
      'Lên content calendar và quản lý social media',
      'Report marketing performance hàng tuần/tháng',
    ],
    kpis: [
      { name: 'Doanh thu từ Website + FB/IG', target: '1.25 tỷ/tháng', unit: 'VND', weight: 35, category: 'revenue' },
      { name: 'ROAS Facebook Ads', target: '>3x', unit: 'x', weight: 20, category: 'efficiency' },
      { name: 'Traffic website', target: '100K visits/tháng', unit: 'visits', weight: 15, category: 'growth' },
      { name: 'Tạo mẫu thiết kế mới', target: '30 mẫu/tháng', unit: 'mẫu', weight: 15, category: 'growth' },
      { name: 'Content đăng đúng lịch', target: '>90%', unit: '%', weight: 15, category: 'quality' },
    ],
    bonusRules: 'KPI đạt ≥95: thưởng 25% lương. ≥80: 15%. ≥65: 10%. ≥50: 5%.',
  },

  'NV TikTok Content & Traffic Driver': {
    summary: 'Tạo content TikTok viral, drive traffic về website/shop. Focus vào quote tees và Saigonese lifestyle.',
    responsibilities: [
      'Quay/edit video TikTok hàng ngày (2-3 video/ngày)',
      'Trend research & hashtag strategy',
      'Phát triển kênh TikTok Shop',
      'Collab với KOL/influencer',
      'Drive traffic từ TikTok → Website (UTM tracking)',
    ],
    kpis: [
      { name: 'Video đăng/tuần', target: '15 video', unit: 'video', weight: 25, category: 'growth' },
      { name: 'Views trung bình/video', target: '>10K', unit: 'views', weight: 20, category: 'growth' },
      { name: 'Traffic từ TikTok → Website', target: '20K clicks/tháng', unit: 'clicks', weight: 25, category: 'revenue' },
      { name: 'Doanh thu TikTok Shop', target: '50M/tháng', unit: 'VND', weight: 20, category: 'revenue' },
      { name: 'Engagement rate', target: '>5%', unit: '%', weight: 10, category: 'quality' },
    ],
    bonusRules: 'KPI đạt ≥95: thưởng 25% lương. ≥80: 15%. ≥65: 10%. ≥50: 5%.',
  },

  'NV Performance Ads & Content (Web/IG Traffic)': {
    summary: 'Chạy quảng cáo performance (Google, Meta), tạo content chuyển đổi cao cho website và Instagram.',
    responsibilities: [
      'Chạy Google Ads (Search, Shopping, Display)',
      'Tối ưu Meta Ads (FB + IG) theo ROAS',
      'Tạo ad creatives (hình ảnh, video ngắn)',
      'A/B test landing pages & ad copies',
      'Report performance hàng ngày (spend, revenue, ROAS)',
    ],
    kpis: [
      { name: 'ROAS tổng ads', target: '>3x', unit: 'x', weight: 30, category: 'efficiency' },
      { name: 'Doanh thu từ Ads', target: '800M/tháng', unit: 'VND', weight: 30, category: 'revenue' },
      { name: 'Chi phí quảng cáo/đơn', target: '<50K/đơn', unit: 'VND', weight: 20, category: 'efficiency' },
      { name: 'Ad creatives mới/tuần', target: '10 mẫu', unit: 'mẫu', weight: 10, category: 'growth' },
      { name: 'Report đúng hạn', target: '100%', unit: '%', weight: 10, category: 'quality' },
    ],
    bonusRules: 'KPI đạt ≥95: thưởng 25% lương. ≥80: 15%. ≥65: 10%. ≥50: 5%.',
  },

  'NV Quản lý Shopee (brand) & Xử lý đơn Website': {
    summary: 'Vận hành gian hàng Shopee, xử lý đơn hàng website, CSKH qua chat/điện thoại.',
    responsibilities: [
      'Quản lý gian hàng Shopee: listing, giá, promotion',
      'Xử lý đơn hàng website (xác nhận, in phiếu, chuyển kho)',
      'CSKH: trả lời chat, xử lý khiếu nại, đổi trả',
      'Theo dõi đánh giá khách hàng & phản hồi',
      'Report đơn hàng hàng ngày',
    ],
    kpis: [
      { name: 'Doanh thu Shopee', target: '120M/tháng', unit: 'VND', weight: 25, category: 'revenue' },
      { name: 'Đơn hàng xử lý/ngày', target: '30 đơn', unit: 'đơn', weight: 25, category: 'efficiency' },
      { name: 'Thời gian phản hồi KH', target: '<30 phút', unit: 'phút', weight: 20, category: 'quality' },
      { name: 'Đánh giá khách hàng', target: '>4.8★', unit: '★', weight: 15, category: 'quality' },
      { name: 'Tỷ lệ đổi trả', target: '<2%', unit: '%', weight: 15, category: 'quality' },
    ],
    bonusRules: 'KPI đạt ≥95: thưởng 25% lương. ≥80: 15%. ≥65: 10%. ≥50: 5%.',
  },

  'NV B2B Sales & CSKH (Website/IG)': {
    summary: 'Phát triển khách hàng B2B (đồng phục doanh nghiệp), CSKH kênh Website/Instagram.',
    responsibilities: [
      'Tìm kiếm & chốt đơn B2B đồng phục',
      'Báo giá, đàm phán, theo dõi hợp đồng B2B',
      'CSKH Website & Instagram (inbox, comment)',
      'Upsell/cross-sell cho khách hàng cũ',
      'Report pipeline B2B hàng tuần',
    ],
    kpis: [
      { name: 'Doanh thu B2B', target: '250M/tháng', unit: 'VND', weight: 35, category: 'revenue' },
      { name: 'Số khách B2B mới', target: '5 KH/tháng', unit: 'KH', weight: 20, category: 'growth' },
      { name: 'CSKH Website/IG', target: '<30 phút phản hồi', unit: 'phút', weight: 20, category: 'quality' },
      { name: 'Tỷ lệ chốt deal', target: '>30%', unit: '%', weight: 15, category: 'efficiency' },
      { name: 'Khách hàng tái đặt', target: '>40%', unit: '%', weight: 10, category: 'growth' },
    ],
    bonusRules: 'KPI đạt ≥95: thưởng 25% lương. ≥80: 15%. ≥65: 10%. Commission 3% doanh thu B2B.',
  },

  'Lead Sản xuất & Thu mua & CS': {
    summary: 'Quản lý quy trình sản xuất áo, thu mua nguyên vật liệu, kiểm soát chất lượng, quản lý đội vận hành.',
    responsibilities: [
      'Lên kế hoạch sản xuất theo BST & đơn hàng',
      'Quản lý nhà in & nhà cung cấp vải',
      'Kiểm tra chất lượng sản phẩm (QC) trước giao',
      'Quản lý tồn kho & đặt hàng bổ sung',
      'Điều phối đội sản xuất & vận hành (2 NV)',
    ],
    kpis: [
      { name: 'Đơn hàng giao đúng hạn', target: '>95%', unit: '%', weight: 25, category: 'efficiency' },
      { name: 'Tỷ lệ lỗi sản phẩm', target: '<1%', unit: '%', weight: 25, category: 'quality' },
      { name: 'Thời gian sản xuất', target: '<7 ngày/lô', unit: 'ngày', weight: 20, category: 'efficiency' },
      { name: 'Tồn kho best sellers', target: '>100 cái/mẫu', unit: 'cái', weight: 15, category: 'efficiency' },
      { name: 'Chi phí sản xuất/áo', target: '<80K', unit: 'VND', weight: 15, category: 'revenue' },
    ],
    bonusRules: 'KPI đạt ≥95: thưởng 25% lương. ≥80: 15%. ≥65: 10%. ≥50: 5%.',
  },

  'NV Sản xuất & Vận hành': {
    summary: 'Thực hiện đóng gói, giao hàng, kiểm kho, hỗ trợ sản xuất hàng ngày.',
    responsibilities: [
      'Đóng gói đơn hàng (đúng sản phẩm, size, packaging)',
      'Giao hàng cho đơn vị vận chuyển',
      'Kiểm kho & cập nhật tồn kho hàng ngày',
      'Hỗ trợ QC sản phẩm mới về',
      'Sắp xếp kho hàng gọn gàng',
    ],
    kpis: [
      { name: 'Đơn đóng gói/ngày', target: '50 đơn', unit: 'đơn', weight: 30, category: 'efficiency' },
      { name: 'Lỗi đóng gói', target: '0 lỗi/tuần', unit: 'lỗi', weight: 25, category: 'quality' },
      { name: 'Giao hàng đúng hạn', target: '>98%', unit: '%', weight: 20, category: 'efficiency' },
      { name: 'Cập nhật tồn kho', target: 'Hàng ngày', unit: 'ngày', weight: 15, category: 'quality' },
      { name: 'Kho sạch sẽ, ngăn nắp', target: 'Đạt', unit: '', weight: 10, category: 'quality' },
    ],
    bonusRules: 'KPI đạt ≥95: thưởng 25% lương. ≥80: 15%. ≥65: 10%. ≥50: 5%.',
  },

  'Kế toán kiêm HR Admin': {
    summary: 'Quản lý sổ sách kế toán, bảng lương, BHXH, thuế. Kiêm nhiệm HR admin (chấm công, hợp đồng).',
    responsibilities: [
      'Lập bảng lương hàng tháng (lương, thưởng, khấu trừ)',
      'Kê khai thuế TNCN, GTGT, TNDN',
      'Quản lý BHXH, BHYT, BHTN',
      'Theo dõi công nợ (phải thu, phải trả)',
      'HR Admin: chấm công, hợp đồng, nghỉ phép',
    ],
    kpis: [
      { name: 'Bảng lương đúng hạn', target: 'Ngày 5 hàng tháng', unit: 'ngày', weight: 25, category: 'efficiency' },
      { name: 'Sai sót kế toán', target: '0 lỗi/tháng', unit: 'lỗi', weight: 25, category: 'quality' },
      { name: 'Báo cáo thuế đúng hạn', target: '100%', unit: '%', weight: 20, category: 'quality' },
      { name: 'Thu hồi công nợ', target: '>90%', unit: '%', weight: 15, category: 'revenue' },
      { name: 'Chấm công chính xác', target: '100%', unit: '%', weight: 15, category: 'quality' },
    ],
    bonusRules: 'KPI đạt ≥95: thưởng 25% lương. ≥80: 15%. ≥65: 10%. ≥50: 5%.',
  },
};

export function getJobDescription(role: string, department: string): JobDescription {
  const jd = JD_DATABASE[role];
  if (jd) {
    return { role, department, ...jd };
  }
  // Fallback
  return {
    role,
    department,
    summary: `Nhân viên ${department} tại Teeworld.`,
    responsibilities: ['Hoàn thành công việc được giao', 'Báo cáo hàng ngày'],
    kpis: [
      { name: 'Hoàn thành tasks', target: '>90%', unit: '%', weight: 50, category: 'efficiency' },
      { name: 'Chất lượng công việc', target: 'Đạt', unit: '', weight: 50, category: 'quality' },
    ],
    bonusRules: 'Theo quy chế thưởng công ty.',
  };
}

// Calculate bonus estimate based on KPI score
export function estimateBonus(salary: number, kpiScore: number): { tier: string; rate: number; amount: number } {
  if (kpiScore >= 95) return { tier: 'Xuất sắc', rate: 0.25, amount: Math.round(salary * 0.25) };
  if (kpiScore >= 80) return { tier: 'Giỏi', rate: 0.15, amount: Math.round(salary * 0.15) };
  if (kpiScore >= 65) return { tier: 'Khá', rate: 0.10, amount: Math.round(salary * 0.10) };
  if (kpiScore >= 50) return { tier: 'Đạt', rate: 0.05, amount: Math.round(salary * 0.05) };
  return { tier: 'Chưa đạt', rate: 0, amount: 0 };
}
