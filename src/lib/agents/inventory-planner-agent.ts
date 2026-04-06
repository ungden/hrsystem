import { InventoryForecast, StockAlert, AgentMessage } from '../agent-types';
import { getInventory, getProducts, getMonthlyPnL, getOrders } from '@/lib/supabase-data';

// Seasonal multipliers for Teeworld
const seasonalFactors: Record<number, number> = {
  1: 1.5,  // Tết
  2: 1.1,  // Valentine
  3: 1.0,
  4: 1.0,
  5: 1.2,  // Hè bắt đầu
  6: 1.1,
  7: 1.0,  // Back to school
  8: 0.9,
  9: 0.9,
  10: 1.0,
  11: 1.8, // 11.11 + Black Friday
  12: 1.3, // Xmas
};

const AVG_PRICE = 270_000; // VND per áo
const GILDAN_COST = 45_000; // VND per áo trắng
const DTG_COST = 30_000; // VND per áo in
const BATCH_SIZE = 500;
const BUFFER_PCT = 0.2; // 20% buffer
const MIN_WEEKS_STOCK = 1;
const MAX_WEEKS_STOCK = 3;

export async function runInventoryPlannerAgent(currentMonth: number = 4): Promise<{
  forecasts: InventoryForecast[];
  alerts: StockAlert[];
  messages: AgentMessage[];
}> {
  const [inventory, products, pnlData, orders] = await Promise.all([
    getInventory(),
    getProducts(),
    getMonthlyPnL(),
    getOrders(),
  ]);

  // Calculate base monthly demand from PnL
  const recentPnl = pnlData.filter((p: { year: number }) => p.year === 2026);
  const avgMonthlyRevenue = recentPnl.length > 0
    ? recentPnl.reduce((s: number, p: { total_revenue: number }) => s + (p.total_revenue || 0), 0) / recentPnl.length
    : 1_200_000_000; // fallback 1.2 tỷ/tháng
  const baseMonthlyDemand = Math.round(avgMonthlyRevenue / AVG_PRICE);

  // Generate forecasts for next 3 months
  const forecasts: InventoryForecast[] = [];
  for (let m = currentMonth; m <= Math.min(currentMonth + 2, 12); m++) {
    const factor = seasonalFactors[m] || 1.0;
    const demandUnits = Math.round(baseMonthlyDemand * factor);
    const withBuffer = Math.round(demandUnits * (1 + BUFFER_PCT));
    const productionBatches = Math.ceil(withBuffer / BATCH_SIZE);
    const rawMaterialNeeded = productionBatches * BATCH_SIZE;

    // Estimate current stock (sum all inventory items that are áo/products)
    const tshirtStock = inventory
      .filter((i: { category: string }) => i.category === 'Thành phẩm' || i.category === 'finished')
      .reduce((s: number, i: { current_stock: number }) => s + (i.current_stock || 0), 0);

    forecasts.push({
      month: m,
      demandUnits,
      currentStock: m === currentMonth ? tshirtStock : 0,
      reorderNeeded: tshirtStock < demandUnits * 0.5,
      productionBatches,
      rawMaterialNeeded,
    });
  }

  // Stock alerts
  const weeklyDemand = Math.round(baseMonthlyDemand / 4);
  const alerts: StockAlert[] = inventory.map((item: {
    item_name: string; current_stock: number; min_stock: number; category: string;
  }) => {
    const minStock = item.min_stock || weeklyDemand * MIN_WEEKS_STOCK;
    let status: StockAlert['status'] = 'ok';
    let action = 'Không cần hành động';

    if (item.current_stock <= 0) {
      status = 'critical';
      action = `ĐẶT HÀNG GẤP! Cần nhập ${minStock * 2} ${item.item_name}`;
    } else if (item.current_stock < minStock) {
      status = 'low';
      action = `Đặt hàng: cần nhập thêm ${minStock * 2 - item.current_stock} ${item.item_name}`;
    } else if (item.current_stock > minStock * MAX_WEEKS_STOCK * 2) {
      status = 'dead';
      action = `Tồn kho cao. Xem xét giảm giá/clear stock`;
    }

    return {
      itemName: item.item_name,
      currentStock: item.current_stock,
      minStock,
      status,
      action,
    };
  });

  // Product performance analysis
  const activeProducts = products.filter((p: { status: string }) => p.status === 'active');
  const totalProducts = activeProducts.length;
  const recentOrders = orders.filter((o: { created_at: string }) => {
    const d = new Date(o.created_at);
    return d.getFullYear() === 2026 && d.getMonth() + 1 >= currentMonth - 1;
  });

  const criticalAlerts = alerts.filter((a: StockAlert) => a.status === 'critical');
  const lowAlerts = alerts.filter((a: StockAlert) => a.status === 'low');
  const deadAlerts = alerts.filter((a: StockAlert) => a.status === 'dead');

  const forecast = forecasts[0];
  const messages: AgentMessage[] = [
    {
      id: 'msg-inventory-1',
      agentRole: 'inventory_planner',
      agentName: 'AI Inventory Planner',
      timestamp: new Date().toISOString(),
      content: `Dự báo T${currentMonth}/2026: cần ${forecast.demandUnits} áo (${(forecast.demandUnits * AVG_PRICE / 1e9).toFixed(1)} tỷ DT). ` +
        `Sản xuất: ${forecast.productionBatches} lô x ${BATCH_SIZE} áo. ` +
        `Nguyên liệu: ${forecast.rawMaterialNeeded} áo trắng Gildan (${(forecast.rawMaterialNeeded * GILDAN_COST / 1e6).toFixed(0)}M). ` +
        `In DTG: ${(forecast.rawMaterialNeeded * DTG_COST / 1e6).toFixed(0)}M. ` +
        `Tồn kho hiện tại: ${forecast.currentStock} áo. ${totalProducts} SKU đang bán. ${recentOrders.length} đơn hàng gần đây.`,
      type: 'analysis',
    },
    {
      id: 'msg-inventory-2',
      agentRole: 'inventory_planner',
      agentName: 'AI Inventory Planner',
      timestamp: new Date().toISOString(),
      content: criticalAlerts.length > 0
        ? `CẢNH BÁO: ${criticalAlerts.length} item hết hàng: ${criticalAlerts.map(a => a.itemName).join(', ')}. ${lowAlerts.length} item sắp hết. ${deadAlerts.length > 0 ? `${deadAlerts.length} item tồn kho cao cần clear.` : ''}`
        : `Tồn kho ổn định. ${lowAlerts.length} item cần theo dõi. ${deadAlerts.length > 0 ? `${deadAlerts.length} item tồn kho cao.` : 'Không có dead stock.'}`,
      type: criticalAlerts.length > 0 ? 'alert' : 'analysis',
    },
  ];

  return { forecasts, alerts, messages };
}
