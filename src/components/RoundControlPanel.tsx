'use client';

import { useState, useEffect } from 'react';
import { Lock, Unlock, CheckCircle2, AlertCircle, RefreshCw, Sparkles, ShieldAlert } from 'lucide-react';
import { RoundSettings } from '@/lib/db-service';

export default function RoundControlPanel({ initialSettings }: { initialSettings?: RoundSettings }) {
  const [settings, setSettings] = useState<RoundSettings>(
    initialSettings || { round1: 'OPEN', round2: 'OPEN', round3: 'CLOSED', top5_locked: false }
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/round-control');
      const data = await res.json();
      if (res.ok && data.settings) {
        setSettings(data.settings);
      }
    } catch (err) {
      // Ignore initial fetch error
    }
  };

  const handleToggleRound = async (roundKey: 'round1' | 'round2' | 'round3', newStatus: 'OPEN' | 'CLOSED') => {
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/admin/round-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [roundKey]: newStatus }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update round status');

      setSettings(data.settings);
      const roundLabel = roundKey.toUpperCase();
      setSuccessMsg(
        newStatus === 'OPEN'
          ? `✓ ${roundLabel} IS NOW UNLOCKED & OPEN FOR TEAMS!`
          : `✓ ${roundLabel} HAS BEEN LOCKED.`
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-studio-700 mb-10 bg-studio-900/60">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-studio-700">
        <div>
          <span className="text-[10px] font-bold text-violetGlow uppercase tracking-widest block mb-1">
            COMPETITION WORKFLOW CONTROL
          </span>
          <h2 className="text-xl font-black text-white flex items-center space-x-2">
            <Lock className="w-5 h-5 text-gold-400" />
            <span>COMPETITION ROUND ACCESS & UNLOCK CONTROLS</span>
          </h2>
          <p className="text-gray-400 text-xs mt-1">
            Lock or unlock competition rounds for participating studio teams.
          </p>
        </div>

        <button
          onClick={fetchSettings}
          className="p-2 rounded-xl bg-studio-800 hover:bg-studio-700 text-gray-300 border border-studio-700 transition self-start md:self-auto"
          title="Refresh Round Status"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="mb-6 p-3.5 rounded-xl bg-crimsonGlow/10 border border-crimsonGlow/30 text-crimsonGlow text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="mb-6 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Rounds Control Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* ROUND 1 CONTROL — ADMIN TOGGLE */}
        <div className={`p-5 rounded-xl border flex flex-col justify-between space-y-4 transition-all ${
          settings.round1 === 'CLOSED'
            ? 'bg-studio-950/90 border-crimsonGlow/30'
            : 'bg-emerald-500/10 border-emerald-500/40 shadow-lg shadow-emerald-500/5'
        }`}>
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-gold-400 uppercase">ROUND 1 — GREENLIGHT</span>
              {settings.round1 === 'CLOSED' ? (
                <span className="px-2.5 py-0.5 rounded bg-crimsonGlow/20 text-crimsonGlow text-[10px] font-bold border border-crimsonGlow/40 flex items-center space-x-1">
                  <Lock className="w-3 h-3" />
                  <span>LOCKED / CLOSED</span>
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/40 flex items-center space-x-1">
                  <Unlock className="w-3 h-3" />
                  <span>OPEN / UNLOCKED</span>
                </span>
              )}
            </div>
            <p className="text-gray-300 text-[11px] leading-relaxed">
              {settings.round1 === 'CLOSED'
                ? 'Round 1 is LOCKED. Teams cannot edit or submit elevator pitch until opened.'
                : 'Round 1 is UNLOCKED. Teams can enter franchise premise and pitch details.'}
            </p>
          </div>

          <div>
            {settings.round1 === 'CLOSED' ? (
              <button
                onClick={() => handleToggleRound('round1', 'OPEN')}
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-studio-950 font-black text-xs transition shadow-lg shadow-emerald-500/20 flex items-center justify-center space-x-2"
              >
                <Unlock className="w-4 h-4 text-studio-950" />
                <span>{loading ? 'OPENING...' : 'OPEN ROUND 1 FOR TEAMS'}</span>
              </button>
            ) : (
              <button
                onClick={() => handleToggleRound('round1', 'CLOSED')}
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-crimsonGlow hover:bg-red-600 text-white font-black text-xs transition flex items-center justify-center space-x-2"
              >
                <Lock className="w-4 h-4" />
                <span>{loading ? 'LOCKING...' : 'LOCK ROUND 1'}</span>
              </button>
            )}
          </div>
        </div>

        {/* ROUND 2 CONTROL — ADMIN TOGGLE */}
        <div className={`p-5 rounded-xl border flex flex-col justify-between space-y-4 transition-all ${
          settings.round2 === 'CLOSED'
            ? 'bg-studio-950/90 border-crimsonGlow/30'
            : 'bg-emerald-500/10 border-emerald-500/40 shadow-lg shadow-emerald-500/5'
        }`}>
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-cyanGlow uppercase">ROUND 2 — CHARACTER</span>
              {settings.round2 === 'CLOSED' ? (
                <span className="px-2.5 py-0.5 rounded bg-crimsonGlow/20 text-crimsonGlow text-[10px] font-bold border border-crimsonGlow/40 flex items-center space-x-1">
                  <Lock className="w-3 h-3" />
                  <span>LOCKED / CLOSED</span>
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/40 flex items-center space-x-1">
                  <Unlock className="w-3 h-3" />
                  <span>OPEN / UNLOCKED</span>
                </span>
              )}
            </div>
            <p className="text-gray-300 text-[11px] leading-relaxed">
              {settings.round2 === 'CLOSED'
                ? 'Round 2 is LOCKED. Teams cannot submit character forge profiles.'
                : 'Round 2 is UNLOCKED. Teams can forge Hero/Villain profiles and trigger AI judging.'}
            </p>
          </div>

          <div>
            {settings.round2 === 'CLOSED' ? (
              <button
                onClick={() => handleToggleRound('round2', 'OPEN')}
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-studio-950 font-black text-xs transition shadow-lg shadow-emerald-500/20 flex items-center justify-center space-x-2"
              >
                <Unlock className="w-4 h-4 text-studio-950" />
                <span>{loading ? 'OPENING...' : 'OPEN ROUND 2 FOR TEAMS'}</span>
              </button>
            ) : (
              <button
                onClick={() => handleToggleRound('round2', 'CLOSED')}
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-crimsonGlow hover:bg-red-600 text-white font-black text-xs transition flex items-center justify-center space-x-2"
              >
                <Lock className="w-4 h-4" />
                <span>{loading ? 'LOCKING...' : 'LOCK ROUND 2'}</span>
              </button>
            )}
          </div>
        </div>

        {/* ROUND 3 CONTROL — ADMIN TOGGLE */}
        <div className={`p-5 rounded-xl border flex flex-col justify-between space-y-4 transition-all ${
          settings.round3 === 'OPEN'
            ? 'bg-emerald-500/10 border-emerald-500/40 shadow-lg shadow-emerald-500/5'
            : 'bg-studio-950/90 border-amber-500/30'
        }`}>
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-violetGlow uppercase">ROUND 3 — MARKETING FORGE</span>
              {settings.round3 === 'OPEN' ? (
                <span className="px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/40 flex items-center space-x-1">
                  <Unlock className="w-3 h-3" />
                  <span>OPEN / UNLOCKED</span>
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded bg-crimsonGlow/20 text-crimsonGlow text-[10px] font-bold border border-crimsonGlow/40 flex items-center space-x-1">
                  <Lock className="w-3 h-3" />
                  <span>LOCKED / CLOSED</span>
                </span>
              )}
            </div>
            <p className="text-gray-300 text-[11px] leading-relaxed">
              {settings.round3 === 'OPEN'
                ? 'Round 3 is UNLOCKED. Qualified teams can enter and submit marketing strategy.'
                : 'Round 3 is LOCKED. Qualified teams cannot enter Round 3 until opened here.'}
            </p>
          </div>

          <div>
            {settings.round3 === 'OPEN' ? (
              <button
                onClick={() => handleToggleRound('round3', 'CLOSED')}
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-crimsonGlow hover:bg-red-600 text-white font-black text-xs transition flex items-center justify-center space-x-2"
              >
                <Lock className="w-4 h-4" />
                <span>{loading ? 'LOCKING...' : 'LOCK ROUND 3'}</span>
              </button>
            ) : (
              <button
                onClick={() => handleToggleRound('round3', 'OPEN')}
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-studio-950 font-black text-xs transition shadow-lg shadow-emerald-500/20 flex items-center justify-center space-x-2"
              >
                <Unlock className="w-4 h-4 text-studio-950" />
                <span>{loading ? 'OPENING...' : 'OPEN ROUND 3 FOR TEAMS'}</span>
              </button>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
