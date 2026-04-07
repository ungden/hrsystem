import { createPlainServerClient } from '@/lib/supabase-server';
import { runFullCoordination } from '@/lib/agents/coordinator';
import { buildExecutiveReport } from '@/lib/report-builder';

export const dynamic = 'force-dynamic';
export const maxDuration = 120; // snapshot generation is heavier

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const t0 = Date.now();

    const [agentState, report] = await Promise.all([
      runFullCoordination(2026, 'Q2'),
      buildExecutiveReport(2026),
    ]);

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

    const snapshot = {
      businessTargets: agentState.businessTargets,
      departmentGoals: agentState.departmentGoals,
      individualPlans: agentState.individualPlans,
      costProjections: agentState.costProjections,
      salaryProjections: agentState.salaryProjections,
      messages: agentState.messages,
      agentStatuses: agentState.agentStatuses,
      actions: agentState.actions,
      channelAnalysis: agentState.channelAnalysis,
      stockAlerts: agentState.stockAlerts,
      collectionPlans: agentState.collectionPlans,
      inventoryForecasts: agentState.inventoryForecasts,
      financialHealth: agentState.financialHealth,
      financials: agentState.financials,
      milestones: agentState.milestones,
      departmentDetails: agentState.departmentDetails,
      marketResearch: agentState.marketResearch || null,
      strategyReport: agentState.strategyReport || null,
      currentQuarter: agentState.currentQuarter,
      report,
    };

    const supabase = createPlainServerClient();

    const { data, error } = await supabase
      .from('command_center_snapshots')
      .insert({
        snapshot_type: 'full',
        year: 2026,
        quarter: 'Q2',
        data: snapshot,
        generated_by: 'cron_api',
        generated_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      return Response.json({ error: `Supabase insert failed: ${error.message}` }, { status: 500 });
    }

    return Response.json({
      snapshotId: data.id,
      elapsed: `${elapsed}s`,
      messages: agentState.messages.length,
      businessTargets: agentState.businessTargets.length,
    });
  } catch (err) {
    return Response.json(
      { error: `Snapshot generation failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 },
    );
  }
}
