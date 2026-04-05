import { ChatMessage, AgentCoordinationState, AgentRole } from '../agent-types';
import { formatCurrency, employees, departments } from '../mock-data';
import { agentProfiles } from './agent-profiles';

let messageCounter = 100;

function genId(): string {
  return `chat-${++messageCounter}`;
}

function now(): string {
  return new Date().toISOString();
}

interface KeywordRoute {
  keywords: string[];
  agent: AgentRole;
}

const routes: KeywordRoute[] = [
  { keywords: ['doanh thu', 'revenue', 'mục tiêu', 'target', 'chiến lược', 'tăng trưởng', 'growth'], agent: 'ceo' },
  { keywords: ['nhân sự', 'phân bổ', 'tuyển dụng', 'đào tạo', 'phát triển', 'thăng tiến', 'career'], agent: 'hr_director' },
  { keywords: ['chi phí', 'lương', 'thưởng', 'ngân sách', 'bonus', 'salary', 'tài chính', 'tiền'], agent: 'finance' },
  { keywords: ['công việc', 'nhiệm vụ', 'task', 'phòng ban', 'giao việc', 'deadline'], agent: 'dept_manager' },
  { keywords: ['hiệu suất', 'rủi ro', 'cảnh báo', 'coaching', 'đánh giá', 'kpi', 'performance'], agent: 'performance_coach' },
];

function detectAgent(input: string): AgentRole {
  const lower = input.toLowerCase();

  // Check department names - route to dept_manager
  for (const dept of departments) {
    if (lower.includes(dept.toLowerCase()) || lower.includes(dept.replace('Phòng ', '').toLowerCase())) {
      return 'dept_manager';
    }
  }

  // Check employee names - route to performance_coach
  for (const emp of employees) {
    if (lower.includes(emp.name.toLowerCase())) {
      return 'performance_coach';
    }
  }

  // Check keywords
  for (const route of routes) {
    if (route.keywords.some(kw => lower.includes(kw))) {
      return route.agent;
    }
  }

  return 'ceo'; // default
}

export function processUserChat(
  input: string,
  state: AgentCoordinationState
): ChatMessage[] {
  const agentRole = detectAgent(input);
  const profile = agentProfiles[agentRole];
  const lower = input.toLowerCase();

  let response = '';

  switch (agentRole) {
    case 'ceo': {
      const targets = state.businessTargets;
      const achieved = targets.filter(t => t.status === 'achieved').length;
      const atRisk = targets.filter(t => t.status === 'at_risk' || t.status === 'behind').length;
      response = `Hiện có ${targets.length} mục tiêu kinh doanh cho ${state.currentQuarter.quarter}/${state.currentQuarter.year}. Đã đạt: ${achieved}, Cần chú ý: ${atRisk}. `;

      if (lower.includes('doanh thu') || lower.includes('revenue')) {
        const revTarget = targets.find(t => t.category === 'revenue');
        if (revTarget) {
          response += `Doanh thu mục tiêu: ${formatCurrency(revTarget.targetValue)} VND, hiện đạt ${formatCurrency(revTarget.currentValue)} VND (${Math.round(revTarget.currentValue / revTarget.targetValue * 100)}%).`;
        }
      } else {
        response += targets.map(t => `${t.name}: ${Math.round(t.currentValue / t.targetValue * 100)}%`).join('. ') + '.';
      }
      break;
    }

    case 'hr_director': {
      const goals = state.departmentGoals;
      // Check if asking about specific department
      const matchedDept = departments.find(d => lower.includes(d.toLowerCase()) || lower.includes(d.replace('Phòng ', '').toLowerCase()));
      if (matchedDept) {
        const deptGoals = goals.filter(g => g.department === matchedDept);
        response = `${matchedDept} có ${deptGoals.length} mục tiêu. `;
        response += deptGoals.map(g => `${g.name.split(':').pop()?.trim()}: đạt ${Math.round(g.currentValue / g.targetValue * 100)}%`).join('. ') + '.';
      } else {
        response = `Đã phân bổ ${goals.length} mục tiêu cho ${departments.length} phòng ban. Trọng số phân bổ dựa trên vai trò: Kinh doanh & Marketing chịu chính doanh thu, CNTT dẫn hiệu suất.`;
      }
      break;
    }

    case 'finance': {
      const costs = state.costProjections;
      const salaries = state.salaryProjections;
      const totalCost = costs.reduce((s, c) => s + c.totalCost, 0);
      const totalBonus = costs.reduce((s, c) => s + c.projectedBonusPool, 0);

      if (lower.includes('lương') || lower.includes('salary')) {
        response = `Tổng chi phí lương: ${formatCurrency(totalCost)} VND/tháng cho ${salaries.length} nhân sự. `;
        response += `Thưởng dự kiến: ${formatCurrency(totalBonus)} VND. Bình quân: ${formatCurrency(Math.round(totalCost / salaries.length))} VND/người.`;
      } else {
        response = `Tổng chi phí nhân sự: ${formatCurrency(totalCost)} VND/tháng. `;
        response += costs.map(c => `${c.department.replace('Phòng ', '')}: ${formatCurrency(c.totalCost)}`).join(', ') + '.';
      }
      break;
    }

    case 'dept_manager': {
      const plans = state.individualPlans;
      const matchedDept = departments.find(d => lower.includes(d.toLowerCase()) || lower.includes(d.replace('Phòng ', '').toLowerCase()));

      if (matchedDept) {
        const deptPlans = plans.filter(p => {
          const emp = employees.find(e => e.id === p.employeeId);
          return emp?.phongBan === matchedDept;
        });
        const completed = deptPlans.filter(p => p.status === 'completed').length;
        const atRisk = deptPlans.filter(p => p.status === 'at_risk').length;
        response = `${matchedDept}: ${deptPlans.length} nhiệm vụ cá nhân. Hoàn thành: ${completed}, Rủi ro: ${atRisk}. `;
        // Top employees
        const empSummary = [...new Set(deptPlans.map(p => p.employeeName))].slice(0, 3);
        response += `Nhân viên: ${empSummary.join(', ')}.`;
      } else {
        const completed = plans.filter(p => p.status === 'completed').length;
        response = `Tổng cộng ${plans.length} nhiệm vụ cá nhân đã được phân bổ. Hoàn thành: ${completed} (${Math.round(completed / plans.length * 100)}%).`;
      }
      break;
    }

    case 'performance_coach': {
      const plans = state.individualPlans;
      const matchedEmp = employees.find(e => lower.includes(e.name.toLowerCase()));

      if (matchedEmp) {
        const empPlans = plans.filter(p => p.employeeId === matchedEmp.id);
        const completed = empPlans.filter(p => p.status === 'completed').length;
        const atRisk = empPlans.filter(p => p.status === 'at_risk').length;
        const salary = state.salaryProjections.find(s => s.employeeId === matchedEmp.id);
        response = `${matchedEmp.name} (${matchedEmp.chucVu}, ${matchedEmp.phongBan}): ${empPlans.length} nhiệm vụ, hoàn thành ${completed}, rủi ro ${atRisk}. `;
        if (salary) {
          response += `Lương dự kiến: ${formatCurrency(salary.projectedTotal)} VND (bao gồm thưởng ${formatCurrency(salary.projectedBonus)}).`;
        }
      } else {
        const atRisk = plans.filter(p => p.status === 'at_risk');
        const riskEmployees = [...new Set(atRisk.map(p => p.employeeName))];
        response = `Có ${riskEmployees.length} nhân viên đang gặp rủi ro hiệu suất. `;
        if (riskEmployees.length > 0) {
          response += `Cần hỗ trợ: ${riskEmployees.slice(0, 5).join(', ')}. Đề xuất coaching 1-on-1.`;
        } else {
          response += `Tất cả nhân viên đang thực hiện tốt nhiệm vụ.`;
        }
      }
      break;
    }
  }

  return [
    {
      id: genId(),
      sender: agentRole,
      senderName: profile.name,
      content: response,
      timestamp: now(),
    },
  ];
}
