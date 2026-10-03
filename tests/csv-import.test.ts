import { describe, it, expect } from 'vitest';
import { parseCSV, processAndValidateCSV } from '../src/lib/csv-importer';
import { commitImportedTeams, getTeamByCode, getRoundSettings, updateRoundSettings } from '../src/lib/db-service';
import { verifyAccessCode } from '../src/lib/auth';

const validCSV = `team_name,member_name,email,phone_number,semester,section
Studio Alpha,Rahul,rahul@email.com,9876543210,5,A
Studio Alpha,Priya,priya@email.com,9876543211,5,A
Studio Alpha,Arjun,arjun@email.com,9876543212,5,A
Studio Duo,Neha,neha@email.com,9876543220,3,B
Studio Duo,Aman,aman@email.com,9876543221,3,B`;

const invalidSizeCSV = `team_name,member_name,email,phone_number,semester,section
Studio Solo,Member 1,m1@email.com,9000000001,1,A`;

describe('CSV Importer Validation Engine', () => {
  it('should parse valid CSV headers and rows accurately', () => {
    const { data, errors } = parseCSV(validCSV);
    expect(errors).toHaveLength(0);
    expect(data).toHaveLength(5);
  });

  it('should correctly group 2-member and 3-member teams', async () => {
    const { data } = parseCSV(validCSV);
    const summary = await processAndValidateCSV(data);

    expect(summary.has_errors).toBe(false);
    expect(summary.valid_teams_count).toBe(2);
    expect(summary.valid_members_count).toBe(5);

    const studioAlpha = summary.preview.find((t) => t.team_name === 'Studio Alpha');
    expect(studioAlpha?.members).toHaveLength(3);

    const studioDuo = summary.preview.find((t) => t.team_name === 'Studio Duo');
    expect(studioDuo?.members).toHaveLength(2);
  });

  it('should flag an error when team size is less than 2 members', async () => {
    const { data } = parseCSV(invalidSizeCSV);
    const summary = await processAndValidateCSV(data);

    expect(summary.has_errors).toBe(true);
    const studioSolo = summary.preview.find((t) => t.team_name === 'Studio Solo');
    expect(studioSolo?.errors.length).toBeGreaterThan(0);
    expect(studioSolo?.errors[0]).toContain('Minimum required is 2 members');
  });

  it('should authenticate seed team FF26-001 credentials', async () => {
    const fetchedTeam = await getTeamByCode('FF26-001');
    expect(fetchedTeam).not.toBeNull();
    const isValid = await verifyAccessCode(fetchedTeam!.access_code || '3LEDAW', fetchedTeam!.access_code_hash, fetchedTeam!.access_code);
    expect(isValid).toBe(true);
  });

  it('should allow team login using committed access codes', async () => {
    const { data } = parseCSV(validCSV);
    const summary = await processAndValidateCSV(data);
    const commitRes = await commitImportedTeams(summary);

    expect(commitRes.success).toBe(true);

    const studioAlphaPreview = summary.preview.find((t) => t.team_name === 'Studio Alpha')!;
    const fetchedTeam = await getTeamByCode(studioAlphaPreview.team_code);

    expect(fetchedTeam).not.toBeNull();
    const isValid = await verifyAccessCode(studioAlphaPreview.access_code, fetchedTeam!.access_code_hash, fetchedTeam!.access_code);
    expect(isValid).toBe(true);
  });

  it('should lock Round 3 by default until Admin opens Round 3', async () => {
    const initialSettings = await getRoundSettings();
    expect(initialSettings.round3).toBe('CLOSED');

    const openedSettings = await updateRoundSettings({ round3: 'OPEN' });
    expect(openedSettings.round3).toBe('OPEN');

    const currentSettings = await getRoundSettings();
    expect(currentSettings.round3).toBe('OPEN');
  });
});


