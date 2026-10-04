'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sparkles, Save, CheckCircle2, AlertTriangle, ArrowLeft, Lock, Upload } from 'lucide-react';

export default function Round3Page() {
  const [formData, setFormData] = useState({
    marketing_angle: '',
    intended_audience_response: '',
    tagline: '',
    promotional_copy: '',
    promotional_asset_s3_path: '',
  });

  const [status, setStatus] = useState<'DRAFT' | 'SUBMITTED' | 'PENDING_AI' | 'EVALUATED'>('DRAFT');
  const [evaluation, setEvaluation] = useState<any>(null);
  const [isRound3Open, setIsRound3Open] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchSubmission();
  }, []);

  const handleFileUpload = async (file: File) => {
    try {
      setUploading(true);
      setError('');
      const initRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          file_type: file.type,
          file_size: file.size,
          category: 'round3',
        }),
      });

      const initData = await initRes.json();
      if (!initRes.ok) throw new Error(initData.error || 'Failed to initialize upload.');

      const uploadRes = await fetch(initData.upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      if (!uploadRes.ok) throw new Error('Failed to upload file to S3 bucket.');

      setFormData((prev) => ({ ...prev, promotional_asset_s3_path: initData.s3_path }));
      setSuccessMsg(`✓ File uploaded successfully: ${initData.s3_path}`);
    } catch (err: any) {
      setError(err.message || 'File upload failed');
    } finally {
      setUploading(false);
    }
  };

  const fetchSubmission = async () => {
    try {
      const ctrlRes = await fetch('/api/admin/round-control');
      const ctrlData = await ctrlRes.json();
      if (ctrlRes.ok && ctrlData.settings?.round3 === 'OPEN') {
        setIsRound3Open(true);
      }

      const res = await fetch('/api/submissions/round3');
      const data = await res.json();
      if (res.ok && data.submission) {
        setFormData({
          marketing_angle: data.submission.marketing_angle || '',
          intended_audience_response: data.submission.intended_audience_response || '',
          tagline: data.submission.tagline || '',
          promotional_copy: data.submission.promotional_copy || '',
          promotional_asset_s3_path: data.submission.promotional_asset_s3_path || '',
        });
        setStatus(data.submission.status || 'DRAFT');
        if (data.evaluation) setEvaluation(data.evaluation);
      }
    } catch (err) {
      setError('Failed to load Round 3 data.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (isSubmit = false) => {
    setError('');
    setSuccessMsg('');
    setSaving(true);

    try {
      const res = await fetch('/api/submissions/round3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          status: isSubmit ? 'SUBMITTED' : 'DRAFT',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save submission.');

      setStatus(data.submission.status);
      if (data.evaluation) setEvaluation(data.evaluation);
      setSuccessMsg(isSubmit ? '✓ ROUND 3 SUBMITTED AND EVALUATED BY AI JUDGE!' : 'Draft saved.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const isLocked = status === 'SUBMITTED' || status === 'EVALUATED';

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-violetGlow font-bold text-sm">Loading Marketing Forge...</p>
      </div>
    );
  }

  if (!isRound3Open) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="glass-panel p-10 rounded-3xl border border-amber-500/30 max-w-lg mx-auto space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 p-0.5 mx-auto flex items-center justify-center">
            <Lock className="w-7 h-7 text-amber-400" />
          </div>
          <h2 className="text-2xl font-black text-white">ROUND 3 IS CURRENTLY LOCKED</h2>
          <p className="text-xs text-gray-300 leading-relaxed">
            Round 3 — Marketing Forge has not been opened by competition organizers yet. Please wait for organizers to unlock Round 3 from the Admin Control Center.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-studio-800 hover:bg-studio-700 text-gold-400 font-bold text-xs border border-gold-500/30 transition mt-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>RETURN TO DASHBOARD</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link href="/dashboard" className="text-xs text-gray-400 hover:text-violetGlow flex items-center space-x-1 mb-2">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>
          <h1 className="text-3xl font-black text-white flex items-center space-x-3">
            <Sparkles className="w-7 h-7 text-violetGlow" />
            <span>ROUND 3 — MARKETING FORGE</span>
          </h1>
        </div>

        {isLocked && (
          <div className="px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-bold text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>✓ SUBMITTED & EVALUATED</span>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-crimsonGlow/10 border border-crimsonGlow/30 text-crimsonGlow text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* AI Judge Evaluation Result Card */}
      {evaluation && (
        <div className="mb-8 p-6 rounded-2xl glass-panel border border-violetGlow/40 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-studio-800">
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <Sparkles className="w-5 h-5 text-violetGlow" />
                <h3 className="text-lg font-black text-white">ROUND 3 AI JUDGE EVALUATION</h3>
              </div>
              <p className="text-xs text-gray-400">Automated AI assessment of marketing strategy, tagline, & pitch copy</p>
            </div>

            <div className="flex items-center space-x-3">
              <span className={`px-3 py-1 rounded-full text-xs font-black uppercase border ${
                evaluation.decision === 'WINNER_CANDIDATE'
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                  : evaluation.decision === 'QUALIFIED'
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : 'bg-red-500/20 text-red-400 border-red-500/40'
              }`}>
                {evaluation.decision}
              </span>
              <div className="px-4 py-2 rounded-xl bg-studio-900 border border-studio-700 text-right">
                <div className="text-2xl font-black text-violetGlow">{evaluation.total_score}<span className="text-xs text-gray-500">/100</span></div>
                <div className="text-[10px] text-gray-400 font-bold">TOTAL SCORE</div>
              </div>
            </div>
          </div>

          {/* Rubric Score Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3 rounded-xl bg-studio-900 border border-studio-800 text-center">
              <div className="text-xs text-gray-400 mb-1">Marketing</div>
              <div className="text-lg font-bold text-white">{evaluation.marketing_strategy_score}<span className="text-xs text-gray-500">/25</span></div>
            </div>
            <div className="p-3 rounded-xl bg-studio-900 border border-studio-800 text-center">
              <div className="text-xs text-gray-400 mb-1">Tagline</div>
              <div className="text-lg font-bold text-white">{evaluation.tagline_punch_score}<span className="text-xs text-gray-500">/20</span></div>
            </div>
            <div className="p-3 rounded-xl bg-studio-900 border border-studio-800 text-center">
              <div className="text-xs text-gray-400 mb-1">Audience</div>
              <div className="text-lg font-bold text-white">{evaluation.audience_engagement_score}<span className="text-xs text-gray-500">/20</span></div>
            </div>
            <div className="p-3 rounded-xl bg-studio-900 border border-studio-800 text-center">
              <div className="text-xs text-gray-400 mb-1">Copywriting</div>
              <div className="text-lg font-bold text-white">{evaluation.copywriting_quality_score}<span className="text-xs text-gray-500">/20</span></div>
            </div>
            <div className="p-3 rounded-xl bg-studio-900 border border-studio-800 text-center">
              <div className="text-xs text-gray-400 mb-1">Poster</div>
              <div className="text-lg font-bold text-white">{evaluation.visual_poster_quality_score}<span className="text-xs text-gray-500">/15</span></div>
            </div>
          </div>

          {/* AI Executive Feedback */}
          {evaluation.feedback && evaluation.feedback.length > 0 && (
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">AI Executive Feedback & Insights:</h4>
              <ul className="space-y-1">
                {evaluation.feedback.map((item: string, idx: number) => (
                  <li key={idx} className="text-xs text-gray-300 flex items-start space-x-2">
                    <span className="text-violetGlow font-bold">›</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Form Card */}
      <div className="glass-panel p-8 rounded-2xl border border-studio-700 space-y-6">
        
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-violetGlow mb-2">
            Strategic Marketing Angle *
          </label>
          <input
            type="text"
            disabled={isLocked}
            placeholder="e.g. High-concept transmedia positioning bridging gaming and cinema"
            value={formData.marketing_angle}
            onChange={(e) => setFormData({ ...formData, marketing_angle: e.target.value })}
            className="w-full px-4 py-3 rounded-xl bg-studio-900 border border-studio-700 text-white text-sm focus:border-violetGlow disabled:opacity-60"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-violetGlow mb-2">
            Intended Audience Response *
          </label>
          <textarea
            rows={3}
            disabled={isLocked}
            placeholder="What key emotional or fan reaction should this franchise trigger..."
            value={formData.intended_audience_response}
            onChange={(e) => setFormData({ ...formData, intended_audience_response: e.target.value })}
            className="w-full px-4 py-3 rounded-xl bg-studio-900 border border-studio-700 text-white text-sm focus:border-violetGlow disabled:opacity-60"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-violetGlow mb-2">
            Franchise Tagline *
          </label>
          <input
            type="text"
            disabled={isLocked}
            placeholder="e.g. 'In a world controlled by algorithms, human spirit is the glitch.'"
            value={formData.tagline}
            onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
            className="w-full px-4 py-3 rounded-xl bg-studio-900 border border-studio-700 text-white text-sm focus:border-violetGlow disabled:opacity-60"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-violetGlow mb-2">
            Promotional Copy / Teaser Press Release *
          </label>
          <textarea
            rows={4}
            disabled={isLocked}
            placeholder="Write compelling promotional copy or trailer script voiceover..."
            value={formData.promotional_copy}
            onChange={(e) => setFormData({ ...formData, promotional_copy: e.target.value })}
            className="w-full px-4 py-3 rounded-xl bg-studio-900 border border-studio-700 text-white text-sm focus:border-violetGlow disabled:opacity-60"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-violetGlow mb-2">
            Promotional Poster S3 Reference Path
          </label>
          <div className="flex space-x-2 items-center">
            <input
              type="text"
              disabled={isLocked}
              placeholder="submissions/TEAM_ID/round3/poster.png"
              value={formData.promotional_asset_s3_path}
              onChange={(e) => setFormData({ ...formData, promotional_asset_s3_path: e.target.value })}
              className="flex-1 px-4 py-3 rounded-xl bg-studio-900 border border-studio-700 text-white text-sm focus:border-violetGlow disabled:opacity-60"
            />
            {!isLocked && (
              <label className="cursor-pointer px-4 py-3 bg-studio-800 hover:bg-studio-700 border border-studio-600 rounded-xl text-xs font-bold text-violetGlow flex items-center space-x-1 shrink-0">
                <Upload className="w-4 h-4" />
                <span>{uploading ? 'Uploading...' : 'Upload'}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                />
              </label>
            )}
          </div>
        </div>

        {!isLocked && (
          <div className="flex flex-col sm:flex-row items-center justify-end gap-4 pt-4 border-t border-studio-800">
            <button
              onClick={() => handleSave(false)}
              disabled={saving}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-studio-800 text-white font-bold text-xs border border-studio-600 hover:bg-studio-700"
            >
              <Save className="w-4 h-4 text-violetGlow" />
              <span>SAVE DRAFT</span>
            </button>

            <button
              onClick={() => handleSave(true)}
              disabled={saving}
              className="w-full sm:w-auto px-8 py-3 rounded-xl bg-violetGlow hover:bg-violet-400 text-studio-950 font-black text-xs transition shadow-lg shadow-violetGlow/20"
            >
              <span>SUBMIT ROUND 3</span>
            </button>
          </div>
        )}

      </div>

    </div>
  );
}
