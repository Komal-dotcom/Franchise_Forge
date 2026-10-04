import { NextRequest, NextResponse } from 'next/server';

export async function PUT(req: NextRequest) {
  return NextResponse.json({ success: true, message: 'Mock S3 object upload completed successfully.' });
}

export async function POST(req: NextRequest) {
  return NextResponse.json({ success: true, message: 'Mock S3 object upload completed successfully.' });
}
