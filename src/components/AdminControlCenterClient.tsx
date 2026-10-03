'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { CompetitionLifecycleSettings, TeamDossierData } from '@/types';
import TeamDossierView from './TeamDossierView';
import { 
  Users, UserCheck, ShieldAlert, Award, Play, Lock, CheckCircle2, 
  AlertCircle, Search, Filter, ArrowUpDown, Eye, RefreshCw, Cpu, 
  Edit3, UploadCloud, ChevronRight, Activity, FileText
} from 'lucide-react';

interface InspectionTeam {
  team: any;
  members: any[];
  round1Status: string;
  round2Status: string;
  round2SafetyStatus?: string;
  round2Score?: number;
  round2Decision?: string;
  round3Status: string;
  round3AverageScore?: number;
  finalScoreAverage?: number;
}

interface Props {
  initialLifecycle: CompetitionLifecycleSettings;
  teamsData: InspectionTeam[];
}

export default function AdminControlCenterClient({ initialLifecycle, teamsData }: Props) {
  const [lifecycle, setLifecycle] = useState<CompetitionLifecycleSettings>(initialLifecycle);
  const [teams, setTeams] = useState<InspectionTeam[]>(teamsData);
  const [loading, setLoading] = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [roundFilter, setRoundFilter] = useState('ALL');
  const [safetyFilter, setSafetyFilter] = useState('ALL');
  const [qualFilter, setQualFilter] = useState('ALL');
  const [sortField, setSortField] = useState<'name' | 'code' | 'round' | 'r2Score' | 'r3Score'>('code');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Selected Team Dossier Modal State
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [dossierData, setDossierData] = useState<TeamDossierData | null>(null);
  const [loadingDossier, setLoadingDossier] = useState(false);

  // Confirmation Modal for Round Lifecycle State Changes
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    description: string;
    actionUpdates: Partial<CompetitionLifecycleSettings>;
    affectedCount: number;
    activeSubmissionsCount: number;
    consequences: string;
  }>({
    open: false,
    title: '',
    description: '',
    actionUpdates: {},
    affectedCount: 0,
    activeSubmissionsCount: 0,
    consequences: '',
  });

  // Calculate 10 Top Summary Card Metrics
  const summaryMetrics = useMemo(() => {
    const totalTeams = teams.length;
    const totalParticipants = teams.reduce((acc, t) => acc + (t.members?.length || 0), 0);
    const r1Status = lifecycle.round1.status;
    const r2Status = lifecycle.round2.status;
    const r2EvaluationsCount = teams.filter((t) => t.round2Score !== undefined).length;
    const r2QualifiedCount = teams.filter((t) => t.round2Decision === 'QUALIFIED' || t.team.status === 'QUALIFIED').length;
    const r2DisqualifiedOrReviewCount = teams.filter(
      (t) => t.round2SafetyStatus === 'FAIL' || t.round2SafetyStatus === 'REVIEW_REQUIRED' || t.team.status === 'DISQUALIFIED'
    ).length;
    const r3SubmissionsCount = teams.filter((t) => t.round3Status === 'SUBMITTED' || t.round3Status === 'EVALUATED').length;
    const finalistsCount = teams.filter((t) => t.team.current_round === 3 && t.team.status === 'QUALIFIED').length;
    const finalPitchStatus = lifecycle.top5_locked ? 'TOP 5 LOCKED' : lifecycle.round3.manual_judging_open ? 'MANUAL JUDGING' : 'STANDBY';

    return {
      totalTeams,
      totalParticipants,
      r1Status,
      r2Status,
      r2EvaluationsCount,
      r2QualifiedCount,
      r2DisqualifiedOrReviewCount,
      r3SubmissionsCount,
      finalistsCount,
      finalPitchStatus,
    };
  }, [teams, lifecycle]);

  // Handle Lifecycle Update API Call
  const applyLifecycleUpdate = async (updates: Partial<CompetitionLifecycleSettings>, reason: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/round-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates, reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update round lifecycle');
      if (data.lifecycle) setLifecycle(data.lifecycle);
    } catch (err: any) {
      alert(err.message || 'Error updating round lifecycle');
    } finally {
      setLoading(false);
      setConfirmModal((prev) => ({ ...prev, open: false }));
    }
  };

  // Trigger Confirmation Modal for Round Lifecycle Action
  const requestLifecycleAction = (
    title: string,
    description: string,
    actionUpdates: Partial<CompetitionLifecycleSettings>,
    consequences: string
  ) => {
    const affectedCount = teams.length;
    const activeSubmissionsCount = teams.filter((t) => t.round1Status === 'SUBMITTED' || t.round2Status === 'SUBMITTED' || t.round3Status === 'SUBMITTED').length;

    setConfirmModal({
      open: true,
      title,
      description,
      actionUpdates,
      affectedCount,
      activeSubmissionsCount,
      consequences,
    });
  };

  // Open Team Dossier
  const openTeamDossier = async (teamId: string) => {
    setSelectedTeamId(teamId);
    setLoadingDossier(true);
    try {
      const res = await fetch(`/api/admin/team-dossier?team_id=${teamId}`);
      const data = await res.json();
      if (data.dossier) setDossierData(data.dossier);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDossier(false);
    }
  };

  // Filter & Search Teams Table
  const filteredTeams = useMemo(() => {
    return teams
      .filter((t) => {
        const query = searchQuery.toLowerCase().trim();
        if (query) {
          const matchName = t.team.team_name.toLowerCase().includes(query);
          const matchCode = t.team.team_code.toLowerCase().includes(query);
          const matchMember = t.members?.some(
            (m) =>
              m.member_name.toLowerCase().includes(query) ||
              m.email.toLowerCase().includes(query) ||
              m.phone_number.includes(query)
          );
          if (!matchName && !matchCode && !matchMember) return false;
        }

        if (roundFilter !== 'ALL') {
          if (roundFilter === 'ROUND1' && t.team.current_round !== 1) return false;
          if (roundFilter === 'ROUND2' && t.team.current_round !== 2) return false;
          if (roundFilter === 'ROUND3' && t.team.current_round !== 3) return false;
        }

        if (safetyFilter !== 'ALL') {
          if (t.round2SafetyStatus !== safetyFilter) return false;
        }

        if (qualFilter !== 'ALL') {
          if (t.team.status !== qualFilter) return false;
        }

        return true;
      })
      .sort((a, b) => {
        let valA: any = '';
        let valB: any = '';

        if (sortField === 'code') {
          valA = a.team.team_code;
          valB = b.team.team_code;
        } else if (sortField === 'name') {
          valA = a.team.team_name;
          valB = b.team.team_name;
        } else if (sortField === 'round') {
          valA = a.team.current_round;
          valB = b.team.current_round;
        } else if (sortField === 'r2Score') {
          valA = a.round2Score || 0;
          valB = b.round2Score || 0;
        } else if (sortField === 'r3Score') {
          valA = a.round3AverageScore || 0;
          valB = b.round3AverageScore || 0;
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [teams, searchQuery, roundFilter, safetyFilter, qualFilter, sortField, sortOrder]);

  return (
    <div className="space-y-8">
      {/* 1. TOP SUMMARY CARDS (10 CARDS) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
        <div className="glass-panel p-4 rounded-xl border border-studio-800 bg-studio-900/60">
          <span className="text-[10px] uppercase font-bold text-gray-400 block">1. Total Teams</span>
          <span className="text-2xl font-black text-white mt-1 block">{summaryMetrics.totalTeams}</span>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-studio-800 bg-studio-900/60">
          <span className="text-[10px] uppercase font-bold text-gray-400 block">2. Total Participants</span>
          <span className="text-2xl font-black text-amber-400 mt-1 block">{summaryMetrics.totalParticipants}</span>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-studio-800 bg-studio-900/60">
          <span className="text-[10px] uppercase font-bold text-gray-400 block">3. Round 1 Status</span>
          <span className={`text-sm font-black mt-2 inline-block px-2 py-0.5 rounded ${summaryMetrics.r1Status === 'OPEN' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
            {summaryMetrics.r1Status}
          </span>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-studio-800 bg-studio-900/60">
          <span className="text-[10px] uppercase font-bold text-gray-400 block">4. Round 2 Status</span>
          <span className={`text-sm font-black mt-2 inline-block px-2 py-0.5 rounded ${summaryMetrics.r2Status === 'OPEN' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-700 text-gray-400'}`}>
            {summaryMetrics.r2Status}
          </span>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-studio-800 bg-studio-900/60">
          <span className="text-[10px] uppercase font-bold text-gray-400 block">5. R2 AI Evaluations</span>
          <span className="text-2xl font-black text-cyanGlow mt-1 block">{summaryMetrics.r2EvaluationsCount}</span>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-studio-800 bg-studio-900/60">
          <span className="text-[10px] uppercase font-bold text-gray-400 block">6. R2 Qualified</span>
          <span className="text-2xl font-black text-emerald-400 mt-1 block">{summaryMetrics.r2QualifiedCount}</span>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-studio-800 bg-studio-900/60">
          <span className="text-[10px] uppercase font-bold text-gray-400 block">7. Disqualified / Review</span>
          <span className="text-2xl font-black text-crimsonGlow mt-1 block">{summaryMetrics.r2DisqualifiedOrReviewCount}</span>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-studio-800 bg-studio-900/60">
          <span className="text-[10px] uppercase font-bold text-gray-400 block">8. R3 Submissions</span>
          <span className="text-2xl font-black text-violetGlow mt-1 block">{summaryMetrics.r3SubmissionsCount}</span>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-studio-800 bg-studio-900/60">
          <span className="text-[10px] uppercase font-bold text-gray-400 block">9. Finalists / Top 5</span>
          <span className="text-2xl font-black text-amber-300 mt-1 block">{summaryMetrics.finalistsCount}</span>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-studio-800 bg-studio-900/60">
          <span className="text-[10px] uppercase font-bold text-gray-400 block">10. Final Pitch Status</span>
          <span className="text-xs font-black text-gray-300 mt-2 block">{summaryMetrics.finalPitchStatus}</span>
        </div>
      </div>

      {/* 2. GLOBAL QUICK ACTION BAR */}
      <div className="glass-panel p-4 rounded-2xl border border-amber-500/20 bg-studio-950/80 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center space-x-2">
            <Activity className="w-4 h-4 text-amber-400" />
            <span>GLOBAL COMMAND QUICK ACTIONS</span>
          </span>
          <span className="text-[11px] text-gray-400">Server-authoritative state transitions with confirmation dialogs</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            onClick={() => requestLifecycleAction('OPEN ROUND 1', 'Open Round 1 for team greenlight submissions.', { round1: { status: 'OPEN' }, active_round: 1 }, 'Teams can create, edit, and submit Round 1 Greenlight submissions.')}
            className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 font-bold text-xs transition"
          >
            [ OPEN ROUND 1 ]
          </button>
          <button
            onClick={() => requestLifecycleAction('LOCK ROUND 1', 'Lock Round 1 to prevent further submissions.', { round1: { status: 'LOCKED' } }, 'Round 1 submissions will become read-only.')}
            className="px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 font-bold text-xs transition"
          >
            [ LOCK ROUND 1 ]
          </button>

          <span className="text-gray-700 font-bold">|</span>

          <button
            onClick={() => requestLifecycleAction('OPEN ROUND 2', 'Open Round 2 Character & Visual Forge.', { round2: { status: 'OPEN' }, active_round: 2 }, 'Qualified teams can submit character profiles and visual prompts.')}
            className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 font-bold text-xs transition"
          >
            [ OPEN ROUND 2 ]
          </button>
          <button
            onClick={() => requestLifecycleAction('LOCK ROUND 2', 'Lock Round 2 submissions.', { round2: { status: 'LOCKED' } }, 'Teams cannot edit Round 2 visual prompts or character data.')}
            className="px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 font-bold text-xs transition"
          >
            [ LOCK ROUND 2 ]
          </button>

          <span className="text-gray-700 font-bold">|</span>

          <button
            onClick={() => requestLifecycleAction('OPEN ROUND 3', 'Open Round 3 Marketing Forge.', { round3: { status: 'OPEN' }, active_round: 3 }, 'Qualified teams can submit promotional copy, taglines, and poster assets.')}
            className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 font-bold text-xs transition"
          >
            [ OPEN ROUND 3 ]
          </button>
          <button
            onClick={() => requestLifecycleAction('LOCK ROUND 3', 'Lock Round 3 submissions.', { round3: { status: 'LOCKED' } }, 'Teams cannot edit Round 3 marketing strategies.')}
            className="px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 font-bold text-xs transition"
          >
            [ LOCK ROUND 3 ]
          </button>

          <span className="text-gray-700 font-bold">|</span>

          <Link href="/admin/ai-judge" className="px-3 py-1.5 rounded-lg bg-cyanGlow/15 hover:bg-cyanGlow/25 border border-cyanGlow/30 text-cyanGlow font-bold text-xs transition">
            [ AI JUDGE QUEUE ]
          </Link>
          <Link href="/admin/manual-judging" className="px-3 py-1.5 rounded-lg bg-violetGlow/15 hover:bg-violetGlow/25 border border-violetGlow/30 text-violetGlow font-bold text-xs transition">
            [ MANUAL JUDGING ]
          </Link>
          <Link href="/admin/final-pitch" className="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 font-bold text-xs transition">
            [ TOP 5 PITCH ]
          </Link>
        </div>
      </div>

      {/* 3. AUTHORITATIVE ROUND LIFECYCLE CONTROL */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-black text-white uppercase tracking-wider">AUTHORITATIVE ROUND LIFECYCLE CONTROL</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Server-authoritative controls for opening, locking, evaluating and publishing each competition round.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* CARD 1: ROUND 1 */}
          <div className="glass-panel p-6 rounded-2xl border border-studio-800 bg-studio-900/60 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400">ROUND 1 — GREENLIGHT FORGE</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${lifecycle.round1.status === 'OPEN' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'}`}>
                {lifecycle.round1.status}
              </span>
            </div>

            <div className="space-y-2 text-xs text-gray-300 pt-1">
              <div className="flex justify-between">
                <span className="text-gray-400">Eligible Teams:</span>
                <span className="font-bold text-white">{teams.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Submitted / Locked:</span>
                <span className="font-bold text-emerald-400">{teams.filter((t) => t.round1Status === 'SUBMITTED' || t.round1Status === 'LOCKED').length} / {teams.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Completion Rate:</span>
                <span className="font-bold text-amber-400">
                  {teams.length > 0 ? Math.round((teams.filter((t) => t.round1Status === 'SUBMITTED' || t.round1Status === 'LOCKED').length / teams.length) * 100) : 0}%
                </span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-gray-500">Last Changed:</span>
                <span className="font-mono text-gray-400">{lifecycle.round1.last_changed_at ? new Date(lifecycle.round1.last_changed_at).toLocaleTimeString() : 'N/A'}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => requestLifecycleAction('OPEN ROUND 1', 'Open Round 1 for team greenlight submissions.', { round1: { status: 'OPEN' }, active_round: 1 }, 'Teams can submit Round 1.')}
                className="py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-xs font-bold border border-emerald-500/40 transition"
              >
                OPEN R1
              </button>
              <button
                onClick={() => requestLifecycleAction('LOCK ROUND 1', 'Lock Round 1 submissions.', { round1: { status: 'LOCKED' } }, 'Submissions become read-only.')}
                className="py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 text-xs font-bold border border-rose-500/40 transition"
              >
                LOCK R1
              </button>
            </div>
          </div>

          {/* CARD 2: ROUND 2 */}
          <div className="glass-panel p-6 rounded-2xl border border-studio-800 bg-studio-900/60 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-cyanGlow">ROUND 2 — VISUAL FORGE</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${lifecycle.round2.status === 'OPEN' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-gray-700 text-gray-400 border border-gray-600'}`}>
                {lifecycle.round2.status}
              </span>
            </div>

            <div className="space-y-2 text-xs text-gray-300 pt-1">
              <div className="flex justify-between">
                <span className="text-gray-400">AI Evaluated:</span>
                <span className="font-bold text-cyanGlow">{teams.filter((t) => t.round2Score !== undefined).length} Teams</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Qualified (Pass):</span>
                <span className="font-bold text-emerald-400">{summaryMetrics.r2QualifiedCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Flagged / Review Req:</span>
                <span className="font-bold text-crimsonGlow">{summaryMetrics.r2DisqualifiedOrReviewCount}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-gray-500">AI Queue State:</span>
                <span className="font-bold text-amber-400">{lifecycle.ai_queue_paused ? 'PAUSED' : 'ACTIVE / ACTIVE'}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => requestLifecycleAction('OPEN ROUND 2', 'Open Round 2 submissions.', { round2: { status: 'OPEN' }, active_round: 2 }, 'Qualified teams can submit Round 2.')}
                className="py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-xs font-bold border border-emerald-500/40 transition"
              >
                OPEN R2
              </button>
              <button
                onClick={() => requestLifecycleAction('LOCK ROUND 2', 'Lock Round 2 submissions.', { round2: { status: 'LOCKED' } }, 'Submissions become read-only.')}
                className="py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 text-xs font-bold border border-rose-500/40 transition"
              >
                LOCK R2
              </button>
            </div>
          </div>

          {/* CARD 3: ROUND 3 */}
          <div className="glass-panel p-6 rounded-2xl border border-studio-800 bg-studio-900/60 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-violetGlow">ROUND 3 — MARKETING FORGE</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${lifecycle.round3.status === 'OPEN' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-gray-700 text-gray-400 border border-gray-600'}`}>
                {lifecycle.round3.status}
              </span>
            </div>

            <div className="space-y-2 text-xs text-gray-300 pt-1">
              <div className="flex justify-between">
                <span className="text-gray-400">Evaluation Mode:</span>
                <span className="font-bold text-amber-400">100% MANUAL HUMAN JUDGING</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Submissions Received:</span>
                <span className="font-bold text-white">{summaryMetrics.r3SubmissionsCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Manual Judging Open:</span>
                <span className={`font-bold ${lifecycle.round3.manual_judging_open ? 'text-emerald-400' : 'text-gray-400'}`}>
                  {lifecycle.round3.manual_judging_open ? 'YES (OPEN)' : 'NO (CLOSED)'}
                </span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-gray-500">Top 5 Finalists:</span>
                <span className="font-bold text-amber-300">{summaryMetrics.finalistsCount} Teams</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => requestLifecycleAction('OPEN ROUND 3', 'Open Round 3 submissions.', { round3: { status: 'OPEN', manual_judging_open: true }, active_round: 3 }, 'Teams can submit marketing strategies.')}
                className="py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-xs font-bold border border-emerald-500/40 transition"
              >
                OPEN R3
              </button>
              <button
                onClick={() => requestLifecycleAction('LOCK ROUND 3', 'Lock Round 3 submissions.', { round3: { status: 'LOCKED' } }, 'Submissions become read-only.')}
                className="py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 text-xs font-bold border border-rose-500/40 transition"
              >
                LOCK R3
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* 4. SEARCHABLE TEAM DOSSIER TABLE */}
      <div className="glass-panel p-6 rounded-2xl border border-studio-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-black text-white uppercase tracking-wider">COMPETITION TEAM DOSSIERS ({filteredTeams.length})</h3>
            <p className="text-xs text-gray-400">Search and filter team records. Click any row to open full 6-tab Team Dossier.</p>
          </div>

          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search team, member, code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 rounded-xl bg-studio-900 border border-studio-700 text-white text-xs placeholder-gray-500 focus:outline-none focus:border-amber-400 w-64"
              />
            </div>
          </div>
        </div>

        {/* Filters & Sorting */}
        <div className="flex flex-wrap items-center gap-3 pt-2 text-xs border-t border-studio-800">
          <div className="flex items-center space-x-2">
            <span className="text-gray-400 font-bold">Round:</span>
            <select
              value={roundFilter}
              onChange={(e) => setRoundFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-studio-900 border border-studio-700 text-gray-200 text-xs"
            >
              <option value="ALL">All Rounds</option>
              <option value="ROUND1">Round 1</option>
              <option value="ROUND2">Round 2</option>
              <option value="ROUND3">Round 3</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-gray-400 font-bold">Status:</span>
            <select
              value={qualFilter}
              onChange={(e) => setQualFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-studio-900 border border-studio-700 text-gray-200 text-xs"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="QUALIFIED">QUALIFIED</option>
              <option value="DISQUALIFIED">DISQUALIFIED</option>
              <option value="ELIMINATED">ELIMINATED</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-gray-400 font-bold">Sort By:</span>
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-lg bg-studio-900 border border-studio-700 text-gray-200 text-xs"
            >
              <option value="code">Team Code</option>
              <option value="name">Team Name</option>
              <option value="round">Current Round</option>
              <option value="r2Score">R2 AI Score</option>
              <option value="r3Score">R3 Manual Score</option>
            </select>
          </div>
        </div>

        {/* Team Table */}
        <div className="overflow-x-auto rounded-xl border border-studio-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-studio-900 text-gray-400 font-bold uppercase tracking-wider text-[10px] border-b border-studio-800">
              <tr>
                <th className="py-3 px-4">Team Code</th>
                <th className="py-3 px-4">Studio Team Name</th>
                <th className="py-3 px-4">Members</th>
                <th className="py-3 px-4">Current Round</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">R2 AI Score</th>
                <th className="py-3 px-4">R3 Human Avg</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-studio-800 text-gray-200">
              {filteredTeams.length > 0 ? (
                filteredTeams.map(({ team, members, round2Score, round2Decision, round3AverageScore }) => (
                  <tr
                    key={team.id}
                    onClick={() => openTeamDossier(team.id)}
                    className="hover:bg-studio-850/80 cursor-pointer transition"
                  >
                    <td className="py-3 px-4 font-black text-amber-400">{team.team_code}</td>
                    <td className="py-3 px-4 font-bold text-white">{team.team_name}</td>
                    <td className="py-3 px-4 text-gray-400">{members?.length || 0} Members</td>
                    <td className="py-3 px-4 font-semibold">Round {team.current_round}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                        team.status === 'QUALIFIED' ? 'bg-emerald-500/20 text-emerald-400' :
                        team.status === 'DISQUALIFIED' ? 'bg-rose-500/20 text-rose-400' :
                        'bg-amber-500/20 text-amber-400'
                      }`}>
                        {team.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-cyanGlow">
                      {round2Score !== undefined ? `${round2Score} / 100` : '—'}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-violetGlow">
                      {round3AverageScore !== undefined ? `${round3AverageScore} / 100` : '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openTeamDossier(team.id);
                        }}
                        className="p-1.5 rounded-lg bg-studio-800 hover:bg-studio-700 text-amber-400 transition"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-500">
                    No teams found matching search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CONFIRMATION MODAL */}
      {confirmModal.open && (
        <div className="fixed inset-0 z-[120] bg-studio-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel max-w-md w-full p-6 rounded-2xl border border-amber-500/30 space-y-4 bg-studio-900">
            <h3 className="text-lg font-black text-white uppercase tracking-wider">{confirmModal.title}</h3>
            <p className="text-xs text-gray-300">{confirmModal.description}</p>

            <div className="p-3 rounded-xl bg-studio-950 border border-studio-800 space-y-1.5 text-xs">
              <p className="text-gray-400">Affected Teams: <strong className="text-white">{confirmModal.affectedCount}</strong></p>
              <p className="text-gray-400">Active Submissions: <strong className="text-amber-400">{confirmModal.activeSubmissionsCount}</strong></p>
              <p className="text-gray-400">Consequences: <span className="text-gray-300 italic">{confirmModal.consequences}</span></p>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                onClick={() => setConfirmModal((prev) => ({ ...prev, open: false }))}
                className="flex-1 py-2.5 rounded-xl bg-studio-800 text-gray-300 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                disabled={loading}
                onClick={() => applyLifecycleUpdate(confirmModal.actionUpdates, confirmModal.title)}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-studio-950 font-black text-xs disabled:opacity-50"
              >
                {loading ? 'Applying...' : 'Confirm Action'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TEAM DOSSIER MODAL */}
      {selectedTeamId && dossierData && (
        <div className="fixed inset-0 z-[100] bg-studio-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <TeamDossierView
            dossier={dossierData}
            onClose={() => {
              setSelectedTeamId(null);
              setDossierData(null);
            }}
            onRefresh={() => openTeamDossier(selectedTeamId)}
          />
        </div>
      )}
    </div>
  );
}
