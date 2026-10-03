import { NextRequest, NextResponse } from 'next/server';
import { createTeamToken, verifyAccessCode, TEAM_SESSION_COOKIE } from '@/lib/auth';
import { getTeamByCode } from '@/lib/db-service';
import { logAuditEvent } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const { team_code, access_code } = await req.json();
    const cleanTeamCode = String(team_code || '').trim().toUpperCase();
    const cleanAccessCode = String(access_code || '').trim();

    if (!cleanTeamCode || !cleanAccessCode) {
      return NextResponse.json({ error: 'Team Code and Access Code are required.' }, { status: 400 });
    }

    const team = await getTeamByCode(cleanTeamCode);
    if (!team) {
      return NextResponse.json({ error: 'Invalid Team Code or Access Code.' }, { status: 401 });
    }

    const isValidAccessCode = await verifyAccessCode(cleanAccessCode, team.access_code_hash, team.access_code);
    if (!isValidAccessCode) {
      return NextResponse.json({ error: 'Invalid Team Code or Access Code.' }, { status: 401 });
    }

    // Generate JWT token
    const token = await createTeamToken(team);

    await logAuditEvent({
      actor: `TEAM:${team.team_code}`,
      action: 'TEAM_LOGIN_SUCCESS',
      entity: 'TEAM',
      entity_id: team.id,
    });

    const response = NextResponse.json({
      success: true,
      team: {
        id: team.id,
        team_code: team.team_code,
        team_name: team.team_name,
        current_round: team.current_round,
        status: team.status,
      },
    });

    // Set secure HTTP-only cookie
    response.cookies.set(TEAM_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 86400, // 24 hours
      path: '/',
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal authentication error' }, { status: 500 });
  }
}
