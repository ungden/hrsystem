/**
 * Workflow Engine — State machine orchestrating the multi-agent approval flow.
 *
 * Flow: STRATEGY → PROPOSALS → REVIEW → [DEBATE] → EXECUTION → MONITORING → COMPLETE
 *
 * Uses progressive callbacks so the UI can render each phase as it unfolds.
 */
import { AgentCoordinationState, ChatMessage, AgentRole } from '../agent-types';
import { WorkflowRun, WorkflowEvent, WorkflowPhase, AgentProposal, DebateMessage } from './workflow-types';
import { generateCEOStrategy, generateAllProposals, reviseProposal } from './proposal-generators';
import { reviewProposal, reReviewProposal, ReviewResult } from './ceo-review';
import { generateCEOQuestion, generateAgentDefense } from './debate-engine';
import { agentProfiles } from './agent-profiles';
import {
  coachSendReminder, coachRecommendPromotion,
  inventoryUpdateStock, inventoryFlagLowStock,
  deptUpdatePriority, hrRebalanceWorkload, hrAssignTask,
  deptCreateDailyTasks, ceoAdjustTarget,
} from './agent-skills';

type ProgressCallback = (messages: ChatMessage[]) => void;

let msgCounter = 500;
function chatMsg(sender: AgentRole, content: string): ChatMessage {
  return {
    id: `wf-${++msgCounter}`,
    sender,
    senderName: agentProfiles[sender]?.name || sender,
    content,
    timestamp: new Date().toISOString(),
  };
}

function eventId(): string {
  return `evt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
}

function addEvent(run: WorkflowRun, phase: WorkflowPhase, agentRole: AgentRole, description: string, type: WorkflowEvent['type']): void {
  run.timeline.push({
    id: eventId(),
    phase,
    agentRole,
    description,
    timestamp: new Date().toISOString(),
    type,
  });
}

// ============ SKILL EXECUTOR ============

async function executeAction(skillFn: string, params: Record<string, unknown>): Promise<{ success: boolean; error?: string }> {
  try {
    switch (skillFn) {
      case 'coachSendReminder':
        await coachSendReminder(params.employeeId as number, params.message as string);
        return { success: true };
      case 'coachRecommendPromotion':
        await coachRecommendPromotion(params.employeeId as number, params.reason as string);
        return { success: true };
      case 'inventoryUpdateStock':
        await inventoryUpdateStock(params.itemId as number, params.newStock as number);
        return { success: true };
      case 'inventoryFlagLowStock':
        await inventoryFlagLowStock();
        return { success: true };
      case 'deptUpdatePriority':
        await deptUpdatePriority(params.taskId as string, params.newPriority as string);
        return { success: true };
      case 'hrRebalanceWorkload':
        await hrRebalanceWorkload(params.fromEmpId as number, params.toEmpId as number, params.taskId as string);
        return { success: true };
      case 'hrAssignTask':
        await hrAssignTask(params as Parameters<typeof hrAssignTask>[0]);
        return { success: true };
      case 'deptCreateDailyTasks':
        await deptCreateDailyTasks(params.managerId as number, params.monthNumber as number);
        return { success: true };
      case 'ceoAdjustTarget':
        await ceoAdjustTarget(params.planId as string, params.newTarget as number, params.reason as string);
        return { success: true };
      default:
        return { success: false, error: `Skill "${skillFn}" không tồn tại` };
    }
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ============ MAIN WORKFLOW ============

export async function runWorkflow(
  state: AgentCoordinationState,
  onProgress: ProgressCallback,
): Promise<WorkflowRun> {
  const run: WorkflowRun = {
    id: `wf-${Date.now()}`,
    phase: 'idle',
    startedAt: new Date().toISOString(),
    proposals: [],
    debates: [],
    approvedProposals: [],
    rejectedProposals: [],
    executionLog: [],
    timeline: [],
  };

  // ═══════════════════════════════════════
  // PHASE 1: CEO STRATEGY
  // ═══════════════════════════════════════
  run.phase = 'strategy';
  addEvent(run, 'strategy', 'ceo', 'CEO bắt đầu phân tích chiến lược', 'phase_start');

  onProgress([
    chatMsg('ceo', `\n═══════════════════════════════════════\n   GIAI ĐOẠN 1: CEO CHIẾN LƯỢC\n═══════════════════════════════════════`),
    chatMsg('ceo', `Đang phân tích dữ liệu doanh nghiệp...`),
  ]);

  await delay(400);

  const strategy = generateCEOStrategy(state);
  run.strategy = strategy;

  const focusLabel = { growth: 'TĂNG TRƯỞNG', cost_reduction: 'CẮT GIẢM CHI PHÍ', efficiency: 'NÂNG CAO HIỆU SUẤT', quality: 'NÂNG CAO CHẤT LƯỢNG' }[strategy.focus];

  onProgress([
    chatMsg('ceo', `CEO QUYẾT ĐỊNH:\n` +
      `  Focus:     ${focusLabel}\n` +
      `  Ngân sách: ${fmt(strategy.budgetCeiling)}đ\n` +
      `  DT mục tiêu: ${fmt(strategy.revenueTarget)}đ\n` +
      `  Trần NS:   ${strategy.headcountCeiling} người\n\n` +
      `  Lý do: ${strategy.rationale}\n\n` +
      `  Ưu tiên:\n${strategy.priorities.map((p, i) => `    ${i + 1}. ${p}`).join('\n')}`),
  ]);

  addEvent(run, 'strategy', 'ceo', `Chiến lược: ${focusLabel}`, 'phase_end');

  await delay(300);

  // ═══════════════════════════════════════
  // PHASE 2: AGENT PROPOSALS
  // ═══════════════════════════════════════
  run.phase = 'proposals';
  addEvent(run, 'proposals', 'ceo', 'Bắt đầu nhận đề xuất từ các agent', 'phase_start');

  onProgress([
    chatMsg('ceo', `\n═══════════════════════════════════════\n   GIAI ĐOẠN 2: CÁC AGENT ĐỀ XUẤT\n═══════════════════════════════════════`),
  ]);

  await delay(200);

  const proposals = generateAllProposals(state, strategy);
  run.proposals = proposals;

  for (const p of proposals) {
    const profile = agentProfiles[p.agentRole];
    const metricsStr = p.metrics.map(m => `    ${m.name}: ${fmtMetric(m.current, m.unit)} / ${fmtMetric(m.target, m.unit)}`).join('\n');

    onProgress([
      chatMsg(p.agentRole, `[ĐỀ XUẤT] ${profile?.name || p.agentRole}\n` +
        `  ${p.title}\n` +
        `  ${p.summary}\n\n` +
        `  Chỉ số:\n${metricsStr}\n\n` +
        `  Chi phí: ${fmt(p.estimatedCost)}đ\n` +
        `  Tác động: ${p.estimatedImpact}\n` +
        `  Hành động: ${p.actions.length} bước`),
    ]);

    addEvent(run, 'proposals', p.agentRole, `Đề xuất: ${p.title}`, 'proposal_submitted');
    await delay(200);
  }

  // ═══════════════════════════════════════
  // PHASE 3: CEO REVIEW
  // ═══════════════════════════════════════
  run.phase = 'review';
  addEvent(run, 'review', 'ceo', 'CEO bắt đầu review đề xuất', 'phase_start');

  onProgress([
    chatMsg('ceo', `\n═══════════════════════════════════════\n   GIAI ĐOẠN 3: CEO REVIEW\n═══════════════════════════════════════`),
    chatMsg('ceo', `Đang đánh giá ${proposals.length} đề xuất...`),
  ]);

  await delay(300);

  const reviewResults: ReviewResult[] = [];
  const needsDebate: ReviewResult[] = [];

  for (let i = 0; i < run.proposals.length; i++) {
    const result = reviewProposal(run.proposals[i], strategy, state);
    reviewResults.push(result);
    run.proposals[i] = result.proposal;

    const icon = result.verdict === 'approved' ? '[V] DUYỆT' : result.verdict === 'rejected' ? '[X] TỪ CHỐI' : '[?] CẦN THẢO LUẬN';
    const scoreBar = '█'.repeat(Math.round(result.totalScore / 5)) + '░'.repeat(20 - Math.round(result.totalScore / 5));

    onProgress([
      chatMsg('ceo', `${icon} ${agentProfiles[result.proposal.agentRole]?.name}\n` +
        `  Điểm: ${scoreBar} ${result.totalScore}/100\n` +
        `  ${result.notes}`),
    ]);

    if (result.verdict === 'approved') {
      run.approvedProposals.push(result.proposal.id);
      addEvent(run, 'review', 'ceo', `DUYỆT: ${result.proposal.title} (${result.totalScore}/100)`, 'approved');
    } else if (result.verdict === 'rejected') {
      run.rejectedProposals.push(result.proposal.id);
      addEvent(run, 'review', 'ceo', `TỪ CHỐI: ${result.proposal.title} (${result.totalScore}/100)`, 'rejected');
    } else {
      needsDebate.push(result);
      addEvent(run, 'review', 'ceo', `CẦN THẢO LUẬN: ${result.proposal.title} (${result.totalScore}/100)`, 'review_complete');
    }

    await delay(150);
  }

  // ═══════════════════════════════════════
  // PHASE 4: DEBATE (if any)
  // ═══════════════════════════════════════
  if (needsDebate.length > 0) {
    run.phase = 'debate';
    addEvent(run, 'debate', 'ceo', `${needsDebate.length} đề xuất cần thảo luận`, 'phase_start');

    onProgress([
      chatMsg('ceo', `\n═══════════════════════════════════════\n   GIAI ĐOẠN 4: THẢO LUẬN\n═══════════════════════════════════════`),
      chatMsg('ceo', `${needsDebate.length} đề xuất cần làm rõ. Bắt đầu debate...`),
    ]);

    await delay(200);

    for (const result of needsDebate) {
      const proposal = result.proposal;
      const maxRounds = 2;

      for (let round = 1; round <= maxRounds; round++) {
        // CEO asks
        const question = generateCEOQuestion(proposal, result.criteria, strategy, state, round);
        run.debates.push(question);

        onProgress([
          chatMsg('ceo', `CEO hỏi ${agentProfiles[proposal.agentRole]?.name} (Vòng ${round}):\n  ${question.content}`),
        ]);

        addEvent(run, 'debate', 'ceo', `Hỏi ${proposal.agentRole}: ${question.content.slice(0, 60)}...`, 'debate');
        await delay(250);

        // Agent defends
        const defense = generateAgentDefense(proposal, question, strategy, state, round);
        run.debates.push(defense);

        onProgress([
          chatMsg(proposal.agentRole, `${agentProfiles[proposal.agentRole]?.name} trả lời:\n  ${defense.content}`),
        ]);

        addEvent(run, 'debate', proposal.agentRole, `Bảo vệ: ${defense.content.slice(0, 60)}...`, 'debate');
        await delay(250);
      }

      // Re-review after debate
      const reResult = reReviewProposal(proposal, maxRounds, strategy, state);
      const idx = run.proposals.findIndex(p => p.id === proposal.id);
      if (idx >= 0) run.proposals[idx] = reResult.proposal;

      const finalIcon = reResult.verdict === 'approved' ? '[V] DUYỆT' : '[X] TỪ CHỐI';

      onProgress([
        chatMsg('ceo', `${finalIcon} Kết luận sau thảo luận: ${agentProfiles[proposal.agentRole]?.name}\n` +
          `  Điểm mới: ${reResult.totalScore}/100. ${reResult.notes}`),
      ]);

      if (reResult.verdict === 'approved') {
        run.approvedProposals.push(proposal.id);
        addEvent(run, 'debate', 'ceo', `DUYỆT sau debate: ${proposal.title}`, 'approved');
      } else {
        run.rejectedProposals.push(proposal.id);
        addEvent(run, 'debate', 'ceo', `TỪ CHỐI sau debate: ${proposal.title}`, 'rejected');
      }

      await delay(150);
    }
  }

  // ═══════════════════════════════════════
  // PHASE 4B: REVISION LOOP (rejected → revise → re-review)
  // ═══════════════════════════════════════
  const MAX_REVISIONS = 3;
  let rejectedIds = [...run.rejectedProposals];

  if (rejectedIds.length > 0) {
    onProgress([
      chatMsg('ceo', `\n═══════════════════════════════════════\n   GIAI ĐOẠN 4B: CHỈNH SỬA & NỘP LẠI\n═══════════════════════════════════════`),
      chatMsg('ceo', `${rejectedIds.length} đề xuất bị từ chối. Yêu cầu các agent chỉnh sửa...`),
    ]);

    await delay(200);

    for (let revision = 1; revision <= MAX_REVISIONS; revision++) {
      const stillRejected = rejectedIds.filter(id => !run.approvedProposals.includes(id));
      if (stillRejected.length === 0) break;

      onProgress([
        chatMsg('ceo', `\n--- Vòng chỉnh sửa ${revision}/${MAX_REVISIONS} ---`),
      ]);

      for (const rejId of stillRejected) {
        const idx = run.proposals.findIndex(p => p.id === rejId);
        if (idx < 0) continue;

        const original = run.proposals[idx];
        const reason = original.reviewNotes || 'Không đạt tiêu chuẩn';

        // Agent revises
        const revised = reviseProposal(original, reason, revision);
        run.proposals[idx] = revised;

        onProgress([
          chatMsg(revised.agentRole, `[SỬA LẠI] ${agentProfiles[revised.agentRole]?.name} chỉnh sửa lần ${revision}:\n` +
            `  Chi phí mới: ${fmt(revised.estimatedCost)}đ (giảm từ ${fmt(original.estimatedCost)}đ)\n` +
            `  Hành động: ${revised.actions.length} bước\n` +
            `  ${revised.summary.split(']')[0]}]`),
        ]);

        addEvent(run, 'review', revised.agentRole, `Chỉnh sửa lần ${revision}: ${revised.title}`, 'proposal_submitted');
        await delay(150);

        // CEO re-reviews
        const reResult = reviewProposal(revised, strategy, state);
        run.proposals[idx] = reResult.proposal;

        const icon = reResult.verdict === 'approved' ? '[V] DUYỆT' :
          reResult.verdict === 'rejected' ? '[X] VẪN TỪ CHỐI' : '[?] CẦN THẢO LUẬN';

        onProgress([
          chatMsg('ceo', `${icon} ${agentProfiles[revised.agentRole]?.name}: ${reResult.totalScore}/100\n  ${reResult.notes}`),
        ]);

        if (reResult.verdict === 'approved' || reResult.verdict === 'needs_debate') {
          // Remove from rejected, add to approved
          run.rejectedProposals = run.rejectedProposals.filter(id => id !== rejId);
          run.approvedProposals.push(rejId);
          addEvent(run, 'review', 'ceo', `DUYỆT sau chỉnh sửa lần ${revision}: ${revised.title}`, 'approved');
        } else if (revision === MAX_REVISIONS) {
          // Final revision still rejected — force approve with minimal scope
          const minimal = reviseProposal(revised, reason, revision + 1);
          minimal.status = 'approved';
          run.proposals[idx] = minimal;
          run.rejectedProposals = run.rejectedProposals.filter(id => id !== rejId);
          run.approvedProposals.push(rejId);

          onProgress([
            chatMsg('ceo', `[V] DUYỆT PHẠM VI TỐI THIỂU: ${agentProfiles[minimal.agentRole]?.name}\n` +
              `  Sau ${MAX_REVISIONS} lần chỉnh sửa, CEO duyệt với phạm vi thu hẹp.\n` +
              `  Chi phí: ${fmt(minimal.estimatedCost)}đ, ${minimal.actions.length} hành động.`),
          ]);

          addEvent(run, 'review', 'ceo', `DUYỆT phạm vi tối thiểu: ${minimal.title}`, 'approved');
        } else {
          addEvent(run, 'review', 'ceo', `Vẫn từ chối lần ${revision}: ${revised.title}`, 'rejected');
        }

        await delay(150);
      }
    }
  }

  // ═══════════════════════════════════════
  // PHASE 5: EXECUTION
  // ═══════════════════════════════════════
  run.phase = 'execution';
  const approvedOnes = run.proposals.filter(p => run.approvedProposals.includes(p.id));
  const totalActions = approvedOnes.reduce((s, p) => s + p.actions.length, 0);

  addEvent(run, 'execution', 'ceo', `${approvedOnes.length} đề xuất duyệt, ${totalActions} hành động`, 'phase_start');

  onProgress([
    chatMsg('ceo', `\n═══════════════════════════════════════\n   GIAI ĐOẠN 5: THỰC THI\n═══════════════════════════════════════`),
    chatMsg('ceo', `${approvedOnes.length} đề xuất đã duyệt. Thực thi ${totalActions} hành động...`),
  ]);

  await delay(200);

  let executed = 0;
  let failed = 0;

  for (const proposal of approvedOnes) {
    for (const action of proposal.actions) {
      const result = await executeAction(action.skillFn, action.params);
      if (result.success) {
        executed++;
        onProgress([
          chatMsg(proposal.agentRole, `  [V] ${action.description}`),
        ]);
      } else {
        failed++;
        onProgress([
          chatMsg(proposal.agentRole, `  [X] THẤT BẠI: ${action.description}${result.error ? ` — ${result.error}` : ''}`),
        ]);
      }
      addEvent(run, 'execution', proposal.agentRole, action.description, 'action_executed');
      await delay(100);
    }
  }

  onProgress([
    chatMsg('ceo', `Thực thi xong: ${executed} thành công, ${failed} thất bại.`),
  ]);

  // ═══════════════════════════════════════
  // PHASE 6: MONITORING
  // ═══════════════════════════════════════
  run.phase = 'monitoring';
  addEvent(run, 'monitoring', 'performance_coach', 'Coach kiểm tra sau thực thi', 'phase_start');

  onProgress([
    chatMsg('performance_coach', `\n═══════════════════════════════════════\n   GIAI ĐOẠN 6: GIÁM SÁT\n═══════════════════════════════════════`),
  ]);

  await delay(200);

  // Coach summary
  const { individualPlans } = state;
  const atRisk = individualPlans.filter(p => p.status === 'at_risk').length;
  const completionRate = Math.round(individualPlans.filter(p => p.status === 'completed').length / Math.max(individualPlans.length, 1) * 100);

  onProgress([
    chatMsg('performance_coach',
      `BÁO CÁO SAU THỰC THI:\n` +
      `  Đề xuất duyệt: ${approvedOnes.length}/${run.proposals.length}\n` +
      `  Hành động thực thi: ${executed}/${totalActions}\n` +
      `  NV rủi ro còn lại: ${atRisk}\n` +
      `  Tỷ lệ hoàn thành: ${completionRate}%\n` +
      `  ${atRisk > 0 ? `[!] Vẫn còn ${atRisk} NV cần theo dõi sát.` : '[OK] Tình hình ổn định.'}`),
  ]);

  addEvent(run, 'monitoring', 'performance_coach', `Kiểm tra xong: ${atRisk} NV rủi ro`, 'phase_end');

  // ═══════════════════════════════════════
  // COMPLETE
  // ═══════════════════════════════════════
  run.phase = 'complete';
  run.completedAt = new Date().toISOString();

  const duration = Math.round((new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()) / 1000);

  onProgress([
    chatMsg('ceo', `\n═══════════════════════════════════════\n   WORKFLOW HOÀN TẤT (${duration}s)\n═══════════════════════════════════════\n` +
      `  Chiến lược: ${focusLabel}\n` +
      `  Đề xuất:    ${run.proposals.length} (${run.approvedProposals.length} duyệt, ${run.rejectedProposals.length} còn từ chối)\n` +
      `  Debate:     ${run.debates.length} lượt\n` +
      `  Hành động:  ${executed} thành công, ${failed} thất bại\n` +
      `\n  Gõ /proposals để xem chi tiết, /timeline để xem lịch sử.`),
  ]);

  return run;
}

// ============ HELPERS ============

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function fmt(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)} ty`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(0)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return String(n);
}

function fmtMetric(value: number, unit: string): string {
  if (unit === 'VND') return fmt(value) + 'd';
  if (unit === '%') return value + '%';
  return `${value.toLocaleString()} ${unit}`;
}
