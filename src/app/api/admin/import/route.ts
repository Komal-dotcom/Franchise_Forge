import { NextRequest, NextResponse } from 'next/server';
import { getIsAdminSession } from '@/lib/auth';
import { parseCSV, processAndValidateCSV } from '@/lib/csv-importer';
import { commitImportedTeams } from '@/lib/db-service';

export async function POST(req: NextRequest) {
  try {
    const isAdmin = await getIsAdminSession();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized. Admin authorization required.' }, { status: 403 });
    }

    const body = await req.json();
    const { csv_content, action, summary: clientSummary } = body;

    if (!csv_content && !clientSummary) {
      return NextResponse.json({ error: 'No CSV content or summary provided.' }, { status: 400 });
    }

    let summaryToCommit = clientSummary;

    if (!summaryToCommit) {
      const { data: rawRows, errors: parseErrors } = parseCSV(csv_content);

      if (parseErrors.length > 0) {
        return NextResponse.json({ error: 'CSV Parsing Errors', details: parseErrors }, { status: 400 });
      }

      summaryToCommit = await processAndValidateCSV(rawRows);
    }

    if (action === 'COMMIT') {
      if (summaryToCommit.has_errors) {
        return NextResponse.json({ error: 'Cannot commit CSV import with validation errors.', summary: summaryToCommit }, { status: 422 });
      }

      const commitResult = await commitImportedTeams(summaryToCommit);
      return NextResponse.json({ success: true, count: commitResult.count, summary: summaryToCommit });
    }

    // Default action: PREVIEW
    return NextResponse.json({ success: true, summary: summaryToCommit });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error during CSV processing' }, { status: 500 });
  }
}
