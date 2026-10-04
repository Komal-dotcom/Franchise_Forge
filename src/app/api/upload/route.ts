import { NextRequest, NextResponse } from 'next/server';
import { getCurrentTeamSession } from '@/lib/auth';
import { buildS3Path, getPresignedUploadUrl, S3AssetCategory, validateUploadFile } from '@/lib/s3';

export async function POST(req: NextRequest) {
  try {
    const teamSession = await getCurrentTeamSession();
    if (!teamSession) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { filename, file_type, file_size, category } = await req.json();

    if (!filename || !file_type || !category) {
      return NextResponse.json({ error: 'filename, file_type, and category are required.' }, { status: 400 });
    }

    const validation = validateUploadFile({ name: filename, type: file_type, size: file_size || 1024 });
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const allowedCategories: S3AssetCategory[] = ['round1', 'round2/hero', 'round2/villain', 'round2/supporting', 'round3'];
    if (!allowedCategories.includes(category as S3AssetCategory)) {
      return NextResponse.json({ error: 'Invalid S3 upload category.' }, { status: 400 });
    }

    const s3Key = buildS3Path(teamSession.team_id, category as S3AssetCategory, filename);
    const presigned = await getPresignedUploadUrl(s3Key, file_type);

    return NextResponse.json({
      success: true,
      upload_url: presigned.uploadUrl,
      s3_path: s3Key,
      is_mock: presigned.isMock,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Upload initialization error' }, { status: 500 });
  }
}
