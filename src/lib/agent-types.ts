// ============ AI MULTI-AGENT COORDINATION SYSTEM ============

export type AgentRole = 'ceo' | 'hr_director' | 'finance' | 'dept_manager' | 'performance_coach' | 'channel_optimizer' | 'inventory_planner' | 'collection_director' | 'market_research' | 'strategy' | 'assistant';
export type AgentStatus = 'idle' | 'thinking' | 'done' | 'error';
export type QuarterPeriod = 'Q1' | 'Q2' | 'Q3' | 'Q4';

export interface AgentProfile {
  role: AgentRole;
  name: string;
  title: string;
  avatar: string;
  color: string;
  bgColor: string;
  textColor: string;
  description: string;
  department?: string;
}

export interface AgentMessage {
  id: string;
  agentRole: AgentRole;
  agentName: string;
  timestamp: string;
  content: string;
  type: 'analysis' | 'decision' | 'alert' | 'recommendation' | 'question';
}

export type TargetCategory = 'revenue' | 'growth' | 'efficiency' | 'quality';

export interface BusinessTarget {
  id: string;
  year: number;
  quarter: QuarterPeriod;
  name: string;
  category: TargetCategory;
  targetValue: number;
  currentValue: number;
  unit: string;
  status: 'on_track' | 'at_risk' | 'behind' | 'achieved';
}

export interface DepartmentGoal {
  id: string;
  businessTargetId: string;
  department: string;
  name: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  weight: number; // % weight toward business target
}

export interface IndividualPlan {
  id: string;
  departmentGoalId: string;
  employeeId: string;
  employeeName: string;
  taskTitle: string;
  description: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  weight: number; // weight within department goal
  deadline: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'at_risk';
  points: number;
}

export interface CostProjection {
  department: string;
  headcount: number;
  totalBaseSalary: number;
  totalAllowances: number;
  totalInsurance: number;
  projectedBonusPool: number;
  totalCost: number;
}

export interface SalaryProjection {
  employeeId: string;
  employeeName: string;
  department: string;
  levelCode: string;
  baseSalary: number;
  allowances: number;
  insurance: number;
  projectedBonus: number;
  projectedTotal: number;
  completionRate: number; // 0-100%
  bonusBreakdown: { source: string; amount: number }[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | AgentRole;
  senderName: string;
  content: string;
  timestamp: string;
}

// ============ CHANNEL OPTIMIZER ============
export interface ChannelAnalysis {
  channel: string;
  revenue: number;
  margin_pct: number;
  revenue_share: number;
  adSpend: number;
  roas: number;
  recommendation: 'increase' | 'maintain' | 'decrease' | 'optimize';
}

// ============ INVENTORY PLANNER ============
export interface InventoryForecast {
  month: number;
  demandUnits: number;
  currentStock: number;
  reorderNeeded: boolean;
  productionBatches: number;
  rawMaterialNeeded: number;
}

export interface StockAlert {
  itemName: string;
  currentStock: number;
  minStock: number;
  status: 'ok' | 'low' | 'critical' | 'dead';
  action: string;
}

// ============ COLLECTION DIRECTOR ============
export interface CollectionPlan {
  month: number;
  name: string;
  theme: string;
  targetSKUs: number;
  status: 'planned' | 'in_design' | 'in_production' | 'launched' | 'completed';
  topSellers: number;
}

// ============ AGENT ACTIONS (Write operations) ============
export interface AgentAction {
  id: string;
  agentRole: AgentRole;
  actionType: string;
  description: string;
  timestamp: string;
  success: boolean;
  details?: Record<string, unknown>;
}

export interface AgentCoordinationState {
  currentQuarter: { year: number; quarter: QuarterPeriod };
  businessTargets: BusinessTarget[];
  departmentGoals: DepartmentGoal[];
  individualPlans: IndividualPlan[];
  costProjections: CostProjection[];
  salaryProjections: SalaryProjection[];
  messages: AgentMessage[];
  agentStatuses: Record<AgentRole, AgentStatus>;
  chatHistory: ChatMessage[];
  actions: AgentAction[];
  // Financial statements
  financials: import('./financial-types').FinancialStatements;
  financialHealth: import('./financial-types').FinancialHealthMetrics;
  departmentDetails: import('./financial-types').DepartmentDetail[];
  milestones: import('./financial-types').BusinessMilestone[];
  // Teeworld-specific
  channelAnalysis: ChannelAnalysis[];
  inventoryForecasts: InventoryForecast[];
  stockAlerts: StockAlert[];
  collectionPlans: CollectionPlan[];
  // Market Research & Strategy
  marketResearch?: import('./agents/market-research-agent').MarketResearchReport;
  strategyReport?: import('./agents/strategy-agent').StrategyReport;
  // Workflow orchestration
  workflowRun?: import('./agents/workflow-types').WorkflowRun;
}
