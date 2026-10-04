'use client';

import { useState } from 'react';
import { TeamDossierData } from '@/types';
import { ShieldCheck, AlertTriangle, XCircle, CheckCircle2, UserCheck, Film, Image as ImageIcon, MessageSquare, Award, Clock, FileText, User, ChevronRight, Lock, Unlock } from 'lucide-react';

interface Props {
  dossier: TeamDossierData;
  onClose?: () => void;
  onRefresh?: () => void;
}

export default function TeamDossierView({ dossier, onClose, onRefresh }: Props) {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'MEMBERS' | 'ROUND1' | 'ROUND2' | 'ROUND3' | 'FINAL_PITCH'>('OVERVIEW');
  const [overrideModal, setOverrideModal] = useState<{ open: boolean; type: 'QUALIFICATION' | 'SAFETY'; newStatus: string; reason: string }>({
    open: false,
    type: 'QUALIFICATION',
    newStatus: '',
    reason: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');

  const { team, members, round1, round2, round2Evaluation, round3, round3ManualScores, finalScores, auditLogs } = dossier;

  const handleQualificationOverride = async () => {
    if (!overrideModal.reason.trim()) {
      setActionError('Reason is required for admin overrides.');
      return;
    }
    setSubmitting(true);
    setActionError('');

    try {
      if (overrideModal.type === 'QUALIFICATION') {
        const res = await fetch('/api/admin/ai-judge/override', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'OVERRIDE_QUALIFICATION',
            team_id: team.id,
            new_qualification_status: overrideModal.newStatus,
            reason: overrideModal.reason,
          }),
        });
        if (!res.ok) throw new Error('Failed to update qualification status.');
      } else if (overrideModal.type === 'SAFETY' && round2) {
        const res = await fetch('/api/admin/ai-judge/override', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            submission_id: round2.id,
            new_safety_status: overrideModal.newStatus,
            reason: overrideModal.reason,
          }),
        });
        if (!res.ok) throw new Error('Failed to update safety status.');
      }

      setOverrideModal({ open: false, type: 'QUALIFICATION', newStatus: '', reason: '' });
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setActionError(err.message || 'Error saving override.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-studio-950 text-white rounded-2xl border border-amber-500/30 overflow-hidden shadow-2xl max-w-5xl w-full mx-auto my-4">
      {/* Dossier Header */}
      <div className="p-6 bg-studio-900 border-b border-amber-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center font-black text-amber-400 text-xl shadow-lg">
            {team.team_code}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-2xl font-black tracking-wide text-white">{team.team_name}</h2>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                team.status === 'QUALIFIED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' :
                team.status === 'DISQUALIFIED' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' :
                team.status === 'ELIMINATED' ? 'bg-gray-500/20 text-gray-400 border border-gray-500/40' :
                'bg-amber-500/20 text-amber-400 border border-amber-500/40'
              }`}>
                {team.status}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Team ID: <span className="font-mono text-gray-300">{team.id}</span> &bull; Roster: {members.length} Members &bull; Current Round: Round {team.current_round}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setOverrideModal({ open: true, type: 'QUALIFICATION', newStatus: 'QUALIFIED', reason: '' })}
            className="px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold text-xs transition"
          >
            Override Status
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-studio-800 hover:bg-studio-700 text-gray-400 hover:text-white transition"
            >
              <XCircle className="w-6 h-6" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center overflow-x-auto border-b border-studio-800 bg-studio-900/60 px-4">
        {[
          { key: 'OVERVIEW', label: 'Overview' },
          { key: 'MEMBERS', label: `Members (${members.length})` },
          { key: 'ROUND1', label: 'Round 1 (Greenlight)' },
          { key: 'ROUND2', label: 'Round 2 (Visual)' },
          { key: 'ROUND3', label: 'Round 3 (Marketing)' },
          { key: 'FINAL_PITCH', label: 'Final Pitch' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-3 text-xs font-bold whitespace-nowrap border-b-2 transition ${
              activeTab === tab.key
                ? 'border-amber-400 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'OVERVIEW' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="glass-panel p-4 rounded-xl border border-studio-800">
                <span className="text-[10px] font-bold uppercase text-gray-400">Team Code</span>
                <p className="text-lg font-black text-amber-400 mt-1">{team.team_code}</p>
              </div>
              <div className="glass-panel p-4 rounded-xl border border-studio-800">
                <span className="text-[10px] font-bold uppercase text-gray-400">Access Key Status</span>
                <p className="text-sm font-semibold text-emerald-400 mt-1 flex items-center space-x-1">
                  <ShieldCheck className="w-4 h-4" />
                  <span>BCrypt Salted Hash Secured</span>
                </p>
              </div>
              <div className="glass-panel p-4 rounded-xl border border-studio-800">
                <span className="text-[10px] font-bold uppercase text-gray-400">Current Round</span>
                <p className="text-lg font-black text-white mt-1">Round {team.current_round}</p>
              </div>
              <div className="glass-panel p-4 rounded-xl border border-studio-800">
                <span className="text-[10px] font-bold uppercase text-gray-400">Created Date</span>
                <p className="text-xs font-mono text-gray-300 mt-2">{new Date(team.created_at).toLocaleString()}</p>
              </div>
            </div>

            {/* Submissions Progression Matrix */}
            <div className="glass-panel p-5 rounded-2xl border border-studio-800 space-y-4">
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Competition Progression State</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-studio-900 border border-studio-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-300">Round 1 Submission</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${round1?.status === 'SUBMITTED' || round1?.status === 'LOCKED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-700 text-gray-400'}`}>
                      {round1?.status || 'NOT_STARTED'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">Title: <span className="text-white font-semibold">{round1?.franchise_name || 'N/A'}</span></p>
                </div>

                <div className="p-4 rounded-xl bg-studio-900 border border-studio-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-300">Round 2 AI Score</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${round2Evaluation?.decision === 'QUALIFIED' ? 'bg-emerald-500/20 text-emerald-400' : round2Evaluation?.decision === 'DISQUALIFIED' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'}`}>
                      {round2Evaluation ? `${round2Evaluation.total_score} / 100 PTS` : 'NOT_EVALUATED'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">Safety: <span className="text-white font-semibold">{round2Evaluation?.safety_status || 'N/A'}</span></p>
                </div>

                <div className="p-4 rounded-xl bg-studio-900 border border-studio-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-300">Round 3 Marketing</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${round3ManualScores && round3ManualScores.length > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-700 text-gray-400'}`}>
                      {round3ManualScores && round3ManualScores.length > 0 ? `${round3ManualScores.length} Judges Evaluated` : round3?.status || 'NOT_STARTED'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">Tagline: <span className="text-white font-semibold truncate block">{round3?.tagline || 'N/A'}</span></p>
                </div>
              </div>
            </div>

            {/* Audit Logs */}
            <div className="glass-panel p-5 rounded-2xl border border-studio-800 space-y-3">
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Team Audit History ({auditLogs?.length || 0})</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                {auditLogs && auditLogs.length > 0 ? (
                  auditLogs.map((log) => (
                    <div key={log.id} className="p-2.5 rounded-lg bg-studio-900 border border-studio-800 text-xs flex items-center justify-between">
                      <div>
                        <span className="font-bold text-amber-400">{log.action}</span>
                        <span className="text-gray-400 ml-2">by {log.actor}</span>
                        {log.reason && <p className="text-gray-400 italic text-[11px]">"{log.reason}"</p>}
                      </div>
                      <span className="font-mono text-gray-500 text-[10px]">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-500">No explicit audit logs recorded for this team yet.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MEMBERS */}
        {activeTab === 'MEMBERS' && (
          <div className="space-y-4">
            <h3 className="text-sm font-black text-white uppercase tracking-wider">Roster ({members.length} Members)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {members.map((mem, i) => (
                <div key={mem.id || i} className="glass-panel p-4 rounded-xl border border-studio-800 flex items-start space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="space-y-1 text-xs">
                    <p className="font-black text-white text-sm">{mem.member_name}</p>
                    <p className="text-gray-300"><span className="text-gray-500">Email:</span> {mem.email}</p>
                    <p className="text-gray-300"><span className="text-gray-500">Phone:</span> {mem.phone_number}</p>
                    <p className="text-gray-300"><span className="text-gray-500">Semester & Section:</span> Sem {mem.semester} - Sec {mem.section}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: ROUND 1 */}
        {activeTab === 'ROUND1' && (
          <div className="space-y-4">
            {round1 ? (
              <div className="space-y-4 text-xs">
                <div className="glass-panel p-4 rounded-xl border border-studio-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Franchise Name</span>
                    <p className="text-base font-black text-amber-400">{round1.franchise_name}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Genre</span>
                    <p className="text-sm font-bold text-white">{round1.genre}</p>
                  </div>
                </div>

                <div className="glass-panel p-4 rounded-xl border border-studio-800 space-y-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Target Audience</span>
                  <p className="text-gray-200">{round1.target_audience}</p>
                </div>

                <div className="glass-panel p-4 rounded-xl border border-studio-800 space-y-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Core Premise</span>
                  <p className="text-gray-200 leading-relaxed whitespace-pre-wrap">{round1.core_premise}</p>
                </div>

                <div className="glass-panel p-4 rounded-xl border border-studio-800 space-y-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Central Conflict</span>
                  <p className="text-gray-200 leading-relaxed whitespace-pre-wrap">{round1.central_conflict}</p>
                </div>

                <div className="glass-panel p-4 rounded-xl border border-studio-800 space-y-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">World Concept & Rules</span>
                  <p className="text-gray-200 leading-relaxed whitespace-pre-wrap">{round1.world_concept}</p>
                </div>

                <div className="glass-panel p-4 rounded-xl border border-studio-800 space-y-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Elevator Pitch</span>
                  <p className="text-gray-200 italic leading-relaxed">"{round1.elevator_pitch}"</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-500 py-8 text-center">No Round 1 submission found for this team.</p>
            )}
          </div>
        )}

        {/* TAB 4: ROUND 2 */}
        {activeTab === 'ROUND2' && (
          <div className="space-y-6 text-xs">
            {round2 ? (
              <>
                {/* AI Evaluation Scorecard Summary */}
                {round2Evaluation && (
                  <div className="glass-panel p-5 rounded-2xl border border-amber-500/30 bg-studio-900 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Award className="w-6 h-6 text-amber-400" />
                        <div>
                          <h4 className="font-black text-white text-base">Round 2 AI Evaluation Breakdown</h4>
                          <p className="text-[11px] text-gray-400">100-Point Programmatic Judging Rubric</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-black text-amber-400">{round2Evaluation.total_score}</span>
                        <span className="text-xs text-gray-400"> / 100 PTS</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                      <div className="p-2.5 rounded-lg bg-studio-950 border border-studio-800">
                        <span className="text-[10px] text-gray-400 block">Character Development</span>
                        <span className="font-bold text-amber-400">{round2Evaluation.character_development_score} / 30</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-studio-950 border border-studio-800">
                        <span className="text-[10px] text-gray-400 block">Hero-Villain Relationship</span>
                        <span className="font-bold text-amber-400">{round2Evaluation.relationship_score} / 20</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-studio-950 border border-studio-800">
                        <span className="text-[10px] text-gray-400 block">Originality</span>
                        <span className="font-bold text-amber-400">{round2Evaluation.originality_score} / 15</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-studio-950 border border-studio-800">
                        <span className="text-[10px] text-gray-400 block">Visual Quality</span>
                        <span className="font-bold text-amber-400">{round2Evaluation.visual_quality_score} / 15</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-studio-950 border border-studio-800">
                        <span className="text-[10px] text-gray-400 block">Prompt Quality</span>
                        <span className="font-bold text-amber-400">{round2Evaluation.prompt_quality_score} / 10</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-studio-950 border border-studio-800">
                        <span className="text-[10px] text-gray-400 block">Prompt-Image Consistency</span>
                        <span className="font-bold text-amber-400">{round2Evaluation.prompt_image_consistency_score} / 10</span>
                      </div>
                    </div>

                    {/* Safety Status */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-studio-950 border border-studio-800">
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase">AI Safety Filter Status</span>
                        <p className={`font-black text-xs ${round2Evaluation.safety_status === 'PASS' ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {round2Evaluation.safety_status} {round2Evaluation.safety_reason && `(${round2Evaluation.safety_reason})`}
                        </p>
                      </div>
                      <button
                        onClick={() => setOverrideModal({ open: true, type: 'SAFETY', newStatus: round2Evaluation.safety_status === 'PASS' ? 'FAIL' : 'PASS', reason: '' })}
                        className="px-3 py-1.5 rounded-lg bg-studio-800 hover:bg-studio-700 text-xs font-bold text-gray-300 border border-studio-700"
                      >
                        Override Safety
                      </button>
                    </div>
                  </div>
                )}

                {/* Hero & Villain Dossiers */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Hero */}
                  <div className="glass-panel p-5 rounded-2xl border border-studio-800 space-y-3">
                    <h4 className="font-black text-amber-400 text-sm uppercase tracking-wider flex items-center space-x-2">
                      <User className="w-4 h-4 text-emerald-400" />
                      <span>HERO: {round2.hero_data.name}</span>
                    </h4>
                    <p><span className="text-gray-500">Goal:</span> {round2.hero_data.goal}</p>
                    <p><span className="text-gray-500">Personality:</span> {round2.hero_data.personality}</p>
                    <p><span className="text-gray-500">Strengths:</span> {round2.hero_data.strengths}</p>
                    <p><span className="text-gray-500">Weakness:</span> {round2.hero_data.weakness}</p>
                    <p><span className="text-gray-500">Visual Prompt:</span> <span className="italic font-mono text-gray-300">{round2.hero_prompt}</span></p>
                    {round2.hero_image_s3_path && (
                      <div className="mt-2 pt-2 border-t border-studio-800 flex items-center justify-between">
                        <div className="overflow-hidden">
                          <span className="text-[10px] font-bold text-gray-500">S3 Asset Reference:</span>
                          <p className="font-mono text-[11px] text-amber-400 truncate">{round2.hero_image_s3_path}</p>
                        </div>
                        <a
                          href={`/api/assets/download?path=${encodeURIComponent(round2.hero_image_s3_path)}&redirect=true`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 bg-studio-800 hover:bg-studio-700 text-amber-400 font-bold text-[10px] rounded border border-studio-700 shrink-0 ml-2"
                        >
                          View Asset ↗
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Villain */}
                  <div className="glass-panel p-5 rounded-2xl border border-studio-800 space-y-3">
                    <h4 className="font-black text-rose-400 text-sm uppercase tracking-wider flex items-center space-x-2">
                      <User className="w-4 h-4 text-rose-400" />
                      <span>VILLAIN: {round2.villain_data.name}</span>
                    </h4>
                    <p><span className="text-gray-500">Goal:</span> {round2.villain_data.goal}</p>
                    <p><span className="text-gray-500">Personality:</span> {round2.villain_data.personality}</p>
                    <p><span className="text-gray-500">Strengths:</span> {round2.villain_data.strengths}</p>
                    <p><span className="text-gray-500">Weakness:</span> {round2.villain_data.weakness}</p>
                    <p><span className="text-gray-500">Visual Prompt:</span> <span className="italic font-mono text-gray-300">{round2.villain_prompt}</span></p>
                    {round2.villain_image_s3_path && (
                      <div className="mt-2 pt-2 border-t border-studio-800 flex items-center justify-between">
                        <div className="overflow-hidden">
                          <span className="text-[10px] font-bold text-gray-500">S3 Asset Reference:</span>
                          <p className="font-mono text-[11px] text-amber-400 truncate">{round2.villain_image_s3_path}</p>
                        </div>
                        <a
                          href={`/api/assets/download?path=${encodeURIComponent(round2.villain_image_s3_path)}&redirect=true`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 bg-studio-800 hover:bg-studio-700 text-rose-400 font-bold text-[10px] rounded border border-studio-700 shrink-0 ml-2"
                        >
                          View Asset ↗
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-xs text-gray-500 py-8 text-center">No Round 2 submission found for this team.</p>
            )}
          </div>
        )}

        {/* TAB 5: ROUND 3 */}
        {activeTab === 'ROUND3' && (
          <div className="space-y-6 text-xs">
            {round3 ? (
              <div className="space-y-4">
                <div className="glass-panel p-5 rounded-2xl border border-studio-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-gray-400">Marketing Tagline</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-500/20 text-amber-400">
                      {round3.status}
                    </span>
                  </div>
                  <p className="text-base font-black text-amber-400 italic">"{round3.tagline}"</p>
                </div>

                <div className="glass-panel p-4 rounded-xl border border-studio-800 space-y-2">
                  <span className="text-[10px] font-bold uppercase text-gray-400">Marketing Angle & Positioning</span>
                  <p className="text-gray-200">{round3.marketing_angle}</p>
                </div>

                <div className="glass-panel p-4 rounded-xl border border-studio-800 space-y-2">
                  <span className="text-[10px] font-bold uppercase text-gray-400">Intended Audience Response</span>
                  <p className="text-gray-200">{round3.intended_audience_response}</p>
                </div>

                <div className="glass-panel p-4 rounded-xl border border-studio-800 space-y-2">
                  <span className="text-[10px] font-bold uppercase text-gray-400">Promotional Copy</span>
                  <p className="text-gray-200 leading-relaxed whitespace-pre-wrap">{round3.promotional_copy}</p>
                </div>

                {/* Human Judge Scorecard for Round 3 */}
                <div className="glass-panel p-5 rounded-2xl border border-amber-500/30 bg-studio-900 space-y-3">
                  <h4 className="font-black text-white text-sm uppercase tracking-wider">Human Judge Scores ({round3ManualScores?.length || 0} Evaluated)</h4>
                  {round3ManualScores && round3ManualScores.length > 0 ? (
                    <div className="space-y-3">
                      {round3ManualScores.map((sc) => (
                        <div key={sc.id} className="p-3 rounded-xl bg-studio-950 border border-studio-800 flex items-center justify-between">
                          <div>
                            <span className="font-bold text-amber-400">{sc.judge_name}</span>
                            <span className="text-gray-400 ml-2">Score: <strong className="text-white">{sc.total_score} / 100</strong></span>
                            {sc.comments && <p className="text-gray-400 italic text-[11px] mt-0.5">"{sc.comments}"</p>}
                          </div>
                          <span className="text-[10px] font-mono text-gray-500">{new Date(sc.updated_at).toLocaleTimeString()}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">No human judge evaluations recorded for Round 3 yet.</p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-500 py-8 text-center">No Round 3 submission found for this team.</p>
            )}
          </div>
        )}

        {/* TAB 6: FINAL PITCH */}
        {activeTab === 'FINAL_PITCH' && (
          <div className="space-y-4 text-xs">
            <div className="glass-panel p-5 rounded-2xl border border-studio-800 space-y-4">
              <h4 className="font-black text-white text-sm uppercase tracking-wider">Offline Final Pitch Panel Scores</h4>
              {finalScores && finalScores.length > 0 ? (
                <div className="space-y-3">
                  {finalScores.map((fs) => (
                    <div key={fs.id} className="p-3 rounded-xl bg-studio-900 border border-studio-800 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-amber-400">{fs.judge_name || fs.judge_id}</span>
                        <span className="text-gray-400 ml-2">Score: <strong className="text-white">{fs.score} / 100</strong></span>
                        {fs.comments && <p className="text-gray-400 italic text-[11px] mt-0.5">"{fs.comments}"</p>}
                      </div>
                      <span className="text-[10px] font-mono text-gray-500">{new Date(fs.created_at).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500 py-4">No offline final pitch judge scores recorded yet.</p>
              )}
            </div>
          </div>
        )}

      </div>

      {/* OVERRIDE CONFIRMATION MODAL */}
      {overrideModal.open && (
        <div className="fixed inset-0 z-[110] bg-studio-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel max-w-md w-full p-6 rounded-2xl border border-amber-500/30 space-y-4 bg-studio-900">
            <h3 className="text-lg font-black text-white uppercase tracking-wider">Confirm Admin Override</h3>
            <p className="text-xs text-gray-300">
              You are about to override <strong className="text-amber-400">{overrideModal.type}</strong> for team <strong className="text-white">{team.team_name} ({team.team_code})</strong>.
            </p>

            {actionError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {actionError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">New Target Status</label>
              <select
                value={overrideModal.newStatus}
                onChange={(e) => setOverrideModal({ ...overrideModal, newStatus: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-studio-950 border border-studio-700 text-white text-xs font-bold"
              >
                {overrideModal.type === 'QUALIFICATION' ? (
                  <>
                    <option value="QUALIFIED">QUALIFIED</option>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="DISQUALIFIED">DISQUALIFIED</option>
                    <option value="ELIMINATED">ELIMINATED</option>
                  </>
                ) : (
                  <>
                    <option value="PASS">PASS</option>
                    <option value="FAIL">FAIL</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">Audit Reason (Required)</label>
              <textarea
                placeholder="Provide official justification for this override..."
                value={overrideModal.reason}
                onChange={(e) => setOverrideModal({ ...overrideModal, reason: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-studio-950 border border-studio-700 text-white text-xs placeholder-gray-500"
                rows={3}
                required
              />
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setOverrideModal({ open: false, type: 'QUALIFICATION', newStatus: '', reason: '' })}
                className="flex-1 py-2.5 rounded-xl bg-studio-800 text-gray-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting || !overrideModal.reason.trim()}
                onClick={handleQualificationOverride}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-studio-950 font-black text-xs disabled:opacity-50"
              >
                {submitting ? 'Applying...' : 'Confirm Override'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
