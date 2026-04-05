import { BusinessTarget, DepartmentGoal, AgentMessage } from '../agent-types';
import { employees, departments } from '../mock-data';

// Department relevance weights for Teeworld
// Revenue only comes from Sales & Marketing channels
// Other departments are cost centers with operational KPIs
const deptWeights: Record<string, Record<string, number>> = {
  revenue: {
    'Sales': 0.55,
    'Marketing': 0.45,
    'Vận hành': 0,
    'Kế toán': 0,
    'Ban Giám đốc': 0,
  },
  growth: {
    'Marketing': 0.50,
    'Sales': 0.35,
    'Vận hành': 0.05,
    'Kế toán': 0.05,
    'Ban Giám đốc': 0.05,
  },
  efficiency: {
    'Vận hành': 0.40,
    'Kế toán': 0.25,
    'Sales': 0.15,
    'Marketing': 0.15,
    'Ban Giám đốc': 0.05,
  },
  quality: {
    'Sales': 0.30,
    'Vận hành': 0.30,
    'Marketing': 0.20,
    'Kế toán': 0.10,
    'Ban Giám đốc': 0.10,
  },
};

// Use Teeworld departments from Supabase
const teeworldDepartments = ['Ban Giám đốc', 'Marketing', 'Sales', 'Vận hành', 'Kế toán'];

function pseudoRandom(seed: number): number {
  return ((seed * 13 + 37) % 100) / 100;
}

export function runHRDirectorAgent(targets: BusinessTarget[]): {
  goals: DepartmentGoal[];
  messages: AgentMessage[];
} {
  const activeEmployees = employees.filter(e => e.trangThai !== 'da_nghi');
  const goals: DepartmentGoal[] = [];
  let goalId = 1;

  for (const target of targets) {
    const weights = deptWeights[target.category] || deptWeights.quality;

    for (const dept of teeworldDepartments) {
      const weight = weights[dept] || 0;
      if (weight === 0) continue; // Skip departments with 0 weight

      const deptTargetValue = Math.round(target.targetValue * weight);
      const deptActualValue = Math.round(target.currentValue * weight * (0.8 + pseudoRandom(goalId) * 0.4));

      goals.push({
        id: `dg-${goalId}`,
        businessTargetId: target.id,
        department: dept,
        name: `${dept}: ${target.name}`,
        targetValue: deptTargetValue,
        currentValue: Math.min(deptActualValue, deptTargetValue),
        unit: target.unit,
        weight: Math.round(weight * 100),
      });
      goalId++;
    }
  }

  const messages: AgentMessage[] = [
    {
      id: 'msg-hr-1',
      agentRole: 'hr_director',
      agentName: 'AI HR Director',
      timestamp: new Date().toISOString(),
      content: `Teeworld: Doanh thu 100% từ Sales (55%) & Marketing (45%). Vận hành, Kế toán, Ban GĐ là cost centers — đánh giá theo hiệu suất & chất lượng, không theo doanh thu.`,
      type: 'decision',
    },
    {
      id: 'msg-hr-2',
      agentRole: 'hr_director',
      agentName: 'AI HR Director',
      timestamp: new Date().toISOString(),
      content: `Đã phân bổ ${targets.length} mục tiêu cho ${teeworldDepartments.length} phòng ban. Marketing team (CMO + TP + Ads + Design) chịu trách nhiệm chính cho tăng trưởng. Sales team (TN + QL ĐH + CSKH) chịu trách nhiệm chốt đơn & retention.`,
      type: 'analysis',
    },
  ];

  return { goals, messages };
}
