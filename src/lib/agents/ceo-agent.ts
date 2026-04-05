import { BusinessTarget, AgentMessage, QuarterPeriod } from '../agent-types';
import { employees, employeeCareers, kpiTargets, departments } from '../mock-data';

function pseudoRandom(seed: number, n: number): number {
  return ((seed * 17 + n * 31 + seed * n * 7) % 100) / 100;
}

export function runCEOAgent(year: number, quarter: QuarterPeriod): {
  targets: BusinessTarget[];
  messages: AgentMessage[];
} {
  const activeEmployees = employees.filter(e => e.trangThai !== 'da_nghi');
  const totalSalary = employeeCareers.reduce((s, c) => s + c.currentSalary, 0);

  // Teeworld: Revenue target Q2 = 4 tỷ (20% of 20 tỷ annual target)
  // Q1: 6 tỷ (Tết peak), Q2: 4 tỷ, Q3: 4.4 tỷ, Q4: 5.6 tỷ
  const quarterTargets: Record<string, number> = { Q1: 6_000_000_000, Q2: 4_000_000_000, Q3: 4_400_000_000, Q4: 5_600_000_000 };
  const revenueTarget = quarterTargets[quarter] || 4_000_000_000;
  // Q1 done (6 tỷ), Q2 in progress
  const revenueActual = quarter === 'Q1' ? 6_000_000_000 : Math.round(revenueTarget * (0.2 + pseudoRandom(year, 1) * 0.2));

  // Growth target: new customers/deals
  const growthTarget = activeEmployees.length * 2;
  const growthActual = Math.round(growthTarget * (0.5 + pseudoRandom(year, 2) * 0.4));

  // Efficiency: avg KPI score across all employees
  const avgKPI = Math.round(
    employeeCareers.reduce((s, c) => {
      const recent = c.performanceHistory.slice(-1)[0];
      return s + (recent?.kpiScore || 60);
    }, 0) / employeeCareers.length
  );
  const efficiencyTarget = 80;
  const efficiencyActual = avgKPI;

  // Quality: task completion rate
  const qualityTarget = 85;
  const qualityActual = Math.round(70 + pseudoRandom(year, 4) * 20);

  // Customer satisfaction
  const satisfactionTarget = 90;
  const satisfactionActual = Math.round(75 + pseudoRandom(year, 5) * 20);

  function getStatus(actual: number, target: number): BusinessTarget['status'] {
    const ratio = actual / target;
    if (ratio >= 1) return 'achieved';
    if (ratio >= 0.8) return 'on_track';
    if (ratio >= 0.6) return 'at_risk';
    return 'behind';
  }

  const targets: BusinessTarget[] = [
    {
      id: 'bt-1',
      year,
      quarter,
      name: `Doanh thu ${quarter}/${year}`,
      category: 'revenue',
      targetValue: revenueTarget,
      currentValue: revenueActual,
      unit: 'VND',
      status: getStatus(revenueActual, revenueTarget),
    },
    {
      id: 'bt-2',
      year,
      quarter,
      name: `Khách hàng mới ${quarter}/${year}`,
      category: 'growth',
      targetValue: growthTarget,
      currentValue: growthActual,
      unit: 'khách hàng',
      status: getStatus(growthActual, growthTarget),
    },
    {
      id: 'bt-3',
      year,
      quarter,
      name: `Hiệu suất KPI trung bình`,
      category: 'efficiency',
      targetValue: efficiencyTarget,
      currentValue: efficiencyActual,
      unit: '%',
      status: getStatus(efficiencyActual, efficiencyTarget),
    },
    {
      id: 'bt-4',
      year,
      quarter,
      name: `Tỷ lệ hoàn thành công việc`,
      category: 'quality',
      targetValue: qualityTarget,
      currentValue: qualityActual,
      unit: '%',
      status: getStatus(qualityActual, qualityTarget),
    },
    {
      id: 'bt-5',
      year,
      quarter,
      name: `Hài lòng khách hàng`,
      category: 'quality',
      targetValue: satisfactionTarget,
      currentValue: satisfactionActual,
      unit: '%',
      status: getStatus(satisfactionActual, satisfactionTarget),
    },
  ];

  const messages: AgentMessage[] = [
    {
      id: 'msg-ceo-1',
      agentRole: 'ceo',
      agentName: 'AI CEO',
      timestamp: new Date().toISOString(),
      content: `Đã thiết lập 5 mục tiêu kinh doanh cho ${quarter}/${year}. Doanh thu mục tiêu: ${(revenueTarget / 1_000_000_000).toFixed(1)} tỷ VND (gấp 3.5x chi phí nhân sự ${(totalSalary / 1_000_000_000).toFixed(1)} tỷ). Hiện đội ngũ ${activeEmployees.length} nhân sự đang hoạt động trên ${departments.length} phòng ban.`,
      type: 'decision',
    },
    {
      id: 'msg-ceo-2',
      agentRole: 'ceo',
      agentName: 'AI CEO',
      timestamp: new Date().toISOString(),
      content: targets.filter(t => t.status === 'behind' || t.status === 'at_risk').length > 0
        ? `Cảnh báo: ${targets.filter(t => t.status === 'behind' || t.status === 'at_risk').map(t => t.name).join(', ')} đang cần chú ý. Yêu cầu HR Director và các trưởng phòng phân bổ lại nguồn lực.`
        : `Tất cả mục tiêu đang trong tầm kiểm soát. Tiếp tục duy trì hiệu suất hiện tại.`,
      type: targets.some(t => t.status === 'behind') ? 'alert' : 'analysis',
    },
  ];

  return { targets, messages };
}
