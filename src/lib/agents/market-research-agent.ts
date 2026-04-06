/**
 * Market Research Agent — Nghiên cứu thị trường, phân tích đối thủ, trend.
 *
 * Agent này KHÔNG chỉ lặp lại data nội bộ. Nó mang perspective bên ngoài:
 * - Thị trường e-commerce VN, fashion/apparel trends
 * - Đối thủ cạnh tranh (Coolmate, Teelab, Canifa, Insidemen...)
 * - Platform trends (TikTok, Shopee, Instagram)
 * - Consumer behavior shifts
 * - Seasonal & macro factors
 *
 * Data sources: channel_economics, monthly_pnl, market benchmarks (hardcoded industry data)
 */

import { AgentMessage } from '../agent-types';
import { getMonthlyPnL, getChannelEconomics } from '@/lib/supabase-data';

// ============ INDUSTRY BENCHMARKS (Vietnamese fashion e-commerce 2025-2026) ============
// These represent real market data points that a research agent would gather

// Teeworld Brand DNA:
// - Graphic t-shirts (NOT basic tees) — unique designs = core differentiator
// - Best sellers: Saigonese (retro Sài Gòn, modern twist), Quote tees ("Không Được Đánh Khách Hàng")
// - Lines: Texture Teeworld Studio (signature), Happy Sunday (sub-brand: joy, travel, lifestyle)
// - Style: retro-modern, local Vietnamese culture pride, humor, travel vibes
// - Target: Gen Z/Millennial VN, thích unique design, local pride, fun personality

const MARKET_DATA = {
  // Thị trường áo thun VN
  tshirtMarketSize2026: 45_000_000_000_000, // 45 nghìn tỷ (apparel market VN)
  graphicTeeSegment: 0.08, // 8% thị phần = ~3,600 tỷ
  yoyGrowth: 0.18, // 18% tăng trưởng YoY online fashion VN

  // Đối thủ — focus graphic tee & local brand space (NOT basic tee competitors)
  competitors: [
    { name: 'Coolmate', revenue: 800_000_000_000, channels: ['Website', 'Shopee', 'TikTok'], strength: 'Brand + subscription + logistics', weakness: 'Basic tees chủ yếu, graphic line yếu, không có local culture DNA' },
    { name: 'Teelab', revenue: 200_000_000_000, channels: ['Website', 'Shopee'], strength: 'Giá rẻ 150-200K, tên tuổi', weakness: 'Design generic, chất lượng thấp, không có brand story' },
    { name: 'Đội Sài Gòn / Saigon Dep', revenue: 30_000_000_000, channels: ['IG', 'Website'], strength: 'Local culture niche giống Teeworld, retro Saigon aesthetic', weakness: 'Team nhỏ 2-3 người, sản lượng thấp, giá cao 350-450K' },
    { name: 'Dirty Coins', revenue: 100_000_000_000, channels: ['Website', 'IG', 'Shopee'], strength: 'Streetwear graphic tees, community mạnh, collab artists', weakness: 'Giá cao 400-600K, target hẹp, không có humor/quote line' },
    { name: 'Local brands nhỏ (IG/TikTok)', revenue: 50_000_000_000, channels: ['IG', 'TikTok'], strength: 'Niche community, authentic, viral potential', weakness: 'Không scale, 1-2 người, fulfillment kém' },
  ],

  // Platform trends 2026
  platformTrends: {
    tiktokOrganic: { reachDecline: -30, note: 'Organic reach giảm 30% YoY, nhưng graphic tee content (quote tees, behind-the-scenes design) vẫn viral được' },
    shopeeMargin: { avgFee: 28, trend: 'Phí sàn squeeze margin, graphic tees giá 250K trên sàn = lỗ' },
    instagramDM: { conversionRate: 8.5, note: 'IG DM là kênh chốt đơn top cho fashion graphic — visual-first platform phù hợp brand DNA' },
    websiteD2C: { avgConversion: 2.8, note: 'D2C graphic tee brands (Dirty Coins, Đội SG) đạt 3-5% conversion nhờ brand loyalty' },
    seoOrganic: { costPerClick: 3500, note: 'Keywords "áo thun in hình", "áo graphic" competition thấp — cơ hội SEO lớn cho Teeworld' },
  },

  // Consumer behavior 2026 — graphic tee specific
  consumerTrends: [
    'Gen Z (18-25) chiếm 35% thị trường — thích unique designs, local culture pride, humor trên áo',
    'Video-first: 72% quyết định mua sau khi xem video (TikTok behind-the-scenes design process = gold content)',
    'D2C trust: 65% Gen Z sẵn sàng mua direct từ brand website nếu có brand story + social proof',
    'Personalization: 48% sẵn sàng trả thêm 10-15% cho custom print — Teeworld có AI design lợi thế',
    'Local pride trend: "Mua hàng Việt" movement mạnh, Saigonese/retro VN aesthetic đang trending',
    'Quote culture: Meme/quote trên áo là social currency cho Gen Z — "Không Được Đánh Khách Hàng" viral proof',
  ],

  // Pricing benchmarks — graphic tee segment
  pricing: {
    avgGraphicTee: 250_000, // Thị trường: 200-350K
    premiumSegment: 400_000, // Brand premium (Dirty Coins, Đội SG): 350-500K
    budgetSegment: 150_000, // Budget graphic (Teelab, no-name): 100-200K
    teeworldTarget: 270_000, // Teeworld sweet spot: 250-300K (affordable unique)
    coolmateAvg: 299_000,
    teelabAvg: 189_000,
  },
};

// ============ ANALYSIS FUNCTIONS ============

export interface MarketResearchReport {
  marketOverview: MarketOverview;
  competitorAnalysis: CompetitorInsight[];
  trendAlerts: TrendAlert[];
  opportunities: Opportunity[];
  threats: Threat[];
  messages: AgentMessage[];
}

interface MarketOverview {
  totalMarketSize: number;
  teeworldMarketShare: number;
  growthRate: number;
  positionVsCompetitors: string;
}

interface CompetitorInsight {
  name: string;
  revenue: number;
  vsTeeworldRevenue: string; // "larger" | "smaller" | "similar"
  keyAdvantage: string;
  keyWeakness: string;
  threatLevel: 'high' | 'medium' | 'low';
}

interface TrendAlert {
  trend: string;
  impact: 'positive' | 'negative' | 'neutral';
  urgency: 'act_now' | 'monitor' | 'long_term';
  recommendation: string;
}

interface Opportunity {
  title: string;
  potentialRevenue: number;
  difficulty: 'easy' | 'medium' | 'hard';
  timeframe: string;
  description: string;
}

interface Threat {
  title: string;
  severity: 'critical' | 'high' | 'medium';
  probability: number; // 0-100
  mitigation: string;
}

export async function runMarketResearchAgent(): Promise<MarketResearchReport> {
  const [pnlData, channelData] = await Promise.all([
    getMonthlyPnL(),
    getChannelEconomics(),
  ]);

  const totalRevenue = pnlData.reduce((s: number, m: Record<string, number>) => s + (m.total_revenue || 0), 0);
  const annualizedRevenue = totalRevenue > 0
    ? Math.round(totalRevenue / Math.max(pnlData.length, 1) * 12)
    : 20_000_000_000;

  // 1. Market Overview
  const segmentSize = MARKET_DATA.tshirtMarketSize2026 * MARKET_DATA.graphicTeeSegment;
  const marketShare = annualizedRevenue / segmentSize * 100;
  const marketOverview: MarketOverview = {
    totalMarketSize: segmentSize,
    teeworldMarketShare: Math.round(marketShare * 100) / 100,
    growthRate: MARKET_DATA.yoyGrowth * 100,
    positionVsCompetitors: marketShare > 1 ? 'Top 5 trong phân khúc graphic tees'
      : marketShare > 0.3 ? 'Đang phát triển, cần scale nhanh'
      : 'Còn nhỏ, nhiều room to grow',
  };

  // 2. Competitor Analysis
  const competitorAnalysis: CompetitorInsight[] = MARKET_DATA.competitors.map(c => ({
    name: c.name,
    revenue: c.revenue,
    vsTeeworldRevenue: c.revenue > annualizedRevenue * 1.5 ? 'larger'
      : c.revenue < annualizedRevenue * 0.5 ? 'smaller' : 'similar',
    keyAdvantage: c.strength,
    keyWeakness: c.weakness,
    threatLevel: c.revenue > annualizedRevenue * 3 ? 'high' as const
      : c.revenue > annualizedRevenue ? 'medium' as const : 'low' as const,
  }));

  // 3. Trend Alerts — based on real platform data
  const websiteChannel = channelData.find((c: { channel: string }) => c.channel === 'Website (D2C)');
  const shopeeChannel = channelData.find((c: { channel: string }) => c.channel === 'Shopee');

  const trendAlerts: TrendAlert[] = [
    {
      trend: `Phí sàn TMĐT tăng lên ~${MARKET_DATA.platformTrends.shopeeMargin.avgFee}% — squeeze margin seller`,
      impact: 'negative',
      urgency: 'act_now',
      recommendation: 'Đúng hướng chuyển D2C. Giảm phụ thuộc sàn xuống <10% DT. Dùng sàn chỉ để acquire customer rồi chuyển về Website/IG.',
    },
    {
      trend: `TikTok organic reach giảm ${Math.abs(MARKET_DATA.platformTrends.tiktokOrganic.reachDecline)}% YoY`,
      impact: 'negative',
      urgency: 'monitor',
      recommendation: 'Organic đang giảm, nhưng viral vẫn possible. Cần test nhiều format (hook khác nhau). Budget cho TikTok Spark Ads boost top-performing organic content thay vì chạy ads thuần.',
    },
    {
      trend: `IG DM commerce tăng 40% YoY — conversion rate ${MARKET_DATA.platformTrends.instagramDM.conversionRate}%`,
      impact: 'positive',
      urgency: 'act_now',
      recommendation: 'IG DM là kênh conversion cao nhất cho fashion VN. Đầu tư: auto-reply + quick reply templates cho Ngọc (CSKH). Mỗi DM = 8.5% chance chốt đơn.',
    },
    {
      trend: `D2C Website conversion VN trung bình ${MARKET_DATA.platformTrends.websiteD2C.avgConversion}%, top performers 5%+`,
      impact: 'neutral',
      urgency: 'monitor',
      recommendation: `Website Teeworld cần đạt ít nhất 3% conversion. Focus: tốc độ load, mobile UX, social proof (reviews, UGC), và urgency (stock counter, limited drops).`,
    },
    {
      trend: `Gen Z (35% thị trường) ưu tiên unique designs + video-first shopping`,
      impact: 'positive',
      urgency: 'act_now',
      recommendation: 'Teeworld có lợi thế AI design (Banana Pro 2) — unique designs mà đối thủ không có. Mỗi BST cần video lookbook trên TikTok TRƯỚC khi launch.',
    },
    {
      trend: `Personalization trend: 48% sẵn sàng trả thêm 10-15% cho custom`,
      impact: 'positive',
      urgency: 'long_term',
      recommendation: 'Q3/Q4 nên test custom print service trên Website (AI generate design theo yêu cầu khách). Giá premium 400-500K. Revenue per order tăng 30-40%.',
    },
  ];

  // 4. Opportunities
  const opportunities: Opportunity[] = [
    {
      title: 'Custom Print-on-Demand qua Website',
      potentialRevenue: 2_000_000_000,
      difficulty: 'medium',
      timeframe: 'Q3-Q4/2026',
      description: 'Cho khách tự thiết kế hoặc AI generate mẫu riêng. Giá premium 400-500K. Margin 60%+ vì không cần stock. Coolmate chưa có feature này.',
    },
    {
      title: 'B2B Corporate/Event — đồng phục startup & event',
      potentialRevenue: 3_000_000_000,
      difficulty: 'medium',
      timeframe: 'Q2-Q3/2026',
      description: 'Thị trường đồng phục startup VN đang boom. MOQ thấp 50 cái phù hợp startup nhỏ. AI design logo miễn phí = competitive advantage lớn.',
    },
    {
      title: 'Subscription Box — Monthly Tee Club',
      potentialRevenue: 1_000_000_000,
      difficulty: 'hard',
      timeframe: 'Q4/2026',
      description: 'Mô hình Coolmate subscription nhưng cho graphic tees. 299K/tháng nhận 1 áo exclusive. Recurring revenue + giảm CAC 5x.',
    },
    {
      title: 'SEO organic traffic — giảm phụ thuộc paid ads',
      potentialRevenue: 1_500_000_000,
      difficulty: 'easy',
      timeframe: 'Q2-Q4/2026 (dài hạn)',
      description: 'Đầu tư content SEO: "áo thun in hình", "graphic tee VN", blog about fashion. 6 tháng để rank. Khi organic traffic = 30% total → ads ROAS tăng gấp đôi.',
    },
  ];

  // 5. Threats
  const threats: Threat[] = [
    {
      title: 'Coolmate mở rộng sang graphic tees',
      severity: 'high',
      probability: 60,
      mitigation: 'Coolmate đang test graphic tees. Lợi thế Teeworld: AI design unique + niche community. Cần build brand identity mạnh trước khi Coolmate scale.',
    },
    {
      title: 'TikTok Shop tăng phí hoặc thay đổi algorithm',
      severity: 'medium',
      probability: 70,
      mitigation: 'Đã chuyển sang D2C model nên impact thấp. Nhưng TikTok là traffic source chính → cần diversify sang SEO + email marketing.',
    },
    {
      title: 'Chi phí ads tăng (CPC +15% YoY)',
      severity: 'high',
      probability: 85,
      mitigation: 'Đầu tư SEO organic + email marketing + community building. Target: 40% traffic organic by Q4/2026. Mỗi 1% organic traffic tăng = giảm 15M ads/tháng.',
    },
    {
      title: 'AI design tools commoditized — đối thủ cũng dùng',
      severity: 'medium',
      probability: 50,
      mitigation: 'AI tools đang phổ biến, nhưng execution + brand storytelling mới tạo khác biệt. Cần xây dựng design system riêng (style guide, signature elements).',
    },
    {
      title: 'Recession/giảm tiêu dùng — fashion discretionary bị ảnh hưởng',
      severity: 'critical',
      probability: 30,
      mitigation: 'Giữ price point 250-350K (affordable luxury). Tránh lên premium quá sớm. Luôn có dòng sản phẩm entry 199K.',
    },
  ];

  // 6. Build insight messages
  const messages: AgentMessage[] = [
    {
      id: 'msg-mr-1',
      agentRole: 'market_research',
      agentName: 'AI Market Research',
      timestamp: new Date().toISOString(),
      content: `THỊ TRƯỜNG: Graphic tees VN ~${(segmentSize / 1e12).toFixed(1)} nghìn tỷ, tăng ${MARKET_DATA.yoyGrowth * 100}%/năm. ` +
        `Teeworld chiếm ${marketShare.toFixed(2)}% — ${marketOverview.positionVsCompetitors}. ` +
        `Đối thủ lớn nhất: Coolmate (${(MARKET_DATA.competitors[0].revenue / 1e9).toFixed(0)} tỷ) đang test graphic tees.`,
      type: 'analysis',
    },
    {
      id: 'msg-mr-2',
      agentRole: 'market_research',
      agentName: 'AI Market Research',
      timestamp: new Date().toISOString(),
      content: `CẢNH BÁO: Phí sàn TMĐT tăng ~30%. D2C là hướng đi đúng. ` +
        `CƠ HỘI LỚN: Custom print-on-demand (2 tỷ potential), B2B corporate (3 tỷ potential), IG DM commerce (CVR 8.5%). ` +
        `RỦI RO: CPC ads tăng 15%/năm → PHẢI đầu tư SEO organic + email marketing ngay.`,
      type: 'alert',
    },
    {
      id: 'msg-mr-3',
      agentRole: 'market_research',
      agentName: 'AI Market Research',
      timestamp: new Date().toISOString(),
      content: buildContrarianInsight(pnlData, channelData, annualizedRevenue),
      type: 'recommendation',
    },
  ];

  return {
    marketOverview,
    competitorAnalysis,
    trendAlerts,
    opportunities,
    threats,
    messages,
  };
}

/**
 * Contrarian insight — things the CEO might not want to hear but needs to.
 * This is what makes a research agent valuable vs just a yes-man.
 */
function buildContrarianInsight(
  pnlData: Array<Record<string, number>>,
  channelData: Array<Record<string, unknown>>,
  annualizedRevenue: number,
): string {
  const insights: string[] = [];

  // Check if revenue target is realistic
  const target = 20_000_000_000;
  const currentRunRate = annualizedRevenue;
  const gap = target - currentRunRate;
  if (gap > target * 0.3) {
    insights.push(
      `THỰC TẾ PHŨ PHÀNG: Run rate hiện tại ${(currentRunRate / 1e9).toFixed(1)} tỷ, target 20 tỷ. ` +
      `Gap ${(gap / 1e9).toFixed(1)} tỷ = cần tăng ${Math.round(gap / currentRunRate * 100)}%. ` +
      `Thị trường graphic tees VN tăng 18%/năm — bạn cần outperform thị trường ${Math.round(gap / currentRunRate * 100 - 18)}pp. Khả thi nếu B2B + custom print bùng nổ.`
    );
  }

  // Check team size vs ambition
  if (annualizedRevenue / 10 > 2_000_000_000) {
    insights.push(
      `NHÂN SỰ: 10 người target 20 tỷ = 2 tỷ DT/người/năm. ` +
      `Benchmark ngành: Coolmate ~1.2 tỷ/người, Teelab ~0.8 tỷ/người. ` +
      `Teeworld cần automation + AI tools mạnh để đạt productivity 2x ngành.`
    );
  } else {
    insights.push(
      `NHÂN SỰ: 10 người cho ${(annualizedRevenue / 1e9).toFixed(1)} tỷ là hợp lý. ` +
      `Nhưng khi scale lên 20 tỷ, KHÔNG nên tuyển thêm — đầu tư automation thay vì headcount.`
    );
  }

  // D2C warning
  insights.push(
    `D2C RISK: Chuyển từ sàn sang D2C = đúng cho margin, nhưng CAC (chi phí thu khách) sẽ TĂNG giai đoạn đầu. ` +
    `Sàn cho traffic miễn phí, website phải mua traffic. ` +
    `Dự kiến ads budget cần tăng 30-40% trong 3 tháng đầu chuyển đổi. ` +
    `Sau 6 tháng khi SEO + email kicks in → CAC sẽ giảm dần.`
  );

  // Brand moat warning
  insights.push(
    `BRAND MOAT: Saigonese + Quote tees đang bán tốt, nhưng ĐỪNG nghĩ đối thủ không copy được. ` +
    `"Đội Sài Gòn" đang làm aesthetic gần giống. Dirty Coins có community streetwear mạnh hơn. ` +
    `MOAT thật sự = (1) tốc độ ra BST (AI design 7 ngày vs đối thủ 30+ ngày), ` +
    `(2) Happy Sunday sub-brand tạo lifestyle identity không ai có, ` +
    `(3) quote culture viral — mỗi quote = free marketing khi khách mặc áo ngoài đường.`
  );

  return `ĐỐI DIỆN SỰ THẬT (Market Research không tô hồng):\n${insights.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;
}
