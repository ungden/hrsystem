/**
 * Agent Coordinator — Orchestrates 10 AI agents in optimal dependency order.
 *
 * Flow designed like a real company decision-making process:
 *
 * PHASE 1: INTELLIGENCE GATHERING (parallel — no dependencies)
 *   Market Research, Channel Optimizer, Inventory Planner, Collection Director, Financial Statements
 *   → Gather ALL external + operational data FIRST
 *
 * PHASE 2: STRATEGY (sequential — CEO informed by Phase 1)
 *   CEO Agent (with market intelligence) → Strategy Agent (challenges CEO)
 *   → Decisions made with FULL information, then immediately challenged
 *
 * PHASE 3: PLANNING (cascade with parallelism)
 *   HR Director → [Finance + Dept Managers] (parallel)
 *   → Translate strategy into department goals, then cost + individual plans simultaneously
 *
 * PHASE 4: QUALITY CONTROL (sequential)
 *   Performance Coach → Department Details + Milestones
 *   → Monitor everything, flag risks, identify stars
 */

import { AgentCoordinationState, AgentRole, QuarterPeriod } from '../agent-types';
import { runCEOAgent } from './ceo-agent';
import { runHRDirectorAgent } from './hr-director-agent';
import { runFinanceAgent } from './finance-agent';
import { runDeptManagerAgent } from './dept-manager-agent';
import { runPerformanceCoachAgent } from './performance-coach-agent';
import { runChannelOptimizerAgent } from './channel-optimizer-agent';
import { runInventoryPlannerAgent } from './inventory-planner-agent';
import { runCollectionDirectorAgent } from './collection-director-agent';
import { runMarketResearchAgent } from './market-research-agent';
import { runStrategyAgent } from './strategy-agent';
import { runAssistantAgent } from './assistant-agent';
import { generateAllFinancials, calculateFinancialHealth, generateDepartmentDetails, generateMilestones } from '../financial-data';
import { getActionLog } from './agent-skills';

export async function runFullCoordination(year: number = 2026, quarter: QuarterPeriod = 'Q2'): Promise<AgentCoordinationState> {
  const quarterStartMonth: Record<QuarterPeriod, number> = { Q1: 1, Q2: 4, Q3: 7, Q4: 10 };
  const currentMonth = quarterStartMonth[quarter] + 1; // mid-quarter

  // ================================================================
  // PHASE 1: INTELLIGENCE GATHERING (all parallel — no dependencies)
  // Gather market data, channel performance, inventory, collections,
  // and financial statements BEFORE any strategic decisions.
  // ================================================================
  const [
    marketResearch,
    channelResult,
    inventoryResult,
    collectionResult,
    financials,
  ] = await Promise.all([
    runMarketResearchAgent(),
    runChannelOptimizerAgent(),
    runInventoryPlannerAgent(currentMonth),
    runCollectionDirectorAgent(currentMonth),
    generateAllFinancials(),
  ]);

  // ================================================================
  // PHASE 2: STRATEGY (CEO informed by intelligence → Strategy challenges)
  // CEO now sees market data + channel performance BEFORE setting targets.
  // Strategy Agent immediately challenges CEO with contrarian perspective.
  // ================================================================
  const ceoResult = await runCEOAgent(year, quarter, {
    marketResearch,
    channelAnalysis: channelResult.analysis,
  });

  // Financial health needs both financials + CEO targets context
  const financialHealth = calculateFinancialHealth(financials.incomeStatements, financials.balanceSheet);

  // ================================================================
  // PHASE 3: PLANNING (HR → parallel Finance + Dept Managers)
  // HR maps CEO targets to department goals, then Finance and Dept
  // Managers work in PARALLEL to calculate costs and individual plans.
  // ================================================================
  const hrResult = await runHRDirectorAgent(ceoResult.targets);

  const [financeResult, deptResult] = await Promise.all([
    runFinanceAgent(hrResult.goals),
    runDeptManagerAgent(hrResult.goals),
  ]);

  // ================================================================
  // PHASE 4: QUALITY CONTROL
  // Performance Coach monitors all plans, then we generate
  // department details, milestones, and Strategy assessment.
  // ================================================================
  const coachResult = await runPerformanceCoachAgent(deptResult.plans);

  const [departmentDetails, milestones] = await Promise.all([
    generateDepartmentDetails(financeResult.costProjections, coachResult.updatedPlans, hrResult.goals),
    generateMilestones(),
  ]);

  // Strategy Agent runs last — needs the COMPLETE picture to challenge effectively
  const fullState: AgentCoordinationState = {
    currentQuarter: { year, quarter },
    businessTargets: ceoResult.targets,
    departmentGoals: hrResult.goals,
    individualPlans: coachResult.updatedPlans,
    costProjections: financeResult.costProjections,
    salaryProjections: financeResult.salaryProjections,
    messages: [],
    agentStatuses: {} as AgentCoordinationState['agentStatuses'],
    chatHistory: [],
    actions: getActionLog(),
    financials,
    financialHealth,
    departmentDetails,
    milestones,
    channelAnalysis: channelResult.analysis,
    inventoryForecasts: inventoryResult.forecasts,
    stockAlerts: inventoryResult.alerts,
    collectionPlans: collectionResult.plans,
    marketResearch,
  };
  const strategyResult = runStrategyAgent(fullState, marketResearch);

  // ================================================================
  // PHASE 5: ASSISTANT — Tổng hợp TẤT CẢ thành báo cáo cho CEO
  // Chạy cuối cùng, đọc toàn bộ state + strategy rồi viết reports.
  // ================================================================
  const finalState: AgentCoordinationState = {
    ...fullState,
    strategyReport: strategyResult,
  };
  const assistantResult = runAssistantAgent(finalState);

  // ================================================================
  // COMBINE — Messages ordered by phase for natural reading flow
  // Assistant reports go FIRST (executive summary), then raw agent messages
  // ================================================================
  const allMessages = [
    // Phase 5: Assistant reports (CEO reads these first)
    ...assistantResult.reports,
    // Phase 1: Intelligence
    ...marketResearch.messages,
    ...channelResult.messages,
    ...inventoryResult.messages,
    ...collectionResult.messages,
    // Phase 2: Strategy
    ...ceoResult.messages,
    ...strategyResult.messages,
    // Phase 3: Planning
    ...hrResult.messages,
    ...financeResult.messages,
    ...deptResult.messages,
    // Phase 4: Quality Control
    ...coachResult.messages,
  ];

  const agentStatuses: Record<AgentRole, 'idle' | 'thinking' | 'done' | 'error'> = {
    assistant: 'done',
    market_research: 'done',
    channel_optimizer: 'done',
    inventory_planner: 'done',
    collection_director: 'done',
    ceo: 'done',
    strategy: 'done',
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
    actions: getActionLog(),
    financials,
    financialHealth,
    departmentDetails,
    milestones,
    channelAnalysis: channelResult.analysis,
    inventoryForecasts: inventoryResult.forecasts,
    stockAlerts: inventoryResult.alerts,
    collectionPlans: collectionResult.plans,
    marketResearch,
    strategyReport: strategyResult,
  };
}
