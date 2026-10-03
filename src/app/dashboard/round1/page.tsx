'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Film, Save, CheckCircle2, AlertTriangle, ArrowLeft, Lock } from 'lucide-react';

export default function Round1Page() {
  const [formData, setFormData] = useState({
    franchise_name: '',
    genre: '',
    target_audience: '',
    core_premise: '',
    central_conflict: '',
    world_concept: '',
    elevator_pitch: '',
  });

  const [status, setStatus] = useState<'DRAFT' | 'SUBMITTED'>('DRAFT');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    fetchSubmission();
  }, []);

  const fetchSubmission = async () => {
    try {
      const res = await fetch('/api/submissions/round1');
      const data = await res.json();
      if (res.ok && data.submission) {
        setFormData({
          franchise_name: data.submission.franchise_name || '',
          genre: data.submission.genre || '',
          target_audience: data.submission.target_audience || '',
          core_premise: data.submission.core_premise || '',
          central_conflict: data.submission.central_conflict || '',
          world_concept: data.submission.world_concept || '',
          elevator_pitch: data.submission.elevator_pitch || '',
        });
        setStatus(data.submission.status || 'DRAFT');
      }
    } catch (err: any) {
      setError('Failed to load submission data.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (isSubmit = false) => {
    setError('');
    setSuccessMsg('');
    setSaving(true);

    try {
      const res = await fetch('/api/submissions/round1', {
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
      setSuccessMsg(isSubmit ? '✓ ROUND 1 SUBMITTED AND LOCKED!' : 'Draft saved successfully.');
      setShowConfirmModal(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const isLocked = status === 'SUBMITTED';

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-gold-400 font-bold text-sm">Loading Round 1 Submission...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link href="/dashboard" className="text-xs text-gray-400 hover:text-gold-400 flex items-center space-x-1 mb-2">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>
          <h1 className="text-3xl font-black text-white flex items-center space-x-3">
            <Film className="w-7 h-7 text-gold-400" />
            <span>ROUND 1 — GREENLIGHT FORGE</span>
          </h1>
        </div>

        {isLocked && (
          <div className="px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-bold text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>✓ SUBMITTED & LOCKED</span>
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

      {/* Form Card */}
      <div className="glass-panel p-8 rounded-2xl border border-studio-700 space-y-6">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gold-400 mb-2">
              Franchise Name *
            </label>
            <input
              type="text"
              disabled={isLocked}
              placeholder="e.g. CyberVerse: Neon Odyssey"
              value={formData.franchise_name}
              onChange={(e) => setFormData({ ...formData, franchise_name: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-studio-900 border border-studio-700 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-gold-400 disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gold-400 mb-2">
              Genre *
            </label>
            <input
              type="text"
              disabled={isLocked}
              placeholder="e.g. Sci-Fi Cyberpunk Thriller"
              value={formData.genre}
              onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-studio-900 border border-studio-700 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-gold-400 disabled:opacity-60"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gold-400 mb-2">
            Target Audience *
          </label>
          <input
            type="text"
            disabled={isLocked}
            placeholder="e.g. Young Adults & Gaming/Tech Enthusiasts (Ages 16-30)"
            value={formData.target_audience}
            onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
            className="w-full px-4 py-3 rounded-xl bg-studio-900 border border-studio-700 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-gold-400 disabled:opacity-60"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gold-400 mb-2">
            Core Premise *
          </label>
          <textarea
            rows={3}
            disabled={isLocked}
            placeholder="Summarize the core premise of your franchise universe..."
            value={formData.core_premise}
            onChange={(e) => setFormData({ ...formData, core_premise: e.target.value })}
            className="w-full px-4 py-3 rounded-xl bg-studio-900 border border-studio-700 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-gold-400 disabled:opacity-60"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gold-400 mb-2">
            Central Conflict *
          </label>
          <textarea
            rows={3}
            disabled={isLocked}
            placeholder="Describe the primary ideological and narrative conflict..."
            value={formData.central_conflict}
            onChange={(e) => setFormData({ ...formData, central_conflict: e.target.value })}
            className="w-full px-4 py-3 rounded-xl bg-studio-900 border border-studio-700 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-gold-400 disabled:opacity-60"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gold-400 mb-2">
            World / Concept Concept *
          </label>
          <textarea
            rows={3}
            disabled={isLocked}
            placeholder="Detail the setting, world-building rules, and atmosphere..."
            value={formData.world_concept}
            onChange={(e) => setFormData({ ...formData, world_concept: e.target.value })}
            className="w-full px-4 py-3 rounded-xl bg-studio-900 border border-studio-700 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-gold-400 disabled:opacity-60"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gold-400 mb-2">
            Elevator Pitch *
          </label>
          <textarea
            rows={4}
            disabled={isLocked}
            placeholder="Hook executive studio greenlighters in 2-3 compelling sentences..."
            value={formData.elevator_pitch}
            onChange={(e) => setFormData({ ...formData, elevator_pitch: e.target.value })}
            className="w-full px-4 py-3 rounded-xl bg-studio-900 border border-studio-700 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-gold-400 disabled:opacity-60"
          />
        </div>

        {/* Action Buttons */}
        {!isLocked && (
          <div className="flex flex-col sm:flex-row items-center justify-end gap-4 pt-4 border-t border-studio-800">
            <button
              onClick={() => handleSave(false)}
              disabled={saving}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-studio-800 hover:bg-studio-700 text-white font-bold text-xs border border-studio-600 transition flex items-center justify-center space-x-2"
            >
              <Save className="w-4 h-4 text-cyanGlow" />
              <span>SAVE DRAFT</span>
            </button>

            <button
              onClick={() => setShowConfirmModal(true)}
              disabled={saving}
              className="w-full sm:w-auto px-8 py-3 rounded-xl bg-gold-400 hover:bg-gold-300 text-studio-950 font-black text-xs transition shadow-lg shadow-gold-500/20 flex items-center justify-center space-x-2"
            >
              <CheckCircle2 className="w-4 h-4 text-studio-950" />
              <span>SUBMIT ROUND 1</span>
            </button>
          </div>
        )}

      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-studio-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel max-w-md w-full p-6 rounded-2xl border border-gold-500/40 text-center">
            <Lock className="w-12 h-12 text-gold-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Confirm Round 1 Submission</h3>
            <p className="text-gray-300 text-xs mb-6">
              Submitting Round 1 will lock your franchise premise and greenlight entry. You cannot edit these fields after submission.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-studio-800 text-gray-300 font-bold text-xs border border-studio-700 hover:bg-studio-700"
              >
                CANCEL
              </button>
              <button
                onClick={() => handleSave(true)}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-gold-400 text-studio-950 font-black text-xs hover:bg-gold-300"
              >
                CONFIRM SUBMIT
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
