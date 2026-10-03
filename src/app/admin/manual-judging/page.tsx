import { redirect } from 'next/navigation';
import { getIsAdminSession } from '@/lib/auth';
import { getAllTeamsWithMembers, getRound3Submission, getRound3ManualScoresForSubmission } from '@/lib/db-service';
import AdminHeaderNav from '@/components/AdminHeaderNav';
import Round3ManualJudgingClient from '@/components/Round3ManualJudgingClient';
import { Edit3 } from 'lucide-react';

export default async function ManualJudgingPage() {
  const isAdmin = await getIsAdminSession();
  if (!isAdmin) redirect('/login');

  const teams = await getAllTeamsWithMembers();
  const items = [];

  for (const team of teams) {
    const submission = await getRound3Submission(team.id);
    if (submission) {
      const scores = await getRound3ManualScoresForSubmission(submission.id);
      items.push({
        team,
        submission,
        scores,
      });
    }
  }

  return (
    <div className="min-h-screen bg-studio-950 text-white">
      <AdminHeaderNav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 space-y-6">
        <div>
          <span className="px-3 py-1 rounded-md bg-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider">
            HUMAN EVALUATION PORTAL
          </span>
          <h1 className="text-3xl font-black text-white mt-1">ROUND 3 — MANUAL MARKETING JUDGING</h1>
          <p className="text-xs text-gray-400 mt-1">
            Round 3 marketing strategies are evaluated 100% manually by human judges across 5 criteria (Strategy 25, Tagline 20, Audience 20, Copy 20, Poster 15). No AI score is generated for Round 3.
          </p>
        </div>

        <Round3ManualJudgingClient items={items} />
      </main>
    </div>
  );
}
