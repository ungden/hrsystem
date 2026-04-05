"use client";

import { useState, useEffect } from 'react';
import { DollarSign, ShoppingCart, TrendingUp, Save, Loader2, CheckCircle2, BarChart3 } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import { getEmployees, getDailyMetricsByDate, upsertDailyMetric, getDailyMetrics } from '@/lib/supabase-data';

function fmt(n: number) { return new Intl.NumberFormat('vi-VN').format(n); }

// Ai phụ trách kênh nào
// NOTE: defaultOwner IDs are demo defaults and may not match real Supabase employee IDs.
// Update these to match actual employee records when connecting to production data.
const CHANNEL_OWNERS: Record<string, { label: string; color: string; defaultOwner: number; ownerRole: string }> = {
  'Shopee': { label: 'Shopee', color: 'bg-orange-50 border-orange-200', defaultOwner: 6, ownerRole: 'Đặng Thị Hồng - QL Đơn hàng' },
  'TikTok': { label: 'TikTok Shop', color: 'bg-pink-50 border-pink-200', defaultOwner: 6, ownerRole: 'Đặng Thị Hồng - QL Đơn hàng' },
  'Website': { label: 'Website', color: 'bg-blue-50 border-blue-200', defaultOwner: 5, ownerRole: 'Võ Minh Tuấn - TN Sales' },
  'FB/IG': { label: 'Facebook / Instagram', color: 'bg-purple-50 border-purple-200', defaultOwner: 3, ownerRole: 'Trần Văn Hùng - Ads Specialist' },
  'B2B': { label: 'B2B / Đối tác', color: 'bg-green-50 border-green-200', defaultOwner: 5, ownerRole: 'Võ Minh Tuấn - TN Sales' },
};

const CHANNELS = Object.keys(CHANNEL_OWNERS);

interface ChannelData {
  revenue: string;
  orders_count: string;
  returns_count: string;
  ad_spend: string;
  platform_fee: string;
  shipping_cost: string;
  other_cost: string;
  new_customers: string;
  notes: string;
  saved: boolean;
}

const emptyChannel = (): ChannelData => ({
  revenue: '', orders_count: '', returns_count: '', ad_spend: '',
  platform_fee: '', shipping_cost: '', other_cost: '', new_customers: '', notes: '', saved: false,
});

export default function DailyDataEntryPage() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState<Record<string, ChannelData>>({});
  const [employees, setEmployees] = useState<Array<{ id: number; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<Array<{ report_date: string; channel: string; revenue: number; orders_count: number }>>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [emps, existing, history] = await Promise.all([
          getEmployees(),
          getDailyMetricsByDate(date),
          getDailyMetrics({ date_from: getWeekAgo(), date_to: date }),
        ]);
        setEmployees(emps);
        setHistoryData(history);

        const newData: Record<string, ChannelData> = {};
        CHANNELS.forEach(ch => {
          const ex = existing.find((e: { channel: string }) => e.channel === ch);
          if (ex) {
            newData[ch] = {
              revenue: String(ex.revenue || ''),
              orders_count: String(ex.orders_count || ''),
              returns_count: String(ex.returns_count || ''),
              ad_spend: String(ex.ad_spend || ''),
              platform_fee: String(ex.platform_fee || ''),
              shipping_cost: String(ex.shipping_cost || ''),
              other_cost: String(ex.other_cost || ''),
              new_customers: String(ex.new_customers || ''),
              notes: ex.notes || '',
              saved: true,
            };
          } else {
            newData[ch] = emptyChannel();
          }
        });
        setData(newData);
      } catch (e) { console.error(e); } finally { setLoading(false); }
    }
    load();
  }, [date]);

  function getWeekAgo() {
    const d = new Date(date);
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  }

  function updateField(channel: string, field: keyof ChannelData, value: string) {
    setData(prev => ({
      ...prev,
      [channel]: { ...prev[channel], [field]: value, saved: false },
    }));
  }

  async function saveChannel(channel: string) {
    const d = data[channel];
    if (!d) return;
    setSaving(channel);
    try {
      const owner = CHANNEL_OWNERS[channel];
      await upsertDailyMetric({
        report_date: date,
        channel,
        entered_by: owner.defaultOwner,
        revenue: parseInt(d.revenue) || 0,
        orders_count: parseInt(d.orders_count) || 0,
        returns_count: parseInt(d.returns_count) || 0,
        ad_spend: parseInt(d.ad_spend) || 0,
        platform_fee: parseInt(d.platform_fee) || 0,
        shipping_cost: parseInt(d.shipping_cost) || 0,
        other_cost: parseInt(d.other_cost) || 0,
        new_customers: parseInt(d.new_customers) || 0,
        notes: d.notes,
      });
      setData(prev => ({ ...prev, [channel]: { ...prev[channel], saved: true } }));
    } catch (e) { console.error(e); } finally { setSaving(null); }
  }

  async function saveAll() {
    for (const ch of CHANNELS) {
      if (data[ch] && !data[ch].saved && data[ch].revenue) {
        await saveChannel(ch);
      }
    }
  }

  // Calculate totals
  const totalRevenue = CHANNELS.reduce((s, ch) => s + (parseInt(data[ch]?.revenue) || 0), 0);
  const totalOrders = CHANNELS.reduce((s, ch) => s + (parseInt(data[ch]?.orders_count) || 0), 0);
  const totalAdSpend = CHANNELS.reduce((s, ch) => s + (parseInt(data[ch]?.ad_spend) || 0), 0);
  const totalCost = CHANNELS.reduce((s, ch) => {
    const d = data[ch];
    if (!d) return s;
    return s + (parseInt(d.ad_spend) || 0) + (parseInt(d.platform_fee) || 0) + (parseInt(d.shipping_cost) || 0) + (parseInt(d.other_cost) || 0);
  }, 0);

  if (loading) {
    return <div className="p-6 flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;
  }

  return (
    <div className="p-4 sm:p-6">
      <PageHeader
        title="Nhập số liệu hàng ngày"
        subtitle="NV phụ trách từng kênh nhập doanh thu, đơn hàng, chi phí"
        breadcrumbs={[{ label: 'Vận hành', href: '/admin' }, { label: 'Nhập số liệu' }]}
        actions={
          <div className="flex gap-2 items-center">
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            <button onClick={saveAll}
              className="flex items-center gap-1.5 bg-blue-600 text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-blue-700">
              <Save size={14} /> Lưu tất cả
            </button>
          </div>
        }
      />

      {/* Daily totals */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatCard icon={DollarSign} label="Tổng doanh thu" value={totalRevenue > 0 ? `${(totalRevenue / 1_000_000).toFixed(1)}M` : '—'} color="green" />
        <StatCard icon={ShoppingCart} label="Tổng đơn hàng" value={totalOrders || '—'} color="blue" />
        <StatCard icon={BarChart3} label="Chi phí ads" value={totalAdSpend > 0 ? `${(totalAdSpend / 1_000_000).toFixed(1)}M` : '—'} color="purple" />
        <StatCard icon={TrendingUp} label="ROAS" value={totalAdSpend > 0 ? `${(totalRevenue / totalAdSpend).toFixed(1)}x` : '—'} color="orange" />
      </div>

      {/* Channel cards */}
      <div className="space-y-4">
        {CHANNELS.map(channel => {
          const cfg = CHANNEL_OWNERS[channel];
          const d = data[channel] || emptyChannel();

          // Yesterday's data for comparison
          const yesterday = historyData.find(h => h.channel === channel && h.report_date !== date);
          const profit = (parseInt(d.revenue) || 0) - (parseInt(d.ad_spend) || 0) - (parseInt(d.platform_fee) || 0) - (parseInt(d.shipping_cost) || 0) - (parseInt(d.other_cost) || 0);

          return (
            <div key={channel} className={`rounded-xl border ${cfg.color} p-4 sm:p-5`}>
              {/* Channel header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-800">{cfg.label}</h3>
                  <p className="text-[11px] text-slate-500">Phụ trách: {cfg.ownerRole}</p>
                </div>
                <div className="flex items-center gap-2">
                  {d.saved && <CheckCircle2 size={16} className="text-green-500" />}
                  <button onClick={() => saveChannel(channel)} disabled={saving === channel || d.saved}
                    className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-50">
                    {saving === channel ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                    {d.saved ? 'Đã lưu' : 'Lưu'}
                  </button>
                </div>
              </div>

              {/* Input grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-slate-600 mb-1 block">Doanh thu (VND) <span className="text-red-500">*</span></label>
                  <input type="number" value={d.revenue} onChange={e => updateField(channel, 'revenue', e.target.value)}
                    placeholder="0" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-600 mb-1 block">Số đơn hàng <span className="text-red-500">*</span></label>
                  <input type="number" value={d.orders_count} onChange={e => updateField(channel, 'orders_count', e.target.value)}
                    placeholder="0" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-600 mb-1 block">Đơn hoàn trả</label>
                  <input type="number" value={d.returns_count} onChange={e => updateField(channel, 'returns_count', e.target.value)}
                    placeholder="0" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm" />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-600 mb-1 block">KH mới</label>
                  <input type="number" value={d.new_customers} onChange={e => updateField(channel, 'new_customers', e.target.value)}
                    placeholder="0" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm" />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-600 mb-1 block">Chi phí ads</label>
                  <input type="number" value={d.ad_spend} onChange={e => updateField(channel, 'ad_spend', e.target.value)}
                    placeholder="0" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm" />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-600 mb-1 block">Phí sàn</label>
                  <input type="number" value={d.platform_fee} onChange={e => updateField(channel, 'platform_fee', e.target.value)}
                    placeholder="0" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm" />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-600 mb-1 block">Phí vận chuyển</label>
                  <input type="number" value={d.shipping_cost} onChange={e => updateField(channel, 'shipping_cost', e.target.value)}
                    placeholder="0" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm" />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-600 mb-1 block">Chi phí khác</label>
                  <input type="number" value={d.other_cost} onChange={e => updateField(channel, 'other_cost', e.target.value)}
                    placeholder="0" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm" />
                </div>
              </div>

              {/* Notes + Summary */}
              <div className="mt-3 flex flex-col sm:flex-row gap-3">
                <input type="text" value={d.notes} onChange={e => updateField(channel, 'notes', e.target.value)}
                  placeholder="Ghi chú (flash sale, lỗi hệ thống, v.v.)" className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                {(parseInt(d.revenue) || 0) > 0 && (
                  <div className="flex gap-3 text-[12px] items-center flex-shrink-0">
                    <span className="text-slate-500">AOV: <strong className="text-slate-800">{fmt(Math.round((parseInt(d.revenue) || 0) / Math.max(1, parseInt(d.orders_count) || 1)))}đ</strong></span>
                    <span className="text-slate-500">Lãi gộp: <strong className={profit >= 0 ? 'text-green-700' : 'text-red-600'}>{fmt(profit)}đ</strong></span>
                    {(parseInt(d.ad_spend) || 0) > 0 && (
                      <span className="text-slate-500">ROAS: <strong className="text-blue-700">{((parseInt(d.revenue) || 0) / (parseInt(d.ad_spend) || 1)).toFixed(1)}x</strong></span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 7-day history */}
      {historyData.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 mt-6">
          <h2 className="text-base font-semibold text-slate-800 mb-4">Lịch sử 7 ngày</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-left text-[10px] text-slate-500 uppercase border-b-2 border-slate-200">
                  <th className="pb-2 pr-2">Ngày</th>
                  {CHANNELS.map(ch => <th key={ch} className="pb-2 px-2 text-center">{ch}</th>)}
                  <th className="pb-2 pl-2 text-right">Tổng</th>
                </tr>
              </thead>
              <tbody>
                {[...new Set(historyData.map(h => h.report_date))].sort().reverse().slice(0, 7).map(d => {
                  const dayData = historyData.filter(h => h.report_date === d);
                  const dayTotal = dayData.reduce((s, h) => s + (h.revenue || 0), 0);
                  return (
                    <tr key={d} className="border-b border-slate-50">
                      <td className="py-1.5 pr-2 text-slate-600">{d}</td>
                      {CHANNELS.map(ch => {
                        const chData = dayData.find(h => h.channel === ch);
                        return <td key={ch} className="py-1.5 px-2 text-center text-slate-700">
                          {chData ? `${(chData.revenue / 1_000_000).toFixed(1)}M` : '—'}
                        </td>;
                      })}
                      <td className="py-1.5 pl-2 text-right font-medium text-slate-800">{dayTotal > 0 ? `${(dayTotal / 1_000_000).toFixed(1)}M` : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
