import { NextResponse } from 'next/server';
import { TEAM_SESSION_COOKIE, ADMIN_SESSION_COOKIE } from '@/lib/auth';

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(TEAM_SESSION_COOKIE);
  response.cookies.delete(ADMIN_SESSION_COOKIE);
  return response;
}
