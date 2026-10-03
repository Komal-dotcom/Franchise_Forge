import { NextRequest, NextResponse } from 'next/server';
import { getIsAdminSession } from '@/lib/auth';
import { getAllTeams, updateTeamAndMembers, deleteTeam } from '@/lib/db-service';

export async function GET() {
  try {
    const isAdmin = await getIsAdminSession();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const teams = await getAllTeams();
    return NextResponse.json({ success: true, teams });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch teams' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const isAdmin = await getIsAdminSession();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { team_id, team_updates, members_updates } = await req.json();

    if (!team_id) {
      return NextResponse.json({ error: 'team_id is required' }, { status: 400 });
    }

    const updated = await updateTeamAndMembers(team_id, team_updates || {}, members_updates);
    return NextResponse.json({ success: true, team: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update team' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const isAdmin = await getIsAdminSession();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const url = new URL(req.url);
    const teamId = url.searchParams.get('team_id');

    if (!teamId) {
      return NextResponse.json({ error: 'team_id parameter is required' }, { status: 400 });
    }

    await deleteTeam(teamId);
    return NextResponse.json({ success: true, deleted_team_id: teamId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete team' }, { status: 500 });
  }
}
