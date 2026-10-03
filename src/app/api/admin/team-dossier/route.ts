import { NextRequest, NextResponse } from 'next/server';
import { getIsAdminSession } from '@/lib/auth';
import { getTeamDossier } from '@/lib/db-service';

export async function GET(req: NextRequest) {
  try {
    const isAdmin = await getIsAdminSession();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized. Admin authorization required.' }, { status: 403 });
    }

    const url = new URL(req.url);
    const teamId = url.searchParams.get('team_id');

    if (!teamId) {
      return NextResponse.json({ error: 'team_id query parameter is required.' }, { status: 400 });
    }

    const dossier = await getTeamDossier(teamId);
    if (!dossier) {
      return NextResponse.json({ error: 'Team dossier not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, dossier });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch team dossier' }, { status: 500 });
  }
}
