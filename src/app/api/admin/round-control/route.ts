import { NextRequest, NextResponse } from 'next/server';
import { getIsAdminSession } from '@/lib/auth';
import { getRoundSettings, updateRoundSettings } from '@/lib/db-service';

export async function GET(req: NextRequest) {
  try {
    const settings = await getRoundSettings();
    return NextResponse.json({ success: true, settings });
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
    const updatedSettings = await updateRoundSettings(body);

    return NextResponse.json({ success: true, settings: updatedSettings });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update round settings' }, { status: 500 });
  }
}
