'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminHeaderNav from '@/components/AdminHeaderNav';
import { Cpu, ShieldAlert, CheckCircle2, XCircle, RefreshCw, AlertTriangle, Eye, RotateCcw, FileJson, Image as ImageIcon } from 'lucide-react';
import { AIEvaluation, Round2Submission, TeamWithMembers } from '@/types';

interface QueueItem {
  team: TeamWithMembers;
  submission: Round2Submission | null;
  evaluation: AIEvaluation | null;
}

export default function AdminAIJudgePage() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [overrideModal, setOverrideModal] = useState<{ submissionId: string; teamId: string; currentStatus: string } | null>(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [jsonModal, setJsonModal] = useState<AIEvaluation | null>(null);
  const [imageModal, setImageModal] = useState<{ hero?: string | null; villain?: string | null; teamName: string } | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchQueue();
  }, []);

  const fetchQueue = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/teams');
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

  const handleRetryEvaluation = async (submissionId: string) => {
    setProcessing(true);
    try {
      const res = await fetch('/api/admin/ai-judge/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'RETRY_EVALUATION',
          submission_id: submissionId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Retry failed');
      fetchQueue();
    } catch (err: any) {
      alert(err.message || 'Error retrying AI evaluation');
    } finally {
      setProcessing(false);
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

  // Compute live counters
  const totalEligible = queue.length;
  const submittedCount = queue.filter((q) => q.submission !== null).length;
  const pendingCount = queue.filter((q) => q.submission && !q.evaluation).length;
  const passCount = queue.filter((q) => q.evaluation?.safety_status === 'PASS').length;
  const reviewCount = queue.filter((q) => q.evaluation?.safety_status === 'REVIEW_REQUIRED').length;
  const failCount = queue.filter((q) => q.evaluation?.safety_status === 'FAIL').length;
  const qualifiedCount = queue.filter((q) => q.evaluation?.decision === 'QUALIFIED').length;
  const disqualifiedCount = queue.filter((q) => q.evaluation?.decision === 'DISQUALIFIED' || q.team.status === 'DISQUALIFIED').length;

  return (
    <div className="min-h-screen bg-studio-950 text-white">
      <AdminHeaderNav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="px-3 py-1 rounded-md bg-cyanGlow/20 text-cyanGlow text-xs font-bold uppercase tracking-wider">
              EVALUATION CONTROL CENTER
            </span>
            <h1 className="text-3xl font-black text-white mt-1">ROUND 2 — AI JUDGE CONTROL CENTER</h1>
          </div>

          <button
            onClick={fetchQueue}
            className="px-4 py-2 rounded-xl bg-studio-800 hover:bg-studio-700 text-cyanGlow font-bold text-xs border border-cyanGlow/30 transition flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>REFRESH QUEUE</span>
          </button>
        </div>

        {/* LIVE COUNTERS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          <div className="glass-panel p-3 rounded-xl border border-studio-800 text-center">
            <span className="text-[10px] text-gray-400 font-bold block uppercase">Eligible</span>
            <span className="text-xl font-black text-white">{totalEligible}</span>
          </div>

          <div className="glass-panel p-3 rounded-xl border border-studio-800 text-center">
            <span className="text-[10px] text-gray-400 font-bold block uppercase">Submitted</span>
            <span className="text-xl font-black text-amber-400">{submittedCount}</span>
          </div>

          <div className="glass-panel p-3 rounded-xl border border-studio-800 text-center">
            <span className="text-[10px] text-gray-400 font-bold block uppercase">Pending AI</span>
            <span className="text-xl font-black text-gray-400">{pendingCount}</span>
          </div>

          <div className="glass-panel p-3 rounded-xl border border-studio-800 text-center">
            <span className="text-[10px] text-gray-400 font-bold block uppercase">PASS</span>
            <span className="text-xl font-black text-emerald-400">{passCount}</span>
          </div>

          <div className="glass-panel p-3 rounded-xl border border-studio-800 text-center">
            <span className="text-[10px] text-gray-400 font-bold block uppercase">REVIEW REQ</span>
            <span className="text-xl font-black text-amber-300">{reviewCount}</span>
          </div>

          <div className="glass-panel p-3 rounded-xl border border-studio-800 text-center">
            <span className="text-[10px] text-gray-400 font-bold block uppercase">FAIL</span>
            <span className="text-xl font-black text-crimsonGlow">{failCount}</span>
          </div>

          <div className="glass-panel p-3 rounded-xl border border-studio-800 text-center">
            <span className="text-[10px] text-gray-400 font-bold block uppercase">Qualified</span>
            <span className="text-xl font-black text-emerald-400">{qualifiedCount}</span>
          </div>

          <div className="glass-panel p-3 rounded-xl border border-studio-800 text-center">
            <span className="text-[10px] text-gray-400 font-bold block uppercase">Disqualified</span>
            <span className="text-xl font-black text-rose-500">{disqualifiedCount}</span>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-crimsonGlow/10 border border-crimsonGlow/30 text-crimsonGlow text-xs flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Queue Table */}
        <div className="glass-panel p-6 rounded-2xl border border-studio-800 space-y-4">
          <h3 className="text-base font-black text-white uppercase tracking-wider">AI EVALUATION QUEUE TABLE</h3>

          <div className="overflow-x-auto rounded-xl border border-studio-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-studio-900 text-gray-400 uppercase tracking-wider font-bold text-[10px]">
                <tr>
                  <th className="p-3">Team</th>
                  <th className="p-3">Submission</th>
                  <th className="p-3">Safety Status</th>
                  <th className="p-3">Score Breakdown</th>
                  <th className="p-3">Total Score</th>
                  <th className="p-3">Decision</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-studio-800">
                {queue.map(({ team, submission, evaluation }) => (
                  <tr key={team.id} className="hover:bg-studio-850">
                    <td className="p-3">
                      <span className="font-black text-amber-400 block">{team.team_code}</span>
                      <span className="font-bold text-white block">{team.team_name}</span>
                    </td>

                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        submission ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-700 text-gray-400'
                      }`}>
                        {submission ? submission.status : 'NO SUBMISSION'}
                      </span>
                    </td>

                    <td className="p-3">
                      {evaluation ? (
                        <span className={`px-2 py-0.5 rounded font-extrabold text-[10px] ${
                          evaluation.safety_status === 'PASS' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                          evaluation.safety_status === 'FAIL' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                          'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}>
                          {evaluation.safety_status}
                        </span>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>

                    <td className="p-3 text-[11px]">
                      {evaluation ? (
                        <div className="space-y-0.5 text-gray-300 font-mono">
                          <span>Char: {evaluation.character_development_score}/30 &bull; Rel: {evaluation.relationship_score}/20</span>
                        </div>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>

                    <td className="p-3 font-bold text-cyanGlow font-mono text-sm">
                      {evaluation ? `${evaluation.total_score} / 100` : '—'}
                    </td>

                    <td className="p-3 font-bold">
                      {evaluation ? (
                        <span className={evaluation.decision === 'QUALIFIED' ? 'text-emerald-400' : 'text-rose-400'}>
                          {evaluation.decision}
                        </span>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>

                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {submission && (
                          <>
                            <button
                              onClick={() => setImageModal({ hero: submission.hero_image_s3_path, villain: submission.villain_image_s3_path, teamName: team.team_name })}
                              className="p-1.5 rounded-lg bg-studio-800 hover:bg-studio-700 text-gray-300 transition"
                              title="View S3 Images"
                            >
                              <ImageIcon className="w-4 h-4" />
                            </button>

                            {evaluation && (
                              <button
                                onClick={() => setJsonModal(evaluation)}
                                className="p-1.5 rounded-lg bg-studio-800 hover:bg-studio-700 text-cyanGlow transition"
                                title="View Structured Evaluation JSON"
                              >
                                <FileJson className="w-4 h-4" />
                              </button>
                            )}

                            <button
                              onClick={() => handleRetryEvaluation(submission.id)}
                              disabled={processing}
                              className="p-1.5 rounded-lg bg-studio-800 hover:bg-studio-700 text-amber-400 transition"
                              title="Re-run Evaluation"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => setOverrideModal({ submissionId: submission.id, teamId: team.id, currentStatus: evaluation?.safety_status || 'PENDING' })}
                              className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 font-bold text-[10px] border border-amber-500/40"
                            >
                              OVERRIDE
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* STRUCTURED JSON MODAL */}
        {jsonModal && (
          <div className="fixed inset-0 z-50 bg-studio-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="glass-panel max-w-xl w-full p-6 rounded-2xl border border-amber-500/40 bg-studio-900 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-white">Structured Evaluation JSON</h3>
                <button onClick={() => setJsonModal(null)} className="text-gray-400 hover:text-white text-xs">Close</button>
              </div>
              <pre className="p-4 rounded-xl bg-studio-950 border border-studio-800 text-xs text-amber-400 font-mono max-h-96 overflow-y-auto">
                {JSON.stringify(jsonModal, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* IMAGE PREVIEW MODAL */}
        {imageModal && (
          <div className="fixed inset-0 z-50 bg-studio-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="glass-panel max-w-xl w-full p-6 rounded-2xl border border-amber-500/40 bg-studio-900 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-white">Image Assets &bull; {imageModal.teamName}</h3>
                <button onClick={() => setImageModal(null)} className="text-gray-400 hover:text-white text-xs">Close</button>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3 rounded-xl bg-studio-950 border border-studio-800 space-y-2">
                  <span className="font-bold text-emerald-400 block mb-1">Hero Asset</span>
                  <p className="font-mono text-[10px] text-gray-400 truncate">{imageModal.hero || 'No image reference'}</p>
                  {imageModal.hero && (
                    <a
                      href={`/api/assets/download?path=${encodeURIComponent(imageModal.hero)}&redirect=true`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block px-3 py-1.5 rounded-lg bg-studio-800 hover:bg-studio-700 text-cyanGlow font-bold text-[10px] border border-studio-700"
                    >
                      View Private Asset ↗
                    </a>
                  )}
                </div>
                <div className="p-3 rounded-xl bg-studio-950 border border-studio-800 space-y-2">
                  <span className="font-bold text-rose-400 block mb-1">Villain Asset</span>
                  <p className="font-mono text-[10px] text-gray-400 truncate">{imageModal.villain || 'No image reference'}</p>
                  {imageModal.villain && (
                    <a
                      href={`/api/assets/download?path=${encodeURIComponent(imageModal.villain)}&redirect=true`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block px-3 py-1.5 rounded-lg bg-studio-800 hover:bg-studio-700 text-rose-400 font-bold text-[10px] border border-studio-700"
                    >
                      View Private Asset ↗
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Manual Safety Override Modal */}
        {overrideModal && (
          <div className="fixed inset-0 z-50 bg-studio-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="glass-panel max-w-lg w-full p-6 rounded-2xl border border-amber-500/40 bg-studio-900 space-y-4">
              <h3 className="text-xl font-bold text-white">Admin Safety & AI Override</h3>
              <p className="text-gray-300 text-xs">
                Current Safety Status: <strong>{overrideModal.currentStatus}</strong>. Manually override safety review to PASS or FAIL.
              </p>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-300 mb-1">Reason for Admin Override *</label>
                <textarea
                  rows={3}
                  placeholder="Log reason for audit trail..."
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-studio-950 border border-studio-700 text-white text-xs focus:border-amber-400"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setOverrideModal(null)}
                  className="flex-1 py-2.5 rounded-xl bg-studio-800 text-gray-300 font-bold text-xs"
                >
                  CANCEL
                </button>

                <button
                  onClick={() => handleOverride('FAIL')}
                  disabled={processing || !overrideReason}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-500 disabled:opacity-50"
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
      </main>
    </div>
  );
}
