import { NextRequest, NextResponse } from 'next/server';
import { getIsAdminSession } from '@/lib/auth';
import { getCompetitionLifecycle, updateRoundLifecycle, getRoundSettings } from '@/lib/db-service';

export async function GET(req: NextRequest) {
  try {
    const lifecycle = await getCompetitionLifecycle();
    const settings = await getRoundSettings();
    return NextResponse.json({ success: true, lifecycle, settings });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch round settings' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const isAdmin = await getIsAdminSession();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized. Admin authorization required.' }, { status: 403 });
    }

    const body = await req.json();
    const { updates, reason } = body;

    const updatedLifecycle = await updateRoundLifecycle(updates || body, 'SUPER_ADMIN', reason || 'Admin control action');
    const settings = await getRoundSettings();

    return NextResponse.json({ success: true, lifecycle: updatedLifecycle, settings });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update round settings' }, { status: 500 });
  }
}
