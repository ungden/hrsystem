import { ChannelAnalysis, AgentMessage } from '../agent-types';
import { getMonthlyPnL, getExpenses } from '@/lib/supabase-data';

const channelConfig: Record<string, { marginPct: number; targetShare: number }> = {
  'Website': { marginPct: 40.9, targetShare: 25 },
  'Facebook/Instagram': { marginPct: 35.1, targetShare: 25 },
  'B2B': { marginPct: 30.7, targetShare: 20 },
  'TikTok': { marginPct: 26.4, targetShare: 15 },
  'Shopee': { marginPct: 18.5, targetShare: 15 },
};

const revenueFieldMap: Record<string, string> = {
  'Website': 'revenue_website',
  'Facebook/Instagram': 'revenue_fbig',
  'B2B': 'revenue_b2b',
  'TikTok': 'revenue_tiktok',
  'Shopee': 'revenue_shopee',
};

export async function runChannelOptimizerAgent(): Promise<{
  analysis: ChannelAnalysis[];
  messages: AgentMessage[];
}> {
  const [pnlData, expenses] = await Promise.all([
    getMonthlyPnL(),
    getExpenses(),
  ]);

  // Get latest 3 months of PnL
  const sorted = [...pnlData].sort((a: { month: string }, b: { month: string }) =>
    b.month.localeCompare(a.month));
  const recent = sorted.slice(0, 3);

  // Sum revenue per channel from recent months
  const channelRevenue: Record<string, number> = {};
  const totalRevenue = recent.reduce((s: number, m: { total_revenue: number }) => s + (m.total_revenue || 0), 0);

  for (const [channel, field] of Object.entries(revenueFieldMap)) {
    channelRevenue[channel] = recent.reduce((s: number, m: Record<string, number>) =>
      s + (m[field] || 0), 0);
  }

  // Marketing expenses by channel (estimate from total mkt spend)
  const mktExpenses = expenses.filter((e: { category: string }) => e.category === 'mkt');
  const totalAdSpend = mktExpenses.reduce((s: number, e: { amount: number }) => s + (e.amount || 0), 0);

  // Estimate ad spend per channel based on typical allocation
  const adAllocation: Record<string, number> = {
    'Facebook/Instagram': 0.33,
    'TikTok': 0.20,
    'Shopee': 0.18,
    'Website': 0.08, // Google Ads
    'B2B': 0.10,
  };

  const analysis: ChannelAnalysis[] = Object.entries(channelConfig).map(([channel, config]) => {
    const revenue = channelRevenue[channel] || 0;
    const share = totalRevenue > 0 ? Math.round((revenue / totalRevenue) * 100) : 0;
    const adSpend = Math.round(totalAdSpend * (adAllocation[channel] || 0.1));
    const roas = adSpend > 0 ? Math.round((revenue / adSpend) * 10) / 10 : 0;

    let recommendation: ChannelAnalysis['recommendation'] = 'maintain';
    if (config.marginPct >= 35 && share < config.targetShare) recommendation = 'increase';
    else if (config.marginPct < 20 && share > config.targetShare) recommendation = 'decrease';
    else if (roas > 0 && roas < 4) recommendation = 'optimize';

    return {
      channel,
      revenue,
      margin_pct: config.marginPct,
      revenue_share: share,
      adSpend,
      roas,
      recommendation,
    };
  }).sort((a, b) => b.margin_pct - a.margin_pct);

  // Generate insights
  const highMarginChannels = analysis.filter(a => a.margin_pct >= 35);
  const lowROAS = analysis.filter(a => a.roas > 0 && a.roas < 4);
  const topChannel = analysis[0];

  const messages: AgentMessage[] = [
    {
      id: 'msg-channel-1',
      agentRole: 'channel_optimizer',
      agentName: 'AI Channel Optimizer',
      timestamp: new Date().toISOString(),
      content: `Phân tích 5 kênh bán: ${topChannel.channel} dẫn đầu margin ${topChannel.margin_pct}%. ` +
        `Kênh margin cao (>35%): ${highMarginChannels.map(c => c.channel).join(', ')}. ` +
        `Tổng doanh thu 3 tháng: ${(totalRevenue / 1e9).toFixed(1)} tỷ. ` +
        `Ads budget: ${(totalAdSpend / 1e6).toFixed(0)}M. ` +
        (lowROAS.length > 0 ? `Cảnh báo: ${lowROAS.map(c => `${c.channel} ROAS ${c.roas}x`).join(', ')} - cần tối ưu.` : 'Tất cả kênh ROAS ổn.'),
      type: lowROAS.length > 0 ? 'alert' : 'analysis',
    },
    {
      id: 'msg-channel-2',
      agentRole: 'channel_optimizer',
      agentName: 'AI Channel Optimizer',
      timestamp: new Date().toISOString(),
      content: `Đề xuất: ${analysis.filter(a => a.recommendation === 'increase').map(a => `Tăng ${a.channel}`).join(', ') || 'Giữ nguyên'}. ` +
        `${analysis.filter(a => a.recommendation === 'decrease').map(a => `Giảm ${a.channel}`).join(', ') || ''}. ` +
        `Chiến lược: Push traffic từ Social → Website (margin gap 2.2x vs Shopee). Flash sale chỉ khi cần clear stock.`,
      type: 'recommendation',
    },
  ];

  return { analysis, messages };
}
