import { NextRequest, NextResponse } from 'next/server';
import { getCurrentTeamSession } from '@/lib/auth';
import { buildS3Path, getPresignedUploadUrl, S3AssetCategory, validateUploadFile } from '@/lib/s3';
import { getRoundSettings, getTeamWithMembers, getRound1Submission, getRound2Submission, getRound3Submission, getAIEvaluationBySubmissionId } from '@/lib/db-service';

export async function POST(req: NextRequest) {
  try {
    const teamSession = await getCurrentTeamSession();
    if (!teamSession) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { filename, file_type, file_size, category } = await req.json();

    if (!filename || !file_type || !category) {
      return NextResponse.json({ error: 'filename, file_type, and category are required.' }, { status: 400 });
    }

    const validation = validateUploadFile({ name: filename, type: file_type, size: file_size || 1024 });
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const allowedCategories: S3AssetCategory[] = ['round1', 'round2/hero', 'round2/villain', 'round2/supporting', 'round3'];
    if (!allowedCategories.includes(category as S3AssetCategory)) {
      return NextResponse.json({ error: 'Invalid S3 upload category.' }, { status: 400 });
    }

    const team = await getTeamWithMembers(teamSession.team_id);
    if (!team) {
      return NextResponse.json({ error: 'Team not found or session invalid.' }, { status: 404 });
    }

    if (team.status === 'DISQUALIFIED' || team.status === 'ELIMINATED') {
      return NextResponse.json({ error: 'Your team is disqualified from the competition.' }, { status: 403 });
    }

    const roundSettings = await getRoundSettings();

    // Category-specific round eligibility & submission status checks
    if (category === 'round1') {
      if (roundSettings.round1 !== 'OPEN') {
        return NextResponse.json({ error: 'Round 1 is currently locked by competition organizers.' }, { status: 403 });
      }
      const r1Sub = await getRound1Submission(teamSession.team_id);
      if (r1Sub && (r1Sub.status === 'SUBMITTED' || r1Sub.status === 'LOCKED')) {
        return NextResponse.json({ error: 'Round 1 submission is already submitted and locked.' }, { status: 422 });
      }
    } else if (category.startsWith('round2/')) {
      if (roundSettings.round2 !== 'OPEN') {
        return NextResponse.json({ error: 'Round 2 is currently locked by competition organizers.' }, { status: 403 });
      }
      const r1Sub = await getRound1Submission(teamSession.team_id);
      if ((!r1Sub || r1Sub.status !== 'SUBMITTED') && team.current_round < 2) {
        return NextResponse.json({ error: 'Round 2 uploads require completing Round 1 Greenlight Forge first.' }, { status: 403 });
      }
      const r2Sub = await getRound2Submission(teamSession.team_id);
      if (r2Sub && (r2Sub.status === 'EVALUATED' || r2Sub.status === 'SUBMITTED' || r2Sub.status === 'PENDING_AI' || r2Sub.status === 'LOCKED')) {
        return NextResponse.json({ error: 'Round 2 submission has been evaluated by the AI Judge and is locked.' }, { status: 422 });
      }
    } else if (category === 'round3') {
      if (roundSettings.round3 !== 'OPEN') {
        return NextResponse.json({ error: 'Round 3 is currently locked by competition organizers.' }, { status: 403 });
      }
      const r2Sub = await getRound2Submission(teamSession.team_id);
      const r2Eval = r2Sub ? await getAIEvaluationBySubmissionId(r2Sub.id) : null;

      if (r2Eval?.safety_status === 'REVIEW_REQUIRED' || r2Eval?.decision === 'REVIEW_REQUIRED') {
        return NextResponse.json({ error: 'Your Round 2 submission is pending organizer safety review. Round 3 access is not granted.' }, { status: 403 });
      }

      if (r2Eval?.safety_status === 'FAIL' || r2Eval?.decision === 'DISQUALIFIED') {
        return NextResponse.json({ error: 'Your team did not qualify for Round 3 due to Round 2 evaluation decision.' }, { status: 403 });
      }

      if (team.status !== 'QUALIFIED' && team.current_round < 3 && r2Eval?.decision !== 'QUALIFIED') {
        return NextResponse.json({ error: 'Round 3 uploads require qualification from Round 2.' }, { status: 403 });
      }

      const r3Sub = await getRound3Submission(teamSession.team_id);
      if (r3Sub && (r3Sub.status === 'SUBMITTED' || r3Sub.status === 'EVALUATED' || r3Sub.status === 'LOCKED')) {
        return NextResponse.json({ error: 'Round 3 submission is already submitted and locked.' }, { status: 422 });
      }
    }

    const s3Key = buildS3Path(teamSession.team_id, category as S3AssetCategory, filename);
    const presigned = await getPresignedUploadUrl(s3Key, file_type);

    return NextResponse.json({
      success: true,
      upload_url: presigned.uploadUrl,
      s3_path: s3Key,
      is_mock: presigned.isMock,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Upload initialization error' }, { status: 500 });
  }
}

