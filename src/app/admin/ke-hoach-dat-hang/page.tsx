"use client";

import { useState, useEffect, useMemo } from 'react';
import { Package, TrendingUp, DollarSign, AlertTriangle, Loader2, Calculator, Truck } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import { getInventory, getMonthlyPnL, getOrders, getProducts } from '@/lib/supabase-data';

function fmt(n: number) { return new Intl.NumberFormat('vi-VN').format(n); }

// POD Business Model Constants
const BLANK_COST = 75000; // Cost áo trắng/đen/kem
const BLANK_OVERSIZE_COST = 80000;
const PRINT_PACKAGING_COST = 20000; // In + bao bì (trả ngay)
const PAYMENT_TERMS_DAYS = 60; // Công nợ đối tác 2 tháng

interface InventoryItem {
  id: number; item_name: string; category: string; current_stock: number;
  min_stock: number; cost_per_unit: number; supplier: string;
}

interface OrderPlan {
  color: string;
  size: string;
  currentStock: number;
  minStock: number;
  forecastDemand: number; // dự kiến bán trong 30 ngày
  toOrder: number; // cần đặt thêm
  cost: number;
  paymentNote: string;
}

export default function OrderingPlanPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [pnlData, setPnlData] = useState<Array<{ total_revenue: number; orders_count: number; month: string }>>([]);
  const [products, setProducts] = useState<Array<{ base_price: number; cost_price: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [targetRevenue, setTargetRevenue] = useState(2000); // Target doanh thu tháng (triệu)
  const [safetyStockDays, setSafetyStockDays] = useState(14); // Buffer ngày tồn kho an toàn

  useEffect(() => {
    async function load() {
      try {
        const [inv, pnl, prods] = await Promise.all([getInventory(), getMonthlyPnL(), getProducts()]);
        setInventory(inv);
        setPnlData(pnl);
        setProducts(prods);
        // Set target based on latest month revenue
        if (pnl.length > 0) {
          const lastMonth = pnl[pnl.length - 1];
          setTargetRevenue(Math.round((lastMonth.total_revenue || 0) / 1_000_000));
        }
      } catch (e) { console.error(e); } finally { setLoading(false); }
    }
    load();
  }, []);

  // CFO Analysis
  const analysis = useMemo(() => {
    const avgPrice = products.length > 0
      ? products.reduce((s, p) => s + p.base_price, 0) / products.length
      : 280000;
    const targetRevenueVND = targetRevenue * 1_000_000;
    const forecastOrdersMonth = Math.round(targetRevenueVND / avgPrice);
    const forecastOrdersDay = Math.round(forecastOrdersMonth / 30);

    // Phân bổ theo màu (dựa trên thị trường POD VN)
    const colorSplit = { 'Trắng': 0.45, 'Đen': 0.35, 'Kem': 0.20 };
    // Phân bổ theo size
    const sizeSplit = { 'S': 0.10, 'M': 0.30, 'L': 0.35, 'XL': 0.25 };

    const plans: OrderPlan[] = [];
    let totalCost = 0;
    let totalToOrder = 0;

    Object.entries(colorSplit).forEach(([color, colorPct]) => {
      Object.entries(sizeSplit).forEach(([size, sizePct]) => {
        const demand30d = Math.round(forecastOrdersMonth * colorPct * sizePct);
        const safetyStock = Math.round(demand30d * safetyStockDays / 30);
        const totalNeeded = demand30d + safetyStock;

        // Find current stock
        const invItem = inventory.find(i =>
          i.item_name.toLowerCase().includes(color.toLowerCase()) &&
          i.item_name.includes(size) &&
          !i.item_name.includes('oversize')
        );
        const currentStock = invItem?.current_stock || 0;
        const toOrder = Math.max(0, totalNeeded - currentStock);
        const cost = toOrder * BLANK_COST;
        totalCost += cost;
        totalToOrder += toOrder;

        plans.push({
          color, size, currentStock, minStock: safetyStock,
          forecastDemand: demand30d, toOrder, cost,
          paymentNote: toOrder > 0 ? `Thanh toán sau ${PAYMENT_TERMS_DAYS} ngày` : '—',
        });
      });
    });

    // Print/packaging cost (trả ngay)
    const printCost = totalToOrder * PRINT_PACKAGING_COST;

    return {
      avgPrice, forecastOrdersMonth, forecastOrdersDay,
      plans, totalCost, totalToOrder, printCost,
      cashNeededNow: printCost, // Chỉ in+bao bì trả ngay
      cashNeededLater: totalCost, // Blank trả sau 60 ngày
    };
  }, [targetRevenue, safetyStockDays, inventory, products]);

  // Historical data
  const avgMonthlyRevenue = pnlData.length > 0
    ? pnlData.reduce((s, m) => s + (m.total_revenue || 0), 0) / pnlData.length : 0;
  const avgMonthlyOrders = pnlData.length > 0
    ? pnlData.reduce((s, m) => s + (m.orders_count || 0), 0) / pnlData.length : 0;

  // Current blank stock summary
  const blankStock = inventory.filter(i => i.category.startsWith('Blank'));
  const totalBlanks = blankStock.reduce((s, i) => s + i.current_stock, 0);
  const blankValue = blankStock.reduce((s, i) => s + i.current_stock * i.cost_per_unit, 0);

  if (loading) {
    return <div className="p-6 flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;
  }

  return (
    <div className="p-4 sm:p-6">
      <PageHeader
        title="Kế hoạch đặt hàng"
        subtitle="CFO dựa trên doanh thu dự kiến → plan đặt blank áo"
        breadcrumbs={[{ label: 'Vận hành', href: '/admin' }, { label: 'Kế hoạch đặt hàng' }]}
      />

      {/* Controls */}
      <div className="bg-white rounded-xl border border-blue-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="text-[11px] font-semibold text-slate-500 uppercase mb-1 block">Doanh thu mục tiêu tháng tới (triệu VND)</label>
            <input type="number" value={targetRevenue} onChange={e => setTargetRevenue(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-bold text-blue-700" />
            <p className="text-[10px] text-slate-400 mt-1">TB 6 tháng qua: {fmt(Math.round(avgMonthlyRevenue / 1_000_000))}M | {fmt(Math.round(avgMonthlyOrders))} đơn/tháng</p>
          </div>
          <div className="w-full sm:w-40">
            <label className="text-[11px] font-semibold text-slate-500 uppercase mb-1 block">Buffer tồn kho (ngày)</label>
            <input type="number" value={safetyStockDays} onChange={e => setSafetyStockDays(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm" />
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-[10px] text-slate-400">Mô hình POD</p>
            <p className="text-[11px] text-slate-600">Áo blank: <strong>75k</strong> (nợ 60 ngày)</p>
            <p className="text-[11px] text-slate-600">In + bao bì: <strong>20k</strong> (trả ngay)</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard icon={Package} label="Cần đặt thêm" value={`${fmt(analysis.totalToOrder)} áo`} color="blue" />
        <StatCard icon={DollarSign} label="Tiền blank (nợ 60 ngày)" value={`${(analysis.cashNeededLater / 1_000_000).toFixed(1)}M`} color="purple" />
        <StatCard icon={Calculator} label="Tiền in+bao bì (trả ngay)" value={`${(analysis.cashNeededNow / 1_000_000).toFixed(1)}M`} color="orange" />
        <StatCard icon={TrendingUp} label="Dự kiến bán" value={`${fmt(analysis.forecastOrdersMonth)} áo/tháng`} color="green" />
      </div>

      {/* Current Stock Summary */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 mb-6">
        <h2 className="text-sm font-bold text-slate-800 mb-3">Tồn kho blank hiện tại — {fmt(totalBlanks)} áo ({fmt(blankValue)}đ)</h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {['Trắng', 'Đen', 'Kem'].map(color => {
            const items = blankStock.filter(i => i.item_name.toLowerCase().includes(color.toLowerCase()) && !i.item_name.includes('oversize'));
            const total = items.reduce((s, i) => s + i.current_stock, 0);
            return (
              <div key={color} className={`rounded-lg p-3 text-center ${color === 'Trắng' ? 'bg-slate-50' : color === 'Đen' ? 'bg-slate-800 text-white' : 'bg-amber-50'}`}>
                <p className="text-lg font-bold">{fmt(total)}</p>
                <p className={`text-[10px] ${color === 'Đen' ? 'text-slate-300' : 'text-slate-500'}`}>{color} (S-XL)</p>
              </div>
            );
          })}
          <div className="rounded-lg p-3 text-center bg-blue-50">
            <p className="text-lg font-bold text-blue-700">{fmt(blankStock.filter(i => i.item_name.includes('oversize')).reduce((s, i) => s + i.current_stock, 0))}</p>
            <p className="text-[10px] text-blue-500">Oversize</p>
          </div>
        </div>
      </div>

      {/* Ordering Plan Table */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 mb-6">
        <h2 className="text-sm font-bold text-slate-800 mb-4">
          <Calculator size={16} className="inline mr-1" />
          Kế hoạch đặt hàng — Target {fmt(targetRevenue)}M doanh thu
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-left text-[10px] text-slate-500 uppercase border-b-2 border-slate-200">
                <th className="pb-2 pr-2">Màu</th>
                <th className="pb-2 pr-2">Size</th>
                <th className="pb-2 pr-2 text-center">Tồn kho</th>
                <th className="pb-2 pr-2 text-center">Dự kiến bán</th>
                <th className="pb-2 pr-2 text-center">Buffer</th>
                <th className="pb-2 pr-2 text-center font-bold">CẦN ĐẶT</th>
                <th className="pb-2 pr-2 text-right">Chi phí blank</th>
                <th className="pb-2 text-center">Thanh toán</th>
              </tr>
            </thead>
            <tbody>
              {analysis.plans.map((plan, i) => (
                <tr key={i} className={`border-b border-slate-50 ${plan.toOrder > 0 ? 'bg-blue-50/30' : ''}`}>
                  <td className="py-2 pr-2 font-medium">{plan.color}</td>
                  <td className="py-2 pr-2">{plan.size}</td>
                  <td className={`py-2 pr-2 text-center font-medium ${plan.currentStock < plan.minStock ? 'text-red-600' : 'text-slate-700'}`}>
                    {plan.currentStock}
                  </td>
                  <td className="py-2 pr-2 text-center text-slate-600">{plan.forecastDemand}</td>
                  <td className="py-2 pr-2 text-center text-slate-400">{plan.minStock}</td>
                  <td className="py-2 pr-2 text-center">
                    {plan.toOrder > 0 ? (
                      <span className="font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">{plan.toOrder}</span>
                    ) : (
                      <span className="text-green-600">Đủ</span>
                    )}
                  </td>
                  <td className="py-2 pr-2 text-right text-slate-700">{plan.cost > 0 ? `${fmt(plan.cost)}đ` : '—'}</td>
                  <td className="py-2 text-center text-[10px] text-slate-400">{plan.paymentNote}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 font-bold">
                <td className="py-2" colSpan={5}>Tổng cộng</td>
                <td className="py-2 text-center text-blue-700">{fmt(analysis.totalToOrder)} áo</td>
                <td className="py-2 text-right text-slate-800">{fmt(analysis.totalCost)}đ</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Cash Flow Impact */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-4 sm:p-5">
        <h2 className="text-sm font-bold text-blue-800 mb-3">
          <DollarSign size={16} className="inline mr-1" />
          Tác động dòng tiền (CFO Analysis)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-3">
            <p className="text-[10px] text-slate-500 uppercase font-semibold">Trả ngay</p>
            <p className="text-lg font-bold text-orange-700">{fmt(analysis.cashNeededNow)}đ</p>
            <p className="text-[10px] text-slate-500">In + bao bì ({fmt(analysis.totalToOrder)} × 20k)</p>
          </div>
          <div className="bg-white rounded-lg p-3">
            <p className="text-[10px] text-slate-500 uppercase font-semibold">Trả sau 60 ngày</p>
            <p className="text-lg font-bold text-purple-700">{fmt(analysis.cashNeededLater)}đ</p>
            <p className="text-[10px] text-slate-500">Blank áo ({fmt(analysis.totalToOrder)} × 75k)</p>
          </div>
          <div className="bg-white rounded-lg p-3">
            <p className="text-[10px] text-slate-500 uppercase font-semibold">Doanh thu dự kiến</p>
            <p className="text-lg font-bold text-green-700">{fmt(targetRevenue * 1_000_000)}đ</p>
            <p className="text-[10px] text-slate-500">Margin: {products.length > 0 ? Math.round((1 - 95000 / (products.reduce((s, p) => s + p.base_price, 0) / products.length)) * 100) : 65}%</p>
          </div>
        </div>
        <div className="mt-3 p-3 bg-blue-100 rounded-lg">
          <p className="text-[12px] text-blue-800">
            <Truck size={14} className="inline mr-1" />
            <strong>Khuyến nghị CFO:</strong> Đặt {fmt(analysis.totalToOrder)} áo blank, cần {fmt(analysis.cashNeededNow)}đ tiền mặt ngay (in+bao bì).
            Tiền blank {fmt(analysis.cashNeededLater)}đ trả sau 60 ngày — khi đó doanh thu đã thu về {fmt(targetRevenue * 1_000_000)}đ.
            {analysis.totalToOrder > 2000 && ' ⚠ Số lượng lớn — nên chia 2 đợt đặt hàng.'}
          </p>
        </div>
      </div>
    </div>
  );
}
