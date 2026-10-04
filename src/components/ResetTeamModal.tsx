'use client';

import { useState } from 'react';
import { RotateCcw, AlertTriangle, ShieldCheck, CheckCircle2, X } from 'lucide-react';
import { TeamResetScope } from '@/types';

interface ResetTeamModalProps {
  team: { id: string; team_code: string; team_name: string };
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: any) => void;
}

export default function ResetTeamModal({ team, isOpen, onClose, onSuccess }: ResetTeamModalProps) {
  const [selectedScopes, setSelectedScopes] = useState<TeamResetScope[]>([]);
  const [reason, setReason] = useState('');
  const [confirmTeamCode, setConfirmTeamCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const isAllSelected = selectedScopes.includes('all') || (
    selectedScopes.includes('round1') &&
    selectedScopes.includes('round2') &&
    selectedScopes.includes('round3') &&
    selectedScopes.includes('final_pitch') &&
    selectedScopes.includes('ai_evaluations') &&
    selectedScopes.includes('assets')
  );

  const toggleScope = (scope: TeamResetScope) => {
    setError('');
    if (scope === 'all') {
      if (selectedScopes.includes('all')) {
        setSelectedScopes([]);
      } else {
        setSelectedScopes(['all', 'round1', 'round2', 'round3', 'final_pitch', 'ai_evaluations', 'assets']);
      }
    } else {
      let newScopes: TeamResetScope[];
      if (selectedScopes.includes(scope)) {
        newScopes = selectedScopes.filter((s) => s !== scope && s !== 'all');
      } else {
        newScopes = [...selectedScopes.filter((s) => s !== 'all'), scope];
        if (
          newScopes.includes('round1') &&
          newScopes.includes('round2') &&
          newScopes.includes('round3') &&
          newScopes.includes('final_pitch') &&
          newScopes.includes('ai_evaluations') &&
          newScopes.includes('assets')
        ) {
          newScopes.push('all');
        }
      }
      setSelectedScopes(newScopes);
    }
  };

  const isConfirmationValid = !isAllSelected || confirmTeamCode.trim().toUpperCase() === team.team_code.trim().toUpperCase();
  const canSubmit = selectedScopes.length > 0 && isConfirmationValid && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/admin/reset-team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team_id: team.id,
          scopes: selectedScopes,
          confirmation_team_code: confirmTeamCode,
          reason: reason.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to reset team progress');
      }

      onSuccess(data.result);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error occurred during reset.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-studio-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-panel max-w-xl w-full p-6 rounded-2xl border border-amber-500/40 bg-studio-900 space-y-5 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b border-studio-800 pb-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white uppercase tracking-wider">Reset Team Progress</h3>
              <p className="text-xs text-amber-400 font-bold">
                {team.team_name} &bull; <span className="font-mono text-white">{team.team_code}</span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Safety Notice */}
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs space-y-1">
          <div className="flex items-center space-x-2 font-bold text-emerald-400">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>SAFE ADMIN RESET GUARANTEE</span>
          </div>
          <p className="text-[11px] text-emerald-200/90 leading-relaxed">
            Team record, roster members, access code credentials, and team identity will NOT be deleted or modified.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Select Scopes */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
            Select Scopes to Reset (Default is NOT Reset All):
          </label>

          <div className="space-y-2 text-xs">
            {[
              { key: 'round1' as TeamResetScope, label: '1. Reset Round 1', desc: 'Remove Round 1 submission & return to Not Started' },
              { key: 'round2' as TeamResetScope, label: '2. Reset Round 2', desc: 'Remove hero, villain, prompts, AI evaluation, rubric scores & feedback' },
              { key: 'round3' as TeamResetScope, label: '3. Reset Round 3', desc: 'Remove marketing submission, promotional asset & manual judge scores' },
              { key: 'final_pitch' as TeamResetScope, label: '4. Reset Final Pitch', desc: 'Remove final pitch judge scores and comments' },
              { key: 'ai_evaluations' as TeamResetScope, label: '5. Reset AI Evaluations', desc: 'Remove associated AI evaluation records' },
              { key: 'assets' as TeamResetScope, label: '6. Reset uploaded submission assets', desc: 'Delete S3 objects under submissions/' + team.id + '/ prefix only' },
              { key: 'all' as TeamResetScope, label: '7. Reset ALL competition progress', desc: 'Reset all competition progress across all rounds' },
            ].map((item) => {
              const isChecked = item.key === 'all' ? isAllSelected : selectedScopes.includes(item.key);
              return (
                <label
                  key={item.key}
                  className={`flex items-start space-x-3 p-3 rounded-xl border transition cursor-pointer ${
                    isChecked
                      ? 'bg-amber-500/10 border-amber-500/40 text-white'
                      : 'bg-studio-950 border-studio-800 text-slate-400 hover:border-studio-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleScope(item.key)}
                    className="mt-0.5 rounded border-studio-700 bg-studio-900 text-amber-500 focus:ring-amber-400"
                  />
                  <div>
                    <span className="font-bold block text-slate-200">{item.label}</span>
                    <span className="text-[11px] text-slate-400 block">{item.desc}</span>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Reason Input */}
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
            Reason for Reset (Optional, saved in system audit log):
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Administrative reset for re-testing round 2 AI judging pipeline"
            className="w-full px-3 py-2 rounded-xl bg-studio-950 border border-studio-800 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-amber-400"
            rows={2}
          />
        </div>

        {/* Reset All Confirmation Input */}
        {isAllSelected && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/40 space-y-2">
            <label className="block text-xs font-bold text-red-400 uppercase tracking-wider">
              TYPE TEAM CODE TO CONFIRM RESET ALL:
            </label>
            <p className="text-[11px] text-slate-300">
              To proceed with resetting ALL competition progress for team <strong className="text-amber-400">{team.team_name}</strong>, type the exact Team Code <strong className="font-mono text-white">{team.team_code}</strong> below:
            </p>
            <input
              type="text"
              value={confirmTeamCode}
              onChange={(e) => setConfirmTeamCode(e.target.value)}
              placeholder={`Type "${team.team_code}" here`}
              className="w-full px-3 py-2 rounded-xl bg-studio-950 border border-red-500/50 font-mono font-bold text-amber-400 text-xs focus:outline-none focus:border-red-400"
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-3 border-t border-studio-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-studio-800 text-slate-300 font-bold text-xs hover:bg-studio-700"
          >
            CANCEL
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="px-6 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{submitting ? 'RESETTING...' : 'CONFIRM TEAM RESET'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
