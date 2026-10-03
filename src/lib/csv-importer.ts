import Papa from 'papaparse';
import { CSVRow, ImportPreviewItem, ImportSummary } from '@/types';
import { generateAccessCode, hashAccessCode } from './auth';

const REQUIRED_HEADERS = ['team_name', 'member_name', 'email', 'phone_number', 'semester', 'section'];

/**
 * Parses raw CSV string or file content into raw rows
 */
export function parseCSV(csvContent: string): { data: CSVRow[]; errors: string[] } {
  const parseResult = Papa.parse<CSVRow>(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim().toLowerCase(),
  });

  const errors: string[] = [];

  if (parseResult.errors.length > 0) {
    parseResult.errors.forEach((e) => errors.push(`CSV Line ${e.row ?? 'Header'}: ${e.message}`));
  }

  // Validate required header columns
  const actualHeaders = parseResult.meta.fields || [];
  const missingHeaders = REQUIRED_HEADERS.filter((h) => !actualHeaders.includes(h));

  if (missingHeaders.length > 0) {
    errors.push(`Missing required CSV column headers: ${missingHeaders.join(', ')}`);
  }

  return {
    data: parseResult.data,
    errors,
  };
}

/**
 * Processes parsed CSV rows into grouped teams, validates team sizes (2-3 members),
 * checks for duplicates, and generates Team Codes and Access Codes.
 */
export async function processAndValidateCSV(rows: CSVRow[]): Promise<ImportSummary> {
  const teamMap = new Map<string, CSVRow[]>();
  const emailSet = new Set<string>();
  const phoneSet = new Set<string>();
  const globalErrors: string[] = [];

  // 1. Group rows by team_name
  rows.forEach((row, index) => {
    const rowNum = index + 2; // Accounting for 1-based index + header row
    const teamName = (row.team_name || '').trim();

    if (!teamName) {
      globalErrors.push(`Row ${rowNum}: Missing team_name`);
      return;
    }

    if (!teamMap.has(teamName)) {
      teamMap.set(teamName, []);
    }
    teamMap.get(teamName)!.push(row);
  });

  const previewItems: ImportPreviewItem[] = [];
  let validTeamsCount = 0;
  let validMembersCount = 0;
  let errorRowsCount = 0;
  let teamCounter = 1;

  // 2. Validate each grouped team
  for (const [teamName, members] of teamMap.entries()) {
    const teamErrors: string[] = [];

    // Check team size constraint (Must be EXACTLY 2 to 3 members)
    if (members.length < 2) {
      teamErrors.push(`Team "${teamName}" has only ${members.length} member. Minimum required is 2 members.`);
    } else if (members.length > 3) {
      teamErrors.push(`Team "${teamName}" has ${members.length} members. Maximum allowed is 3 members.`);
    }

    const validatedMembers = [];

    for (const member of members) {
      const memberName = (member.member_name || '').trim();
      const email = (member.email || '').trim().toLowerCase();
      const phone = (member.phone_number || '').trim();
      const semester = (member.semester || '').trim();
      const section = (member.section || '').trim();

      if (!memberName) teamErrors.push(`Missing member_name in team "${teamName}"`);
      if (!email) teamErrors.push(`Missing email for member "${memberName || 'Unknown'}"`);
      if (!phone) teamErrors.push(`Missing phone_number for member "${memberName || 'Unknown'}"`);
      if (!semester) teamErrors.push(`Missing semester for member "${memberName || 'Unknown'}"`);
      if (!section) teamErrors.push(`Missing section for member "${memberName || 'Unknown'}"`);

      // Duplicate email check across dataset
      if (email) {
        if (emailSet.has(email)) {
          teamErrors.push(`Duplicate email found across CSV: ${email}`);
        } else {
          emailSet.add(email);
        }
      }

      // Duplicate phone number check across dataset
      if (phone) {
        if (phoneSet.has(phone)) {
          teamErrors.push(`Duplicate phone number found across CSV: ${phone}`);
        } else {
          phoneSet.add(phone);
        }
      }

      validatedMembers.push({
        member_name: memberName,
        email,
        phone_number: phone,
        semester,
        section,
      });
    }

    const formattedTeamCode = `FF26-${String(teamCounter).padStart(3, '0')}`;
    const rawAccessCode = generateAccessCode();

    if (teamErrors.length === 0) {
      validTeamsCount++;
      validMembersCount += members.length;
    } else {
      errorRowsCount += members.length;
    }

    previewItems.push({
      team_name: teamName,
      team_code: formattedTeamCode,
      access_code: rawAccessCode,
      members: validatedMembers,
      errors: teamErrors,
    });

    teamCounter++;
  }

  const totalRows = rows.length;
  const hasErrors = globalErrors.length > 0 || previewItems.some((item) => item.errors.length > 0);

  return {
    total_rows: totalRows,
    valid_teams_count: validTeamsCount,
    valid_members_count: validMembersCount,
    error_rows_count: errorRowsCount,
    preview: previewItems,
    has_errors: hasErrors,
  };
}
