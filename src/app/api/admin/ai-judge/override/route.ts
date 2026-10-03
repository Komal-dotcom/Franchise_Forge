import { NextRequest, NextResponse } from 'next/server';
import { getIsAdminSession } from '@/lib/auth';
import { adminOverrideSafety, overrideTeamQualification, triggerAIJudgeForSubmission } from '@/lib/db-service';

export async function POST(req: NextRequest) {
  try {
    const isAdmin = await getIsAdminSession();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized. Admin session required.' }, { status: 403 });
    }

    const body = await req.json();
    const { action, submission_id, team_id, new_safety_status, new_qualification_status, reason } = body;

    if (action === 'OVERRIDE_QUALIFICATION') {
      if (!team_id || !new_qualification_status || !reason) {
        return NextResponse.json({ error: 'team_id, new_qualification_status, and reason are required.' }, { status: 400 });
      }
      const team = await overrideTeamQualification(team_id, new_qualification_status, reason);
      return NextResponse.json({ success: true, team });
    }

    if (action === 'RETRY_EVALUATION') {
      if (!submission_id) {
        return NextResponse.json({ error: 'submission_id is required.' }, { status: 400 });
      }
      const evaluation = await triggerAIJudgeForSubmission(submission_id);
      return NextResponse.json({ success: true, evaluation });
    }

    // Default safety override
    if (!submission_id || !new_safety_status || !reason) {
      return NextResponse.json({ error: 'submission_id, new_safety_status, and reason are required.' }, { status: 400 });
    }

    if (new_safety_status !== 'PASS' && new_safety_status !== 'FAIL') {
      return NextResponse.json({ error: 'new_safety_status must be PASS or FAIL.' }, { status: 400 });
    }

    const updatedEval = await adminOverrideSafety(submission_id, new_safety_status, reason);
    return NextResponse.json({ success: true, evaluation: updatedEval });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error during admin override' }, { status: 500 });
  }
}
