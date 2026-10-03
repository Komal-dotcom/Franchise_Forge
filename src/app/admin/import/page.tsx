'use client';

import { useState } from 'react';
import Link from 'next/link';
import AdminHeaderNav from '@/components/AdminHeaderNav';
import { Upload, CheckCircle2, AlertTriangle, FileText, ArrowLeft, Download, RefreshCw, XCircle } from 'lucide-react';
import { ImportSummary } from '@/types';

export default function AdminCSVImportPage() {
  const [csvText, setCsvText] = useState('');
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState('');
  const [commitSuccess, setCommitSuccess] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvText(content);
      handleParsePreview(content);
    };
    reader.readAsText(file);
  };

  const handleParsePreview = async (contentToParse = csvText) => {
    setError('');
    setCommitSuccess('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv_content: contentToParse, action: 'PREVIEW' }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to parse CSV');

      setSummary(data.summary);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!summary || summary.has_errors) return;

    setError('');
    setCommitting(true);

    try {
      const res = await fetch('/api/admin/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv_content: csvText, action: 'COMMIT', summary }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to commit import');

      setCommitSuccess(`✓ SUCCESSFULLY IMPORTED ${data.count} TEAMS AND CREATED ACCESS CODES!`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCommitting(false);
    }
  };

  const exportAccessCodesCSV = () => {
    if (!summary) return;
    let csvStr = 'Team Code,Team Name,Access Code,Members Count\n';
    summary.preview.forEach((item) => {
      csvStr += `"${item.team_code}","${item.team_name}","${item.access_code}",${item.members.length}\n`;
    });

    const blob = new Blob([csvStr], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'franchise_forge_team_access_codes.csv';
    a.click();
  };

  return (
    <div className="min-h-screen bg-studio-950 text-white">
      <AdminHeaderNav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 space-y-6">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          <div>
            <span className="px-3 py-1 rounded-md bg-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider">
              REGISTRATION REGISTRY IMPORTER
            </span>
            <h1 className="text-3xl font-black text-white mt-1">ADMIN CSV TEAM IMPORTER</h1>
          </div>

          {summary && !summary.has_errors && (
            <button
              onClick={exportAccessCodesCSV}
              className="px-4 py-2.5 rounded-xl bg-studio-800 hover:bg-studio-700 text-amber-400 font-bold text-xs border border-amber-500/30 transition flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>EXPORT TEAM ACCESS CODES</span>
            </button>
          )}
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2">
            <XCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {commitSuccess && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{commitSuccess}</span>
          </div>
        )}

        {/* CSV File Upload / Paste Box */}
        <div className="glass-panel p-8 rounded-2xl border border-studio-800">
          <h2 className="text-sm font-bold text-amber-400 uppercase tracking-widest mb-4">1. Select or Paste CSV Registration File</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-2">Upload CSV File</label>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="w-full px-4 py-3 rounded-xl bg-studio-900 border border-studio-700 text-gray-300 text-xs file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-amber-500 file:text-studio-950 hover:file:bg-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 mb-2">Required CSV Format Headers</label>
              <code className="block p-3 rounded-xl bg-studio-950 border border-studio-800 text-cyanGlow text-[11px] font-mono leading-relaxed">
                team_name,member_name,email,phone_number,semester,section
              </code>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-xs font-bold text-gray-300 mb-2">Raw CSV Text Content</label>
            <textarea
              rows={5}
              placeholder="Paste CSV text here..."
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-studio-900 border border-studio-700 text-white font-mono text-xs focus:border-amber-400"
            />
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={() => handleParsePreview()}
              disabled={loading || !csvText}
              className="px-6 py-2.5 rounded-xl bg-studio-800 hover:bg-studio-700 text-white font-bold text-xs border border-studio-600 flex items-center space-x-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>PARSE & PREVIEW CSV</span>
            </button>
          </div>
        </div>

        {/* CSV PREVIEW & VALIDATION SUMMARY TABLE */}
        {summary && (
          <div className="glass-panel p-8 rounded-2xl border border-studio-800 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-studio-800">
              <div>
                <h2 className="text-xl font-bold text-white">2. Import Validation Summary</h2>
                <p className="text-gray-400 text-xs mt-1">Review team groupings, member counts (3-4), and error flags before committing to DB.</p>
              </div>

              <div className="flex items-center space-x-3">
                <span className="px-3 py-1.5 rounded-lg bg-studio-900 text-white text-xs font-bold border border-studio-800">
                  {summary.valid_teams_count} Teams Detected
                </span>
                <span className="px-3 py-1.5 rounded-lg bg-studio-900 text-cyanGlow text-xs font-bold border border-studio-800">
                  {summary.valid_members_count} Members Detected
                </span>

                {summary.has_errors ? (
                  <span className="px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-400 text-xs font-bold border border-rose-500/30">
                    ERRORS FOUND
                  </span>
                ) : (
                  <button
                    onClick={handleConfirmImport}
                    disabled={committing}
                    className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-studio-950 font-black text-xs transition shadow-lg shadow-amber-500/20"
                  >
                    {committing ? 'COMMITTING TO DATABASE...' : 'CONFIRM & COMMIT IMPORT'}
                  </button>
                )}
              </div>
            </div>

            {/* Teams Table */}
            <div className="overflow-x-auto rounded-xl border border-studio-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-studio-900 text-gray-400 uppercase tracking-wider font-bold text-[10px]">
                  <tr>
                    <th className="p-3">Team Code</th>
                    <th className="p-3">Team Name</th>
                    <th className="p-3">Generated Access Code</th>
                    <th className="p-3">Members Count</th>
                    <th className="p-3">Roster Detail</th>
                    <th className="p-3">Validation Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-studio-800">
                  {summary.preview.map((item, idx) => (
                    <tr key={idx} className={item.errors.length > 0 ? 'bg-rose-500/10' : 'hover:bg-studio-850'}>
                      <td className="p-3 font-mono font-bold text-amber-400">{item.team_code}</td>
                      <td className="p-3 font-bold text-white">{item.team_name}</td>
                      <td className="p-3 font-mono text-cyanGlow font-bold">{item.access_code}</td>
                      <td className="p-3 font-bold">{item.members.length} Members</td>
                      <td className="p-3 text-gray-300">
                        {item.members.map((m) => `${m.member_name} (${m.section})`).join(', ')}
                      </td>
                      <td className="p-3">
                        {item.errors.length > 0 ? (
                          <div className="text-rose-400 font-bold">
                            {item.errors.map((e, i) => <div key={i}>• {e}</div>)}
                          </div>
                        ) : (
                          <span className="text-emerald-400 font-bold flex items-center space-x-1">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>VALIDATED</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
