'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Cpu, ShieldAlert, CheckCircle2, XCircle, ArrowLeft, Eye, RefreshCw, AlertTriangle } from 'lucide-react';
import { AIEvaluation, Round2Submission, TeamWithMembers } from '@/types';

interface QueueItem {
  team: TeamWithMembers;
  submission: Round2Submission | null;
  evaluation: AIEvaluation | null;
}

export default function AdminAIJudgePage() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [overrideModal, setOverrideModal] = useState<{ submissionId: string; currentStatus: string } | null>(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchQueue();
  }, []);

  const fetchQueue = async () => {
    try {
      const res = await fetch('/api/admin/teams'); // or fetch teams list
      const teamsRes = await res.json();

      if (teamsRes.success && teamsRes.teams) {
        const items: QueueItem[] = await Promise.all(
          teamsRes.teams.map(async (team: TeamWithMembers) => {
            const subRes = await fetch(`/api/submissions/round2?team_id=${team.id}`);
            const subData = await subRes.json();
            return {
              team,
              submission: subData.submission || null,
              evaluation: subData.evaluation || null,
            };
          })
        );
        setQueue(items);
      }
    } catch (err) {
      setError('Failed to fetch AI Judge Queue data.');
    } finally {
      setLoading(false);
    }
  };

  const handleOverride = async (newSafetyStatus: 'PASS' | 'FAIL') => {
    if (!overrideModal || !overrideReason) return;

    setProcessing(true);
    setError('');

    try {
      const res = await fetch('/api/admin/ai-judge/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submission_id: overrideModal.submissionId,
          new_safety_status: newSafetyStatus,
          reason: overrideReason,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Override failed');

      setOverrideModal(null);
      setOverrideReason('');
      fetchQueue();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <p className="text-cyanGlow font-bold text-sm">Loading AI Judge Queue...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link href="/admin" className="text-xs text-gray-400 hover:text-cyanGlow flex items-center space-x-1 mb-2">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Admin Center</span>
          </Link>
          <h1 className="text-3xl font-black text-white flex items-center space-x-3">
            <Cpu className="w-7 h-7 text-cyanGlow" />
            <span>ROUND 2 AI JUDGE QUEUE & SAFETY DASHBOARD</span>
          </h1>
        </div>

        <button
          onClick={fetchQueue}
          className="px-4 py-2 rounded-xl bg-studio-800 hover:bg-studio-700 text-cyanGlow font-bold text-xs border border-cyanGlow/30 transition flex items-center space-x-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span>REFRESH QUEUE</span>
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-crimsonGlow/10 border border-crimsonGlow/30 text-crimsonGlow text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Queue Table */}
      <div className="glass-panel p-8 rounded-2xl border border-studio-700">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-studio-900 text-gray-400 uppercase tracking-wider font-bold">
              <tr>
                <th className="p-3">Team</th>
                <th className="p-3">Submission Status</th>
                <th className="p-3">Safety Status</th>
                <th className="p-3">AI Evaluation Status</th>
                <th className="p-3">Score</th>
                <th className="p-3">Decision</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-studio-800">
              {queue.map(({ team, submission, evaluation }) => (
                <tr key={team.id} className="hover:bg-studio-850">
                  <td className="p-3">
                    <span className="font-bold text-white block">{team.team_name}</span>
                    <span className="text-[10px] text-gray-400 font-mono">{team.team_code}</span>
                  </td>

                  <td className="p-3">
                    <span className="px-2.5 py-1 rounded bg-studio-800 text-gray-300 font-bold">
                      {submission ? submission.status : 'NO SUBMISSION'}
                    </span>
                  </td>

                  <td className="p-3">
                    {evaluation ? (
                      <span className={`px-2.5 py-1 rounded font-bold ${
                        evaluation.safety_status === 'PASS' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                        evaluation.safety_status === 'FAIL' ? 'bg-crimsonGlow/20 text-crimsonGlow border border-crimsonGlow/30' :
                        'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}>
                        {evaluation.safety_status}
                      </span>
                    ) : (
                      <span className="text-gray-500">—</span>
                    )}
                  </td>

                  <td className="p-3">
                    {submission?.status === 'EVALUATED' ? (
                      <span className="text-emerald-400 font-bold">COMPLETE</span>
                    ) : submission?.status === 'SUBMITTED' ? (
                      <span className="text-cyanGlow font-bold">EVALUATING</span>
                    ) : (
                      <span className="text-gray-500">PENDING</span>
                    )}
                  </td>

                  <td className="p-3 font-bold text-gold-400">
                    {evaluation ? `${evaluation.total_score} / 100` : '—'}
                  </td>

                  <td className="p-3 font-bold">
                    {evaluation ? (
                      <span className={evaluation.decision === 'QUALIFIED' ? 'text-emerald-400' : 'text-crimsonGlow'}>
                        {evaluation.decision}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>

                  <td className="p-3 text-right">
                    {submission && (
                      <button
                        onClick={() => setOverrideModal({ submissionId: submission.id, currentStatus: evaluation?.safety_status || 'PENDING' })}
                        className="px-3 py-1.5 rounded bg-studio-800 hover:bg-gold-500 hover:text-studio-950 text-gold-400 font-bold transition border border-gold-500/30"
                      >
                        MANUAL OVERRIDE
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Safety Override Modal */}
      {overrideModal && (
        <div className="fixed inset-0 z-50 bg-studio-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel max-w-lg w-full p-6 rounded-2xl border border-gold-500/40">
            <h3 className="text-xl font-bold text-white mb-2">Admin Safety & AI Override</h3>
            <p className="text-gray-300 text-xs mb-4">
              Current Safety Status: <strong>{overrideModal.currentStatus}</strong>. Manually override safety review to PASS or FAIL.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-bold uppercase text-gray-300 mb-1">Reason for Admin Override *</label>
              <textarea
                rows={3}
                placeholder="Log reason for audit trail..."
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-studio-900 border border-studio-700 text-white text-xs focus:border-gold-400"
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setOverrideModal(null)}
                className="flex-1 py-2.5 rounded-xl bg-studio-800 text-gray-300 font-bold text-xs border border-studio-700 hover:bg-studio-700"
              >
                CANCEL
              </button>

              <button
                onClick={() => handleOverride('FAIL')}
                disabled={processing || !overrideReason}
                className="flex-1 py-2.5 rounded-xl bg-crimsonGlow text-white font-bold text-xs hover:bg-red-600 disabled:opacity-50"
              >
                OVERRIDE TO FAIL
              </button>

              <button
                onClick={() => handleOverride('PASS')}
                disabled={processing || !overrideReason}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-studio-950 font-black text-xs hover:bg-emerald-400 disabled:opacity-50"
              >
                OVERRIDE TO PASS
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
