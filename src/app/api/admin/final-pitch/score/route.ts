import { NextRequest, NextResponse } from 'next/server';
import { getIsAdminSession } from '@/lib/auth';
import { addFinalScore, getFinalScoresForTeam } from '@/lib/db-service';

export async function POST(req: NextRequest) {
  try {
    const isAdmin = await getIsAdminSession();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized. Admin authorization required.' }, { status: 403 });
    }

    const { team_id, judge_id, score, comments } = await req.json();

    if (!team_id || !judge_id || score === undefined) {
      return NextResponse.json({ error: 'team_id, judge_id, and score are required.' }, { status: 400 });
    }

    const numericScore = Number(score);
    if (isNaN(numericScore) || numericScore < 0 || numericScore > 100) {
      return NextResponse.json({ error: 'Score must be a number between 0 and 100.' }, { status: 400 });
    }

    const newScore = await addFinalScore(team_id, judge_id, numericScore, comments);
    const allScores = await getFinalScoresForTeam(team_id);

    return NextResponse.json({ success: true, score: newScore, all_scores: allScores });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
