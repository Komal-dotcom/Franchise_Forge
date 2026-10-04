import { NextRequest, NextResponse } from 'next/server';
import { getCurrentTeamSession, getIsAdminSession } from '@/lib/auth';
import { getRound3Submission, upsertRound3Submission, getRoundSettings, getRound3ManualScoresForSubmission, getTeamWithMembers, getRound2Submission, getAIEvaluationBySubmissionId } from '@/lib/db-service';
import { Round3ManualScore } from '@/types';

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
  let manualScores: Round3ManualScore[] = [];
  if (submission) {
    manualScores = await getRound3ManualScoresForSubmission(submission.id);
  }

  return NextResponse.json({ success: true, submission, manualScores });
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

  const team = await getTeamWithMembers(teamSession.team_id);
  if (!team) {
    return NextResponse.json({ error: 'Team not found or session invalid.' }, { status: 404 });
  }

  if (team.status === 'DISQUALIFIED' || team.status === 'ELIMINATED') {
    return NextResponse.json({ error: 'Your team is disqualified from the competition.' }, { status: 403 });
  }

  // Verify Round 2 qualification status
  const r2Sub = await getRound2Submission(teamSession.team_id);
  const r2Eval = r2Sub ? await getAIEvaluationBySubmissionId(r2Sub.id) : null;

  if (r2Eval?.safety_status === 'REVIEW_REQUIRED' || r2Eval?.decision === 'REVIEW_REQUIRED') {
    return NextResponse.json({ error: 'Your Round 2 submission is pending organizer safety review. Round 3 access is not granted.' }, { status: 403 });
  }

  if (r2Eval?.safety_status === 'FAIL' || r2Eval?.decision === 'DISQUALIFIED') {
    return NextResponse.json({ error: 'Your team did not qualify for Round 3 due to Round 2 evaluation decision.' }, { status: 403 });
  }

  if (team.status !== 'QUALIFIED' && team.current_round < 3 && r2Eval?.decision !== 'QUALIFIED') {
    return NextResponse.json({ error: 'Round 3 submission requires qualification from Round 2.' }, { status: 403 });
  }

  const body = await req.json();

  const existing = await getRound3Submission(teamSession.team_id);
  if (existing && (existing.status === 'SUBMITTED' || existing.status === 'EVALUATED' || existing.status === 'LOCKED')) {
    return NextResponse.json({ error: 'Round 3 submission is already submitted and locked.' }, { status: 422 });
  }

  const result = await upsertRound3Submission({
    ...body,
    team_id: teamSession.team_id,
  });

  return NextResponse.json({ success: true, submission: result });
}

