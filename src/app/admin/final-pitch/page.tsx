'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Trophy, ArrowLeft, Star, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { TeamWithMembers, Round1Submission, Round2Submission, AIEvaluation, Round3Submission, Round3AIEvaluation, FinalScore } from '@/types';

interface PitchPortfolio {
  team: TeamWithMembers;
  r1: Round1Submission | null;
  r2: Round2Submission | null;
  r2Eval: AIEvaluation | null;
  r3: Round3Submission | null;
  r3Eval: Round3AIEvaluation | null;
  scores: FinalScore[];
}

export default function AdminFinalPitchPage() {
  const [portfolios, setPortfolios] = useState<PitchPortfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);

  // Judge Score Form State
  const [judgeId, setJudgeId] = useState('');
  const [score, setScore] = useState('');
  const [comments, setComments] = useState('');
  const [submittingScore, setSubmittingScore] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchTop5Portfolios();
  }, []);

  const fetchTop5Portfolios = async () => {
    try {
      const res = await fetch('/api/admin/teams');
      const data = await res.json();

      if (data.success && data.teams) {
        // Filter Top 5 or Qualified teams
        const topTeams = data.teams.filter((t: TeamWithMembers) => t.status === 'QUALIFIED' || t.current_round >= 3).slice(0, 5);

        const list: PitchPortfolio[] = await Promise.all(
          topTeams.map(async (team: TeamWithMembers) => {
            const [r1Res, r2Res, r3Res] = await Promise.all([
              fetch(`/api/submissions/round1?team_id=${team.id}`).then(r => r.json()),
              fetch(`/api/submissions/round2?team_id=${team.id}`).then(r => r.json()),
              fetch(`/api/submissions/round3?team_id=${team.id}`).then(r => r.json()),
            ]);

            return {
              team,
              r1: r1Res.submission || null,
              r2: r2Res.submission || null,
              r2Eval: r2Res.evaluation || null,
              r3: r3Res.submission || null,
              r3Eval: r3Res.evaluation || null,
              scores: [],
            };
          })
        );

        setPortfolios(list);
        if (list.length > 0) setActiveTeamId(list[0].team.id);
      }
    } catch (err) {
      setError('Failed to fetch pitch portfolios.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitJudgeScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTeamId || !judgeId || !score) return;

    setError('');
    setSuccessMsg('');
    setSubmittingScore(true);

    try {
      const res = await fetch('/api/admin/final-pitch/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team_id: activeTeamId,
          judge_id: judgeId,
          score: Number(score),
          comments,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit judge score');

      setSuccessMsg(`✓ Score ${score} submitted successfully by Judge ${judgeId}!`);
      setScore('');
      setComments('');
      fetchTop5Portfolios();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmittingScore(false);
    }
  };

  const selectedItem = portfolios.find((p) => p.team.id === activeTeamId);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <p className="text-amber-400 font-bold text-sm">Loading Top 5 Pitch Portfolios...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link href="/admin" className="text-xs text-gray-400 hover:text-amber-400 flex items-center space-x-1 mb-2">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Admin Center</span>
          </Link>
          <h1 className="text-3xl font-black text-white flex items-center space-x-3">
            <Trophy className="w-7 h-7 text-amber-400" />
            <span>OFFLINE FINAL PITCH PORTAL & HUMAN JUDGE SCORING</span>
          </h1>
        </div>

        <div className="px-4 py-2 rounded-xl bg-gold-500/20 border border-gold-500/30 text-gold-400 font-bold text-xs">
          OFFLINE PRESENTATION MODE (NO TIMER)
        </div>
      </div>

      {/* Main Grid: Team Selector + Full Submission Portfolio View */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* Top 5 Team Selector List */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gold-400 mb-2">TOP 5 FINALISTS</h2>
          {portfolios.map((item, index) => (
            <button
              key={item.team.id}
              onClick={() => setActiveTeamId(item.team.id)}
              className={`w-full p-4 rounded-xl text-left border transition ${
                activeTeamId === item.team.id
                  ? 'bg-gold-500/10 border-gold-400 text-white shadow-lg'
                  : 'glass-panel border-studio-700 text-gray-400 hover:text-white'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs text-gold-400">RANK #{index + 1}</span>
                <span className="text-[10px] font-mono text-cyanGlow">{item.team.team_code}</span>
              </div>
              <h3 className="font-bold text-sm text-white">{item.team.team_name}</h3>
              <p className="text-[11px] text-gray-400 mt-1">
                {item.r1?.franchise_name ? `Franchise: "${item.r1.franchise_name}"` : 'Franchise Portfolio'}
              </p>
            </button>
          ))}
        </div>

        {/* Selected Team Full Submission Portfolio */}
        {selectedItem ? (
          <div className="md:col-span-3 space-y-6">
            
            {/* Portfolio Overview Banner */}
            <div className="glass-panel p-6 rounded-2xl border border-gold-500/40">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-xs font-bold text-gold-400 uppercase tracking-wider block">FINALIST PORTFOLIO</span>
                  <h2 className="text-2xl font-black text-white">{selectedItem.team.team_name}</h2>
                  <p className="text-sm font-bold text-cyanGlow mt-1">
                    Franchise: "{selectedItem.r1?.franchise_name || 'N/A'}" ({selectedItem.r1?.genre || 'N/A'})
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-400 block">Round 2 AI Score</span>
                  <span className="text-2xl font-extrabold text-gold-400">
                    {selectedItem.r2Eval?.total_score || 'N/A'} / 100
                  </span>
                </div>
              </div>

              {/* Roster */}
              <p className="text-xs text-gray-300">
                <strong>Studio Members:</strong> {selectedItem.team.members.map((m) => m.member_name).join(', ')}
              </p>
            </div>

            {/* Submission Sections Tabs/Accordion */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              
              {/* Round 1 Greenlight Summary */}
              <div className="glass-panel p-5 rounded-xl border border-studio-700">
                <h4 className="font-bold text-gold-400 mb-2 text-sm">Round 1: Greenlight</h4>
                <p className="text-gray-300 mb-2"><strong>Core Premise:</strong> {selectedItem.r1?.core_premise || 'N/A'}</p>
                <p className="text-gray-300 mb-2"><strong>Target Audience:</strong> {selectedItem.r1?.target_audience || 'N/A'}</p>
                <p className="text-gray-300"><strong>Elevator Pitch:</strong> "{selectedItem.r1?.elevator_pitch || 'N/A'}"</p>
              </div>

              {/* Round 2 Characters Summary */}
              <div className="glass-panel p-5 rounded-xl border border-studio-700">
                <h4 className="font-bold text-cyanGlow mb-2 text-sm">Round 2: Character Forge</h4>
                <p className="text-gray-300 mb-1"><strong>Hero:</strong> {selectedItem.r2?.hero_data?.name} — {selectedItem.r2?.hero_data?.goal}</p>
                <p className="text-gray-300 mb-1"><strong>Villain:</strong> {selectedItem.r2?.villain_data?.name} — {selectedItem.r2?.villain_data?.goal}</p>
                <p className="text-gray-300"><strong>Conflict:</strong> {selectedItem.r2?.hero_villain_conflict}</p>
              </div>

              {/* Round 3 Marketing Summary */}
              <div className="glass-panel p-5 rounded-xl border border-studio-700">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-violetGlow text-sm">Round 3: Marketing Forge</h4>
                  {selectedItem.r3Eval && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-violet-500/20 text-violet-300 border border-violet-500/30">
                      AI SCORE: {selectedItem.r3Eval.total_score}/100 ({selectedItem.r3Eval.decision})
                    </span>
                  )}
                </div>
                <p className="text-gray-300 mb-1"><strong>Tagline:</strong> "{selectedItem.r3?.tagline || 'N/A'}"</p>
                <p className="text-gray-300 mb-1"><strong>Angle:</strong> {selectedItem.r3?.marketing_angle || 'N/A'}</p>
                <p className="text-gray-300"><strong>Copy:</strong> {selectedItem.r3?.promotional_copy || 'N/A'}</p>
              </div>

            </div>

            {/* Human Judge Score Input Form */}
            <div className="glass-panel p-6 rounded-2xl border border-amber-500/40 bg-studio-900/90">
              <h3 className="text-lg font-bold text-amber-400 mb-4 flex items-center space-x-2">
                <Star className="w-5 h-5 text-amber-400" />
                <span>HUMAN JUDGE SCORECARD ENTRY</span>
              </h3>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-crimsonGlow/10 border border-crimsonGlow/30 text-crimsonGlow text-xs">
                  {error}
                </div>
              )}

              {successMsg && (
                <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                  {successMsg}
                </div>
              )}

              <form onSubmit={handleSubmitJudgeScore} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-300 mb-1">Judge Name / ID *</label>
                    <input
                      type="text"
                      placeholder="e.g. Judge Sarah Jenkins"
                      value={judgeId}
                      onChange={(e) => setJudgeId(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-studio-950 border border-studio-700 text-white text-xs focus:border-amber-400"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-300 mb-1">Pitch Score (0 - 100) *</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="e.g. 92"
                      value={score}
                      onChange={(e) => setScore(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-studio-950 border border-studio-700 text-white text-xs focus:border-amber-400"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-300 mb-1">Judge Feedback & Pitch Comments</label>
                  <textarea
                    rows={3}
                    placeholder="Enter human judge feedback on presentation, franchise marketability, and response..."
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-studio-950 border border-studio-700 text-white text-xs focus:border-amber-400"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submittingScore}
                    className="px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-studio-950 font-black text-xs transition shadow-lg shadow-amber-500/20"
                  >
                    {submittingScore ? 'SUBMITTING SCORE...' : 'RECORD JUDGE SCORE'}
                  </button>
                </div>
              </form>
            </div>

          </div>
        ) : (
          <div className="md:col-span-3 glass-panel p-12 rounded-2xl text-center text-gray-400">
            Select a finalist team from the left to view pitch portfolio and enter human judge scores.
          </div>
        )}

      </div>

    </div>
  );
}
