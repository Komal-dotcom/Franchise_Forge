import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentTeamSession } from '@/lib/auth';
import { getTeamWithMembers, getRound1Submission, getRound2Submission, getAIEvaluationBySubmissionId, getRound3Submission, getRoundSettings } from '@/lib/db-service';
import { Film, CheckCircle2, Clock, Lock, Cpu, Sparkles, Users, ArrowRight } from 'lucide-react';

export default async function TeamDashboardPage() {
  const teamSession = await getCurrentTeamSession();
  if (!teamSession) {
    redirect('/login');
  }

  const [teamData, roundSettings, r1Sub, r2Sub, r3Sub] = await Promise.all([
    getTeamWithMembers(teamSession.team_id),
    getRoundSettings(),
    getRound1Submission(teamSession.team_id),
    getRound2Submission(teamSession.team_id),
    getRound3Submission(teamSession.team_id),
  ]);

  if (!teamData) {
    redirect('/login');
  }

  const isRound3OpenByAdmin = roundSettings.round3 === 'OPEN';

  let r2Eval = null;
  if (r2Sub) {
    r2Eval = await getAIEvaluationBySubmissionId(r2Sub.id);
  }

  const r1Status = r1Sub?.status === 'SUBMITTED' ? 'COMPLETED' : 'ACTIVE';
  const r2Status = r2Sub?.status === 'EVALUATED' ? 'COMPLETED' : r1Status === 'COMPLETED' ? 'ACTIVE' : 'LOCKED';
  const isR2Qualified = r2Eval?.decision === 'QUALIFIED' || teamData.status === 'QUALIFIED' || teamData.current_round >= 3;
  const r3Status = r3Sub?.status === 'SUBMITTED' ? 'COMPLETED' : (isR2Qualified && isRound3OpenByAdmin) ? 'ACTIVE' : 'LOCKED';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

      {/* Team Header Banner */}
      <div className="glass-panel p-8 rounded-3xl border border-gold-500/30 mb-10 bg-gradient-to-r from-studio-900 via-studio-850 to-studio-900 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">

          <div>
            <div className="flex items-center space-x-3 mb-2">
              <span className="px-3 py-1 rounded-md bg-gold-500/20 text-gold-400 text-xs font-bold tracking-widest border border-gold-500/30 uppercase">
                STUDIO CODE: {teamData.team_code}
              </span>
              <span className="px-3 py-1 rounded-md bg-cyanGlow/20 text-cyanGlow text-xs font-bold tracking-widest border border-cyanGlow/30 uppercase">
                STATUS: {teamData.status}
              </span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-white">{teamData.team_name}</h1>
            <p className="text-gray-400 text-xs mt-2 flex items-center space-x-2">
              <Users className="w-4 h-4 text-gold-400" />
              <span>Studio Roster: {teamData.members.length} Members ({teamData.members.map((m) => m.member_name).join(', ')})</span>
            </p>
          </div>

          <div className="glass-panel px-6 py-4 rounded-2xl border border-studio-700 text-right">
            <span className="text-xs uppercase tracking-wider font-semibold text-gray-400 block">Current Active Round</span>
            <span className="text-2xl font-black text-gold-400">ROUND {teamData.current_round}</span>
          </div>

        </div>
      </div>

      {/* Progress Tracker Cards */}
      <h2 className="text-xs font-extrabold uppercase tracking-widest text-gold-400 mb-6">COMPETITION WORKFLOW PROGRESS</h2>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">

        {/* ROUND 1 CARD */}
        <div className={`glass-panel p-6 rounded-2xl border transition-all ${r1Status === 'COMPLETED' ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-gold-500/50 bg-gold-500/5'}`}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-gold-400">ROUND 1</span>
            {r1Status === 'COMPLETED' ? (
              <span className="flex items-center space-x-1 text-xs font-bold text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>Submitted</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1 text-xs font-bold text-gold-400">
                <Clock className="w-4 h-4" />
                <span>Active</span>
              </span>
            )}
          </div>

          <h3 className="text-lg font-bold text-white mb-1">Greenlight Forge</h3>
          <p className="text-gray-400 text-xs mb-6">Franchise Premise & Elevator Pitch</p>

          <Link
            href="/dashboard/round1"
            className="w-full py-2.5 rounded-xl bg-studio-800 hover:bg-gold-500 hover:text-studio-950 text-white font-bold text-xs border border-studio-600 flex items-center justify-center space-x-2 transition"
          >
            <span>{r1Status === 'COMPLETED' ? 'VIEW SUBMISSION' : 'ENTER ROUND 1'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* ROUND 2 CARD */}
        <div className={`glass-panel p-6 rounded-2xl border transition-all ${r2Status === 'COMPLETED' ? 'border-emerald-500/50 bg-emerald-500/5' : r2Status === 'ACTIVE' ? 'border-cyanGlow/50 bg-cyanGlow/5' : 'border-studio-800 opacity-60'}`}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-cyanGlow">ROUND 2</span>
            {r2Status === 'COMPLETED' ? (
              <span className="flex items-center space-x-1 text-xs font-bold text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>Evaluated</span>
              </span>
            ) : r2Status === 'ACTIVE' ? (
              <span className="flex items-center space-x-1 text-xs font-bold text-cyanGlow">
                <Cpu className="w-4 h-4" />
                <span>Active</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1 text-xs font-bold text-gray-500">
                <Lock className="w-4 h-4" />
                <span>Locked</span>
              </span>
            )}
          </div>

          <h3 className="text-lg font-bold text-white mb-1">Character & Visual Forge</h3>
          <p className="text-gray-400 text-xs mb-2">Hero/Villain & AI Judge</p>
          {r2Eval && (
            <p className="text-xs font-bold text-gold-400 mb-4">AI Score: {r2Eval.total_score} / 100 ({r2Eval.decision})</p>
          )}

          {r2Status !== 'LOCKED' ? (
            <Link
              href="/dashboard/round2"
              className="w-full py-2.5 rounded-xl bg-studio-800 hover:bg-cyanGlow hover:text-studio-950 text-white font-bold text-xs border border-studio-600 flex items-center justify-center space-x-2 transition mt-auto"
            >
              <span>{r2Status === 'COMPLETED' ? 'VIEW EVALUATION' : 'ENTER ROUND 2'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <div className="w-full py-2.5 rounded-xl bg-studio-900 text-gray-600 font-bold text-xs text-center border border-studio-800">
              Complete Round 1 First
            </div>
          )}
        </div>

        {/* ROUND 3 CARD */}
        <div className={`glass-panel p-6 rounded-2xl border transition-all ${r3Status === 'COMPLETED' ? 'border-emerald-500/50 bg-emerald-500/5' : r3Status === 'ACTIVE' ? 'border-violetGlow/50 bg-violetGlow/5' : 'border-studio-800 opacity-60'}`}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-violetGlow">ROUND 3</span>
            {r3Status === 'COMPLETED' ? (
              <span className="flex items-center space-x-1 text-xs font-bold text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>Submitted</span>
              </span>
            ) : r3Status === 'ACTIVE' ? (
              <span className="flex items-center space-x-1 text-xs font-bold text-violetGlow">
                <Clock className="w-4 h-4" />
                <span>Active</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1 text-xs font-bold text-gray-500">
                <Lock className="w-4 h-4" />
                <span>Locked</span>
              </span>
            )}
          </div>

          <h3 className="text-lg font-bold text-white mb-1">Marketing Forge</h3>
          <p className="text-gray-400 text-xs mb-6">Promotional Strategy & Copy</p>

          {r3Status !== 'LOCKED' ? (
            <Link
              href="/dashboard/round3"
              className="w-full py-2.5 rounded-xl bg-studio-800 hover:bg-violetGlow hover:text-studio-950 text-white font-bold text-xs border border-studio-600 flex items-center justify-center space-x-2 transition"
            >
              <span>{r3Status === 'COMPLETED' ? 'VIEW SUBMISSION' : 'ENTER ROUND 3'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <div className="w-full py-2.5 rounded-xl bg-studio-900 text-gray-400 font-bold text-xs text-center border border-studio-800 flex items-center justify-center space-x-1">
              <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>{isR2Qualified ? 'Waiting for Admin to Open Round 3' : 'Complete Round 2 First'}</span>
            </div>
          )}
        </div>

        {/* FINAL PITCH CARD */}
        <div className="glass-panel p-6 rounded-2xl border border-studio-800 opacity-80">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-amber-400">FINAL PITCH</span>
            <span className="flex items-center space-x-1 text-xs font-bold text-gray-500">
              <Lock className="w-4 h-4" />
              <span>Offline</span>
            </span>
          </div>

          <h3 className="text-lg font-bold text-white mb-1">Offline Pitch</h3>
          <p className="text-gray-400 text-xs mb-6">Live Presentation before Judges</p>

          <div className="w-full py-2.5 rounded-xl bg-studio-900 text-gray-500 font-bold text-xs text-center border border-studio-800">
            Top 5 Qualified
          </div>
        </div>

      </div>

    </div>
  );
}
