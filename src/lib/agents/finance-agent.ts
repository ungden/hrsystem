import { DepartmentGoal, CostProjection, SalaryProjection, AgentMessage } from '../agent-types';
import { employees, employeeCareers, getCareerLevel, formatCurrency, departments } from '../mock-data';

export function runFinanceAgent(goals: DepartmentGoal[]): {
  costProjections: CostProjection[];
  salaryProjections: SalaryProjection[];
  messages: AgentMessage[];
} {
  const activeEmployees = employees.filter(e => e.trangThai !== 'da_nghi');
  const LUNCH_ALLOWANCE = 400_000;
  const FUEL_ALLOWANCE = 1_000_000;
  const PHONE_ALLOWANCE = 0;
  const INSURANCE_RATE = 0.08;

  // Calculate per-employee salary projections
  const salaryProjections: SalaryProjection[] = activeEmployees.map(emp => {
    const career = employeeCareers.find(c => c.employeeId === emp.id);
    const baseSalary = career?.currentSalary || 12_000_000;
    const level = getCareerLevel(career?.levelCode || 'L3');
    const allowances = LUNCH_ALLOWANCE + FUEL_ALLOWANCE + PHONE_ALLOWANCE;
    const insurance = -Math.round(baseSalary * INSURANCE_RATE);

    // Project bonus based on dept goals completion
    const deptGoals = goals.filter(g => g.department === emp.phongBan);
    const avgCompletion = deptGoals.length > 0
      ? deptGoals.reduce((s, g) => s + (g.targetValue > 0 ? g.currentValue / g.targetValue : 0), 0) / deptGoals.length
      : 0.7;

    const completionRate = Math.round(Math.min(avgCompletion * 100, 100));

    // Bonus: 10-25% of base salary depending on completion
    const bonusRate = avgCompletion >= 1 ? 0.25 : avgCompletion >= 0.8 ? 0.15 : avgCompletion >= 0.6 ? 0.10 : 0.05;
    const projectedBonus = Math.round(baseSalary * bonusRate / 100_000) * 100_000;

    const bonusBreakdown = [
      { source: 'KPI hoàn thành', amount: Math.round(projectedBonus * 0.6) },
      { source: 'Thưởng phòng ban', amount: Math.round(projectedBonus * 0.25) },
      { source: 'Thưởng công ty', amount: Math.round(projectedBonus * 0.15) },
    ];

    return {
      employeeId: emp.id,
      employeeName: emp.name,
      department: emp.phongBan,
      levelCode: career?.levelCode || 'L3',
      baseSalary,
      allowances,
      insurance,
      projectedBonus,
      projectedTotal: baseSalary + allowances + insurance + projectedBonus,
      completionRate,
      bonusBreakdown,
    };
  });

  // Aggregate into cost projections per department
  const costProjections: CostProjection[] = departments.map(dept => {
    const deptProjections = salaryProjections.filter(s => s.department === dept);
    return {
      department: dept,
      headcount: deptProjections.length,
      totalBaseSalary: deptProjections.reduce((s, p) => s + p.baseSalary, 0),
      totalAllowances: deptProjections.reduce((s, p) => s + p.allowances, 0),
      totalInsurance: deptProjections.reduce((s, p) => s + Math.abs(p.insurance), 0),
      projectedBonusPool: deptProjections.reduce((s, p) => s + p.projectedBonus, 0),
      totalCost: deptProjections.reduce((s, p) => s + p.projectedTotal, 0),
    };
  }).filter(c => c.headcount > 0);

  const totalCost = costProjections.reduce((s, c) => s + c.totalCost, 0);
  const totalBonus = costProjections.reduce((s, c) => s + c.projectedBonusPool, 0);
  const totalBase = costProjections.reduce((s, c) => s + c.totalBaseSalary, 0);

  const messages: AgentMessage[] = [
    {
      id: 'msg-fin-1',
      agentRole: 'finance',
      agentName: 'AI CFO',
      timestamp: new Date().toISOString(),
      content: `Tổng chi phí nhân sự dự kiến: ${formatCurrency(totalCost)} VND/tháng. Trong đó: Lương cơ bản ${formatCurrency(totalBase)} (${Math.round(totalBase/totalCost*100)}%), Thưởng dự kiến ${formatCurrency(totalBonus)} (${Math.round(totalBonus/totalCost*100)}%), Phụ cấp + BH chiếm phần còn lại.`,
      type: 'analysis',
    },
    {
      id: 'msg-fin-2',
      agentRole: 'finance',
      agentName: 'AI CFO',
      timestamp: new Date().toISOString(),
      content: `Chi phí bình quân/nhân sự: ${formatCurrency(Math.round(totalCost / activeEmployees.length))} VND/tháng. ${costProjections.sort((a, b) => b.totalCost - a.totalCost)[0]?.department} có chi phí cao nhất với ${costProjections[0]?.headcount} nhân sự.`,
      type: 'analysis',
    },
  ];

  return { costProjections, salaryProjections, messages };
}
