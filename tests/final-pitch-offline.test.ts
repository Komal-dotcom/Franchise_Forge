import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

let mockCookieStore = new Map<string, string>();

vi.mock('next/headers', () => ({
  cookies: () => ({
    get: (name: string) => {
      const val = mockCookieStore.get(name);
      return val ? { name, value: val } : undefined;
    },
    set: (name: string, val: string) => mockCookieStore.set(name, val),
  }),
}));

import { createTeamToken, createAdminToken, TEAM_SESSION_COOKIE, ADMIN_SESSION_COOKIE } from '../src/lib/auth';
import {
  commitImportedTeams,
  getTeamByCode,
  updateRoundSettings,
  getRoundSettings,
  upsertRound1Submission,
  upsertRound2Submission,
  upsertRound3Submission,
  updateTeamAndMembers,
  getTeamDossier,
  getTeamsWithFullInspection,
  addFinalScore,
  getFinalScoresForTeam,
} from '../src/lib/db-service';
import { parseCSV, processAndValidateCSV } from '../src/lib/csv-importer';
import { inMemoryDB } from '../src/lib/supabase';

const sampleCSV = `team_name,member_name,email,phone_number,semester,section
Team Cyber,Alice,alice@cyber.com,9876543210,5,A
Team Cyber,Bob,bob@cyber.com,9876543211,5,A
Team Neon,Charlie,charlie@neon.com,9876543220,3,B
Team Neon,David,david@neon.com,9876543221,3,B`;

describe('PHASE 5: OFFLINE FINAL PITCH & TOP 5 REALIGNMENT SUITE', () => {
  let teamCyberId: string;
  let teamNeonId: string;
  let adminToken: string;

  beforeEach(async () => {
    mockCookieStore.clear();

    inMemoryDB.teams.clear();
    inMemoryDB.teamMembers.clear();
    inMemoryDB.round1Submissions.clear();
    inMemoryDB.round2Submissions.clear();
    inMemoryDB.aiEvaluations.clear();
    inMemoryDB.round3Submissions.clear();
    inMemoryDB.finalScores.clear();

    const parsed = parseCSV(sampleCSV);
    const summary = await processAndValidateCSV(parsed.data);
    await commitImportedTeams(summary);

    const cyber = await getTeamByCode('Team Cyber');
    const neon = await getTeamByCode('Team Neon');

    teamCyberId = cyber!.id;
    teamNeonId = neon!.id;

    adminToken = await createAdminToken('admin');
    mockCookieStore.set(ADMIN_SESSION_COOKIE, adminToken);
  });

  it('1. TOP 5 IDENTIFICATION & LOCKING: Admins can lock Top 5 state in lifecycle settings', async () => {
    const settingsBefore = await getRoundSettings();
    expect(settingsBefore.top5_locked).toBe(false);

    await updateRoundSettings({ top5_locked: true });
    const settingsAfter = await getRoundSettings();
    expect(settingsAfter.top5_locked).toBe(true);
  });

  it('2. FINALIST DOSSIER ACCESS: Admins can retrieve complete team dossier for Top 5 finalists', async () => {
    // Qualify team & populate Round 1, 2, 3 submissions
    await updateTeamAndMembers(teamCyberId, { status: 'QUALIFIED', current_round: 3 });
    await upsertRound1Submission({ team_id: teamCyberId, status: 'SUBMITTED', franchise_name: 'Cyber Pitch Franchise' });
    await upsertRound2Submission({ team_id: teamCyberId, status: 'EVALUATED' });
    await upsertRound3Submission({
      team_id: teamCyberId,
      marketing_angle: 'Sci-Fi Action Franchise',
      tagline: 'The Future is Now',
      status: 'SUBMITTED',
    });

    const dossier = await getTeamDossier(teamCyberId);
    expect(dossier).not.toBeNull();
    expect(dossier?.team.status).toBe('QUALIFIED');
    expect(dossier?.round1?.franchise_name).toBe('Cyber Pitch Franchise');
    expect(dossier?.round3?.tagline).toBe('The Future is Now');
  });

  it('3. PRESERVED FINAL SCORES STORAGE: Offline judge score recording works cleanly', async () => {
    // Add offline scores given by judges during offline final pitch
    const score1 = await addFinalScore(teamCyberId, 'judge-1', 92, 'Excellent pitch presentation', 'Judge Alpha');
    const score2 = await addFinalScore(teamCyberId, 'judge-2', 88, 'Strong team Q&A', 'Judge Beta');

    expect(score1.score).toBe(92);
    expect(score2.score).toBe(88);

    const scores = await getFinalScoresForTeam(teamCyberId);
    expect(scores).toHaveLength(2);
    expect(scores[0].judge_name).toBe('Judge Alpha');
    expect(scores[1].judge_name).toBe('Judge Beta');

    const dossier = await getTeamDossier(teamCyberId);
    expect(dossier?.finalScores).toHaveLength(2);
  });

  it('4. FULL INSPECTION OVERVIEW: Admin overview includes finalist inspection metrics', async () => {
    await updateTeamAndMembers(teamCyberId, { status: 'QUALIFIED', current_round: 3 });
    await addFinalScore(teamCyberId, 'judge-1', 95, 'Winner choice');

    const overview = await getTeamsWithFullInspection();
    const cyberOverview = overview.find((t) => t.team.id === teamCyberId);

    expect(cyberOverview).toBeDefined();
    expect(cyberOverview?.finalScoreAverage).toBe(95);
  });
});
