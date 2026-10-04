import { NextRequest, NextResponse } from 'next/server';
import { getCurrentTeamSession, getIsAdminSession } from '@/lib/auth';
import { getPresignedDownloadUrl, isValidS3Path } from '@/lib/s3';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const s3Path = url.searchParams.get('path');
    const redirect = url.searchParams.get('redirect') === 'true';

    if (!s3Path) {
      return NextResponse.json({ error: 'path query parameter is required.' }, { status: 400 });
    }

    if (!isValidS3Path(s3Path)) {
      return NextResponse.json({ error: 'Invalid S3 path parameter.' }, { status: 400 });
    }

    const teamSession = await getCurrentTeamSession();
    const isAdmin = await getIsAdminSession();

    if (!teamSession && !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized. Authentication required to access private assets.' }, { status: 401 });
    }

    // Team authorization check: team members can only access assets starting with submissions/{team_id}/
    if (!isAdmin && teamSession) {
      const allowedPrefix = `submissions/${teamSession.team_id}/`;
      if (!s3Path.startsWith(allowedPrefix)) {
        return NextResponse.json({ error: 'Access denied. You do not have permission to view this private asset.' }, { status: 403 });
      }
    }

    const result = await getPresignedDownloadUrl(s3Path, 3600);

    if (redirect) {
      return NextResponse.redirect(result.downloadUrl, { status: 307 });
    }

    return NextResponse.json({
      success: true,
      download_url: result.downloadUrl,
      s3_path: result.s3Path,
      is_mock: result.isMock,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to generate download URL' }, { status: 500 });
  }
}
