import { NextRequest, NextResponse } from 'next/server';
import { seedDemoData } from '@/lib/seed';

export async function GET(req: NextRequest) {
  try {
    const result = await seedDemoData();
    return NextResponse.json({
      success: true,
      message: 'Demo test users and complete Round 1, Round 2, and Round 3 submission data seeded successfully!',
      teams: [
        { code: 'FF26-001', access_code: '3LEDAW', name: 'Cyberpunk Nexus' },
        { code: 'FF26-002', access_code: '8K9P2M', name: 'Shadow Forge Studios' },
      ],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Seeding error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
