import { CollectionPlan, AgentMessage } from '../agent-types';
import { getProducts, getOrders } from '@/lib/supabase-data';

// Teeworld brand DNA: graphic tees, retro-modern Saigonese, fun Vietnamese quotes, travel lifestyle
// Best sellers: Saigonese, retro-modern, quote tees ("Không Được Đánh Khách Hàng")
// Lines: Texture Teeworld Studio (signature), Happy Sunday (sub-brand: joy + travel)
const collectionCalendar: Array<{ month: number; name: string; theme: string; line: string; targetSKUs: number }> = [
  { month: 1, name: 'Saigonese Tết', theme: 'Retro Sài Gòn x Tết, Rồng vintage, typography cổ điển', line: 'Texture Teeworld Studio', targetSKUs: 30 },
  { month: 2, name: 'Happy Sunday: Valentine Getaway', theme: 'Du lịch đôi, Đà Lạt/biển, retro couple tees', line: 'Happy Sunday', targetSKUs: 20 },
  { month: 3, name: 'Saigonese: Phố Cổ Mới', theme: 'Sài Gòn xưa & nay, quán café retro, xe Vespa, typography', line: 'Texture Teeworld Studio', targetSKUs: 25 },
  { month: 4, name: 'Quote Season: Nói Thật Đi', theme: 'Fun quotes VN: "Không Được Đánh Khách Hàng", humor đời thường', line: 'Texture Teeworld Studio', targetSKUs: 30 },
  { month: 5, name: 'Happy Sunday: Beach Escape', theme: 'Biển, Phú Quốc, Quy Nhơn vibe, surf retro, sunset palette', line: 'Happy Sunday', targetSKUs: 35 },
  { month: 6, name: 'Saigonese: Street Culture', theme: 'Xe ôm, bánh mì, cà phê sữa đá, Sài Gòn streetlife', line: 'Texture Teeworld Studio', targetSKUs: 25 },
  { month: 7, name: 'Quote Season: Tuổi Trẻ', theme: 'Student quotes, campus life, retro-modern school vibes', line: 'Texture Teeworld Studio', targetSKUs: 30 },
  { month: 8, name: 'Happy Sunday: Mountain High', theme: 'Trekking, Sapa/Hà Giang, nature illustration, earth tones', line: 'Happy Sunday', targetSKUs: 25 },
  { month: 9, name: 'Saigonese: Retro Film', theme: 'Phim Việt xưa, poster vintage, color grading retro', line: 'Texture Teeworld Studio', targetSKUs: 25 },
  { month: 10, name: 'Texture Studio: Layer Up', theme: 'Hoodie/Sweater graphic, texture art, layering streetwear', line: 'Texture Teeworld Studio', targetSKUs: 30 },
  { month: 11, name: 'Best of Teeworld 2026', theme: 'Top sellers reprint: Saigonese + Quote + Happy Sunday hits', line: 'All Lines', targetSKUs: 40 },
  { month: 12, name: 'Happy Sunday: Year End Trip', theme: 'Holiday travel, Giáng sinh retro, New Year countdown', line: 'Happy Sunday', targetSKUs: 30 },
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
  const currentCalendar = collectionCalendar.find(c => c.month === currentMonth);
  const nextCalendar = collectionCalendar.find(c => c.month === currentMonth + 1);
  const totalSKUs = collectionCalendar.reduce((s, c) => s + c.targetSKUs, 0);

  const messages: AgentMessage[] = [
    {
      id: 'msg-collection-1',
      agentRole: 'collection_director',
      agentName: 'AI Collection Director',
      timestamp: new Date().toISOString(),
      content: `BST T${currentMonth}: "${currentCollection?.name || 'N/A'}" [${currentCalendar?.line || 'Texture'}] — ${currentCollection?.theme || ''}. ` +
        `Kế tiếp T${currentMonth + 1}: "${nextCollection?.name || 'N/A'}" [${nextCalendar?.line || ''}] (${nextCollection?.status || 'planned'}). ` +
        `Tổng ${totalSKUs} SKU/năm (12 BST). 3 lines: Texture Teeworld Studio (signature) + Happy Sunday (travel/lifestyle) + Quote Season (humor VN). ` +
        `${activeProducts.length} products active. Best sellers: ${bestSellers.length}. Retire: ${candidates.length}.`,
      type: 'analysis',
    },
    {
      id: 'msg-collection-2',
      agentRole: 'collection_director',
      agentName: 'AI Collection Director',
      timestamp: new Date().toISOString(),
      content: `BRAND DNA: Saigonese retro-modern + fun Vietnamese quotes + Happy Sunday travel lifestyle. ` +
        `Top sellers: "Không Được Đánh Khách Hàng", Saigonese series, Happy Sunday beach/mountain. ` +
        `Workflow: Brief → AI generate 100+ concepts (Banana Pro 2) → Curate top 50 → Mockup → Print test → Launch (7 ngày). ` +
        `Chi phí/mẫu: <50K. ` +
        (candidates.length > 0
          ? `Retire ${candidates.length} design chậm. Reprint ${bestSellers.length} best sellers.`
          : `Focus BST mới. Reprint ${bestSellers.length} best sellers đang bán tốt.`),
      type: 'recommendation',
    },
  ];

  return { plans, messages };
}
