'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Cpu, Save, CheckCircle2, AlertCircle, ArrowLeft, Image as ImageIcon, ShieldAlert, Sparkles, Upload, ArrowRight, Lock } from 'lucide-react';
import { AIEvaluation, CharacterData } from '@/types';

export default function Round2Page() {
  const [heroData, setHeroData] = useState<CharacterData>({
    name: '', personality: '', goal: '', strengths: '', weakness: '', conflict: '', description: '',
  });

  const [villainData, setVillainData] = useState<CharacterData>({
    name: '', personality: '', goal: '', strengths: '', weakness: '', conflict: '', description: '',
  });

  const [heroPrompt, setHeroPrompt] = useState('');
  const [villainPrompt, setVillainPrompt] = useState('');

  const [heroImage, setHeroImage] = useState('');
  const [villainImage, setVillainImage] = useState('');

  const [relationship, setRelationship] = useState('');
  const [conflict, setConflict] = useState('');

  const [status, setStatus] = useState<string>('DRAFT');
  const [aiEvaluation, setAiEvaluation] = useState<AIEvaluation | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [isRound3Open, setIsRound3Open] = useState(false);

  useEffect(() => {
    fetchSubmission();
  }, []);

  const fetchSubmission = async () => {
    try {
      const res = await fetch('/api/submissions/round2');
      const data = await res.json();

      if (res.ok && data.submission) {
        const sub = data.submission;
        setHeroData(sub.hero_data || heroData);
        setVillainData(sub.villain_data || villainData);
        setHeroPrompt(sub.hero_prompt || '');
        setVillainPrompt(sub.villain_prompt || '');
        setHeroImage(sub.hero_image_s3_path || '');
        setVillainImage(sub.villain_image_s3_path || '');
        setRelationship(sub.hero_villain_relationship || '');
        setConflict(sub.hero_villain_conflict || '');
        setStatus(sub.status || 'DRAFT');

        if (data.evaluation) {
          setAiEvaluation(data.evaluation);
        }
      }

      // Check if Admin has opened Round 3
      const ctrlRes = await fetch('/api/admin/round-control');
      const ctrlData = await ctrlRes.json();
      if (ctrlRes.ok && ctrlData.settings?.round3 === 'OPEN') {
        setIsRound3Open(true);
      }
    } catch (err) {
      setError('Failed to load Round 2 data.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (isSubmitToAI = false) => {
    setError('');
    setSuccessMsg('');
    setSaving(true);

    try {
      const payload = {
        hero_data: heroData,
        villain_data: villainData,
        hero_prompt: heroPrompt,
        villain_prompt: villainPrompt,
        hero_image_s3_path: heroImage,
        villain_image_s3_path: villainImage,
        hero_villain_relationship: relationship,
        hero_villain_conflict: conflict,
        status: isSubmitToAI ? 'SUBMITTED' : 'DRAFT',
      };

      const res = await fetch('/api/submissions/round2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit to AI Judge.');

      setStatus(data.submission.status);
      if (data.evaluation) {
        setAiEvaluation(data.evaluation);
      }

      setSuccessMsg(isSubmitToAI ? '✓ SUBMITTED TO AI JUDGE! EVALUATION COMPLETE.' : 'Draft saved.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const isLocked = status === 'EVALUATED';

  // Checklist verification
  const checklist = {
    hero: Boolean(heroData.name && heroData.goal && heroData.description),
    villain: Boolean(villainData.name && villainData.goal && villainData.description),
    relationship: Boolean(relationship && conflict),
    prompts: Boolean(heroPrompt && villainPrompt),
    visuals: Boolean(heroImage || villainImage),
  };

  const canSubmit = Object.values(checklist).every(Boolean);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center">
        <p className="text-cyanGlow font-bold text-sm">Loading Character & Visual Forge...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link href="/dashboard" className="text-xs text-gray-400 hover:text-cyanGlow flex items-center space-x-1 mb-2">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>
          <h1 className="text-3xl font-black text-white flex items-center space-x-3">
            <Cpu className="w-7 h-7 text-cyanGlow" />
            <span>ROUND 2 — CHARACTER & VISUAL FORGE</span>
          </h1>
        </div>

        {isLocked && (
          <div className="px-4 py-2 rounded-xl bg-cyanGlow/20 border border-cyanGlow/40 text-cyanGlow font-bold text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>✓ EVALUATED BY AI JUDGE</span>
          </div>
        )}
      </div>

      {/* AI Evaluation Result Card */}
      {aiEvaluation && (
        <div className="glass-panel p-8 rounded-2xl border border-cyanGlow/40 mb-10 bg-studio-900/80">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-studio-700">
            <div>
              <span className="text-xs font-bold text-cyanGlow uppercase tracking-widest block mb-1">AI JUDGE SCORECARD</span>
              <h2 className="text-2xl font-black text-white">Qualification Decision: {aiEvaluation.decision}</h2>
            </div>
            <div className="text-right">
              <span className="text-xs text-gray-400 block">Total Score</span>
              <span className="text-4xl font-extrabold text-gold-400">{aiEvaluation.total_score} <span className="text-sm font-normal text-gray-400">/ 100</span></span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-center mb-6">
            <div className="p-3 rounded-xl bg-studio-800 border border-studio-700">
              <span className="text-[10px] text-gray-400 uppercase block">Character Dev</span>
              <span className="text-base font-bold text-gold-400">{aiEvaluation.character_development_score} / 30</span>
            </div>
            <div className="p-3 rounded-xl bg-studio-800 border border-studio-700">
              <span className="text-[10px] text-gray-400 uppercase block">Relationship</span>
              <span className="text-base font-bold text-cyanGlow">{aiEvaluation.relationship_score} / 20</span>
            </div>
            <div className="p-3 rounded-xl bg-studio-800 border border-studio-700">
              <span className="text-[10px] text-gray-400 uppercase block">Originality</span>
              <span className="text-base font-bold text-violetGlow">{aiEvaluation.originality_score} / 15</span>
            </div>
            <div className="p-3 rounded-xl bg-studio-800 border border-studio-700">
              <span className="text-[10px] text-gray-400 uppercase block">Visual Quality</span>
              <span className="text-base font-bold text-emerald-400">{aiEvaluation.visual_quality_score} / 15</span>
            </div>
            <div className="p-3 rounded-xl bg-studio-800 border border-studio-700">
              <span className="text-[10px] text-gray-400 uppercase block">Prompt Quality</span>
              <span className="text-base font-bold text-amber-400">{aiEvaluation.prompt_quality_score} / 10</span>
            </div>
            <div className="p-3 rounded-xl bg-studio-800 border border-studio-700">
              <span className="text-[10px] text-gray-400 uppercase block">Consistency</span>
              <span className="text-base font-bold text-pink-400">{aiEvaluation.prompt_image_consistency_score} / 10</span>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <strong className="text-white block">AI Executive Feedback:</strong>
            {aiEvaluation.feedback.map((f, i) => (
              <p key={i} className="text-gray-300 flex items-center space-x-2">
                <Sparkles className="w-3.5 h-3.5 text-cyanGlow shrink-0" />
                <span>{f}</span>
              </p>
            ))}
          </div>

          {/* NEXT STEP ACTION BANNER */}
          {aiEvaluation.decision === 'QUALIFIED' ? (
            <div className="mt-8 pt-6 border-t border-studio-700 flex flex-col sm:flex-row items-center justify-between gap-4 bg-emerald-500/10 p-5 rounded-2xl border border-emerald-500/30">
              <div>
                <span className="text-xs font-black uppercase tracking-widest text-emerald-400 block">
                  ✓ QUALIFICATION PASSED
                </span>
                <h3 className="text-lg font-black text-white mt-0.5">
                  {isRound3Open ? 'READY FOR ROUND 3 — MARKETING FORGE' : 'WAITING FOR ADMIN TO OPEN ROUND 3'}
                </h3>
                <p className="text-xs text-gray-300">
                  {isRound3Open
                    ? 'Your character profiles cleared AI evaluation. Proceed to submit your marketing strategy and promotional copy.'
                    : 'Your studio passed AI evaluation! Round 3 will unlock once competition organizers open it from the Admin Center.'}
                </p>
              </div>
              {isRound3Open ? (
                <Link
                  href="/dashboard/round3"
                  className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-studio-950 font-black text-xs transition shadow-lg shadow-emerald-500/20 flex items-center space-x-2 shrink-0"
                >
                  <span>PROCEED TO ROUND 3</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <div className="px-4 py-2.5 rounded-xl bg-studio-800 border border-studio-700 text-amber-400 font-bold text-xs flex items-center space-x-1.5 shrink-0">
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span>LOCKED BY ADMIN</span>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-8 pt-6 border-t border-studio-700 p-5 rounded-2xl bg-crimsonGlow/10 border border-crimsonGlow/30 flex items-center space-x-3">
              <ShieldAlert className="w-6 h-6 text-crimsonGlow shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-white">SUBMISSION DISQUALIFIED</h3>
                <p className="text-xs text-gray-300 mt-0.5">
                  Your submission did not meet the required threshold or safety guidelines and cannot proceed to Round 3.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-crimsonGlow/10 border border-crimsonGlow/30 text-crimsonGlow text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Forms Section */}
      <div className="space-y-8">

        {/* HERO FORM */}
        <div className="glass-panel p-8 rounded-2xl border border-studio-700">
          <h2 className="text-xl font-bold text-gold-400 mb-6 flex items-center space-x-2">
            <Sparkles className="w-5 h-5" />
            <span>HERO ARCHETYPE PROFILE</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-300 mb-1">Hero Name *</label>
              <input
                type="text"
                disabled={isLocked}
                placeholder="e.g. Captain Orion"
                value={heroData.name}
                onChange={(e) => setHeroData({ ...heroData, name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-studio-900 border border-studio-700 text-white text-sm focus:border-gold-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-300 mb-1">Hero Goal *</label>
              <input
                type="text"
                disabled={isLocked}
                placeholder="e.g. Restore human autonomy to Neon Prime"
                value={heroData.goal}
                onChange={(e) => setHeroData({ ...heroData, goal: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-studio-900 border border-studio-700 text-white text-sm focus:border-gold-400"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-bold uppercase text-gray-300 mb-1">Character Description & Personality *</label>
            <textarea
              rows={3}
              disabled={isLocked}
              placeholder="Describe personality, strengths, weaknesses, and back-story..."
              value={heroData.description}
              onChange={(e) => setHeroData({ ...heroData, description: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-studio-900 border border-studio-700 text-white text-sm focus:border-gold-400"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-300 mb-1">Visual Prompt *</label>
              <textarea
                rows={2}
                disabled={isLocked}
                placeholder="AI Image prompt describing Hero's visual aesthetic..."
                value={heroPrompt}
                onChange={(e) => setHeroPrompt(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-studio-900 border border-studio-700 text-white text-sm focus:border-gold-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-300 mb-1">Hero Image S3 Path / Data Reference</label>
              <input
                type="text"
                disabled={isLocked}
                placeholder="submissions/TEAM_ID/round2/hero/hero.png"
                value={heroImage}
                onChange={(e) => setHeroImage(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-studio-900 border border-studio-700 text-white text-sm focus:border-gold-400"
              />
            </div>
          </div>
        </div>

        {/* VILLAIN FORM */}
        <div className="glass-panel p-8 rounded-2xl border border-studio-700">
          <h2 className="text-xl font-bold text-crimsonGlow mb-6 flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5" />
            <span>VILLAIN ARCHETYPE PROFILE</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-300 mb-1">Villain Name *</label>
              <input
                type="text"
                disabled={isLocked}
                placeholder="e.g. Archon Vane"
                value={villainData.name}
                onChange={(e) => setVillainData({ ...villainData, name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-studio-900 border border-studio-700 text-white text-sm focus:border-crimsonGlow"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-300 mb-1">Villain Goal *</label>
              <input
                type="text"
                disabled={isLocked}
                placeholder="e.g. Enforce total algorithmic surveillance"
                value={villainData.goal}
                onChange={(e) => setVillainData({ ...villainData, goal: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-studio-900 border border-studio-700 text-white text-sm focus:border-crimsonGlow"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-bold uppercase text-gray-300 mb-1">Character Description & Personality *</label>
            <textarea
              rows={3}
              disabled={isLocked}
              placeholder="Describe villain motivation, darkness, and ideological opposition..."
              value={villainData.description}
              onChange={(e) => setVillainData({ ...villainData, description: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-studio-900 border border-studio-700 text-white text-sm focus:border-crimsonGlow"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-300 mb-1">Visual Prompt *</label>
              <textarea
                rows={2}
                disabled={isLocked}
                placeholder="AI Image prompt describing Villain's visual aesthetic..."
                value={villainPrompt}
                onChange={(e) => setVillainPrompt(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-studio-900 border border-studio-700 text-white text-sm focus:border-crimsonGlow"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-300 mb-1">Villain Image S3 Path / Data Reference</label>
              <input
                type="text"
                disabled={isLocked}
                placeholder="submissions/TEAM_ID/round2/villain/villain.png"
                value={villainImage}
                onChange={(e) => setVillainImage(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-studio-900 border border-studio-700 text-white text-sm focus:border-crimsonGlow"
              />
            </div>
          </div>
        </div>

        {/* RELATIONSHIP & CONFLICT */}
        <div className="glass-panel p-8 rounded-2xl border border-studio-700">
          <h2 className="text-xl font-bold text-cyanGlow mb-6">HERO–VILLAIN RELATIONSHIP & CONFLICT</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-300 mb-2">Hero–Villain Relationship *</label>
              <textarea
                rows={3}
                disabled={isLocked}
                placeholder="Describe their past connection, shared history, or ideological contrast..."
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-studio-900 border border-studio-700 text-white text-sm focus:border-cyanGlow"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-300 mb-2">Hero–Villain Narrative Conflict *</label>
              <textarea
                rows={3}
                disabled={isLocked}
                placeholder="Detail the central clash driving the franchise narrative..."
                value={conflict}
                onChange={(e) => setConflict(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-studio-900 border border-studio-700 text-white text-sm focus:border-cyanGlow"
              />
            </div>
          </div>
        </div>

        {/* PRE-SUBMISSION CHECKLIST */}
        {!isLocked && (
          <div className="glass-panel p-6 rounded-2xl border border-studio-700 bg-studio-900/50">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-gold-400 mb-4">PRE-SUBMISSION CHECKLIST</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
              <div className={`p-2.5 rounded-lg border flex items-center space-x-2 ${checklist.hero ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-studio-800 border-studio-700 text-gray-500'}`}>
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Hero Profile</span>
              </div>
              <div className={`p-2.5 rounded-lg border flex items-center space-x-2 ${checklist.villain ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-studio-800 border-studio-700 text-gray-500'}`}>
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Villain Profile</span>
              </div>
              <div className={`p-2.5 rounded-lg border flex items-center space-x-2 ${checklist.relationship ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-studio-800 border-studio-700 text-gray-500'}`}>
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Relationship</span>
              </div>
              <div className={`p-2.5 rounded-lg border flex items-center space-x-2 ${checklist.prompts ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-studio-800 border-studio-700 text-gray-500'}`}>
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Prompts</span>
              </div>
              <div className={`p-2.5 rounded-lg border flex items-center space-x-2 ${checklist.visuals ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-studio-800 border-studio-700 text-gray-500'}`}>
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Visual References</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-4 mt-6 pt-4 border-t border-studio-800">
              <button
                onClick={() => handleSave(false)}
                disabled={saving}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-studio-800 text-white font-bold text-xs border border-studio-600 hover:bg-studio-700"
              >
                SAVE DRAFT
              </button>

              <button
                onClick={() => handleSave(true)}
                disabled={saving || !canSubmit}
                className="w-full sm:w-auto px-8 py-3 rounded-xl bg-cyanGlow hover:bg-cyan-300 text-studio-950 font-black text-xs transition shadow-lg shadow-cyanGlow/20 disabled:opacity-50"
              >
                {saving ? 'SUBMITTING TO AI JUDGE...' : 'SUBMIT TO AI JUDGE'}
              </button>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
