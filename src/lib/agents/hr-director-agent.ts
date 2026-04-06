import { BusinessTarget, DepartmentGoal, AgentMessage } from '../agent-types';
import { getEmployees, getFinanceSettings, getMonthlyPnL, getTasks, getPerformanceRatings } from '@/lib/supabase-data';

// Map PnL channel columns to departments
// Sales ← revenue_shopee + revenue_b2b
// Marketing ← revenue_website + revenue_fbig + revenue_tiktok
function computeDeptRevenue(pnlRows: Array<Record<string, number>>): Record<string, number> {
  let salesRevenue = 0;
  let marketingRevenue = 0;
  for (const row of pnlRows) {
    salesRevenue += (row.revenue_shopee || 0) + (row.revenue_b2b || 0);
    marketingRevenue += (row.revenue_website || 0) + (row.revenue_fbig || 0) + (row.revenue_tiktok || 0);
  }
  return { Sales: salesRevenue, Marketing: marketingRevenue };
}

export async function runHRDirectorAgent(targets: BusinessTarget[]): Promise<{
  goals: DepartmentGoal[];
  messages: AgentMessage[];
}> {
  const [employees, financeSettings, pnlData, allTasks, allRatings] = await Promise.all([
    getEmployees(),
    getFinanceSettings().catch((e) => { console.warn('[HR Agent] Không load được finance settings, dùng mặc định:', e.message); return null; }),
    getMonthlyPnL(),
    getTasks(),
    getPerformanceRatings(),
  ]);

  const departments = [...new Set(employees.map((e: { department: string }) => e.department))];

  // Get revenue weights from finance_settings or use defaults
  const defaultWeights: Record<string, Record<string, number>> = {
    revenue: { Sales: 0.55, Marketing: 0.45, 'Vận hành': 0, 'Kế toán': 0, 'Ban Giám đốc': 0 },
    growth: { Marketing: 0.50, Sales: 0.35, 'Vận hành': 0.05, 'Kế toán': 0.05, 'Ban Giám đốc': 0.05 },
    efficiency: { 'Vận hành': 0.40, 'Kế toán': 0.25, Sales: 0.15, Marketing: 0.15, 'Ban Giám đốc': 0.05 },
    quality: { Sales: 0.30, 'Vận hành': 0.30, Marketing: 0.20, 'Kế toán': 0.10, 'Ban Giám đốc': 0.10 },
  };

  // Use dept_revenue_weights from finance_settings for revenue category if available
  const settingsWeights = financeSettings?.dept_revenue_weights as Record<string, number> | null;
  const deptWeights: Record<string, Record<string, number>> = { ...defaultWeights };
  if (settingsWeights) {
    deptWeights.revenue = {};
    for (const dept of departments) {
      deptWeights.revenue[dept] = settingsWeights[dept] ?? 0;
    }
  }

  // Compute actual revenue per department from PnL data
  const deptRevenue = computeDeptRevenue(pnlData);
  const totalActualRevenue = Object.values(deptRevenue).reduce((s, v) => s + v, 0);

  // Compute task completion per department
  const deptTaskStats: Record<string, { done: number; total: number }> = {};
  for (const dept of departments) {
    const deptTasks = allTasks.filter((t: { department: string }) => t.department === dept);
    const done = deptTasks.filter((t: { status: string }) => t.status === 'done').length;
    deptTaskStats[dept] = { done, total: deptTasks.length };
  }

  // Compute avg KPI per department
  const deptKPI: Record<string, number> = {};
  for (const dept of departments) {
    const deptEmployees = employees.filter((e: { department: string }) => e.department === dept);
    const deptEmpIds = deptEmployees.map((e: { id: number }) => e.id);
    const deptRatings = allRatings.filter((r: { employee_id: number }) => deptEmpIds.includes(r.employee_id));
    deptKPI[dept] = deptRatings.length > 0
      ? Math.round(deptRatings.reduce((s: number, r: { kpi_score: number }) => s + (r.kpi_score || 0), 0) / deptRatings.length)
      : 60;
  }

  const goals: DepartmentGoal[] = [];
  let goalId = 1;

  for (const target of targets) {
    const weights = deptWeights[target.category] || deptWeights.quality;

    for (const dept of departments) {
      const weight = weights[dept] || 0;
      if (weight === 0) continue;

      let deptTargetValue: number;
      let deptActualValue: number;

      if (target.category === 'revenue') {
        // Revenue: distribute target by weight, actual from real PnL channel data
        deptTargetValue = Math.round(target.targetValue * weight);
        deptActualValue = Math.round(deptRevenue[dept] || 0);
        // Scale actual to quarter proportion if target is quarterly but PnL is all-time
        // Use ratio of target's actual to total actual for proportioning
        if (totalActualRevenue > 0 && target.currentValue > 0) {
          const quarterRatio = target.currentValue / totalActualRevenue;
          deptActualValue = Math.round((deptRevenue[dept] || 0) * quarterRatio);
        }
      } else if (target.category === 'efficiency') {
        // Efficiency: target by weight, actual from real KPI scores
        deptTargetValue = Math.round(target.targetValue * weight);
        deptActualValue = Math.round(deptKPI[dept] * weight);
      } else if (target.category === 'quality') {
        // Quality: target by weight, actual from real task completion
        deptTargetValue = Math.round(target.targetValue * weight);
        const stats = deptTaskStats[dept] || { done: 0, total: 0 };
        const completionRate = stats.total > 0 ? (stats.done / stats.total) * 100 : 0;
        deptActualValue = Math.round(completionRate * weight);
      } else if (target.category === 'growth') {
        // Growth: distribute by weight, actual proportional
        deptTargetValue = Math.round(target.targetValue * weight);
        deptActualValue = Math.round(target.currentValue * weight);
      } else {
        deptTargetValue = Math.round(target.targetValue * weight);
        deptActualValue = Math.round(target.currentValue * weight);
      }

      goals.push({
        id: `dg-${goalId}`,
        businessTargetId: target.id,
        department: dept,
        name: `${dept}: ${target.name}`,
        targetValue: deptTargetValue,
        currentValue: Math.min(deptActualValue, deptTargetValue * 2), // cap at 2x target to avoid display issues
        unit: target.unit,
        weight: Math.round(weight * 100),
      });
      goalId++;
    }
  }

  // Build insight messages with real data
  const salesRev = deptRevenue.Sales || 0;
  const mktRev = deptRevenue.Marketing || 0;
  const totalRev = salesRev + mktRev;
  const salesPct = totalRev > 0 ? Math.round((salesRev / totalRev) * 100) : 0;
  const mktPct = totalRev > 0 ? Math.round((mktRev / totalRev) * 100) : 0;

  const messages: AgentMessage[] = [
    {
      id: 'msg-hr-1',
      agentRole: 'hr_director',
      agentName: 'AI HR Director',
      timestamp: new Date().toISOString(),
      content: `Teeworld: Doanh thu thực tế từ Sales (Shopee+B2B): ${(salesRev / 1_000_000_000).toFixed(1)} tỷ (${salesPct}%) & Marketing (Web+FB+TikTok): ${(mktRev / 1_000_000_000).toFixed(1)} tỷ (${mktPct}%). Vận hành, Kế toán, Ban GĐ là cost centers -- đánh giá theo hiệu suất & chất lượng, không theo doanh thu.`,
      type: 'decision',
    },
    {
      id: 'msg-hr-2',
      agentRole: 'hr_director',
      agentName: 'AI HR Director',
      timestamp: new Date().toISOString(),
      content: `Đã phân bổ ${targets.length} mục tiêu cho ${departments.length} phòng ban với dữ liệu thực. KPI trung bình: ${departments.map(d => `${d}: ${deptKPI[d] || 0}%`).join(', ')}. Task completion: ${departments.map(d => { const s = deptTaskStats[d]; return s ? `${d}: ${s.total > 0 ? Math.round(s.done / s.total * 100) : 0}%` : `${d}: 0%`; }).join(', ')}.`,
      type: 'analysis',
    },
  ];

  return { goals, messages };
}
