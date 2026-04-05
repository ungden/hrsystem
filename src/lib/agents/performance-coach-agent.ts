import { IndividualPlan, AgentMessage } from '../agent-types';
import { employees, employeeCareers, getPerformanceRating } from '../mock-data';

export function runPerformanceCoachAgent(plans: IndividualPlan[]): {
  updatedPlans: IndividualPlan[];
  messages: AgentMessage[];
} {
  const activeEmployees = employees.filter(e => e.trangThai !== 'da_nghi');
  const messages: AgentMessage[] = [];

  // Analyze each employee's performance
  const riskEmployees: string[] = [];
  const starEmployees: string[] = [];

  const updatedPlans = plans.map(plan => {
    const career = employeeCareers.find(c => c.employeeId === plan.employeeId);
    const recentRating = career?.performanceHistory.slice(-1)[0];

    // Check if employee has weak historical performance
    if (recentRating && (recentRating.rating === 'Weak' || recentRating.rating === 'Poor')) {
      if (plan.status === 'in_progress' || plan.status === 'not_started') {
        return { ...plan, status: 'at_risk' as const };
      }
    }

    return plan;
  });

  // Aggregate employee risk analysis
  for (const emp of activeEmployees) {
    const empPlans = updatedPlans.filter(p => p.employeeId === emp.id);
    if (empPlans.length === 0) continue;

    const completedPlans = empPlans.filter(p => p.status === 'completed').length;
    const atRiskPlans = empPlans.filter(p => p.status === 'at_risk').length;
    const completionRate = empPlans.length > 0 ? completedPlans / empPlans.length : 0;

    const career = employeeCareers.find(c => c.employeeId === emp.id);
    const avgKPI = career?.performanceHistory.length
      ? Math.round(career.performanceHistory.reduce((s, h) => s + h.kpiScore, 0) / career.performanceHistory.length)
      : 60;

    if (atRiskPlans > 0 || completionRate < 0.3 || avgKPI < 55) {
      riskEmployees.push(emp.name);
    } else if (completionRate >= 0.8 && avgKPI >= 80) {
      starEmployees.push(emp.name);
    }
  }

  // Generate insight messages
  const totalPlans = updatedPlans.length;
  const completedCount = updatedPlans.filter(p => p.status === 'completed').length;
  const atRiskCount = updatedPlans.filter(p => p.status === 'at_risk').length;
  const inProgressCount = updatedPlans.filter(p => p.status === 'in_progress').length;

  messages.push({
    id: 'msg-coach-1',
    agentRole: 'performance_coach',
    agentName: 'AI Coach',
    timestamp: new Date().toISOString(),
    content: `Tổng quan hiệu suất: ${totalPlans} nhiệm vụ - Hoàn thành: ${completedCount} (${Math.round(completedCount/totalPlans*100)}%), Đang thực hiện: ${inProgressCount}, Rủi ro: ${atRiskCount} (${Math.round(atRiskCount/totalPlans*100)}%).`,
    type: 'analysis',
  });

  if (riskEmployees.length > 0) {
    messages.push({
      id: 'msg-coach-2',
      agentRole: 'performance_coach',
      agentName: 'AI Coach',
      timestamp: new Date().toISOString(),
      content: `Cảnh báo: ${riskEmployees.length} nhân viên cần hỗ trợ: ${riskEmployees.slice(0, 5).join(', ')}${riskEmployees.length > 5 ? '...' : ''}. Đề xuất: Tổ chức 1-on-1 coaching, điều chỉnh khối lượng công việc, hoặc ghép cặp mentor.`,
      type: 'alert',
    });
  }

  if (starEmployees.length > 0) {
    messages.push({
      id: 'msg-coach-3',
      agentRole: 'performance_coach',
      agentName: 'AI Coach',
      timestamp: new Date().toISOString(),
      content: `Nhân viên xuất sắc: ${starEmployees.slice(0, 5).join(', ')}. Đề xuất: Xem xét thưởng hiệu suất, cân nhắc promotion, hoặc giao thêm trách nhiệm để phát triển.`,
      type: 'recommendation',
    });
  }

  return { updatedPlans, messages };
}
