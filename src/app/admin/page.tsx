import { redirect } from 'next/navigation';
import { getIsAdminSession } from '@/lib/auth';
import { getCompetitionLifecycle, getTeamsWithFullInspection } from '@/lib/db-service';
import AdminHeaderNav from '@/components/AdminHeaderNav';
import AdminControlCenterClient from '@/components/AdminControlCenterClient';
import { ShieldCheck, UploadCloud, Cpu, Award } from 'lucide-react';
import Link from 'next/link';

export default async function AdminDashboardPage() {
  const isAdmin = await getIsAdminSession();
  if (!isAdmin) {
    redirect('/login');
  }

  const [lifecycle, teamsData] = await Promise.all([
    getCompetitionLifecycle(),
    getTeamsWithFullInspection(),
  ]);

  return (
    <div className="min-h-screen bg-studio-950 text-white">
      <AdminHeaderNav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {/* Header Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <span className="px-3 py-1 rounded-md bg-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider">
              AUTHORITATIVE COMMAND CENTER
            </span>
            <h1 className="text-3xl font-black text-white mt-1">FRANCHISE FORGE &mdash; ADMIN CONTROL CENTER</h1>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/admin/import"
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-studio-950 font-black text-xs transition flex items-center space-x-2 shadow-lg shadow-amber-500/20"
            >
              <UploadCloud className="w-4 h-4 text-studio-950" />
              <span>IMPORT TEAM CSV</span>
            </Link>

            <Link
              href="/admin/ai-judge"
              className="px-4 py-2.5 rounded-xl bg-cyanGlow/20 hover:bg-cyanGlow/30 text-cyanGlow font-bold text-xs border border-cyanGlow/40 transition flex items-center space-x-2"
            >
              <Cpu className="w-4 h-4" />
              <span>R2 AI QUEUE</span>
            </Link>
          </div>
        </div>

        {/* Client Dashboard Component */}
        <AdminControlCenterClient initialLifecycle={lifecycle} teamsData={teamsData} />
      </main>
    </div>
  );
}
