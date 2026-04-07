/**
 * Hook to read the latest pre-computed snapshot from Supabase.
 * AI agents compute everything locally via Claude Code → push to DB.
 * Website just reads the result.
 */
"use client";

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export interface SnapshotData {
  report: any;
  businessTargets: any[];
  departmentGoals: any[];
  individualPlans: any[];
  costProjections: any[];
  messages: any[];
  agentStatuses: Record<string, string>;
  channelAnalysis: any[];
  stockAlerts: any[];
  collectionPlans: any[];
  inventoryForecasts: any[];
  financialHealth: any;
  milestones: any[];
  departmentDetails: any[];
  marketResearch: any;
  strategyReport: any;
  actions: any[];
}

export function useSnapshot() {
  const [data, setData] = useState<SnapshotData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [generatedAt, setGeneratedAt] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    supabase
      .from('command_center_snapshots')
      .select('data, generated_at')
      .eq('snapshot_type', 'full')
      .order('generated_at', { ascending: false })
      .limit(1)
      .single()
      .then(({ data: row, error: err }) => {
        if (err || !row) {
          setError(err?.message || 'No snapshot found');
        } else {
          setData(row.data as SnapshotData);
          setGeneratedAt(row.generated_at);
        }
        setLoading(false);
      });
  };

  useEffect(() => { load(); }, []);

  return { data, loading, error, generatedAt, reload: load };
}
