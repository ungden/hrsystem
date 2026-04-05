import { DepartmentGoal, CostProjection, SalaryProjection, AgentMessage } from '../agent-types';
import { getEmployees, getEmployeeCareers, getPayrolls, getFinanceSettings, getPerformanceRatings } from '@/lib/supabase-data';
import { formatCurrency } from '../format';

export async function runFinanceAgent(goals: DepartmentGoal[]): Promise<{
  costProjections: CostProjection[];
  salaryProjections: SalaryProjection[];
  messages: AgentMessage[];
}> {
  const now = new Date();
  const currentMonth = `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

  const [employees, employeeCareers, payrolls, financeSettings, performanceRatings] = await Promise.all([
    getEmployees(),
    getEmployeeCareers(),
    getPayrolls(currentMonth),
    getFinanceSettings(),
    getPerformanceRatings(),
  ]);

  const activeEmployees = employees.filter((e: { status: string }) => e.status !== 'inactive');
  const departments = [...new Set(employees.map((e: { department: string }) => e.department))];

  // Finance settings with defaults
  const lunchAllowance = financeSettings?.lunch_allowance ?? 400_000;
  const fuelAllowance = financeSettings?.fuel_allowance ?? 1_000_000;
  const phoneAllowance = financeSettings?.phone_allowance ?? 0;
  const bhxhRate = financeSettings?.insurance_rate_bhxh ?? 0.08;
  const bhytRate = financeSettings?.insurance_rate_bhyt ?? 0.015;
  const bhtnRate = financeSettings?.insurance_rate_bhtn ?? 0.01;
  const totalInsuranceRate = bhxhRate + bhytRate + bhtnRate;
  const bonusTiers: { min_score: number; label: string; rate: number }[] = financeSettings?.bonus_tiers ?? [
    { min_score: 90, label: 'Xuat sac', rate: 0.25 },
    { min_score: 75, label: 'Tot', rate: 0.15 },
    { min_score: 55, label: 'Kha', rate: 0.10 },
    { min_score: 0, label: 'Trung binh', rate: 0.05 },
  ];

  // Calculate per-employee salary projections
  const salaryProjections: SalaryProjection[] = activeEmployees.map((emp: { id: number; name: string; department: string; role: string }) => {
    const career = employeeCareers.find((c: { employee_id: number }) => c.employee_id === emp.id);
    const payroll = payrolls.find((p: { employee_id: number }) => p.employee_id === emp.id);
    const levelCode = career?.level_code || 'L3';

    let baseSalary: number;
    let allowances: number;
    let insurance: number;
    let projectedBonus: number;
    let completionRate: number;

    if (payroll) {
      // Use real payroll data
      baseSalary = payroll.base_salary || 0;
      allowances = payroll.allowances || 0;
      insurance = -(payroll.deductions || 0);
      projectedBonus = payroll.bonus || 0;

      // Completion rate from performance ratings
      const empRatings = performanceRatings
        .filter((r: { employee_id: number }) => r.employee_id === emp.id)
        .sort((a: { period: string }, b: { period: string }) => b.period.localeCompare(a.period));
      completionRate = empRatings.length > 0 ? empRatings[0].kpi_score : 70;
    } else {
      // Compute from career data + finance settings
      baseSalary = career?.current_salary || 12_000_000;
      allowances = lunchAllowance + fuelAllowance + phoneAllowance;
      insurance = -Math.round(baseSalary * totalInsuranceRate);

      // Bonus from performance ratings
      const empRatings = performanceRatings
        .filter((r: { employee_id: number }) => r.employee_id === emp.id)
        .sort((a: { period: string }, b: { period: string }) => b.period.localeCompare(a.period));
      const latestScore = empRatings.length > 0 ? empRatings[0].kpi_score : 50;
      completionRate = latestScore;

      // Find matching bonus tier
      const sortedTiers = [...bonusTiers].sort((a, b) => b.min_score - a.min_score);
      const matchedTier = sortedTiers.find(t => latestScore >= t.min_score) || sortedTiers[sortedTiers.length - 1];
      projectedBonus = Math.round(baseSalary * (matchedTier?.rate || 0.05) / 100_000) * 100_000;
    }

    const bonusBreakdown = [
      { source: 'KPI hoan thanh', amount: Math.round(projectedBonus * 0.6) },
      { source: 'Thuong phong ban', amount: Math.round(projectedBonus * 0.25) },
      { source: 'Thuong cong ty', amount: Math.round(projectedBonus * 0.15) },
    ];

    return {
      employeeId: String(emp.id),
      employeeName: emp.name,
      department: emp.department,
      levelCode,
      baseSalary,
      allowances,
      insurance,
      projectedBonus,
      projectedTotal: baseSalary + allowances + insurance + projectedBonus,
      completionRate: Math.round(Math.min(completionRate, 100)),
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
  const payrollSource = payrolls.length > 0 ? `bang luong thang ${currentMonth}` : 'du lieu career + finance_settings';

  const messages: AgentMessage[] = [
    {
      id: 'msg-fin-1',
      agentRole: 'finance',
      agentName: 'AI CFO',
      timestamp: new Date().toISOString(),
      content: `Tong chi phi nhan su du kien: ${formatCurrency(totalCost)} VND/thang (nguon: ${payrollSource}). Trong do: Luong co ban ${formatCurrency(totalBase)} (${totalCost > 0 ? Math.round(totalBase/totalCost*100) : 0}%), Thuong du kien ${formatCurrency(totalBonus)} (${totalCost > 0 ? Math.round(totalBonus/totalCost*100) : 0}%), Phu cap + BH chiem phan con lai.`,
      type: 'analysis',
    },
    {
      id: 'msg-fin-2',
      agentRole: 'finance',
      agentName: 'AI CFO',
      timestamp: new Date().toISOString(),
      content: `Chi phi binh quan/nhan su: ${formatCurrency(activeEmployees.length > 0 ? Math.round(totalCost / activeEmployees.length) : 0)} VND/thang. ${costProjections.sort((a, b) => b.totalCost - a.totalCost)[0]?.department || 'N/A'} co chi phi cao nhat voi ${costProjections[0]?.headcount || 0} nhan su. BH: BHXH ${bhxhRate*100}% + BHYT ${bhytRate*100}% + BHTN ${bhtnRate*100}% = ${totalInsuranceRate*100}%.`,
      type: 'analysis',
    },
  ];

  return { costProjections, salaryProjections, messages };
}
