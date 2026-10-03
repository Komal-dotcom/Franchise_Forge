import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getIsAdminSession } from '@/lib/auth';
import { getAuditLogs } from '@/lib/db-service';
import { Activity, ArrowLeft } from 'lucide-react';

export default async function AdminAuditLogPage() {
  const isAdmin = await getIsAdminSession();
  if (!isAdmin) {
    redirect('/login');
  }

  const logs = await getAuditLogs(150);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link href="/admin" className="text-xs text-gray-400 hover:text-cyanGlow flex items-center space-x-1 mb-2">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Admin Center</span>
          </Link>
          <h1 className="text-3xl font-black text-white flex items-center space-x-3">
            <Activity className="w-7 h-7 text-cyanGlow" />
            <span>SYSTEM AUDIT TRAIL LOGS</span>
          </h1>
        </div>

        <span className="px-3 py-1.5 rounded-lg bg-studio-800 text-cyanGlow font-bold text-xs border border-studio-700">
          {logs.length} Total Events Logged
        </span>
      </div>

      {/* Audit Log Table */}
      <div className="glass-panel p-8 rounded-2xl border border-studio-700">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-studio-900 text-gray-400 uppercase tracking-wider font-bold">
              <tr>
                <th className="p-3">Timestamp</th>
                <th className="p-3">Actor</th>
                <th className="p-3">Action</th>
                <th className="p-3">Target Entity</th>
                <th className="p-3">Entity ID</th>
                <th className="p-3">Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-studio-800">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-studio-850">
                  <td className="p-3 font-mono text-gray-400">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="p-3 font-bold text-gold-400">{log.actor}</td>
                  <td className="p-3 font-bold text-white">{log.action}</td>
                  <td className="p-3 font-mono text-cyanGlow">{log.entity}</td>
                  <td className="p-3 font-mono text-gray-400">{log.entity_id}</td>
                  <td className="p-3 font-mono text-[11px] text-gray-400">
                    {log.metadata ? JSON.stringify(log.metadata) : '{}'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
