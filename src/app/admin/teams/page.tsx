'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminHeaderNav from '@/components/AdminHeaderNav';
import { Users, ArrowLeft, Edit3, Trash2, Mail, Phone, Search, Save, X, AlertTriangle, CheckCircle2, RefreshCw, Key, Eye, EyeOff, RotateCcw } from 'lucide-react';
import { TeamWithMembers, TeamMember } from '@/types';
import ResetTeamModal from '@/components/ResetTeamModal';

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<TeamWithMembers[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Access code visibility toggle map per team id
  const [visibleCodes, setVisibleCodes] = useState<Record<string, boolean>>({});
  const [showEditCode, setShowEditCode] = useState(false);

  // Reset Modal State
  const [resettingTeam, setResettingTeam] = useState<TeamWithMembers | null>(null);


  const toggleCodeVisibility = (teamId: string) => {
    setVisibleCodes((prev) => ({ ...prev, [teamId]: !prev[teamId] }));
  };

  // Edit Modal State
  const [editingTeam, setEditingTeam] = useState<TeamWithMembers | null>(null);
  const [editTeamName, setEditTeamName] = useState('');
  const [editAccessCode, setEditAccessCode] = useState('');
  const [editStatus, setEditStatus] = useState<'ACTIVE' | 'QUALIFIED' | 'DISQUALIFIED' | 'ELIMINATED'>('ACTIVE');
  const [editMembers, setEditMembers] = useState<TeamMember[]>([]);
  const [saving, setSaving] = useState(false);

  // Delete Confirmation Modal State
  const [deletingTeam, setDeletingTeam] = useState<TeamWithMembers | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      const res = await fetch('/api/admin/teams');
      const data = await res.json();
      if (res.ok && data.teams) {
        setTeams(data.teams);
      } else {
        throw new Error(data.error || 'Failed to fetch teams');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (team: TeamWithMembers) => {
    setEditingTeam(team);
    setEditTeamName(team.team_name);
    setEditAccessCode(team.access_code || '');
    setEditStatus(team.status);
    setEditMembers(JSON.parse(JSON.stringify(team.members)));
    setError('');
    setSuccessMsg('');
  };

  const handleSaveEdit = async () => {
    if (!editingTeam) return;

    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/admin/teams', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team_id: editingTeam.id,
          team_updates: {
            team_name: editTeamName,
            access_code: editAccessCode,
            status: editStatus,
          },
          members_updates: editMembers,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update team');

      setSuccessMsg(`✓ Team "${editTeamName}" updated successfully!`);
      setEditingTeam(null);
      fetchTeams();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTeam = async () => {
    if (!deletingTeam) return;

    setDeleting(true);
    setError('');

    try {
      const res = await fetch(`/api/admin/teams?team_id=${deletingTeam.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete team');

      setSuccessMsg(`✓ Team "${deletingTeam.team_name}" deleted.`);
      setDeletingTeam(null);
      fetchTeams();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const filteredTeams = teams.filter((t) =>
    t.team_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.team_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.members.some((m) => m.member_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <p className="text-amber-400 font-bold text-sm">Loading Studio Team Roster...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-studio-950 text-white">
      <AdminHeaderNav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="px-3 py-1 rounded-md bg-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider">
              STUDIO TEAM ROSTER
            </span>
            <h1 className="text-3xl font-black text-white mt-1">IMPORTED STUDIO TEAM ROSTER</h1>
          </div>

          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search team or member..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 rounded-xl bg-studio-900 border border-studio-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-amber-400 w-60"
              />
            </div>

            <button
              onClick={fetchTeams}
              className="p-2.5 rounded-xl bg-studio-850 hover:bg-studio-800 text-slate-300 border border-studio-700 transition"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Teams Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredTeams.map((team) => (
            <div key={team.id} className="glass-panel p-6 rounded-2xl border border-studio-700 space-y-4 relative group">
              
              <div className="flex justify-between items-start pb-3 border-b border-studio-800">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-[10px] font-mono text-amber-400 font-bold uppercase tracking-wider">
                      {team.team_code}
                    </span>
                    {team.access_code && (
                      <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-[11px] font-bold flex items-center space-x-1">
                        <Key className="w-3 h-3 text-amber-400 shrink-0" />
                        <span>CODE: {visibleCodes[team.id] ? team.access_code : '••••••'}</span>
                        <button
                          type="button"
                          onClick={() => toggleCodeVisibility(team.id)}
                          className="ml-1 text-slate-400 hover:text-amber-400 transition"
                          title={visibleCodes[team.id] ? 'Hide Access Code' : 'Show Access Code'}
                        >
                          {visibleCodes[team.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-white">{team.team_name}</h3>
                </div>

                <div className="flex items-center space-x-2">
                  <span className={`px-2.5 py-1 rounded text-xs font-bold ${
                    team.status === 'QUALIFIED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                    team.status === 'DISQUALIFIED' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                    'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}>
                    {team.status}
                  </span>

                  <button
                    onClick={() => setResettingTeam(team)}
                    className="p-1.5 rounded-lg bg-studio-800 hover:bg-red-500 hover:text-white text-red-400 transition border border-studio-700"
                    title="Reset Team Competition Progress"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => openEditModal(team)}
                    className="p-1.5 rounded-lg bg-studio-800 hover:bg-amber-500 hover:text-studio-950 text-slate-300 transition border border-studio-700"
                    title="Edit Team Details"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => setDeletingTeam(team)}
                    className="p-1.5 rounded-lg bg-studio-800 hover:bg-red-600 hover:text-white text-red-400 transition border border-studio-700"
                    title="Delete Team"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                </div>
              </div>

              {/* Roster Table */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Team Members ({team.members.length})</h4>
                <div className="space-y-2 text-xs">
                  {team.members.map((mem) => (
                    <div key={mem.id} className="p-2.5 rounded-lg bg-studio-900 border border-studio-800 flex justify-between items-center">
                      <div>
                        <strong className="text-white block">{mem.member_name}</strong>
                        <span className="text-[10px] text-slate-500">Sem {mem.semester} — Sec {mem.section}</span>
                      </div>
                      <div className="text-right text-slate-400 text-[11px]">
                        <div className="flex items-center space-x-1">
                          <Mail className="w-3 h-3 text-amber-400" />
                          <span>{mem.email}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{mem.phone_number}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          ))}
        </div>

        {/* EDIT MODAL */}
        {editingTeam && (
          <div className="fixed inset-0 z-50 bg-studio-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="glass-panel max-w-2xl w-full p-6 rounded-2xl border border-amber-500/40 max-h-[90vh] overflow-y-auto">
              
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-studio-700">
                <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                  <Edit3 className="w-5 h-5 text-amber-400" />
                  <span>EDIT TEAM DETAILS — {editingTeam.team_code}</span>
                </h3>
                <button onClick={() => setEditingTeam(null)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-bold text-slate-300 uppercase mb-1">Team Name</label>
                    <input
                      type="text"
                      value={editTeamName}
                      onChange={(e) => setEditTeamName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-studio-900 border border-studio-700 text-white text-xs focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 uppercase mb-1 flex items-center space-x-1">
                      <Key className="w-3 h-3 text-amber-400" />
                      <span>6-Digit Access Code</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showEditCode ? 'text' : 'password'}
                        maxLength={6}
                        value={editAccessCode}
                        onChange={(e) => setEditAccessCode(e.target.value)}
                        placeholder="e.g. 482910"
                        className="w-full px-3 py-2 rounded-xl bg-studio-900 border border-studio-700 text-amber-400 font-mono font-bold text-xs focus:border-amber-400 pr-8"
                      />
                      <button
                        type="button"
                        onClick={() => setShowEditCode(!showEditCode)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        title={showEditCode ? 'Hide Access Code' : 'Show Access Code'}
                      >
                        {showEditCode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 uppercase mb-1">Competition Status</label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-studio-900 border border-studio-700 text-white text-xs focus:border-amber-400"
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="QUALIFIED">QUALIFIED</option>
                      <option value="DISQUALIFIED">DISQUALIFIED</option>
                      <option value="ELIMINATED">ELIMINATED</option>
                    </select>
                  </div>
                </div>

                {/* Members Edit List */}
                <div className="space-y-3 pt-2">
                  <h4 className="font-bold text-amber-400 uppercase tracking-widest">Edit Team Members</h4>
                  {editMembers.map((mem, index) => (
                    <div key={mem.id || index} className="p-3 rounded-xl bg-studio-900 border border-studio-800 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-400 block">Member Name</label>
                          <input
                            type="text"
                            value={mem.member_name}
                            onChange={(e) => {
                              const updated = [...editMembers];
                              updated[index].member_name = e.target.value;
                              setEditMembers(updated);
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-studio-950 border border-studio-700 text-white text-xs"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-400 block">Email</label>
                          <input
                            type="email"
                            value={mem.email}
                            onChange={(e) => {
                              const updated = [...editMembers];
                              updated[index].email = e.target.value;
                              setEditMembers(updated);
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-studio-950 border border-studio-700 text-white text-xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-400 block">Phone</label>
                          <input
                            type="text"
                            value={mem.phone_number}
                            onChange={(e) => {
                              const updated = [...editMembers];
                              updated[index].phone_number = e.target.value;
                              setEditMembers(updated);
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-studio-950 border border-studio-700 text-white text-xs"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-400 block">Semester</label>
                          <input
                            type="text"
                            value={mem.semester}
                            onChange={(e) => {
                              const updated = [...editMembers];
                              updated[index].semester = e.target.value;
                              setEditMembers(updated);
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-studio-950 border border-studio-700 text-white text-xs"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-400 block">Section</label>
                          <input
                            type="text"
                            value={mem.section}
                            onChange={(e) => {
                              const updated = [...editMembers];
                              updated[index].section = e.target.value;
                              setEditMembers(updated);
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-studio-950 border border-studio-700 text-white text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

              </div>

              <div className="flex justify-end space-x-3 pt-4 mt-4 border-t border-studio-700">
                <button
                  onClick={() => setEditingTeam(null)}
                  className="px-4 py-2 rounded-xl bg-studio-800 text-slate-300 font-bold text-xs hover:bg-studio-700"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="px-6 py-2 rounded-xl bg-amber-500 text-studio-950 font-black text-xs hover:bg-amber-400 transition"
                >
                  {saving ? 'SAVING...' : 'SAVE CHANGES'}
                </button>
              </div>

            </div>
          </div>
        )}

        {/* DELETE CONFIRMATION MODAL */}
        {deletingTeam && (
          <div className="fixed inset-0 z-50 bg-studio-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="glass-panel max-w-md w-full p-6 rounded-2xl border border-red-500/40 text-center">
              <Trash2 className="w-12 h-12 text-red-400 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-white mb-2">Delete Team {deletingTeam.team_name}?</h3>
              <p className="text-slate-300 text-xs mb-6 leading-relaxed">
                Are you sure you want to delete <strong>{deletingTeam.team_name} ({deletingTeam.team_code})</strong> and all associated member rosters? This action cannot be undone.
              </p>

              <div className="flex space-x-3">
                <button
                  onClick={() => setDeletingTeam(null)}
                  className="flex-1 py-2.5 rounded-xl bg-studio-800 text-slate-300 font-bold text-xs border border-studio-700 hover:bg-studio-700"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleDeleteTeam}
                  disabled={deleting}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-black text-xs hover:bg-red-500 transition"
                >
                  {deleting ? 'DELETING...' : 'CONFIRM DELETE'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* RESET TEAM MODAL */}
        {resettingTeam && (
          <ResetTeamModal
            team={{ id: resettingTeam.id, team_code: resettingTeam.team_code, team_name: resettingTeam.team_name }}
            isOpen={!!resettingTeam}
            onClose={() => setResettingTeam(null)}
            onSuccess={(result) => {
              const scopesStr = result.scopes_reset ? result.scopes_reset.join(', ') : 'selected scopes';
              setSuccessMsg(`✓ Team reset completed successfully for "${resettingTeam.team_name}" (${scopesStr}).`);
              setResettingTeam(null);
              fetchTeams();
            }}
          />
        )}
      </main>
    </div>
  );
}


