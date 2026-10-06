import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// 1. Mock next/headers cookie store
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
  upsertRound1Submission,
  upsertRound2Submission,
  triggerAIJudgeForSubmission,
  updateTeamAndMembers,
  getRoundSettings,
  resetDatabaseForTesting,
} from '../src/lib/db-service';
import { parseCSV, processAndValidateCSV } from '../src/lib/csv-importer';
import { inMemoryDB } from '../src/lib/supabase';

// Import route handlers
import { POST as postRound1, GET as getRound1 } from '../src/app/api/submissions/round1/route';
import { POST as postRound2, GET as getRound2 } from '../src/app/api/submissions/round2/route';
import { POST as postRound3, GET as getRound3 } from '../src/app/api/submissions/round3/route';
import { POST as postUpload } from '../src/app/api/upload/route';

const sampleCSV = `team_name,member_name,email,phone_number,semester,section
Team Cyber,Alice,alice@cyber.com,9876543210,5,A
Team Cyber,Bob,bob@cyber.com,9876543211,5,A
Team Neon,Charlie,charlie@neon.com,9876543220,3,B
Team Neon,David,david@neon.com,9876543221,3,B`;

describe('SERVER-SIDE ROUND ENFORCEMENT & SECURITY SUITE', () => {
  let teamCyberId: string;
  let teamNeonId: string;
  let cyberToken: string;
  let neonToken: string;
  let adminToken: string;

  beforeEach(async () => {
    mockCookieStore.clear();

    await resetDatabaseForTesting();

    // Reset round settings to defaults (Round 1 OPEN, Round 2 CLOSED, Round 3 CLOSED)
    await updateRoundSettings({ round1: 'OPEN', round2: 'CLOSED', round3: 'CLOSED' });

    // Seed teams
    const { data } = parseCSV(sampleCSV);
    const summary = await processAndValidateCSV(data);
    await commitImportedTeams(summary);

    const cyberPreview = summary.preview.find((t) => t.team_name === 'Team Cyber')!;
    const neonPreview = summary.preview.find((t) => t.team_name === 'Team Neon')!;

    const fetchedCyber = await getTeamByCode(cyberPreview.team_code);
    const fetchedNeon = await getTeamByCode(neonPreview.team_code);

    teamCyberId = fetchedCyber!.id;
    teamNeonId = fetchedNeon!.id;

    cyberToken = await createTeamToken(fetchedCyber!);
    neonToken = await createTeamToken(fetchedNeon!);
    adminToken = await createAdminToken();
  });

  it('1. UNAUTHORIZED ROUND ACCESS: Submitting without session returns 401', async () => {
    mockCookieStore.clear();

    const req = new NextRequest('http://localhost/api/submissions/round1', {
      method: 'POST',
      body: JSON.stringify({ franchise_name: 'Test' }),
    });

    const res = await postRound1(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain('Unauthorized');
  });

  it('2. FUTURE-ROUND ACCESS: Submitting Round 2 without Round 1 returns 403', async () => {
    mockCookieStore.set(TEAM_SESSION_COOKIE, cyberToken);
    await updateRoundSettings({ round2: 'OPEN' });

    const req = new NextRequest('http://localhost/api/submissions/round2', {
      method: 'POST',
      body: JSON.stringify({
        hero_data: { name: 'Hero' },
        villain_data: { name: 'Villain' },
      }),
    });

    const res = await postRound2(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('requires completing Round 1');
  });

  it('3. LOCKED SUBMISSION MODIFICATION: Submitting Round 1 after locks returns 422', async () => {
    mockCookieStore.set(TEAM_SESSION_COOKIE, cyberToken);

    // Submit Round 1 first
    const submitReq = new NextRequest('http://localhost/api/submissions/round1', {
      method: 'POST',
      body: JSON.stringify({
        franchise_name: 'Cyber Horizon',
        genre: 'Sci-Fi Action',
        target_audience: 'Young Adults & Sci-Fi Enthusiasts',
        core_premise: 'A futuristic city where human minds are digitized into a neural grid.',
        central_conflict: 'Rebel hackers fight rogue AI overlords controlling the virtual grid.',
        world_concept: 'Neon dystopian metropolis with high-tech towers and sprawling undercity.',
        elevator_pitch: 'An adrenaline-fueled cyber thriller where identity is the ultimate code.',
        status: 'SUBMITTED',
      }),
    });
    const subRes = await postRound1(submitReq);
    expect(subRes.status).toBe(200);

    // Attempt to overwrite locked Round 1 submission
    const duplicateReq = new NextRequest('http://localhost/api/submissions/round1', {
      method: 'POST',
      body: JSON.stringify({
        franchise_name: 'Altered Cyber Horizon',
        status: 'SUBMITTED',
      }),
    });

    const dupRes = await postRound1(duplicateReq);
    expect(dupRes.status).toBe(422);
    const body = await dupRes.json();
    expect(body.error).toContain('already submitted and locked');
  });

  it('4. QUALIFIED TEAM -> ROUND 3 ACCESS: Qualified team can submit Round 3', async () => {
    mockCookieStore.set(TEAM_SESSION_COOKIE, cyberToken);

    // Complete Round 1 & Round 2, qualify team
    await upsertRound1Submission({ team_id: teamCyberId, status: 'SUBMITTED', franchise_name: 'Cyber Verse', genre: 'Sci-Fi', target_audience: 'General', core_premise: 'Valid Premise', central_conflict: 'Valid Conflict', world_concept: 'Valid World', elevator_pitch: 'Valid Pitch' });
    await updateTeamAndMembers(teamCyberId, { status: 'QUALIFIED', current_round: 3 });

    // Open Round 3
    await updateRoundSettings({ round3: 'OPEN' });

    const req = new NextRequest('http://localhost/api/submissions/round3', {
      method: 'POST',
      body: JSON.stringify({
        marketing_angle: 'Cinematic High Concept Trailer Campaign',
        intended_audience_response: 'Widespread excitement among gaming and sci-fi fans',
        tagline: 'Enter the Grid. Break the Rules.',
        promotional_copy: 'Experience the ultimate sci-fi thriller live on stage.',
        status: 'SUBMITTED',
      }),
    });

    const res = await postRound3(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.submission.status).toBe('SUBMITTED');
  });

  it('5. DISQUALIFIED TEAM -> ROUND 3 BLOCKED: Disqualified team cannot submit Round 3', async () => {
    mockCookieStore.set(TEAM_SESSION_COOKIE, cyberToken);

    // Complete Round 1 & Round 2, disqualify team
    await upsertRound1Submission({ team_id: teamCyberId, status: 'SUBMITTED', franchise_name: 'Cyber Verse', genre: 'Sci-Fi', target_audience: 'General', core_premise: 'Valid Premise', central_conflict: 'Valid Conflict', world_concept: 'Valid World', elevator_pitch: 'Valid Pitch' });
    const r2Sub = await upsertRound2Submission({
      team_id: teamCyberId,
      status: 'SUBMITTED',
      hero_data: { name: 'Hero', personality: 'Brave', goal: 'Save city', strengths: 'Strong', weakness: 'Trusting', conflict: 'Enemy', description: 'Hero desc' },
      villain_data: { name: 'Villain', personality: 'Cruel', goal: 'Destroy city', strengths: 'Cunning', weakness: 'Arrogant', conflict: 'Hero', description: 'Villain desc' },
      hero_prompt: 'Hero prompt',
      villain_prompt: 'Villain prompt',
      hero_image_s3_path: 'submissions/teamcyber/round2/hero/123_hero.png',
      villain_image_s3_path: 'submissions/teamcyber/round2/villain/123_villain.png',
      hero_villain_relationship: 'Rivals',
      hero_villain_conflict: 'Conflict',
    });

    // Manually mark disqualified
    await updateTeamAndMembers(teamCyberId, { status: 'DISQUALIFIED' });
    await updateRoundSettings({ round3: 'OPEN' });

    const req = new NextRequest('http://localhost/api/submissions/round3', {
      method: 'POST',
      body: JSON.stringify({
        marketing_angle: 'Illegal submission attempt',
        tagline: 'Disqualified team pitch',
        status: 'SUBMITTED',
      }),
    });

    const res = await postRound3(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('disqualified');
  });

  it('6. REVIEW-REQUIRED TEAM -> ROUND 3 BLOCKED: Safety review required team blocked from Round 3', async () => {
    mockCookieStore.set(TEAM_SESSION_COOKIE, cyberToken);

    await upsertRound1Submission({ team_id: teamCyberId, status: 'SUBMITTED', franchise_name: 'Cyber Verse', genre: 'Sci-Fi', target_audience: 'General', core_premise: 'Valid Premise', central_conflict: 'Valid Conflict', world_concept: 'Valid World', elevator_pitch: 'Valid Pitch' });
    const r2Sub = await upsertRound2Submission({ team_id: teamCyberId, status: 'DRAFT' });
    await updateTeamAndMembers(teamCyberId, { status: 'ACTIVE' });

    // Mock AI eval with REVIEW_REQUIRED
    inMemoryDB.aiEvaluations.set('eval-123', {
      id: 'eval-123',
      round2_submission_id: r2Sub.id,
      safety_status: 'REVIEW_REQUIRED',
      safety_reason: 'Borderline content detected',
      character_development_score: 0,
      relationship_score: 0,
      originality_score: 0,
      visual_quality_score: 0,
      prompt_quality_score: 0,
      prompt_image_consistency_score: 0,
      total_score: 0,
      decision: 'REVIEW_REQUIRED',
      feedback: ['Pending review'],
      created_at: new Date().toISOString(),
    });

    await updateRoundSettings({ round3: 'OPEN' });

    const req = new NextRequest('http://localhost/api/submissions/round3', {
      method: 'POST',
      body: JSON.stringify({
        marketing_angle: 'Pending review team attempt',
        status: 'SUBMITTED',
      }),
    });

    const res = await postRound3(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('pending organizer safety review');
  });

  it('7. CROSS-TEAM SUBMISSION ACCESS: Team A cannot view Team B submission', async () => {
    mockCookieStore.set(TEAM_SESSION_COOKIE, cyberToken);

    // Populate Round 1 for Team Neon
    await upsertRound1Submission({
      team_id: teamNeonId,
      franchise_name: 'Neon Secret Project',
      status: 'SUBMITTED',
    });

    // Team Cyber attempts to GET Team Neon's submission via API
    const req = new NextRequest(`http://localhost/api/submissions/round1?team_id=${teamNeonId}`, {
      method: 'GET',
    });

    const res = await getRound1(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('Access denied');
  });

  it('8. DUPLICATE SUBMISSION ATTEMPTS: Repeated POST requests to locked round return 422', async () => {
    mockCookieStore.set(TEAM_SESSION_COOKIE, cyberToken);
    await updateRoundSettings({ round2: 'OPEN' });

    await upsertRound1Submission({ team_id: teamCyberId, status: 'SUBMITTED' });
    await upsertRound2Submission({ team_id: teamCyberId, status: 'EVALUATED' });

    const req = new NextRequest('http://localhost/api/submissions/round2', {
      method: 'POST',
      body: JSON.stringify({ hero_prompt: 'Mutate prompt' }),
    });

    const res = await postRound2(req);
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toContain('locked');
  });

  it('9. UPLOAD ENDPOINT SECURITY: Rejects asset upload when round is closed or team not eligible', async () => {
    mockCookieStore.set(TEAM_SESSION_COOKIE, cyberToken);

    // Attempt Round 2 upload when Round 2 is CLOSED
    await updateRoundSettings({ round2: 'CLOSED' });
    const req1 = new NextRequest('http://localhost/api/upload', {
      method: 'POST',
      body: JSON.stringify({
        filename: 'hero.png',
        file_type: 'image/png',
        file_size: 2048,
        category: 'round2/hero',
      }),
    });
    const res1 = await postUpload(req1);
    expect(res1.status).toBe(403);
    const body1 = await res1.json();
    expect(body1.error).toContain('locked');

    // Attempt Round 3 upload when Team is NOT qualified
    await updateRoundSettings({ round3: 'OPEN' });
    const req2 = new NextRequest('http://localhost/api/upload', {
      method: 'POST',
      body: JSON.stringify({
        filename: 'poster.pdf',
        file_type: 'application/pdf',
        file_size: 4096,
        category: 'round3',
      }),
    });
    const res2 = await postUpload(req2);
    expect(res2.status).toBe(403);
    const body2 = await res2.json();
    expect(body2.error).toContain('require qualification');
  });

  it('10. ROUND 3 DRAFT SAVE & LOCKING: Qualified team can save draft and lock submission', async () => {
    mockCookieStore.set(TEAM_SESSION_COOKIE, cyberToken);
    await updateTeamAndMembers(teamCyberId, { status: 'QUALIFIED', current_round: 3 });
    await updateRoundSettings({ round3: 'OPEN' });

    // Save draft
    const draftReq = new NextRequest('http://localhost/api/submissions/round3', {
      method: 'POST',
      body: JSON.stringify({
        marketing_angle: 'Draft Marketing Angle',
        tagline: 'Draft Tagline',
        status: 'DRAFT',
      }),
    });
    const draftRes = await postRound3(draftReq);
    expect(draftRes.status).toBe(200);
    const draftBody = await draftRes.json();
    expect(draftBody.submission.status).toBe('DRAFT');

    // Submit and lock
    const submitReq = new NextRequest('http://localhost/api/submissions/round3', {
      method: 'POST',
      body: JSON.stringify({
        marketing_angle: 'Final Marketing Angle',
        tagline: 'Final Tagline',
        promotional_copy: 'Final Copy',
        status: 'SUBMITTED',
      }),
    });
    const submitRes = await postRound3(submitReq);
    expect(submitRes.status).toBe(200);
    const submitBody = await submitRes.json();
    expect(submitBody.submission.status).toBe('SUBMITTED');

    // Further edit attempt must be rejected (422)
    const editReq = new NextRequest('http://localhost/api/submissions/round3', {
      method: 'POST',
      body: JSON.stringify({
        marketing_angle: 'Mutated Angle',
        status: 'DRAFT',
      }),
    });
    const editRes = await postRound3(editReq);
    expect(editRes.status).toBe(422);
  });

  it('11. ADMIN DOSSIER INSPECTION: Admin can inspect complete Round 3 submission and team dossier', async () => {
    const { getTeamDossier } = await import('../src/lib/db-service');

    mockCookieStore.set(TEAM_SESSION_COOKIE, cyberToken);
    await updateRoundSettings({ round3: 'OPEN' });
    await updateTeamAndMembers(teamCyberId, { status: 'QUALIFIED', current_round: 3 });
    await upsertRound1Submission({ team_id: teamCyberId, status: 'SUBMITTED', franchise_name: 'Cyberverse' });
    await upsertRound2Submission({ team_id: teamCyberId, status: 'EVALUATED' });
    await postRound3(
      new NextRequest('http://localhost/api/submissions/round3', {
        method: 'POST',
        body: JSON.stringify({
          marketing_angle: 'Admin Inspected Angle',
          tagline: 'Admin Inspected Tagline',
          status: 'SUBMITTED',
        }),
      })
    );

    const dossier = await getTeamDossier(teamCyberId);
    expect(dossier).not.toBeNull();
    expect(dossier?.team.id).toBe(teamCyberId);
    expect(dossier?.round3?.marketing_angle).toBe('Admin Inspected Angle');
    expect(dossier?.round3?.status).toBe('SUBMITTED');
  });
});
