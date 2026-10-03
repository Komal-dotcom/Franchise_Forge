import { redirect } from 'next/navigation';
import { getIsAdminSession } from '@/lib/auth';
import { getAuditLogs } from '@/lib/db-service';
import AdminHeaderNav from '@/components/AdminHeaderNav';
import { Activity } from 'lucide-react';

export default async function AdminAuditLogPage() {
  const isAdmin = await getIsAdminSession();
  if (!isAdmin) redirect('/login');

  const logs = await getAuditLogs(150);

  return (
    <div className="min-h-screen bg-studio-950 text-white">
      <AdminHeaderNav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <span className="px-3 py-1 rounded-md bg-cyanGlow/20 text-cyanGlow text-xs font-bold uppercase tracking-wider">
              SYSTEM SECURITY & OVERRIDE LOG
            </span>
            <h1 className="text-3xl font-black text-white mt-1">SYSTEM AUDIT TRAIL LOGS</h1>
          </div>

          <span className="px-3 py-1.5 rounded-lg bg-studio-900 border border-studio-800 text-cyanGlow font-bold text-xs">
            {logs.length} Total Events Logged
          </span>
        </div>

        <div className="glass-panel p-6 rounded-2xl border border-studio-800 space-y-4">
          <div className="overflow-x-auto rounded-xl border border-studio-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-studio-900 text-gray-400 uppercase tracking-wider font-bold text-[10px]">
                <tr>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Actor</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Target Entity</th>
                  <th className="p-3">Entity ID</th>
                  <th className="p-3">Reason / Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-studio-800">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-studio-850">
                    <td className="p-3 font-mono text-gray-400">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="p-3 font-bold text-amber-400">{log.actor}</td>
                    <td className="p-3 font-bold text-white">{log.action}</td>
                    <td className="p-3 font-mono text-cyanGlow">{log.entity}</td>
                    <td className="p-3 font-mono text-gray-400">{log.entity_id}</td>
                    <td className="p-3 font-mono text-[11px] text-gray-400">
                      {log.reason ? `Reason: "${log.reason}" ` : ''}
                      {log.metadata ? JSON.stringify(log.metadata) : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
