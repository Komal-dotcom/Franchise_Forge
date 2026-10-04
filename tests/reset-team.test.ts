import { describe, it, expect, beforeEach } from 'vitest';
import {
  commitImportedTeams,
  getTeamByCode,
  getTeamWithMembers,
  upsertRound1Submission,
  getRound1Submission,
  upsertRound2Submission,
  getRound2Submission,
  triggerAIJudgeForSubmission,
  getAIEvaluationBySubmissionId,
  upsertRound3Submission,
  getRound3Submission,
  submitRound3ManualScore,
  getRound3ManualScoresForTeam,
  addFinalScore,
  getFinalScoresForTeam,
  resetTeamProgress,
  getAuditLogs,
} from '../src/lib/db-service';
import { parseCSV, processAndValidateCSV } from '../src/lib/csv-importer';
import { deleteTeamS3Assets } from '../src/lib/s3';
import { inMemoryDB } from '../src/lib/supabase';

const sampleCSV = `team_name,member_name,email,phone_number,semester,section
Team Phoenix,Alex,alex@phoenix.com,9876543210,5,A
Team Phoenix,Sam,sam@phoenix.com,9876543211,5,A
Team Orion,Chris,chris@orion.com,9876543220,3,B
Team Orion,Pat,pat@orion.com,9876543221,3,B`;

describe('SAFE ADMIN-ONLY TEAM RESET FEATURE', () => {
  let teamPhoenixId: string;
  let teamOrionId: string;
  let phoenixCode: string;
  let phoenixAccessCode: string;

  beforeEach(async () => {
    // Seed initial teams into inMemoryDB
    const { data } = parseCSV(sampleCSV);
    const summary = await processAndValidateCSV(data);
    await commitImportedTeams(summary);

    const phoenixPreview = summary.preview.find((t) => t.team_name === 'Team Phoenix')!;
    const orionPreview = summary.preview.find((t) => t.team_name === 'Team Orion')!;

    phoenixCode = phoenixPreview.team_code;
    phoenixAccessCode = phoenixPreview.access_code;

    const fetchedPhoenix = await getTeamByCode(phoenixCode);
    const fetchedOrion = await getTeamByCode(orionPreview.team_code);

    teamPhoenixId = fetchedPhoenix!.id;
    teamOrionId = fetchedOrion!.id;

    // Populate Submissions for Team Phoenix
    await upsertRound1Submission({
      team_id: teamPhoenixId,
      franchise_name: 'Phoenix Saga',
      genre: 'Sci-Fi Action',
      target_audience: 'Young Adults',
      core_premise: 'A mythical bird powers clean energy across the star system.',
      central_conflict: 'Corporate titans want to extract and weaponize the core energy.',
      world_concept: 'Futuristic solar cities governed by clean plasma reserves.',
      elevator_pitch: 'Star Wars meets Avatar in an energy wars epic.',
      s3_path: `submissions/${teamPhoenixId}/round1/12345_bible.pdf`,
      status: 'SUBMITTED',
    });

    const r2 = await upsertRound2Submission({
      team_id: teamPhoenixId,
      hero_data: {
        name: 'Kaelen Phoenix',
        personality: 'Brave, resourceful, empathetic engineer',
        goal: 'Protect the ancient celestial hearth',
        strengths: 'Master inventor',
        weakness: 'Overly trusting',
        conflict: 'Brother serves the enemy syndicate',
        description: 'Tall engineer with glowing plasma goggles',
      },
      villain_data: {
        name: 'Lord Vane',
        personality: 'Cold, calculating, ambitious CEO',
        goal: 'Harvest all plasma stars for personal dominance',
        strengths: 'Infinite resource wealth',
        weakness: 'Arrogant underestimation of rebels',
        conflict: 'Seeks absolute stellar monopoly',
        description: 'Cybernetic executive in black metallic armor',
      },
      hero_prompt: 'Cinematic portrait of Kaelen in high-tech suit',
      villain_prompt: 'Dark obsidian armor lord in shadow throne room',
      hero_image_s3_path: `submissions/${teamPhoenixId}/round2/hero/12345_kaelen.png`,
      villain_image_s3_path: `submissions/${teamPhoenixId}/round2/villain/12345_vane.png`,
      hero_villain_relationship: 'Former business partners',
      hero_villain_conflict: 'Clash over sustainable star energy vs weaponization',
      status: 'EVALUATED',
    });

    const aiEvalRecord = {
      id: 'ai-eval-phoenix-1',
      round2_submission_id: r2.id,
      safety_status: 'PASS' as const,
      safety_reason: 'Passed safety filters',
      safety_confidence: 0.99,
      character_development_score: 28,
      relationship_score: 18,
      originality_score: 14,
      visual_quality_score: 14,
      prompt_quality_score: 9,
      prompt_image_consistency_score: 9,
      total_score: 92,
      decision: 'QUALIFIED' as const,
      evaluation_status: 'COMPLETED' as const,
      feedback: ['Excellent character arc', 'Strong hero-villain dynamic'],
      evaluated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    inMemoryDB.aiEvaluations.set(aiEvalRecord.id, aiEvalRecord);

    const r3 = await upsertRound3Submission({

      team_id: teamPhoenixId,
      marketing_angle: 'Sci-Fi blockbuster energy for gaming generation',
      intended_audience_response: 'Thrill, excitement, environmental awareness',
      tagline: 'Ignite the Hearth. Save the Stars.',
      promotional_copy: 'Experience the ultimate sci-fi showdown this fall.',
      promotional_asset_s3_path: `submissions/${teamPhoenixId}/round3/12345_poster.png`,
      status: 'SUBMITTED',
    });

    await submitRound3ManualScore(
      r3.id,
      teamPhoenixId,
      'judge_1',
      'Senior Creative Judge',
      {
        marketing_strategy_score: 22,
        tagline_punch_score: 18,
        audience_engagement_score: 18,
        copywriting_quality_score: 18,
        visual_poster_quality_score: 14,
      },
      'Great presentation!'
    );

    await addFinalScore(teamPhoenixId, 'judge_final', 92, 'Outstanding final pitch', 'Chief Pitch Judge');

    // Populate Submissions for Team Orion (Other Team)
    await upsertRound1Submission({
      team_id: teamOrionId,
      franchise_name: 'Orion Vanguard',
      genre: 'Cyberpunk RPG',
      target_audience: 'Hardcore Gamers',
      core_premise: 'Deep space bounty hunting squad in lawless nebula.',
      central_conflict: 'Corrupt star police vs rogue mercenaries.',
      world_concept: 'Neon lit star stations and asteroid mines.',
      elevator_pitch: 'Cyberpunk space western with deep squad tactics.',
      s3_path: `submissions/${teamOrionId}/round1/9999_orion.pdf`,
      status: 'SUBMITTED',
    });
  });

  it('should reset Round 1 only without affecting Round 2, Round 3, or Team identity', async () => {
    const res = await resetTeamProgress(teamPhoenixId, ['round1'], 'Resetting round 1 for re-drafting', 'ADMIN');

    expect(res.success).toBe(true);
    expect(res.scopes_reset).toContain('round1');

    // Round 1 submission should be deleted
    const r1After = await getRound1Submission(teamPhoenixId);
    expect(r1After).toBeNull();

    // Round 2 and Round 3 submissions must remain intact
    const r2After = await getRound2Submission(teamPhoenixId);
    expect(r2After).not.toBeNull();
    expect(r2After?.hero_data.name).toBe('Kaelen Phoenix');

    const r3After = await getRound3Submission(teamPhoenixId);
    expect(r3After).not.toBeNull();

    // Team Record & Roster MUST remain intact
    const teamWithMembers = await getTeamWithMembers(teamPhoenixId);
    expect(teamWithMembers).not.toBeNull();
    expect(teamWithMembers?.team_code).toBe(phoenixCode);
    expect(teamWithMembers?.members).toHaveLength(2);
    expect(teamWithMembers?.current_round).toBe(1);
  });

  it('should reset Round 2 only and clear associated AI evaluations', async () => {
    const res = await resetTeamProgress(teamPhoenixId, ['round2'], 'Resetting round 2 AI scoring', 'ADMIN');

    expect(res.success).toBe(true);
    expect(res.scopes_reset).toContain('round2');

    // Round 2 submission should be deleted
    const r2After = await getRound2Submission(teamPhoenixId);
    expect(r2After).toBeNull();

    // Associated AI evaluation must also be removed
    const allEvals = Array.from(inMemoryDB.aiEvaluations.values());
    const phoenixEvals = allEvals.filter((e) => e.round2_submission_id === r2After?.id);
    expect(phoenixEvals).toHaveLength(0);

    // Round 1 submission must remain intact
    const r1After = await getRound1Submission(teamPhoenixId);
    expect(r1After).not.toBeNull();
  });

  it('should reset Round 3 only and clear Round 3 manual scores', async () => {
    const res = await resetTeamProgress(teamPhoenixId, ['round3'], 'Resetting Round 3 marketing', 'ADMIN');

    expect(res.success).toBe(true);
    expect(res.scopes_reset).toContain('round3');

    // Round 3 submission should be deleted
    const r3After = await getRound3Submission(teamPhoenixId);
    expect(r3After).toBeNull();

    // Round 3 manual scores should be deleted
    const r3Scores = await getRound3ManualScoresForTeam(teamPhoenixId);
    expect(r3Scores).toHaveLength(0);

    // Round 1 and Round 2 submissions must remain intact
    const r1After = await getRound1Submission(teamPhoenixId);
    expect(r1After).not.toBeNull();
    const r2After = await getRound2Submission(teamPhoenixId);
    expect(r2After).not.toBeNull();
  });

  it('should reset Final Pitch scores only', async () => {
    const res = await resetTeamProgress(teamPhoenixId, ['final_pitch'], 'Resetting final pitch scores', 'ADMIN');

    expect(res.success).toBe(true);
    expect(res.scopes_reset).toContain('final_pitch');

    const finalScores = await getFinalScoresForTeam(teamPhoenixId);
    expect(finalScores).toHaveLength(0);

    // Submissions remain intact
    const r1After = await getRound1Submission(teamPhoenixId);
    expect(r1After).not.toBeNull();
  });

  it('should reset AI Evaluations only without deleting Round 2 text content', async () => {
    const r2Before = await getRound2Submission(teamPhoenixId);
    expect(r2Before).not.toBeNull();

    const res = await resetTeamProgress(teamPhoenixId, ['ai_evaluations'], 'Re-running AI eval pipeline', 'ADMIN');

    expect(res.success).toBe(true);

    // AI Evaluation record deleted
    const evalAfter = await getAIEvaluationBySubmissionId(r2Before!.id);
    expect(evalAfter).toBeNull();

    // Round 2 Submission record remains intact and status reset to SUBMITTED
    const r2After = await getRound2Submission(teamPhoenixId);
    expect(r2After).not.toBeNull();
    expect(r2After?.status).toBe('SUBMITTED');
  });

  it('should reset ALL competition progress cleanly and return team to Active Round 1', async () => {
    const res = await resetTeamProgress(teamPhoenixId, ['all'], 'Complete team administrative reset', 'ADMIN');

    expect(res.success).toBe(true);

    // All rounds and evaluations must be cleared
    expect(await getRound1Submission(teamPhoenixId)).toBeNull();
    expect(await getRound2Submission(teamPhoenixId)).toBeNull();
    expect(await getRound3Submission(teamPhoenixId)).toBeNull();
    expect(await getRound3ManualScoresForTeam(teamPhoenixId)).toHaveLength(0);
    expect(await getFinalScoresForTeam(teamPhoenixId)).toHaveLength(0);

    // Team Record, Roster, Access Code, Team Code MUST remain intact
    const team = await getTeamWithMembers(teamPhoenixId);
    expect(team).not.toBeNull();
    expect(team?.team_code).toBe(phoenixCode);
    expect(team?.access_code).toBe(phoenixAccessCode);
    expect(team?.members).toHaveLength(2);
    expect(team?.current_round).toBe(1);
    expect(team?.status).toBe('ACTIVE');
  });

  it('should ensure other teams data remains completely untouched', async () => {
    // Reset Team Phoenix completely
    await resetTeamProgress(teamPhoenixId, ['all'], 'Full reset Phoenix', 'ADMIN');

    // Verify Team Orion data is 100% intact
    const orionR1 = await getRound1Submission(teamOrionId);
    expect(orionR1).not.toBeNull();
    expect(orionR1?.franchise_name).toBe('Orion Vanguard');

    const orionTeam = await getTeamWithMembers(teamOrionId);
    expect(orionTeam).not.toBeNull();
    expect(orionTeam?.members).toHaveLength(2);
  });

  it('should enforce S3 path isolation and reject assets belonging to another team', async () => {
    const foreignAssetPath = `submissions/${teamOrionId}/round1/secret.pdf`;
    const ownAssetPath = `submissions/${teamPhoenixId}/round1/photo.jpg`;

    const result = await deleteTeamS3Assets(teamPhoenixId, [ownAssetPath, foreignAssetPath]);

    expect(result.deletedCount).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('could not be safely verified as belonging to team');
  });

  it('should record system audit logs for every reset operation', async () => {
    await resetTeamProgress(teamPhoenixId, ['round1'], 'Testing audit log creation', 'ADMIN_JANE');

    const logs = await getAuditLogs();
    const resetLog = logs.find(
      (l) => l.action === 'RESET_TEAM_PROGRESS' && l.entity_id === teamPhoenixId
    );

    expect(resetLog).toBeDefined();
    expect(resetLog?.actor).toBe('ADMIN_JANE');
    expect(resetLog?.reason).toBe('Testing audit log creation');
    expect(resetLog?.metadata?.team_code).toBe(phoenixCode);
  });

  it('should throw an error for invalid team_id or empty scope array', async () => {
    await expect(resetTeamProgress('', ['round1'])).rejects.toThrow('team_id parameter is required');
    await expect(resetTeamProgress(teamPhoenixId, [])).rejects.toThrow('At least one reset scope must be selected');
    await expect(resetTeamProgress('non_existent_id', ['round1'])).rejects.toThrow('not found');
  });

  it('REGRESSION: should reset an existing team by exact UUID (e.g., 1481a8f6-e79c-49db-b8ef-7255f0f80ffb) and by team code', async () => {
    const customUuid = '1481a8f6-e79c-49db-b8ef-7255f0f80ffb';
    const customCode = 'FF26-999';

    // Seed team with exact UUID from bug report
    inMemoryDB.teams.set(customUuid, {
      id: customUuid,
      team_code: customCode,
      team_name: 'Studio Test Alpha',
      access_code_hash: 'hash999',
      access_code: '999999',
      current_round: 2,
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    await upsertRound1Submission({
      team_id: customUuid,
      franchise_name: 'Alpha Concept',
      genre: 'Fantasy',
      target_audience: 'General',
      core_premise: 'Alpha world concept',
      central_conflict: 'Alpha conflict',
      world_concept: 'Alpha world',
      elevator_pitch: 'Alpha pitch',
      status: 'SUBMITTED',
    });

    // 1. Reset by exact UUID 1481a8f6-e79c-49db-b8ef-7255f0f80ffb
    const resUuid = await resetTeamProgress(customUuid, ['round1'], 'Resetting by exact UUID 1481a8f6-e79c-49db-b8ef-7255f0f80ffb', 'ADMIN');
    expect(resUuid.success).toBe(true);
    expect(resUuid.team_id).toBe(customUuid);
    expect(resUuid.team_code).toBe(customCode);

    // Verify submission cleared
    const r1SubAfterUuid = await getRound1Submission(customUuid);
    expect(r1SubAfterUuid).toBeNull();

    // Verify team record still exists
    const teamObjAfterUuid = await getTeamWithMembers(customUuid);
    expect(teamObjAfterUuid).not.toBeNull();
    expect(teamObjAfterUuid?.id).toBe(customUuid);

    // 2. Reset by Team Code
    await upsertRound1Submission({
      team_id: customUuid,
      franchise_name: 'Alpha Concept 2',
      genre: 'Fantasy',
      target_audience: 'General',
      core_premise: 'Alpha world concept 2',
      central_conflict: 'Alpha conflict 2',
      world_concept: 'Alpha world 2',
      elevator_pitch: 'Alpha pitch 2',
      status: 'SUBMITTED',
    });

    const resCode = await resetTeamProgress(customCode, ['round1'], 'Resetting by Team Code FF26-999', 'ADMIN');
    expect(resCode.success).toBe(true);

    const r1SubAfterCode = await getRound1Submission(customUuid);
    expect(r1SubAfterCode).toBeNull();
  });
});

