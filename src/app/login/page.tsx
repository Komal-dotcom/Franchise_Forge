'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Film, Lock, ShieldCheck, KeyRound, ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'TEAM' | 'ADMIN'>('TEAM');

  // Team Form State
  const [teamCode, setTeamCode] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [showAccessCode, setShowAccessCode] = useState(false);

  // Admin Form State
  const [adminPin, setAdminPin] = useState('');
  const [showAdminPin, setShowAdminPin] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTeamLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/team-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_code: teamCode, access_code: accessCode }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_pin: adminPin }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Admin login failed');

      router.push('/admin');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        
        {/* Card Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-gold-500 to-cyanGlow p-0.5 mx-auto mb-4 shadow-lg shadow-gold-500/20">
            <div className="w-full h-full bg-studio-950 rounded-[14px] flex items-center justify-center">
              <Film className="w-7 h-7 text-gold-400" />
            </div>
          </div>
          <h1 className="text-2xl font-black text-white tracking-wider">FRANCHISE FORGE</h1>
          <p className="text-gray-400 text-xs mt-1 uppercase tracking-widest text-cyanGlow font-semibold">
            Studio Competition Portal
          </p>
        </div>

        {/* Tab Selector */}
        <div className="glass-panel p-1 rounded-xl mb-6 flex border border-studio-700">
          <button
            onClick={() => { setActiveTab('TEAM'); setError(''); }}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-2 ${
              activeTab === 'TEAM'
                ? 'bg-studio-800 text-gold-400 border border-gold-500/30 shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>TEAM ACCESS</span>
          </button>
          <button
            onClick={() => { setActiveTab('ADMIN'); setError(''); }}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-2 ${
              activeTab === 'ADMIN'
                ? 'bg-studio-800 text-cyanGlow border border-cyanGlow/30 shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>ADMIN CENTER</span>
          </button>
        </div>

        {/* Form Container */}
        <div className="glass-panel p-8 rounded-2xl border border-studio-700 shadow-2xl">
          
          {error && (
            <div className="mb-6 p-3 rounded-lg bg-crimsonGlow/10 border border-crimsonGlow/30 text-crimsonGlow text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {activeTab === 'TEAM' ? (
            <form onSubmit={handleTeamLogin} className="space-y-5" autoComplete="off">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-2">
                  Team Code
                </label>
                <input
                  type="text"
                  name="team_code_input"
                  id="team_code_input"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  placeholder="e.g. FF26-001"
                  value={teamCode}
                  onChange={(e) => setTeamCode(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-studio-900 border border-studio-700 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-gold-400 transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-2">
                  Access Code
                </label>
                <div className="relative">
                  <input
                    type={showAccessCode ? 'text' : 'password'}
                    name="team_access_code_input"
                    id="team_access_code_input"
                    autoComplete="new-password"
                    placeholder="6-Character Access Code"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-studio-900 border border-studio-700 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-gold-400 transition pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowAccessCode(!showAccessCode)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition"
                    title={showAccessCode ? 'Hide Access Code' : 'Show Access Code'}
                  >
                    {showAccessCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <p className="text-[11px] text-gray-400 leading-relaxed">
                * Team credentials are provided by organizers after CSV import.
              </p>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-gold-500 to-amber-600 hover:from-gold-400 hover:to-amber-500 text-studio-950 font-black text-sm transition shadow-lg shadow-gold-500/20 flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <span>AUTHENTICATING...</span>
                ) : (
                  <>
                    <span>LOG IN TO STUDIO</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleAdminLogin} className="space-y-5" autoComplete="off">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-2">
                  Admin Security PIN
                </label>
                <div className="relative">
                  <input
                    type={showAdminPin ? 'text' : 'password'}
                    name="admin_pin_input"
                    id="admin_pin_input"
                    autoComplete="new-password"
                    placeholder="Enter Admin PIN"
                    value={adminPin}
                    onChange={(e) => setAdminPin(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-studio-900 border border-studio-700 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-cyanGlow transition pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPin(!showAdminPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition"
                    title={showAdminPin ? 'Hide Admin PIN' : 'Show Admin PIN'}
                  >
                    {showAdminPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <p className="text-[11px] text-gray-400 leading-relaxed">
                * Admin authorization grants control over CSV import, AI safety overrides, and Top 5 locking.
              </p>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyanGlow/80 to-blue-600 hover:from-cyanGlow hover:to-blue-500 text-studio-950 font-black text-sm transition shadow-lg shadow-cyanGlow/20 flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <span>VERIFYING ADMIN...</span>
                ) : (
                  <>
                    <span>ENTER ADMIN CONTROL CENTER</span>
                    <ShieldCheck className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

        </div>

      </div>
    </div>
  );
}

