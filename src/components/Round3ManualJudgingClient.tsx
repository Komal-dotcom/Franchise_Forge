'use client';

import { useState } from 'react';
import { Round3ManualScore, Round3Submission, Team } from '@/types';
import { Edit3, CheckCircle2, Award, User, MessageSquare, Save, Lock, Star, ChevronRight } from 'lucide-react';

interface Round3Item {
  team: Team;
  submission: Round3Submission;
  scores: Round3ManualScore[];
}

interface Props {
  items: Round3Item[];
}

export default function Round3ManualJudgingClient({ items }: Props) {
  const [selectedSubId, setSelectedSubId] = useState<string | null>(items[0]?.submission.id || null);
  const [judgeId, setJudgeId] = useState('1');
  const [judgeName, setJudgeName] = useState('Judge 1');

  // Score Form State
  const [strategy, setStrategy] = useState(20);
  const [tagline, setTagline] = useState(16);
  const [audience, setAudience] = useState(16);
  const [copywriting, setCopywriting] = useState(16);
  const [poster, setPoster] = useState(12);
  const [comments, setComments] = useState('');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const currentItem = items.find((i) => i.submission.id === selectedSubId) || items[0];

  const totalScore = strategy + tagline + audience + copywriting + poster;

  const handleSelectSubmission = (subId: string) => {
    setSelectedSubId(subId);
    setSuccessMsg('');
    const target = items.find((i) => i.submission.id === subId);

    // Look for existing judge score
    const existing = target?.scores.find((s) => s.judge_id === judgeId);
    if (existing) {
      setStrategy(existing.marketing_strategy_score);
      setTagline(existing.tagline_punch_score);
      setAudience(existing.audience_engagement_score);
      setCopywriting(existing.copywriting_quality_score);
      setPoster(existing.visual_poster_quality_score);
      setComments(existing.comments || '');
    } else {
      setStrategy(20);
      setTagline(16);
      setAudience(16);
      setCopywriting(16);
      setPoster(12);
      setComments('');
    }
  };

  const handleSaveScore = async (status: 'DRAFT' | 'SUBMITTED') => {
    if (!currentItem) return;
    setSaving(true);
    setSuccessMsg('');

    try {
      const res = await fetch('/api/admin/round3-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          round3_submission_id: currentItem.submission.id,
          team_id: currentItem.team.id,
          judge_id: judgeId,
          judge_name: judgeName,
          scores: {
            marketing_strategy_score: Number(strategy),
            tagline_punch_score: Number(tagline),
            audience_engagement_score: Number(audience),
            copywriting_quality_score: Number(copywriting),
            visual_poster_quality_score: Number(poster),
          },
          comments,
          status,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit score');

      setSuccessMsg(`Score successfully ${status === 'SUBMITTED' ? 'submitted and locked' : 'saved as draft'}.`);
    } catch (err: any) {
      alert(err.message || 'Error saving score');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Submissions List Sidebar */}
      <div className="lg:col-span-4 space-y-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-gray-400">
          Round 3 Submissions ({items.length})
        </h3>
        <div className="space-y-2 max-h-[75vh] overflow-y-auto pr-1">
          {items.map(({ team, submission, scores }) => {
            const isSelected = submission.id === selectedSubId;
            const avgScore = scores.length > 0
              ? Math.round(scores.reduce((a, c) => a + c.total_score, 0) / scores.length)
              : null;

            return (
              <div
                key={submission.id}
                onClick={() => handleSelectSubmission(submission.id)}
                className={`p-4 rounded-xl border cursor-pointer transition ${
                  isSelected
                    ? 'bg-amber-500/10 border-amber-500/40 text-white shadow-lg'
                    : 'glass-panel border-studio-800 text-gray-300 hover:border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-black text-amber-400 text-xs">{team.team_code}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    scores.length > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-700 text-gray-400'
                  }`}>
                    {scores.length > 0 ? `${scores.length} Judges` : 'PENDING'}
                  </span>
                </div>
                <h4 className="font-bold text-white text-sm mt-1">{team.team_name}</h4>
                <p className="text-xs text-gray-400 truncate italic mt-0.5">"{submission.tagline}"</p>
                {avgScore !== null && (
                  <p className="text-xs font-mono font-bold text-cyanGlow mt-2">
                    Average Score: {avgScore} / 100 PTS
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Scoring Area */}
      <div className="lg:col-span-8 space-y-6">
        {currentItem ? (
          <>
            {/* Judge Selector & Header */}
            <div className="glass-panel p-5 rounded-2xl border border-studio-800 bg-studio-900/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-black text-amber-400 uppercase tracking-wider">{currentItem.team.team_code}</span>
                <h2 className="text-xl font-black text-white">{currentItem.team.team_name}</h2>
              </div>

              <div className="flex items-center space-x-3">
                <label className="text-xs font-bold text-gray-300">Active Judge Panel:</label>
                <select
                  value={judgeId}
                  onChange={(e) => {
                    setJudgeId(e.target.value);
                    setJudgeName(`Judge ${e.target.value}`);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-studio-950 border border-studio-700 text-xs font-bold text-amber-400"
                >
                  <option value="1">Judge 1 (Panel A)</option>
                  <option value="2">Judge 2 (Panel B)</option>
                  <option value="3">Judge 3 (Panel C)</option>
                  <option value="SUPER_ADMIN">Super Admin Override</option>
                </select>
              </div>
            </div>

            {/* Submission Content Card */}
            <div className="glass-panel p-6 rounded-2xl border border-studio-800 space-y-4">
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Submitted Marketing Strategy Data</h3>

              <div className="p-4 rounded-xl bg-studio-900 border border-studio-800 space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Tagline</span>
                <p className="text-base font-black text-amber-400 italic">"{currentItem.submission.tagline}"</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-studio-900 border border-studio-800 space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Marketing Strategy Angle</span>
                  <p className="text-xs text-gray-200">{currentItem.submission.marketing_angle}</p>
                </div>

                <div className="p-4 rounded-xl bg-studio-900 border border-studio-800 space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Target Audience Response</span>
                  <p className="text-xs text-gray-200">{currentItem.submission.intended_audience_response}</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-studio-900 border border-studio-800 space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Promotional Copy</span>
                <p className="text-xs text-gray-200 whitespace-pre-wrap leading-relaxed">{currentItem.submission.promotional_copy}</p>
              </div>
            </div>

            {/* Manual Judging Scorecard Form */}
            <div className="glass-panel p-6 rounded-2xl border border-amber-500/30 bg-studio-900 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-wider">Human Judge Scorecard</h3>
                  <p className="text-xs text-gray-400">Evaluate each criterion manually according to official rubric boundaries.</p>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-black text-amber-400">{totalScore}</span>
                  <span className="text-xs text-gray-400"> / 100 PTS</span>
                </div>
              </div>

              {successMsg && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{successMsg}</span>
                </div>
              )}

              <div className="space-y-4">
                {/* 1. Marketing Strategy (25 Pts) */}
                <div className="p-4 rounded-xl bg-studio-950 border border-studio-800 space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-white">1. Marketing Strategy (Max 25)</span>
                    <span className="text-amber-400 font-mono text-sm">{strategy} PTS</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={25}
                    value={strategy}
                    onChange={(e) => setStrategy(Number(e.target.value))}
                    className="w-full accent-amber-400"
                  />
                </div>

                {/* 2. Tagline Punch (20 Pts) */}
                <div className="p-4 rounded-xl bg-studio-950 border border-studio-800 space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-white">2. Tagline Punch (Max 20)</span>
                    <span className="text-amber-400 font-mono text-sm">{tagline} PTS</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={20}
                    value={tagline}
                    onChange={(e) => setTagline(Number(e.target.value))}
                    className="w-full accent-amber-400"
                  />
                </div>

                {/* 3. Audience Engagement (20 Pts) */}
                <div className="p-4 rounded-xl bg-studio-950 border border-studio-800 space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-white">3. Audience Engagement (Max 20)</span>
                    <span className="text-amber-400 font-mono text-sm">{audience} PTS</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={20}
                    value={audience}
                    onChange={(e) => setAudience(Number(e.target.value))}
                    className="w-full accent-amber-400"
                  />
                </div>

                {/* 4. Copywriting Quality (20 Pts) */}
                <div className="p-4 rounded-xl bg-studio-950 border border-studio-800 space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-white">4. Copywriting Quality (Max 20)</span>
                    <span className="text-amber-400 font-mono text-sm">{copywriting} PTS</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={20}
                    value={copywriting}
                    onChange={(e) => setCopywriting(Number(e.target.value))}
                    className="w-full accent-amber-400"
                  />
                </div>

                {/* 5. Poster Quality (15 Pts) */}
                <div className="p-4 rounded-xl bg-studio-950 border border-studio-800 space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-white">5. Poster / Visual Quality (Max 15)</span>
                    <span className="text-amber-400 font-mono text-sm">{poster} PTS</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={15}
                    value={poster}
                    onChange={(e) => setPoster(Number(e.target.value))}
                    className="w-full accent-amber-400"
                  />
                </div>

                {/* Judge Comments */}
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1">Judge Comments & Qualitative Feedback</label>
                  <textarea
                    placeholder="Enter notes on copywriting, audience resonance, tagline impact..."
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-studio-950 border border-studio-800 text-white text-xs placeholder-gray-500"
                    rows={3}
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-3 pt-2">
                  <button
                    disabled={saving}
                    onClick={() => handleSaveScore('DRAFT')}
                    className="flex-1 py-3 rounded-xl bg-studio-800 hover:bg-studio-750 text-gray-300 font-bold text-xs border border-studio-700 flex items-center justify-center space-x-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Draft Score</span>
                  </button>

                  <button
                    disabled={saving}
                    onClick={() => handleSaveScore('SUBMITTED')}
                    className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-studio-950 font-black text-xs transition shadow-lg shadow-amber-500/20 flex items-center justify-center space-x-2"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Submit & Lock Score</span>
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="glass-panel p-12 text-center text-gray-500 rounded-2xl border border-studio-800">
            No Round 3 submissions available for evaluation.
          </div>
        )}
      </div>
    </div>
  );
}
