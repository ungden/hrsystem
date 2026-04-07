/**
 * push-snapshot.ts
 *
 * Run locally via Claude Code to:
 * 1. Execute all 11 AI Agents (runFullCoordination)
 * 2. Build Executive Report (buildExecutiveReport)
 * 3. Push the pre-computed JSON to Supabase `command_center_snapshots`
 *
 * Website just reads the latest snapshot — zero computation on frontend.
 *
 * Usage: npx tsx scripts/push-snapshot.ts
 */

import { createClient } from '@supabase/supabase-js';
import { runFullCoordination } from '../src/lib/agents/coordinator';
import { buildExecutiveReport } from '../src/lib/report-builder';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function main() {
  console.log('🧠 Starting AI Agent coordination...');
  console.log('   Phase 1: Intelligence gathering (Market, Channels, Inventory, Collections, Financials)...');

  const t0 = Date.now();

  const [agentState, report] = await Promise.all([
    runFullCoordination(2026, 'Q2'),
    buildExecutiveReport(2026),
  ]);

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`✅ All 11 agents completed in ${elapsed}s`);
  console.log(`   Messages: ${agentState.messages.length}`);
  console.log(`   Business targets: ${agentState.businessTargets.length}`);
  console.log(`   Individual plans: ${agentState.individualPlans.length}`);
  console.log(`   Revenue: ${(report.overview.totalRevenue / 1e9).toFixed(1)} tỷ`);
  console.log(`   Profit: ${(report.overview.netProfit / 1e9).toFixed(1)} tỷ`);

  // Build the snapshot data
  const snapshot = {
    // Agent coordination
    businessTargets: agentState.businessTargets,
    departmentGoals: agentState.departmentGoals,
    individualPlans: agentState.individualPlans,
    costProjections: agentState.costProjections,
    messages: agentState.messages,
    agentStatuses: agentState.agentStatuses,
    actions: agentState.actions,
    channelAnalysis: agentState.channelAnalysis,
    stockAlerts: agentState.stockAlerts,
    collectionPlans: agentState.collectionPlans,
    inventoryForecasts: agentState.inventoryForecasts,
    financialHealth: agentState.financialHealth,
    milestones: agentState.milestones,
    departmentDetails: agentState.departmentDetails,
    marketResearch: agentState.marketResearch || null,
    strategyReport: agentState.strategyReport || null,
    // Executive report
    report,
  };

  // Push to Supabase
  console.log('📤 Pushing snapshot to Supabase...');
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  const { data, error } = await supabase
    .from('command_center_snapshots')
    .insert({
      snapshot_type: 'full',
      year: 2026,
      quarter: 'Q2',
      data: snapshot,
      generated_by: 'claude_code',
      generated_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    console.error('❌ Supabase error:', error.message);
    process.exit(1);
  }

  console.log(`✅ Snapshot #${data.id} pushed successfully!`);
  console.log(`   Website will now show this data at /admin`);
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
