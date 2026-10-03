import { NextRequest, NextResponse } from 'next/server';
import { getCurrentTeamSession, getIsAdminSession } from '@/lib/auth';
import { getAIEvaluationBySubmissionId, getRound2Submission, upsertRound2Submission } from '@/lib/db-service';

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

  const submission = await getRound2Submission(targetTeamId);
  let aiEvaluation = null;

  if (submission) {
    aiEvaluation = await getAIEvaluationBySubmissionId(submission.id);
  }

  return NextResponse.json({ success: true, submission, evaluation: aiEvaluation });
}

export async function POST(req: NextRequest) {
  const teamSession = await getCurrentTeamSession();
  if (!teamSession) {
    return NextResponse.json({ error: 'Unauthorized. Team session required.' }, { status: 401 });
  }

  const body = await req.json();

  const existing = await getRound2Submission(teamSession.team_id);
  if (existing && existing.status === 'EVALUATED') {
    return NextResponse.json({ error: 'Round 2 submission has been evaluated by the AI Judge and is locked.' }, { status: 422 });
  }

  const result = await upsertRound2Submission({
    ...body,
    team_id: teamSession.team_id,
  });

  let aiEvaluation = null;
  if (result.status === 'EVALUATED' || result.status === 'SUBMITTED') {
    aiEvaluation = await getAIEvaluationBySubmissionId(result.id);
  }

  return NextResponse.json({ success: true, submission: result, evaluation: aiEvaluation });
}
