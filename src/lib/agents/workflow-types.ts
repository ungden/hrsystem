/**
 * Workflow Engine Types — Multi-agent orchestration with approval gates
 */
import { AgentRole, AgentAction } from '../agent-types';

export type WorkflowPhase = 'idle' | 'strategy' | 'proposals' | 'review' | 'debate' | 'execution' | 'monitoring' | 'complete';
export type ProposalStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'needs_revision';
export type ReviewVerdict = 'approved' | 'needs_debate' | 'rejected';

export interface CEOStrategy {
  focus: 'growth' | 'cost_reduction' | 'efficiency' | 'quality';
  rationale: string;
  budgetCeiling: number;
  revenueTarget: number;
  headcountCeiling: number;
  priorities: string[];
}

export interface ProposalAction {
  skillFn: string;
  params: Record<string, unknown>;
  description: string;
}

export interface AgentProposal {
  id: string;
  agentRole: AgentRole;
  title: string;
  summary: string;
  metrics: { name: string; current: number; target: number; unit: string }[];
  actions: ProposalAction[];
  estimatedCost: number;
  estimatedImpact: string;
  status: ProposalStatus;
  reviewScore?: number;
  reviewNotes?: string;
  reviewCriteria?: ReviewCriteria;
}

export interface ReviewCriteria {
  budgetAlignment: number;     // 0-20
  targetAlignment: number;     // 0-20
  headcountImpact: number;     // 0-20
  riskLevel: number;           // 0-20
  dataQuality: number;         // 0-20
}

export interface DebateMessage {
  id: string;
  from: AgentRole;
  to: AgentRole;
  content: string;
  type: 'question' | 'defense' | 'concern' | 'concession';
  dataPoints: string[];
  timestamp: string;
  round: number;
}

export type WorkflowEventType = 'phase_start' | 'proposal_submitted' | 'review_complete' | 'debate' | 'approved' | 'rejected' | 'action_executed' | 'phase_end';

export interface WorkflowEvent {
  id: string;
  phase: WorkflowPhase;
  agentRole: AgentRole;
  description: string;
  timestamp: string;
  type: WorkflowEventType;
}

export interface WorkflowRun {
  id: string;
  phase: WorkflowPhase;
  startedAt: string;
  completedAt?: string;
  strategy?: CEOStrategy;
  proposals: AgentProposal[];
  debates: DebateMessage[];
  approvedProposals: string[];
  rejectedProposals: string[];
  executionLog: AgentAction[];
  timeline: WorkflowEvent[];
}
