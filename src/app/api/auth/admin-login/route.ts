import { NextRequest, NextResponse } from 'next/server';
import { createAdminToken, ADMIN_SESSION_COOKIE } from '@/lib/auth';
import { logAuditEvent } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const { admin_pin } = await req.json();
    const expectedPin = process.env.ADMIN_SECRET_PIN || 'studio2026admin';

    if (!admin_pin || admin_pin !== expectedPin) {
      return NextResponse.json({ error: 'Invalid Admin Security Key.' }, { status: 401 });
    }

    const token = await createAdminToken();

    await logAuditEvent({
      actor: 'ADMIN',
      action: 'ADMIN_LOGIN_SUCCESS',
      entity: 'ADMIN_SESSION',
      entity_id: 'SESSION',
    });

    const response = NextResponse.json({ success: true, role: 'ADMIN' });

    response.cookies.set(ADMIN_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 86400,
      path: '/',
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
