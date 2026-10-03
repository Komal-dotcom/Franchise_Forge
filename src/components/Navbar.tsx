'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Film, Calendar, LogIn, Lock, ShieldCheck, X, AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isLinkActive = (path: string) => pathname === path;

  const handleOpenAdminModal = (e: React.MouseEvent) => {
    e.preventDefault();
    setAdminPin('');
    setError('');
    setIsAdminModalOpen(true);
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
      if (!res.ok) throw new Error(data.error || 'Invalid Admin Security Key.');

      setIsAdminModalOpen(false);
      setAdminPin('');
      router.push('/admin');
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 glass-panel border-b border-amber-500/20 bg-studio-950/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Brand / Logo */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 p-0.5 shadow-md group-hover:border-amber-400 transition">
              <div className="w-full h-full bg-studio-950 rounded-[10px] flex items-center justify-center">
                <Film className="w-5 h-5 text-amber-400" />
              </div>
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-wider text-white">
                FRANCHISE FORGE
              </span>
              <span className="block text-[10px] font-semibold tracking-widest text-amber-400 uppercase">
                The Studio Challenge
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link
              href="/"
              className={`text-sm font-medium transition-colors hover:text-amber-400 ${
                isLinkActive('/') ? 'text-amber-400 border-b-2 border-amber-400 pb-1' : 'text-slate-300'
              }`}
            >
              Overview
            </Link>
            <Link
              href="/rules"
              className={`text-sm font-medium transition-colors hover:text-amber-400 ${
                isLinkActive('/rules') ? 'text-amber-400 border-b-2 border-amber-400 pb-1' : 'text-slate-300'
              }`}
            >
              Rules & Safety
            </Link>
            <Link
              href="/event"
              className={`text-sm font-medium transition-colors hover:text-amber-400 flex items-center space-x-1 ${
                isLinkActive('/event') ? 'text-amber-400 border-b-2 border-amber-400 pb-1' : 'text-slate-300'
              }`}
            >
              <Calendar className="w-4 h-4 text-amber-400" />
              <span>Event Agenda</span>
            </Link>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center space-x-4">
            <Link
              href="/login"
              className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-studio-850 hover:bg-studio-800 text-sm font-medium text-slate-200 border border-studio-700 hover:border-amber-500/40 transition shadow-sm"
            >
              <LogIn className="w-4 h-4 text-amber-400" />
              <span>Team Login</span>
            </Link>

            <button
              onClick={handleOpenAdminModal}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-studio-950 text-sm font-black transition shadow-md shadow-amber-500/20 cursor-pointer"
            >
              <Lock className="w-4 h-4 text-studio-950" />
              <span>Admin Center</span>
            </button>
          </div>

        </div>
      </header>

      {/* ADMIN PASSWORD PROMPT MODAL */}
      {isAdminModalOpen && (
        <div className="fixed inset-0 z-[100] bg-studio-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="glass-panel max-w-md w-full p-6 sm:p-8 rounded-2xl border border-amber-500/30 shadow-2xl relative">
            
            {/* Close Button */}
            <button
              onClick={() => setIsAdminModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-studio-800 transition"
              aria-label="Close Admin Modal"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 p-0.5 mx-auto mb-3 flex items-center justify-center">
                <Lock className="w-6 h-6 text-amber-400" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold uppercase tracking-widest">
                RESTRICTED ACCESS
              </span>
              <h2 className="text-xl font-black text-white mt-2">ADMIN CENTER AUTHORIZATION</h2>
              <p className="text-gray-400 text-xs mt-1">
                Enter your Admin Security PIN to access the Organizer Control Center.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-5 p-3.5 rounded-xl bg-crimsonGlow/10 border border-crimsonGlow/30 text-crimsonGlow text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Password Form */}
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-2">
                  Admin Security Password / PIN
                </label>
                <div className="relative">
                  <input
                    type={showPin ? 'text' : 'password'}
                    placeholder="Enter Admin PIN"
                    value={adminPin}
                    onChange={(e) => setAdminPin(e.target.value)}
                    autoFocus
                    className="w-full px-4 py-3 rounded-xl bg-studio-900 border border-studio-700 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-amber-400 transition pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition"
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdminModalOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-studio-850 hover:bg-studio-800 text-gray-300 font-bold text-xs border border-studio-700 transition"
                >
                  CANCEL
                </button>

                <button
                  type="submit"
                  disabled={loading || !adminPin}
                  className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-studio-950 font-black text-xs transition shadow-lg shadow-amber-500/20 flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {loading ? (
                    <span>VERIFYING...</span>
                  ) : (
                    <>
                      <span>VERIFY & ENTER</span>
                      <ShieldCheck className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </>
  );
}

