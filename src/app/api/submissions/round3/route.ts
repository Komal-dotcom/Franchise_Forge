import { NextRequest, NextResponse } from 'next/server';
import { getCurrentTeamSession, getIsAdminSession } from '@/lib/auth';
import { getRound3Submission, upsertRound3Submission, getRoundSettings, getRound3AIEvaluationBySubmissionId } from '@/lib/db-service';

export async function GET(req: NextRequest) {
  const teamSession = await getCurrentTeamSession();
  const isAdmin = await getIsAdminSession();

  const url = new URL(req.url);
  const targetTeamId = url.searchParams.get('team_id') || teamSession?.team_id;

  if (!targetTeamId) {
    return NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
  }

  if (!isAdmin && teamSession?.team_id !== targetTeamId) {
    return NextResponse.json({ error: 'Access denied. You cannot view another team’s submission.' }, { status: 403 });
  }

  const submission = await getRound3Submission(targetTeamId);
  let evaluation = null;
  if (submission) {
    evaluation = await getRound3AIEvaluationBySubmissionId(submission.id);
  }

  return NextResponse.json({ success: true, submission, evaluation });
}

export async function POST(req: NextRequest) {
  const teamSession = await getCurrentTeamSession();
  if (!teamSession) {
    return NextResponse.json({ error: 'Unauthorized. Team session required.' }, { status: 401 });
  }

  const roundSettings = await getRoundSettings();
  if (roundSettings.round3 !== 'OPEN') {
    return NextResponse.json({ error: 'Round 3 is currently locked by competition organizers.' }, { status: 403 });
  }

  const body = await req.json();

  const existing = await getRound3Submission(teamSession.team_id);
  if (existing && existing.status === 'EVALUATED') {
    return NextResponse.json({ error: 'Round 3 submission is already evaluated and locked.' }, { status: 422 });
  }

  const result = await upsertRound3Submission({
    ...body,
    team_id: teamSession.team_id,
  });

  let evaluation = null;
  if (result) {
    evaluation = await getRound3AIEvaluationBySubmissionId(result.id);
  }

  return NextResponse.json({ success: true, submission: result, evaluation });
}
