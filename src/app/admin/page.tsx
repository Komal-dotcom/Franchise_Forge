import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getIsAdminSession } from '@/lib/auth';
import { getAllTeams, getAuditLogs, getRoundSettings } from '@/lib/db-service';
import RoundControlPanel from '@/components/RoundControlPanel';
import { ShieldCheck, Upload, Users, Cpu, Trophy, Lock, FileText, Settings, Activity } from 'lucide-react';

export default async function AdminDashboardPage() {
  const isAdmin = await getIsAdminSession();
  if (!isAdmin) {
    redirect('/login');
  }

  const [teams, logs, roundSettings] = await Promise.all([
    getAllTeams(),
    getAuditLogs(10),
    getRoundSettings(),
  ]);

  const totalTeams = teams.length;
  const activeTeams = teams.filter((t) => t.status === 'ACTIVE' || t.status === 'QUALIFIED').length;
  const r1Submitted = teams.filter((t) => t.current_round >= 2).length;
  const qualifiedR2 = teams.filter((t) => t.status === 'QUALIFIED').length;
  const disqualified = teams.filter((t) => t.status === 'DISQUALIFIED').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <span className="px-3 py-1 rounded-md bg-cyanGlow/20 text-cyanGlow text-xs font-bold uppercase tracking-wider">
            ORGANIZER CONTROL CENTER
          </span>
          <h1 className="text-3xl font-black text-white mt-1">EXECUTIVE ADMIN DASHBOARD</h1>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            href="/admin/import"
            className="px-4 py-2.5 rounded-xl bg-gold-400 hover:bg-gold-300 text-studio-950 font-black text-xs transition flex items-center space-x-2 shadow-lg shadow-gold-500/20"
          >
            <Upload className="w-4 h-4 text-studio-950" />
            <span>IMPORT TEAM CSV</span>
          </Link>

          <Link
            href="/admin/ai-judge"
            className="px-4 py-2.5 rounded-xl bg-cyanGlow/20 hover:bg-cyanGlow/30 text-cyanGlow font-bold text-xs border border-cyanGlow/40 transition flex items-center space-x-2"
          >
            <Cpu className="w-4 h-4" />
            <span>AI JUDGE QUEUE</span>
          </Link>
        </div>
      </div>

      {/* METRIC CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
        <div className="glass-panel p-5 rounded-2xl border border-studio-700">
          <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Total Imported Teams</span>
          <span className="text-3xl font-black text-white">{totalTeams}</span>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-studio-700">
          <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Active Competing</span>
          <span className="text-3xl font-black text-emerald-400">{activeTeams}</span>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-studio-700">
          <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Round 1 Cleared</span>
          <span className="text-3xl font-black text-gold-400">{r1Submitted}</span>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-studio-700">
          <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">R2 Qualified</span>
          <span className="text-3xl font-black text-cyanGlow">{qualifiedR2}</span>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-studio-700">
          <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Disqualified / Flagged</span>
          <span className="text-3xl font-black text-crimsonGlow">{disqualified}</span>
        </div>
      </div>

      {/* ROUND UNLOCK CONTROL PANEL */}
      <RoundControlPanel initialSettings={roundSettings} />

      {/* ADMIN NAVIGATION GRID */}
      <h2 className="text-xs font-extrabold uppercase tracking-widest text-gold-400 mb-4">ADMIN MANAGEMENT MODULES</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        
        <Link href="/admin/import" className="glass-panel p-6 rounded-2xl border border-studio-700 hover:border-gold-400 transition group">
          <Upload className="w-8 h-8 text-gold-400 mb-4 group-hover:scale-110 transition-transform" />
          <h3 className="text-lg font-bold text-white mb-1">CSV Importer</h3>
          <p className="text-gray-400 text-xs">Import teams, group 3-4 members, generate codes & export credentials.</p>
        </Link>

        <Link href="/admin/teams" className="glass-panel p-6 rounded-2xl border border-studio-700 hover:border-cyanGlow transition group">
          <Users className="w-8 h-8 text-cyanGlow mb-4 group-hover:scale-110 transition-transform" />
          <h3 className="text-lg font-bold text-white mb-1">Team Roster</h3>
          <p className="text-gray-400 text-xs">Manage studio teams, view member details, reset access codes.</p>
        </Link>

        <Link href="/admin/ai-judge" className="glass-panel p-6 rounded-2xl border border-studio-700 hover:border-violetGlow transition group">
          <Cpu className="w-8 h-8 text-violetGlow mb-4 group-hover:scale-110 transition-transform" />
          <h3 className="text-lg font-bold text-white mb-1">AI Judge Queue</h3>
          <p className="text-gray-400 text-xs">Monitor AI evaluations, review flagged images, perform manual overrides.</p>
        </Link>

        <Link href="/admin/final-pitch" className="glass-panel p-6 rounded-2xl border border-studio-700 hover:border-amber-400 transition group">
          <Trophy className="w-8 h-8 text-amber-400 mb-4 group-hover:scale-110 transition-transform" />
          <h3 className="text-lg font-bold text-white mb-1">Offline Pitch Portal</h3>
          <p className="text-gray-400 text-xs">Human judges scoring board for Top 5 offline pitches.</p>
        </Link>

      </div>

      {/* RECENT AUDIT LOGS */}
      <div className="glass-panel p-6 rounded-2xl border border-studio-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <Activity className="w-4 h-4 text-cyanGlow" />
            <span>Recent System Audit Activity</span>
          </h3>
          <Link href="/admin/audit-log" className="text-xs text-gold-400 hover:underline">View All Audit Logs</Link>
        </div>

        <div className="space-y-2 text-xs">
          {logs.map((log) => (
            <div key={log.id} className="p-3 rounded-lg bg-studio-900 border border-studio-800 flex items-center justify-between">
              <div>
                <span className="font-bold text-gold-400 mr-2">{log.actor}</span>
                <span className="text-white">{log.action}</span>
                <span className="text-gray-500 ml-2">({log.entity})</span>
              </div>
              <span className="text-gray-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
