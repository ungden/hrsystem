import { CollectionPlan, AgentMessage } from '../agent-types';
import { getProducts, getOrders } from '@/lib/supabase-data';

const collectionCalendar: Array<{ month: number; name: string; theme: string; targetSKUs: number }> = [
  { month: 1, name: 'Tết Rồng Vàng', theme: 'Lunar New Year, Rồng, Đỏ/Vàng', targetSKUs: 30 },
  { month: 2, name: 'Couple Tee Valentine', theme: 'Love, Đôi, Minimalist', targetSKUs: 20 },
  { month: 3, name: 'Spring Collection', theme: 'Hoa, Pastel, Fresh', targetSKUs: 25 },
  { month: 4, name: 'Tropical Vibes', theme: 'Lá cây, Biển, Neon', targetSKUs: 30 },
  { month: 5, name: 'Beach & Chill + Collab', theme: 'Surf, Sunset, Artist collab', targetSKUs: 35 },
  { month: 6, name: 'Summer Essentials', theme: 'Solid colors, Quote tees', targetSKUs: 25 },
  { month: 7, name: 'Back to School', theme: 'Campus, Young, Fun', targetSKUs: 30 },
  { month: 8, name: 'Minimalist Office', theme: 'Clean, Professional, Subtle', targetSKUs: 20 },
  { month: 9, name: 'Autumn Vibes', theme: 'Earth tones, Vintage', targetSKUs: 25 },
  { month: 10, name: 'Hoodie & Sweater', theme: 'Layering, Cozy, Graphic', targetSKUs: 30 },
  { month: 11, name: 'Black Friday Special', theme: 'Best sellers reprint + Limited', targetSKUs: 40 },
  { month: 12, name: 'Xmas & New Year', theme: 'Holiday, Gift, Festive', targetSKUs: 30 },
];

const REPRINT_THRESHOLD = 50; // > 50 bán/tháng → reprint
const RETIRE_THRESHOLD = 5;   // < 5 bán/tháng sau 2 tháng → retire

export async function runCollectionDirectorAgent(currentMonth: number = 4): Promise<{
  plans: CollectionPlan[];
  messages: AgentMessage[];
}> {
  const [products, orders] = await Promise.all([
    getProducts(),
    getOrders(),
  ]);

  // Analyze product performance
  const activeProducts = products.filter((p: { status: string }) => p.status === 'active');
  const productSales = new Map<string, number>();

  // Count orders per product in recent 2 months
  const recentOrders = orders.filter((o: { created_at: string; status: string }) => {
    const d = new Date(o.created_at);
    return d.getFullYear() === 2026 && d.getMonth() + 1 >= currentMonth - 1 && o.status !== 'cancelled';
  });

  // Estimate sales per product (simplified - count by order)
  activeProducts.forEach((p: { id: number; name: string }) => {
    // Approximate: each product appears in ~orders/products orders
    const estimatedSales = Math.round(recentOrders.length / Math.max(activeProducts.length, 1) * 30);
    productSales.set(p.name, estimatedSales);
  });

  const bestSellers = activeProducts.filter((p: { name: string }) =>
    (productSales.get(p.name) || 0) >= REPRINT_THRESHOLD
  );
  const candidates = activeProducts.filter((p: { name: string }) =>
    (productSales.get(p.name) || 0) < RETIRE_THRESHOLD
  );

  // Build collection plans
  const plans: CollectionPlan[] = collectionCalendar.map(c => {
    let status: CollectionPlan['status'] = 'planned';
    if (c.month < currentMonth) status = 'completed';
    else if (c.month === currentMonth) status = 'launched';
    else if (c.month === currentMonth + 1) status = 'in_production';
    else if (c.month === currentMonth + 2) status = 'in_design';

    // Count products matching this collection
    const collectionProducts = products.filter((p: { collection: string }) =>
      p.collection && p.collection.toLowerCase().includes(c.name.toLowerCase().split(' ')[0])
    );

    return {
      month: c.month,
      name: c.name,
      theme: c.theme,
      targetSKUs: c.targetSKUs,
      status,
      topSellers: collectionProducts.filter((p: { name: string }) =>
        (productSales.get(p.name) || 0) >= REPRINT_THRESHOLD
      ).length,
    };
  });

  const currentCollection = plans.find(p => p.month === currentMonth);
  const nextCollection = plans.find(p => p.month === currentMonth + 1);
  const totalSKUs = collectionCalendar.reduce((s, c) => s + c.targetSKUs, 0);

  const messages: AgentMessage[] = [
    {
      id: 'msg-collection-1',
      agentRole: 'collection_director',
      agentName: 'AI Collection Director',
      timestamp: new Date().toISOString(),
      content: `BST T${currentMonth}: "${currentCollection?.name || 'N/A'}" - ${currentCollection?.theme || ''}. ` +
        `Kế tiếp T${currentMonth + 1}: "${nextCollection?.name || 'N/A'}" (${nextCollection?.status || 'planned'}). ` +
        `Tổng ${totalSKUs} SKU/năm (12 BST). ${activeProducts.length} products đang active. ` +
        `Best sellers: ${bestSellers.length}. Candidates retire: ${candidates.length}.`,
      type: 'analysis',
    },
    {
      id: 'msg-collection-2',
      agentRole: 'collection_director',
      agentName: 'AI Collection Director',
      timestamp: new Date().toISOString(),
      content: `Workflow: Brief theme → AI generate 100+ concepts (Banana Pro 2) → Curate top 50 → Refine → Mockup → Approve → Print test → Photography → Launch. ` +
        `Design-to-market: 7 ngày. Chi phí/mẫu: <50K (AI tools). ` +
        (candidates.length > 0
          ? `Đề xuất retire ${candidates.length} design bán chậm. Reprint ${bestSellers.length} best sellers.`
          : `Không có design cần retire. Focus ra BST mới.`),
      type: 'recommendation',
    },
  ];

  return { plans, messages };
}
