import { NextRequest, NextResponse } from 'next/server';
import { getCurrentTeamSession, getIsAdminSession } from '@/lib/auth';
import { getRound1Submission, upsertRound1Submission, getRoundSettings } from '@/lib/db-service';

export async function GET(req: NextRequest) {
  const teamSession = await getCurrentTeamSession();
  const isAdmin = await getIsAdminSession();

  const url = new URL(req.url);
  const targetTeamId = url.searchParams.get('team_id') || teamSession?.team_id;

  if (!targetTeamId) {
    return NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
  }

  // Team authorization scope check
  if (!isAdmin && teamSession?.team_id !== targetTeamId) {
    return NextResponse.json({ error: 'Access denied. You cannot view another team’s submission.' }, { status: 403 });
  }

  const submission = await getRound1Submission(targetTeamId);
  return NextResponse.json({ success: true, submission });
}

import { validateRound1Submission } from '@/lib/ai/validator';

export async function POST(req: NextRequest) {
  const teamSession = await getCurrentTeamSession();
  if (!teamSession) {
    return NextResponse.json({ error: 'Unauthorized. Team session required.' }, { status: 401 });
  }

  const roundSettings = await getRoundSettings();
  if (roundSettings.round1 === 'CLOSED') {
    return NextResponse.json({ error: 'Round 1 is currently locked by competition organizers.' }, { status: 403 });
  }

  const body = await req.json();

  // Check if existing submission is locked
  const existing = await getRound1Submission(teamSession.team_id);
  if (existing && existing.status === 'SUBMITTED') {
    return NextResponse.json({ error: 'Round 1 submission is already submitted and locked.' }, { status: 422 });
  }

  // Pre-submission meaningful content validation
  if (body.status === 'SUBMITTED') {
    const validation = validateRound1Submission(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.reason, validation }, { status: 400 });
    }
  }

  const result = await upsertRound1Submission({
    ...body,
    team_id: teamSession.team_id,
  });

  return NextResponse.json({ success: true, submission: result });
}
