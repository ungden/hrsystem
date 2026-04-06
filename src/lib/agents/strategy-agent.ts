/**
 * Strategy Agent — Chiến lược gia cấp cao.
 *
 * Agent này KHÔNG phải yes-man. Nó:
 * - Tổng hợp data từ TẤT CẢ agents khác
 * - Đưa ra strategic recommendations có chính kiến
 * - CHALLENGE quyết định của CEO khi data không support
 * - Identify blind spots mà không ai khác thấy
 * - Recommend pivots khi cần thiết
 *
 * Think: McKinsey consultant that doesn't sugarcoat.
 */

import { AgentCoordinationState, AgentMessage } from '../agent-types';
import { MarketResearchReport } from './market-research-agent';

export interface StrategyReport {
  strategicAssessment: StrategicAssessment;
  criticalDecisions: CriticalDecision[];
  blindSpots: BlindSpot[];
  quarterPriorities: QuarterPriority[];
  ceoChallenge: string; // Thẳng thắn nói CEO cần nghe gì
  messages: AgentMessage[];
}

interface StrategicAssessment {
  overallHealth: 'strong' | 'growing' | 'struggling' | 'critical';
  score: number; // 0-100
  topStrength: string;
  topWeakness: string;
  oneLineSummary: string;
}

interface CriticalDecision {
  question: string;
  options: { name: string; pros: string; cons: string; recommendation: boolean }[];
  deadline: string;
  impact: 'high' | 'medium';
}

interface BlindSpot {
  area: string;
  risk: string;
  whatToDoNow: string;
}

interface QuarterPriority {
  rank: number;
  title: string;
  why: string;
  metric: string;
  owner: string;
}

export function runStrategyAgent(
  state: AgentCoordinationState,
  marketResearch: MarketResearchReport,
): StrategyReport {
  const { businessTargets, financialHealth, costProjections, individualPlans,
    channelAnalysis, stockAlerts, collectionPlans, financials } = state;

  // ============ STRATEGIC ASSESSMENT ============

  const revTarget = businessTargets.find(t => t.category === 'revenue');
  const revPct = revTarget ? Math.round(revTarget.currentValue / revTarget.targetValue * 100) : 0;
  const profitMargin = financialHealth.profitMargin;
  const headcount = costProjections.reduce((s, c) => s + c.headcount, 0);
  const atRisk = individualPlans.filter(p => p.status === 'at_risk').length;
  const completionRate = individualPlans.length > 0
    ? Math.round(individualPlans.filter(p => p.status === 'completed').length / individualPlans.length * 100) : 0;
  const totalCost = costProjections.reduce((s, c) => s + c.totalCost, 0);
  const revenuePerHead = revTarget ? Math.round(revTarget.targetValue / Math.max(headcount, 1)) : 0;

  // Score the business: weighted average
  const scores = {
    revenue: Math.min(revPct, 100) * 0.30,
    margin: Math.min(profitMargin / 30 * 100, 100) * 0.25,
    team: Math.min(completionRate, 100) * 0.20,
    growth: Math.min(marketResearch.marketOverview.teeworldMarketShare * 50, 100) * 0.15,
    risk: Math.max(100 - atRisk * 15, 0) * 0.10,
  };
  const totalScore = Math.round(Object.values(scores).reduce((s, v) => s + v, 0));

  const overallHealth: StrategicAssessment['overallHealth'] =
    totalScore >= 75 ? 'strong' : totalScore >= 55 ? 'growing' : totalScore >= 35 ? 'struggling' : 'critical';

  // Find top strength & weakness
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (profitMargin > 25) strengths.push(`Biên LN ${profitMargin}% — top ngành`);
  else weaknesses.push(`Biên LN ${profitMargin}% — cần tối ưu chi phí`);

  if (completionRate > 70) strengths.push(`Team hoàn thành ${completionRate}% tasks`);
  else weaknesses.push(`Team chỉ hoàn thành ${completionRate}% — productivity thấp`);

  const highMarginChannels = channelAnalysis?.filter(c => c.margin_pct >= 35) || [];
  if (highMarginChannels.length >= 2) strengths.push(`${highMarginChannels.length} kênh margin >35%`);

  if (marketResearch.marketOverview.teeworldMarketShare < 0.5)
    weaknesses.push(`Thị phần ${marketResearch.marketOverview.teeworldMarketShare}% — còn quá nhỏ`);

  if (headcount <= 10 && revenuePerHead > 1_500_000_000)
    strengths.push(`Lean team: ${(revenuePerHead / 1e9).toFixed(1)} tỷ DT/người — hiệu quả cao`);

  const strategicAssessment: StrategicAssessment = {
    overallHealth,
    score: totalScore,
    topStrength: strengths[0] || 'D2C model & AI design',
    topWeakness: weaknesses[0] || 'Cần thời gian để scale',
    oneLineSummary: buildOneLiner(overallHealth, revPct, profitMargin, headcount),
  };

  // ============ CRITICAL DECISIONS ============

  const criticalDecisions: CriticalDecision[] = [
    {
      question: 'Happy Sunday: giữ là 1 line hay tách thành sub-brand riêng?',
      options: [
        {
          name: 'Tách Happy Sunday thành sub-brand (IG riêng, identity riêng)',
          pros: 'Travel/lifestyle community riêng, collab homestay/cafe. Target audience rộng hơn Texture Studio. Second revenue stream.',
          cons: 'Chia resources, cần content riêng (1 người manage), brand dilution nếu làm không tốt.',
          recommendation: true,
        },
        {
          name: 'Giữ Happy Sunday là collection line trong Teeworld',
          pros: 'Tập trung resources, 1 brand identity. Đơn giản hơn.',
          cons: 'Mất cơ hội build travel lifestyle community. Happy Sunday bị pha loãng trong Saigonese/Quote.',
          recommendation: false,
        },
      ],
      deadline: 'Test T5-T6, quyết định cuối T6/2026',
      impact: 'high',
    },
    {
      question: 'Quote tees: Flash Drop model hay BST theo tháng truyền thống?',
      options: [
        {
          name: 'Flash Quote Drop: 2x/tháng, 3-5 designs, bán 48h rồi hết',
          pros: 'FOMO + scarcity tạo urgency. Mỗi drop = content event viral. "Không Được Đánh Khách Hàng" chứng minh model này works.',
          cons: 'Cần hệ thống quote pipeline, logistics nhanh. Risk: 1 drop flop = mất momentum.',
          recommendation: true,
        },
        {
          name: 'Quote tees gộp vào BST hàng tháng như bình thường',
          pros: 'Đơn giản, không cần process riêng. Ít risk.',
          cons: 'Mất FOMO effect. Quote tees bị lẫn với designs khác. Không tận dụng viral potential.',
          recommendation: false,
        },
      ],
      deadline: 'Áp dụng từ T5/2026',
      impact: 'high',
    },
    {
      question: 'Ads budget: FB paid vs TikTok organic vs SEO long-term?',
      options: [
        {
          name: '70% FB Ads, 30% TikTok boost',
          pros: 'FB retarget graphic tee shoppers chính xác. ROAS predictable.',
          cons: 'CPC tăng 15%/năm. Phụ thuộc Meta. Không build brand awareness.',
          recommendation: false,
        },
        {
          name: '50% FB, 30% TikTok (organic + Spark), 20% SEO/Email',
          pros: 'TikTok behind-the-scenes design = gold content cho graphic brand. SEO "áo thun in hình" competition thấp. Email cho BST drops.',
          cons: 'SEO chậm 3-6 tháng. Ngắn hạn revenue có thể giảm 10%.',
          recommendation: true,
        },
      ],
      deadline: 'Áp dụng từ T5/2026',
      impact: 'high',
    },
    {
      question: 'B2B đồng phục: AI design advantage hay partnership model?',
      options: [
        {
          name: 'Ngọc lead + AI design miễn phí cho khách B2B (competitive advantage)',
          pros: 'AI generate logo lên áo miễn phí = unique selling point. Startup/event thích giá rẻ + thiết kế nhanh.',
          cons: 'Cần Hoàng support AI design B2B. Chia resources từ D2C.',
          recommendation: false,
        },
        {
          name: 'Ngọc lead B2B + partner 3-5 agency + AI design upsell',
          pros: 'Agency mang khách, Teeworld fulfill. AI design = premium upsell 50K/design. Scale không tăng headcount.',
          cons: 'Chia margin 10-15% cho agency. Ít control khách hàng.',
          recommendation: true,
        },
      ],
      deadline: 'Q2/2026',
      impact: 'medium',
    },
  ];

  // ============ BLIND SPOTS ============

  const blindSpots: BlindSpot[] = [
    {
      area: 'Email Marketing = $0 investment — graphic tee buyers = collectors',
      risk: 'Đang bỏ qua owned channel mạnh nhất. Email ROI 42:1. Graphic tee buyers collect theo BST — ' +
        'email "Saigonese mới drop" hoặc "Quote tee mới" sẽ convert cực tốt. Coolmate có 500K+ subscribers.',
      whatToDoNow: 'Setup email popup trên Website NGAY. Series: Welcome → BST Saigonese drops → Quote tee mới → ' +
        'Happy Sunday travel inspo. Target: 5,000 subscribers by end Q2.',
    },
    {
      area: 'Happy Sunday sub-brand đang bị under-utilized',
      risk: 'Happy Sunday có DNA travel/lifestyle rất mạnh nhưng đang chỉ là 1 line nhỏ. ' +
        'Tiềm năng: lifestyle brand riêng, IG account riêng, collab homestay/cafe. ' +
        'Nếu không build → bị pha loãng, mất cơ hội tạo second revenue stream.',
      whatToDoNow: 'Test T5-T6: Happy Sunday IG riêng (travel content + tee styling). ' +
        'Collab 3-5 homestay/cafe Đà Lạt, Hội An (đặt áo bán tại quán). Zero CAC.',
    },
    {
      area: 'Single point of failure: Hoàng = Website + SEO + AI Design + brand aesthetic',
      risk: 'Toàn bộ Saigonese retro aesthetic + Texture Studio style phụ thuộc taste của 1 người. ' +
        'Nếu Hoàng out → design pipeline (Banana Pro 2) + Website + SEO dừng hẳn.',
      whatToDoNow: 'Document AI prompts cho từng line (Saigonese retro, Quote, Happy Sunday), ' +
        'style guide, color palette, typography vào Notion. Đức Anh cross-train Website. 3 tháng deadline.',
    },
    {
      area: 'Quote tee pipeline chưa systematic — đang dựa vào cảm hứng',
      risk: '"Không Được Đánh Khách Hàng" viral tự nhiên nhưng không có hệ thống tạo quotes mới. ' +
        'Mỗi quote viral = free marketing khi khách mặc áo ngoài đường. Đang để money on the table.',
      whatToDoNow: 'Quote Pipeline: trending VN memes weekly → AI generate variations → ' +
        'test IG story poll → top 3 → sản xuất 48h → "Flash Quote Drop". 2 drops/tháng, 20-30M/drop.',
    },
    {
      area: 'Chưa track data theo collection line — marketing mù',
      risk: 'Không biết ai mua Saigonese vs Happy Sunday vs Quote. Repeat rate per line? Cross-sell rate? ' +
        'Không data → không biết line nào invest thêm, line nào scale back.',
      whatToDoNow: 'GA4 + enhanced e-commerce BY COLLECTION LINE. ' +
        'Tâm track monthly: revenue/line, repeat rate/line, AOV/line, cross-sell rate.',
    },
  ];

  // ============ QUARTER PRIORITIES ============

  const currentQ = getCurrentQuarter();
  const quarterPriorities: QuarterPriority[] = buildQuarterPriorities(
    currentQ, state, marketResearch, profitMargin, completionRate, headcount
  );

  // ============ CEO CHALLENGE ============

  const ceoChallenge = buildCEOChallenge(state, marketResearch, revPct, profitMargin);

  // ============ MESSAGES ============

  const messages: AgentMessage[] = [
    {
      id: 'msg-str-1',
      agentRole: 'strategy',
      agentName: 'AI Strategy Advisor',
      timestamp: new Date().toISOString(),
      content: `ĐÁNH GIÁ CHIẾN LƯỢC: ${overallHealth.toUpperCase()} (${totalScore}/100). ` +
        `${strategicAssessment.oneLineSummary}`,
      type: 'analysis',
    },
    {
      id: 'msg-str-2',
      agentRole: 'strategy',
      agentName: 'AI Strategy Advisor',
      timestamp: new Date().toISOString(),
      content: `BLIND SPOTS CEO CẦN BIẾT:\n${blindSpots.map((b, i) => `${i + 1}. ${b.area}: ${b.risk.split('.')[0]}.`).join('\n')}`,
      type: 'alert',
    },
    {
      id: 'msg-str-3',
      agentRole: 'strategy',
      agentName: 'AI Strategy Advisor',
      timestamp: new Date().toISOString(),
      content: ceoChallenge,
      type: 'recommendation',
    },
    {
      id: 'msg-str-4',
      agentRole: 'strategy',
      agentName: 'AI Strategy Advisor',
      timestamp: new Date().toISOString(),
      content: `TOP ${quarterPriorities.length} ƯU TIÊN ${currentQ}:\n` +
        quarterPriorities.map(p => `#${p.rank}. ${p.title} — ${p.why} [KPI: ${p.metric}] → ${p.owner}`).join('\n'),
      type: 'decision',
    },
  ];

  return {
    strategicAssessment,
    criticalDecisions,
    blindSpots,
    quarterPriorities,
    ceoChallenge,
    messages,
  };
}

// ============ HELPER FUNCTIONS ============

function buildOneLiner(
  health: string, revPct: number, margin: number, headcount: number,
): string {
  switch (health) {
    case 'strong':
      return `Teeworld đang vận hành tốt. DT đạt ${revPct}%, margin ${margin}%. Focus: scale + defend market position.`;
    case 'growing':
      return `Teeworld đang phát triển nhưng chưa ổn định. DT ${revPct}% target, ${headcount} NV. Cần tập trung vào execution + conversion.`;
    case 'struggling':
      return `Teeworld đang gặp khó. DT chỉ đạt ${revPct}% target, margin ${margin}%. Cần pivot hoặc cut costs ngay.`;
    default:
      return `Teeworld trong tình trạng nghiêm trọng. Cần hành động khẩn cấp: review lại toàn bộ chi phí và chiến lược.`;
  }
}

function getCurrentQuarter(): string {
  const month = new Date().getMonth() + 1;
  if (month <= 3) return 'Q1/2027';
  if (month <= 6) return 'Q2/2026';
  if (month <= 9) return 'Q3/2026';
  return 'Q4/2026';
}

function buildQuarterPriorities(
  quarter: string,
  state: AgentCoordinationState,
  research: MarketResearchReport,
  margin: number,
  completionRate: number,
  headcount: number,
): QuarterPriority[] {
  // Dynamic priorities based on actual state
  const priorities: QuarterPriority[] = [];
  let rank = 0;

  // Always #1: Revenue
  priorities.push({
    rank: ++rank,
    title: 'Chuyển đổi D2C: Website conversion ≥ 3%',
    why: 'Đã bỏ sàn, Website là sống còn. Dưới 3% conversion = burn cash cho ads.',
    metric: 'Website conversion rate, DT Website/tháng',
    owner: 'Hoàng (Lead Marketing) + Đức Anh (Ads)',
  });

  // #2: Based on team status
  if (completionRate < 60) {
    priorities.push({
      rank: ++rank,
      title: 'Ổn định team mới — 4 NV join T5 cần onboarding',
      why: `Team completion rate ${completionRate}%. 4 NV mới cần 1-2 tháng adapt.`,
      metric: 'Completion rate ≥ 70% by end of month 2',
      owner: 'Vi (Lead VH) + CEO mentoring',
    });
  }

  // #3: Email marketing (blind spot)
  priorities.push({
    rank: ++rank,
    title: 'Setup Email Marketing — 5,000 subscribers by end Q',
    why: 'Owned channel, ROI 42:1. Hiện = 0. Mỗi subscriber = 150K/năm revenue potential.',
    metric: 'Email subscribers, open rate, revenue from email',
    owner: 'Đức Anh setup + Hoàng content',
  });

  // #4: TikTok content engine
  priorities.push({
    rank: ++rank,
    title: 'TikTok Content Engine: 3 videos/ngày, 1 viral/tuần',
    why: 'TikTok = top-of-funnel cho D2C. Cần volume để test hooks. 1 viral = 10K website visits.',
    metric: 'Videos/ngày, views/video, Website traffic from TikTok',
    owner: 'Khôi (Content) + Hoàng (strategy)',
  });

  // #5: B2B pipeline
  if (research.opportunities.find(o => o.title.includes('B2B'))) {
    priorities.push({
      rank: ++rank,
      title: 'B2B Pipeline: 20 leads/tháng, 5 deals closed',
      why: 'B2B margin 31%, không phụ thuộc sàn/ads. Recurring nếu build relationships.',
      metric: 'Leads, proposals sent, deals closed, B2B revenue',
      owner: 'Ngọc (B2B Sales)',
    });
  }

  return priorities;
}

/**
 * CEO Challenge — Nói thẳng những gì CEO cần nghe.
 * Không tô hồng, không sợ. Đây là giá trị lớn nhất của Strategy Agent.
 */
function buildCEOChallenge(
  state: AgentCoordinationState,
  research: MarketResearchReport,
  revPct: number,
  margin: number,
): string {
  const challenges: string[] = [];

  // Challenge 1: Target reality check
  challenges.push(
    `TARGET 20 TỶ: Hiện đạt ${revPct}% target quý. Thị trường graphic tees tăng 18%/năm — ` +
    `bạn đang đòi tăng trưởng gấp ${Math.round(100 / Math.max(revPct, 1) * 100 / 18)}x thị trường. ` +
    `KHÔNG PHẢI KHÔNG THỂ — nhưng cần execution hoàn hảo, đặc biệt Q3-Q4 peak season.`
  );

  // Challenge 2: D2C transition cost
  challenges.push(
    `CHUYỂN D2C SẼ ĐAU TRƯỚC KHI SƯỚNG: 2-3 tháng đầu (T5-T7), DT có thể GIẢM 15-20% ` +
    `vì mất traffic sàn mà Website chưa đủ organic. Đừng hoảng loạn. ` +
    `Chỉ số theo dõi: Website traffic growth week-over-week, không phải revenue tháng.`
  );

  // Challenge 3: Team capacity
  const { individualPlans } = state;
  const atRisk = individualPlans.filter(p => p.status === 'at_risk').length;
  if (atRisk > 2) {
    challenges.push(
      `TEAM ĐANG QUÁ TẢI: ${atRisk} NV at_risk. Bạn đang thêm 4 NV mới + chuyển đổi D2C + ` +
      `target 20 tỷ CÙNG LÚC. Đó là 3 biến lớn đồng thời. ` +
      `ĐỀ XUẤT: Focus Q2 vào 1 việc duy nhất — ỔN ĐỊNH D2C CONVERSION. Mọi thứ khác có thể chờ.`
    );
  }

  // Challenge 4: Dependency risk
  challenges.push(
    `RỦI RO PHỤ THUỘC: Toàn bộ design + website + SEO phụ thuộc 1 người (Hoàng). ` +
    `Toàn bộ sản xuất phụ thuộc 1 lead (Vi). Nếu 1 trong 2 out → doanh nghiệp paralyzed. ` +
    `HÀNH ĐỘNG: Cross-training trong 60 ngày. Không phải option, là survival.`
  );

  // Challenge 5: Brand moat
  const doiSG = research.competitorAnalysis.find(c => c.name.includes('Sài Gòn') || c.name.includes('Saigon'));
  const dirtyCoins = research.competitorAnalysis.find(c => c.name.includes('Dirty'));
  challenges.push(
    `BRAND MOAT: Saigonese retro-modern + Quote tees + Happy Sunday = Teeworld DNA. ` +
    `NHƯNG đối thủ đang gần: ${doiSG ? `"${doiSG.name}" làm aesthetic giống` : 'local brands bắt chước'}` +
    `${dirtyCoins ? `, Dirty Coins có community streetwear mạnh hơn` : ''}. ` +
    `MOAT thật sự KHÔNG phải design — AI tools ai cũng dùng được. MOAT = ` +
    `(1) Tốc độ ra BST 7 ngày vs đối thủ 30+ ngày, ` +
    `(2) Quote culture viral (mỗi áo quote = free marketing ngoài đường), ` +
    `(3) Happy Sunday lifestyle community (travel + tee = identity, không ai copy được). ` +
    `HÀNH ĐỘNG: Build community TRƯỚC khi đối thủ clone aesthetic.`
  );

  return `LỜI KHUYÊN THẲNG THẮN (Strategy Advisor nói thật):\n\n${challenges.map((c, i) => `${i + 1}. ${c}`).join('\n\n')}`;
}
