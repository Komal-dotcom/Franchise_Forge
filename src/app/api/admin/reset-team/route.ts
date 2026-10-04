import { NextRequest, NextResponse } from 'next/server';
import { getIsAdminSession } from '@/lib/auth';
import { getTeamWithMembers, resetTeamProgress } from '@/lib/db-service';
import { TeamResetScope } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const isAdmin = await getIsAdminSession();
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin authorization required.' },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { team_id, scopes, confirmation_team_code, reason } = body;

    if (!team_id || typeof team_id !== 'string' || !team_id.trim()) {
      return NextResponse.json(
        { error: 'team_id is required.' },
        { status: 400 }
      );
    }

    if (!scopes || !Array.isArray(scopes) || scopes.length === 0) {
      return NextResponse.json(
        { error: 'At least one reset scope must be selected.' },
        { status: 400 }
      );
    }

    const team = await getTeamWithMembers(team_id);
    if (!team) {
      return NextResponse.json(
        { error: `Team with ID "${team_id}" not found.` },
        { status: 404 }
      );
    }

    const isResetAll =
      scopes.includes('all') ||
      scopes.includes('reset_all' as any) ||
      (scopes.includes('round1') &&
        scopes.includes('round2') &&
        scopes.includes('round3') &&
        scopes.includes('final_pitch') &&
        scopes.includes('ai_evaluations') &&
        scopes.includes('assets'));

    if (isResetAll) {
      const cleanConfirmation = (confirmation_team_code || '').trim().toUpperCase();
      const expectedCode = team.team_code.trim().toUpperCase();

      if (!cleanConfirmation || cleanConfirmation !== expectedCode) {
        return NextResponse.json(
          {
            error: `Confirmation failed. Typing the team's Team Code ("${team.team_code}") is required to confirm Reset All.`,
          },
          { status: 400 }
        );
      }
    }

    const result = await resetTeamProgress(
      team_id,
      scopes as TeamResetScope[],
      reason,
      'ADMIN'
    );

    return NextResponse.json({
      success: true,
      message: 'Team reset completed successfully.',
      result,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to reset team progress.' },
      { status: 500 }
    );
  }
}
