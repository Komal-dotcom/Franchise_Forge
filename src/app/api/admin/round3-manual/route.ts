import { NextRequest, NextResponse } from 'next/server';
import { getIsAdminSession } from '@/lib/auth';
import { getRound3ManualScoresForSubmission, submitRound3ManualScore } from '@/lib/db-service';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const round3SubId = url.searchParams.get('round3_submission_id');

    if (!round3SubId) {
      return NextResponse.json({ error: 'round3_submission_id is required' }, { status: 400 });
    }

    const scores = await getRound3ManualScoresForSubmission(round3SubId);
    return NextResponse.json({ success: true, scores });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch manual scores' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const isAdmin = await getIsAdminSession();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized. Admin authorization required.' }, { status: 403 });
    }

    const body = await req.json();
    const { round3_submission_id, team_id, judge_id, judge_name, scores, comments, status } = body;

    if (!round3_submission_id || !team_id || !judge_id || !scores) {
      return NextResponse.json({ error: 'Missing required scoring fields' }, { status: 400 });
    }

    const record = await submitRound3ManualScore(
      round3_submission_id,
      team_id,
      judge_id,
      judge_name || `Judge ${judge_id}`,
      scores,
      comments,
      status || 'SUBMITTED'
    );

    return NextResponse.json({ success: true, score: record });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to submit manual score' }, { status: 500 });
  }
}
