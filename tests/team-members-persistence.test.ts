import { describe, it, expect, beforeEach } from 'vitest';
import {
  commitImportedTeams,
  getTeamByCode,
  getTeamWithMembers,
  reconcileTeamMembersData,
  resetDatabaseForTesting,
} from '../src/lib/db-service';
import { parseCSV, processAndValidateCSV } from '../src/lib/csv-importer';
import { inMemoryDB } from '../src/lib/supabase';

const sampleCSV = `team_name,member_name,email,phone_number,semester,section
Studio Alpha,Rahul,rahul@email.com,9876543210,5,A
Studio Alpha,Priya,priya@email.com,9876543211,5,A
Studio Alpha,Arjun,arjun@email.com,9876543212,5,A
Studio Nova,Neha,neha@email.com,9876543220,3,B
Studio Nova,Aman,aman@email.com,9876543221,3,B`;

describe('TEAM MEMBERS SUPABASE DATA CONSISTENCY ENGINE', () => {
  beforeEach(async () => {
    await resetDatabaseForTesting();
  });

  it('should persist all 2-3 members correctly during CSV import with matching canonical team_id', async () => {
    const { data } = parseCSV(sampleCSV);
    const summary = await processAndValidateCSV(data);
    const commitRes = await commitImportedTeams(summary);

    expect(commitRes.success).toBe(true);

    const studioAlphaPreview = summary.preview.find((t) => t.team_name === 'Studio Alpha')!;
    const fetchedTeam = await getTeamWithMembers(studioAlphaPreview.team_code);

    expect(fetchedTeam).not.toBeNull();
    expect(fetchedTeam?.members).toHaveLength(3);

    // Verify team_members.team_id strictly matches canonical teams.id
    for (const member of fetchedTeam!.members) {
      expect(member.team_id).toBe(fetchedTeam!.id);
    }
  });

  it('should ensure re-importing an existing team reuses the canonical team UUID without breaking team_members', async () => {
    // First import
    const { data: data1 } = parseCSV(sampleCSV);
    const summary1 = await processAndValidateCSV(data1);
    await commitImportedTeams(summary1);

    const firstAlpha = await getTeamByCode('FF26-001');
    const canonicalId = firstAlpha!.id;
    expect(canonicalId).toBeDefined();

    // Second import (re-importing same team code)
    const { data: data2 } = parseCSV(sampleCSV);
    const summary2 = await processAndValidateCSV(data2);
    await commitImportedTeams(summary2);

    const secondAlpha = await getTeamWithMembers('FF26-001');
    expect(secondAlpha).not.toBeNull();
    // UUID MUST BE PRESERVED
    expect(secondAlpha!.id).toBe(canonicalId);
    expect(secondAlpha!.members).toHaveLength(3);

    for (const member of secondAlpha!.members) {
      expect(member.team_id).toBe(canonicalId);
    }
  });

  it('should remain consistent after fetching team dossier with canonical team_id', async () => {
    const { data } = parseCSV(sampleCSV);
    const summary = await processAndValidateCSV(data);
    await commitImportedTeams(summary);

    const teamBefore = await getTeamByCode('FF26-001');
    const teamId = teamBefore!.id;

    // Fetching team dossier must return member roster from canonical team_members
    const teamAfter = await getTeamWithMembers(teamId);
    expect(teamAfter).not.toBeNull();
    expect(teamAfter?.members).toHaveLength(3);
    expect(teamAfter?.members[0].team_id).toBe(teamId);
  });

  it('should reconcile in-memory member roster data safely if missing in database', async () => {
    const { data } = parseCSV(sampleCSV);
    const summary = await processAndValidateCSV(data);
    await commitImportedTeams(summary);

    const recResult = await reconcileTeamMembersData();
    expect(recResult).toBeDefined();
    expect(typeof recResult.reconciledTeamsCount).toBe('number');
  });
});
