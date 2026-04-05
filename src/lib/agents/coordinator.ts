import { AgentCoordinationState, AgentRole, QuarterPeriod } from '../agent-types';
import { runCEOAgent } from './ceo-agent';
import { runHRDirectorAgent } from './hr-director-agent';
import { runFinanceAgent } from './finance-agent';
import { runDeptManagerAgent } from './dept-manager-agent';
import { runPerformanceCoachAgent } from './performance-coach-agent';
import { generateAllFinancials, calculateFinancialHealth, generateDepartmentDetails, generateMilestones } from '../financial-data';

export async function runFullCoordination(year: number = 2026, quarter: QuarterPeriod = 'Q2'): Promise<AgentCoordinationState> {
  // Step 1: CEO sets business targets
  const ceoResult = await runCEOAgent(year, quarter);

  // Step 2: HR Director maps targets to department goals
  const hrResult = await runHRDirectorAgent(ceoResult.targets);

  // Step 3: Department Managers break goals into individual plans
  const deptResult = await runDeptManagerAgent(hrResult.goals);

  // Step 4: Performance Coach monitors and flags risks
  const coachResult = await runPerformanceCoachAgent(deptResult.plans);

  // Step 5: Finance calculates costs and salary projections
  const financeResult = await runFinanceAgent(hrResult.goals);

  // Step 6: Generate financial statements
  const financials = await generateAllFinancials();
  const financialHealth = calculateFinancialHealth(financials.incomeStatements, financials.balanceSheet);

  // Step 7: Generate department details
  const departmentDetails = await generateDepartmentDetails(
    financeResult.costProjections,
    coachResult.updatedPlans,
    hrResult.goals
  );

  // Step 8: Generate milestones
  const milestones = await generateMilestones();

  // Combine all messages chronologically
  const allMessages = [
    ...ceoResult.messages,
    ...hrResult.messages,
    ...financeResult.messages,
    ...deptResult.messages,
    ...coachResult.messages,
  ];

  const agentStatuses: Record<AgentRole, 'idle' | 'thinking' | 'done' | 'error'> = {
    ceo: 'done',
    hr_director: 'done',
    finance: 'done',
    dept_manager: 'done',
    performance_coach: 'done',
  };

  return {
    currentQuarter: { year, quarter },
    businessTargets: ceoResult.targets,
    departmentGoals: hrResult.goals,
    individualPlans: coachResult.updatedPlans,
    costProjections: financeResult.costProjections,
    salaryProjections: financeResult.salaryProjections,
    messages: allMessages,
    agentStatuses,
    chatHistory: [],
    financials,
    financialHealth,
    departmentDetails,
    milestones,
  };
}
