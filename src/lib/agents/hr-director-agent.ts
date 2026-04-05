import { BusinessTarget, DepartmentGoal, AgentMessage } from '../agent-types';
import { employees, departments } from '../mock-data';

// Department relevance weights for each target category
const deptWeights: Record<string, Record<string, number>> = {
  revenue: {
    'Phòng Kinh doanh': 0.40,
    'Phòng Marketing': 0.25,
    'Phòng CNTT': 0.15,
    'Phòng Kế toán': 0.08,
    'Phòng Nhân sự': 0.05,
    'Phòng Hành chính': 0.07,
  },
  growth: {
    'Phòng Kinh doanh': 0.35,
    'Phòng Marketing': 0.30,
    'Phòng CNTT': 0.10,
    'Phòng Kế toán': 0.05,
    'Phòng Nhân sự': 0.10,
    'Phòng Hành chính': 0.10,
  },
  efficiency: {
    'Phòng CNTT': 0.30,
    'Phòng Hành chính': 0.20,
    'Phòng Kế toán': 0.20,
    'Phòng Nhân sự': 0.15,
    'Phòng Kinh doanh': 0.10,
    'Phòng Marketing': 0.05,
  },
  quality: {
    'Phòng CNTT': 0.25,
    'Phòng Kinh doanh': 0.20,
    'Phòng Nhân sự': 0.15,
    'Phòng Kế toán': 0.15,
    'Phòng Marketing': 0.15,
    'Phòng Hành chính': 0.10,
  },
};

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

    for (const dept of departments) {
      const weight = weights[dept] || 0.1;
      const deptEmployees = activeEmployees.filter(e => e.phongBan === dept);
      if (deptEmployees.length === 0) continue;

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

  // Department headcount summary
  const deptSummary = departments.map(d => {
    const count = activeEmployees.filter(e => e.phongBan === d).length;
    return `${d.replace('Phòng ', '')}: ${count} người`;
  }).join(', ');

  const messages: AgentMessage[] = [
    {
      id: 'msg-hr-1',
      agentRole: 'hr_director',
      agentName: 'AI HR Director',
      timestamp: new Date().toISOString(),
      content: `Đã phân bổ ${targets.length} mục tiêu kinh doanh thành ${goals.length} mục tiêu phòng ban. Phân bổ dựa trên vai trò và năng lực của từng phòng. Đội ngũ hiện tại: ${deptSummary}.`,
      type: 'decision',
    },
    {
      id: 'msg-hr-2',
      agentRole: 'hr_director',
      agentName: 'AI HR Director',
      timestamp: new Date().toISOString(),
      content: `Phòng Kinh doanh và Marketing chịu trách nhiệm chính cho mục tiêu doanh thu (65%). Phòng CNTT dẫn đầu mục tiêu hiệu suất (30%). Tất cả phòng ban đều có đóng góp vào mục tiêu chất lượng.`,
      type: 'analysis',
    },
  ];

  return { goals, messages };
}
