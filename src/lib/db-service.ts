import {
  AIEvaluation,
  AuditLog,
  CSVRow,
  FinalScore,
  ImportSummary,
  Round1Submission,
  Round2Submission,
  Round3AIEvaluation,
  Round3Submission,
  Team,
  TeamMember,
  TeamWithMembers,
} from '@/types';
import { inMemoryDB, supabaseAdmin } from './supabase';
import { hashAccessCode } from './auth';
import { logAuditEvent, getAuditLogs } from './audit';
export { getAuditLogs };
import { executeAIJudgingPipeline, executeRound3AIJudgingPipeline } from './ai';

/**
 * Commits parsed CSV imported teams into database
 */
export async function commitImportedTeams(summary: ImportSummary): Promise<{ success: boolean; count: number; error?: string }> {
  let importedCount = 0;

  for (const item of summary.preview) {
    if (item.errors.length > 0) continue;

    const accessHash = await hashAccessCode(item.access_code);
    const teamId = typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString(36).substring(2);

    const teamRecord: Team = {
      id: teamId,
      team_code: item.team_code,
      team_name: item.team_name,
      access_code_hash: accessHash,
      access_code: item.access_code,
      current_round: 1,
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Remove any existing team with same team_code from memory to avoid duplicates
    for (const [id, t] of inMemoryDB.teams.entries()) {
      if (t.team_code.toUpperCase() === item.team_code.toUpperCase()) {
        inMemoryDB.teams.delete(id);
      }
    }

    inMemoryDB.teams.set(teamId, teamRecord);

    const memberRecords: TeamMember[] = item.members.map((m) => ({
      id: typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString(36).substring(2),
      team_id: teamId,
      member_name: m.member_name,
      email: m.email,
      phone_number: m.phone_number,
      semester: m.semester,
      section: m.section,
      created_at: new Date().toISOString(),
    }));

    memberRecords.forEach((mem) => inMemoryDB.teamMembers.set(mem.id, mem));

    try {
      const { error: teamErr } = await supabaseAdmin.from('teams').upsert(
        {
          id: teamRecord.id,
          team_code: teamRecord.team_code,
          team_name: teamRecord.team_name,
          access_code_hash: teamRecord.access_code_hash,
          current_round: teamRecord.current_round,
          status: teamRecord.status,
          updated_at: teamRecord.updated_at,
        },
        { onConflict: 'team_code' }
      );

      if (!teamErr) {
        await supabaseAdmin.from('team_members').upsert(
          memberRecords.map((mem) => ({
            id: mem.id,
            team_id: mem.team_id,
            member_name: mem.member_name,
            email: mem.email,
            phone_number: mem.phone_number,
            semester: mem.semester,
            section: mem.section,
          }))
        );
      }
    } catch (err) {
      // Fallback to in-memory store
    }

    importedCount++;
  }

  await logAuditEvent({
    actor: 'ADMIN',
    action: 'CSV_IMPORT_COMMITTED',
    entity: 'TEAMS',
    entity_id: 'BULK_IMPORT',
    metadata: { imported_teams: importedCount },
  });

  return { success: true, count: importedCount };
}

/**
 * Gets team by Team Code
 */
export async function getTeamByCode(teamCode: string): Promise<Team | null> {
  const cleanCode = teamCode.trim().toUpperCase();
  const normalizedCleanCode = cleanCode.replace(/[^A-Z0-9]/gi, '');

  // 1. First check inMemoryDB (preserves imported team credentials in dev/offline mode)
  for (const team of inMemoryDB.teams.values()) {
    const code = (team.team_code || '').trim().toUpperCase();
    const name = (team.team_name || '').trim().toUpperCase();
    const normCode = code.replace(/[^A-Z0-9]/gi, '');

    if (code === cleanCode || normCode === normalizedCleanCode || name === cleanCode) {
      return team;
    }
  }

  // 2. Fall back to Supabase query
  try {
    const { data, error } = await supabaseAdmin
      .from('teams')
      .select('*')
      .eq('team_code', cleanCode)
      .single();

    if (!error && data) return data as Team;
  } catch (err) {
    // Fall back to memory DB
  }

  return null;
}



/**
 * Gets team details with members roster
 */
export async function getTeamWithMembers(teamId: string): Promise<TeamWithMembers | null> {
  let team: Team | null = null;
  let members: TeamMember[] = [];

  try {
    const [{ data: teamData }, { data: membersData }] = await Promise.all([
      supabaseAdmin.from('teams').select('*').eq('id', teamId).single(),
      supabaseAdmin.from('team_members').select('*').eq('team_id', teamId),
    ]);
    if (teamData) team = teamData as Team;
    if (membersData) members = membersData as TeamMember[];
  } catch (err) {
    // Memory fallback
  }

  if (!team) {
    team = inMemoryDB.teams.get(teamId) || null;
    members = Array.from(inMemoryDB.teamMembers.values()).filter((m) => m.team_id === teamId);
  }

  if (!team) return null;
  return { ...team, members };
}

/**
 * Gets all teams with members
 */
export async function getAllTeams(): Promise<TeamWithMembers[]> {
  const teams: TeamWithMembers[] = [];

  try {
    const [{ data: teamRows }, { data: allMembers }] = await Promise.all([
      supabaseAdmin.from('teams').select('*').order('created_at', { ascending: true }),
      supabaseAdmin.from('team_members').select('*'),
    ]);

    if (teamRows && teamRows.length > 0) {
      const membersMap = new Map<string, TeamMember[]>();
      if (allMembers) {
        for (const m of allMembers as TeamMember[]) {
          if (!membersMap.has(m.team_id)) membersMap.set(m.team_id, []);
          membersMap.get(m.team_id)!.push(m);
        }
      }

      for (const t of teamRows) {
        teams.push({
          ...(t as Team),
          members: membersMap.get(t.id) || [],
        });
      }
      return teams;
    }
  } catch (err) {
    // Fall through to memory DB
  }

  for (const t of inMemoryDB.teams.values()) {
    const m = Array.from(inMemoryDB.teamMembers.values()).filter((mem) => mem.team_id === t.id);
    teams.push({ ...t, members: m });
  }

  return teams;
}

/**
 * Round 1 Submission handling
 */
export async function upsertRound1Submission(sub: Partial<Round1Submission> & { team_id: string }): Promise<Round1Submission> {
  const existing = Array.from(inMemoryDB.round1Submissions.values()).find((r) => r.team_id === sub.team_id);

  const now = new Date().toISOString();
  const record: Round1Submission = {
    id: existing?.id || (typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString(36).substring(2)),
    team_id: sub.team_id,
    franchise_name: sub.franchise_name || '',
    genre: sub.genre || '',
    target_audience: sub.target_audience || '',
    core_premise: sub.core_premise || '',
    central_conflict: sub.central_conflict || '',
    world_concept: sub.world_concept || '',
    elevator_pitch: sub.elevator_pitch || '',
    s3_path: sub.s3_path || null,
    status: sub.status || 'DRAFT',
    submitted_at: sub.status === 'SUBMITTED' ? now : existing?.submitted_at || null,
    created_at: existing?.created_at || now,
    updated_at: now,
  };

  inMemoryDB.round1Submissions.set(record.id, record);

  try {
    await supabaseAdmin.from('round1_submissions').upsert(record);
  } catch (e) { }

  await logAuditEvent({
    actor: `TEAM:${sub.team_id}`,
    action: sub.status === 'SUBMITTED' ? 'SUBMIT_ROUND_1' : 'SAVE_DRAFT_ROUND_1',
    entity: 'ROUND1_SUBMISSION',
    entity_id: record.id,
  });

  return record;
}

export async function getRound1Submission(teamId: string): Promise<Round1Submission | null> {
  try {
    const { data } = await supabaseAdmin.from('round1_submissions').select('*').eq('team_id', teamId).single();
    if (data) return data as Round1Submission;
  } catch (e) { }

  return Array.from(inMemoryDB.round1Submissions.values()).find((r) => r.team_id === teamId) || null;
}

/**
 * Round 2 Submission handling
 */
export async function upsertRound2Submission(sub: Partial<Round2Submission> & { team_id: string }): Promise<Round2Submission> {
  const existing = Array.from(inMemoryDB.round2Submissions.values()).find((r) => r.team_id === sub.team_id);
  const now = new Date().toISOString();

  const record: Round2Submission = {
    id: existing?.id || (typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString(36).substring(2)),
    team_id: sub.team_id,
    hero_data: sub.hero_data || { name: '', personality: '', goal: '', strengths: '', weakness: '', conflict: '', description: '' },
    villain_data: sub.villain_data || { name: '', personality: '', goal: '', strengths: '', weakness: '', conflict: '', description: '' },
    supporting_character_data: sub.supporting_character_data,
    hero_prompt: sub.hero_prompt || '',
    villain_prompt: sub.villain_prompt || '',
    supporting_character_prompt: sub.supporting_character_prompt,
    hero_image_s3_path: sub.hero_image_s3_path || null,
    villain_image_s3_path: sub.villain_image_s3_path || null,
    supporting_character_image_s3_path: sub.supporting_character_image_s3_path || null,
    hero_villain_relationship: sub.hero_villain_relationship || '',
    hero_villain_conflict: sub.hero_villain_conflict || '',
    status: sub.status || 'DRAFT',
    submitted_at: sub.status === 'SUBMITTED' ? now : existing?.submitted_at || null,
    created_at: existing?.created_at || now,
    updated_at: now,
  };

  inMemoryDB.round2Submissions.set(record.id, record);

  try {
    await supabaseAdmin.from('round2_submissions').upsert(record);
  } catch (e) { }

  await logAuditEvent({
    actor: `TEAM:${sub.team_id}`,
    action: sub.status === 'SUBMITTED' ? 'SUBMIT_ROUND_2' : 'SAVE_DRAFT_ROUND_2',
    entity: 'ROUND2_SUBMISSION',
    entity_id: record.id,
  });

  // If submitted, trigger AI Judging pipeline immediately or in background queue
  if (sub.status === 'SUBMITTED' || sub.status === 'PENDING_AI') {
    triggerAIJudgeForSubmission(record.id).catch(console.error);
  }

  return record;
}

export async function getRound2Submission(teamId: string): Promise<Round2Submission | null> {
  try {
    const { data } = await supabaseAdmin.from('round2_submissions').select('*').eq('team_id', teamId).single();
    if (data) return data as Round2Submission;
  } catch (e) { }

  return Array.from(inMemoryDB.round2Submissions.values()).find((r) => r.team_id === teamId) || null;
}

/**
 * Triggers AI evaluation for a Round 2 Submission
 */
export async function triggerAIJudgeForSubmission(round2SubId: string): Promise<AIEvaluation> {
  let sub: Round2Submission | undefined;
  for (const s of inMemoryDB.round2Submissions.values()) {
    if (s.id === round2SubId) { sub = s; break; }
  }

  if (!sub) {
    throw new Error('Round 2 Submission not found');
  }

  const evalResult = await executeAIJudgingPipeline(sub);
  const now = new Date().toISOString();

  const aiEvalRecord: AIEvaluation = {
    id: typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString(36).substring(2),
    round2_submission_id: round2SubId,
    safety_status: evalResult.safety.status,
    safety_reason: evalResult.safety.reason,
    safety_confidence: evalResult.safety.confidence,
    character_development_score: evalResult.scores.character_development,
    relationship_score: evalResult.scores.relationship,
    originality_score: evalResult.scores.originality,
    visual_quality_score: evalResult.scores.visual_quality,
    prompt_quality_score: evalResult.scores.prompt_quality,
    prompt_image_consistency_score: evalResult.scores.prompt_image_consistency,
    total_score: evalResult.total_score,
    decision: evalResult.decision,
    feedback: evalResult.feedback,
    evaluated_at: now,
    created_at: now,
  };

  inMemoryDB.aiEvaluations.set(aiEvalRecord.id, aiEvalRecord);

  // Update submission status to EVALUATED
  sub.status = 'EVALUATED';
  sub.updated_at = now;

  // Update team status if DISQUALIFIED or QUALIFIED
  const team = inMemoryDB.teams.get(sub.team_id);
  if (team) {
    if (evalResult.decision === 'DISQUALIFIED') {
      team.status = 'DISQUALIFIED';
    } else if (evalResult.decision === 'QUALIFIED') {
      team.status = 'QUALIFIED';
      team.current_round = 3;
    }
  }

  try {
    await supabaseAdmin.from('ai_evaluations').upsert(aiEvalRecord);
    await supabaseAdmin.from('round2_submissions').update({ status: 'EVALUATED', updated_at: now }).eq('id', round2SubId);
    if (team) {
      await supabaseAdmin.from('teams').update({ status: team.status, current_round: team.current_round }).eq('id', team.id);
    }
  } catch (e) { }

  await logAuditEvent({
    actor: 'SYSTEM_AI_JUDGE',
    action: 'AI_EVALUATION_COMPLETED',
    entity: 'AI_EVALUATION',
    entity_id: aiEvalRecord.id,
    metadata: {
      team_id: sub.team_id,
      decision: evalResult.decision,
      total_score: evalResult.total_score,
      safety_status: evalResult.safety.status,
    },
  });

  return aiEvalRecord;
}

export async function getAIEvaluationBySubmissionId(round2SubId: string): Promise<AIEvaluation | null> {
  try {
    const { data } = await supabaseAdmin.from('ai_evaluations').select('*').eq('round2_submission_id', round2SubId).single();
    if (data) return data as AIEvaluation;
  } catch (e) { }

  return Array.from(inMemoryDB.aiEvaluations.values()).find((a) => a.round2_submission_id === round2SubId) || null;
}

/**
 * Round 3 Submission handling
 */
export async function upsertRound3Submission(sub: Partial<Round3Submission> & { team_id: string }): Promise<Round3Submission> {
  const existing = Array.from(inMemoryDB.round3Submissions.values()).find((r) => r.team_id === sub.team_id);
  const now = new Date().toISOString();

  const record: Round3Submission = {
    id: existing?.id || (typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString(36).substring(2)),
    team_id: sub.team_id,
    marketing_angle: sub.marketing_angle || '',
    intended_audience_response: sub.intended_audience_response || '',
    tagline: sub.tagline || '',
    promotional_copy: sub.promotional_copy || '',
    promotional_asset_s3_path: sub.promotional_asset_s3_path || null,
    status: sub.status || 'DRAFT',
    submitted_at: sub.status === 'SUBMITTED' ? now : existing?.submitted_at || null,
    created_at: existing?.created_at || now,
    updated_at: now,
  };

  inMemoryDB.round3Submissions.set(record.id, record);

  try {
    await supabaseAdmin.from('round3_submissions').upsert(record);
  } catch (e) { }

  await logAuditEvent({
    actor: `TEAM:${sub.team_id}`,
    action: sub.status === 'SUBMITTED' ? 'SUBMIT_ROUND_3' : 'SAVE_DRAFT_ROUND_3',
    entity: 'ROUND3_SUBMISSION',
    entity_id: record.id,
  });

  if (sub.status === 'SUBMITTED' || sub.status === 'PENDING_AI') {
    triggerAIJudgeForRound3Submission(record.id).catch(console.error);
  }

  return record;
}

export async function getRound3Submission(teamId: string): Promise<Round3Submission | null> {
  try {
    const { data } = await supabaseAdmin.from('round3_submissions').select('*').eq('team_id', teamId).single();
    if (data) return data as Round3Submission;
  } catch (e) { }

  return Array.from(inMemoryDB.round3Submissions.values()).find((r) => r.team_id === teamId) || null;
}

/**
 * Triggers AI evaluation for a Round 3 Submission
 */
export async function triggerAIJudgeForRound3Submission(round3SubId: string): Promise<Round3AIEvaluation> {
  let sub: Round3Submission | undefined;
  for (const s of inMemoryDB.round3Submissions.values()) {
    if (s.id === round3SubId) { sub = s; break; }
  }

  if (!sub) {
    throw new Error('Round 3 Submission not found');
  }

  const evalResult = await executeRound3AIJudgingPipeline(sub);
  const now = new Date().toISOString();

  const r3AiEvalRecord: Round3AIEvaluation = {
    id: typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString(36).substring(2),
    round3_submission_id: round3SubId,
    marketing_strategy_score: evalResult.scores.marketing_strategy,
    tagline_punch_score: evalResult.scores.tagline_punch,
    audience_engagement_score: evalResult.scores.audience_engagement,
    copywriting_quality_score: evalResult.scores.copywriting_quality,
    visual_poster_quality_score: evalResult.scores.visual_poster_quality,
    total_score: evalResult.total_score,
    decision: evalResult.decision,
    feedback: evalResult.feedback,
    evaluated_at: now,
    created_at: now,
  };

  inMemoryDB.round3AIEvaluations.set(r3AiEvalRecord.id, r3AiEvalRecord);

  sub.status = 'EVALUATED';
  sub.updated_at = now;

  try {
    await supabaseAdmin.from('round3_ai_evaluations').upsert(r3AiEvalRecord);
    await supabaseAdmin.from('round3_submissions').update({ status: 'EVALUATED', updated_at: now }).eq('id', round3SubId);
  } catch (e) { }

  await logAuditEvent({
    actor: 'SYSTEM_ROUND3_AI_JUDGE',
    action: 'ROUND3_AI_EVALUATION_COMPLETED',
    entity: 'ROUND3_AI_EVALUATION',
    entity_id: r3AiEvalRecord.id,
    metadata: {
      team_id: sub.team_id,
      decision: evalResult.decision,
      total_score: evalResult.total_score,
    },
  });

  return r3AiEvalRecord;
}

export async function getRound3AIEvaluationBySubmissionId(round3SubId: string): Promise<Round3AIEvaluation | null> {
  try {
    const { data } = await supabaseAdmin.from('round3_ai_evaluations').select('*').eq('round3_submission_id', round3SubId).single();
    if (data) return data as Round3AIEvaluation;
  } catch (e) { }

  return Array.from(inMemoryDB.round3AIEvaluations.values()).find((a) => a.round3_submission_id === round3SubId) || null;
}

/**
 * Offline Final Pitch Human Scores handling
 */
export async function addFinalScore(teamId: string, judgeId: string, score: number, comments?: string): Promise<FinalScore> {
  const record: FinalScore = {
    id: typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString(36).substring(2),
    team_id: teamId,
    judge_id: judgeId,
    score,
    comments: comments || '',
    created_at: new Date().toISOString(),
  };

  inMemoryDB.finalScores.set(record.id, record);

  try {
    await supabaseAdmin.from('final_scores').insert(record);
  } catch (e) { }

  await logAuditEvent({
    actor: `JUDGE:${judgeId}`,
    action: 'HUMAN_JUDGE_SCORE_SUBMITTED',
    entity: 'FINAL_SCORE',
    entity_id: record.id,
    metadata: { team_id: teamId, score },
  });

  return record;
}

export async function getFinalScoresForTeam(teamId: string): Promise<FinalScore[]> {
  try {
    const { data } = await supabaseAdmin.from('final_scores').select('*').eq('team_id', teamId);
    if (data) return data as FinalScore[];
  } catch (e) { }

  return Array.from(inMemoryDB.finalScores.values()).filter((f) => f.team_id === teamId);
}

/**
 * Admin override for safety / AI evaluation
 */
export async function adminOverrideSafety(round2SubId: string, newSafetyStatus: 'PASS' | 'FAIL', reason: string): Promise<AIEvaluation> {
  const aiEval = await getAIEvaluationBySubmissionId(round2SubId);
  if (!aiEval) throw new Error('AI Evaluation not found');

  aiEval.safety_status = newSafetyStatus;
  aiEval.safety_reason = `Admin Override: ${reason}`;
  aiEval.decision = newSafetyStatus === 'PASS' ? 'QUALIFIED' : 'DISQUALIFIED';

  inMemoryDB.aiEvaluations.set(aiEval.id, aiEval);

  try {
    await supabaseAdmin.from('ai_evaluations').update({
      safety_status: aiEval.safety_status,
      safety_reason: aiEval.safety_reason,
      decision: aiEval.decision,
    }).eq('id', aiEval.id);
  } catch (e) { }

  await logAuditEvent({
    actor: 'ADMIN',
    action: 'ADMIN_SAFETY_OVERRIDE',
    entity: 'AI_EVALUATION',
    entity_id: aiEval.id,
    metadata: { new_status: newSafetyStatus, reason },
  });

  return aiEval;
}

/**
 * Updates a team's details and members roster
 */
export async function updateTeamAndMembers(
  teamId: string,
  teamUpdates: { team_name?: string; status?: 'ACTIVE' | 'QUALIFIED' | 'DISQUALIFIED' | 'ELIMINATED'; current_round?: number; access_code?: string },
  membersUpdates?: Array<{ id?: string; member_name: string; email: string; phone_number: string; semester: string; section: string }>
): Promise<TeamWithMembers | null> {
  const existingTeam = inMemoryDB.teams.get(teamId);
  let newHash: string | undefined;
  if (teamUpdates.access_code) {
    newHash = await hashAccessCode(teamUpdates.access_code);
  }

  if (existingTeam) {
    if (teamUpdates.team_name) existingTeam.team_name = teamUpdates.team_name;
    if (teamUpdates.status) existingTeam.status = teamUpdates.status;
    if (teamUpdates.current_round !== undefined) existingTeam.current_round = teamUpdates.current_round;
    if (teamUpdates.access_code) {
      existingTeam.access_code = teamUpdates.access_code;
      if (newHash) existingTeam.access_code_hash = newHash;
    }
    existingTeam.updated_at = new Date().toISOString();
    inMemoryDB.teams.set(teamId, existingTeam);
  }

  try {
    await supabaseAdmin.from('teams').update({
      ...(teamUpdates.team_name && { team_name: teamUpdates.team_name }),
      ...(teamUpdates.status && { status: teamUpdates.status }),
      ...(teamUpdates.current_round !== undefined && { current_round: teamUpdates.current_round }),
      ...(teamUpdates.access_code && { access_code: teamUpdates.access_code }),
      ...(newHash && { access_code_hash: newHash }),
      updated_at: new Date().toISOString(),
    }).eq('id', teamId);
  } catch (e) { }

  if (membersUpdates) {
    for (const mem of membersUpdates) {
      if (mem.id && inMemoryDB.teamMembers.has(mem.id)) {
        const existingMem = inMemoryDB.teamMembers.get(mem.id);
        Object.assign(existingMem, mem);
        inMemoryDB.teamMembers.set(mem.id, existingMem);
        try {
          await supabaseAdmin.from('team_members').update(mem).eq('id', mem.id);
        } catch (e) { }
      }
    }
  }

  await logAuditEvent({
    actor: 'ADMIN',
    action: 'UPDATE_TEAM_ROSTER',
    entity: 'TEAM',
    entity_id: teamId,
    metadata: { updates: teamUpdates },
  });

  return getTeamWithMembers(teamId);
}

/**
 * Deletes a team and all associated members and submissions
 */
export async function deleteTeam(teamId: string): Promise<boolean> {
  // Remove from memory
  inMemoryDB.teams.delete(teamId);
  for (const [id, mem] of inMemoryDB.teamMembers.entries()) {
    if (mem.team_id === teamId) inMemoryDB.teamMembers.delete(id);
  }

  try {
    await supabaseAdmin.from('teams').delete().eq('id', teamId);
  } catch (e) { }

  await logAuditEvent({
    actor: 'ADMIN',
    action: 'DELETE_TEAM',
    entity: 'TEAM',
    entity_id: teamId,
  });

  return true;
}

export interface RoundSettings {
  round1: 'OPEN' | 'CLOSED';
  round2: 'OPEN' | 'CLOSED';
  round3: 'OPEN' | 'CLOSED';
  top5_locked: boolean;
}

/**
 * Gets competition round status settings
 */
export async function getRoundSettings(): Promise<RoundSettings> {
  const defaultSettings: RoundSettings = { round1: 'OPEN', round2: 'OPEN', round3: 'CLOSED', top5_locked: false };

  const memSettings = inMemoryDB.settings.get('round_status');
  if (memSettings) {
    return { ...defaultSettings, ...memSettings };
  }

  try {
    const { data } = await supabaseAdmin.from('settings').select('*').eq('key', 'round_status').single();
    if (data && data.value) {
      return { ...defaultSettings, ...data.value };
    }
  } catch (err) {}

  inMemoryDB.settings.set('round_status', defaultSettings);
  return defaultSettings;
}

/**
 * Updates competition round status settings
 */
export async function updateRoundSettings(newSettings: Partial<RoundSettings>): Promise<RoundSettings> {
  const current = await getRoundSettings();
  const updated: RoundSettings = { ...current, ...newSettings };

  inMemoryDB.settings.set('round_status', updated);

  try {
    await supabaseAdmin.from('settings').upsert({ key: 'round_status', value: updated });
  } catch (err) {}

  await logAuditEvent({
    actor: 'ADMIN',
    action: 'UPDATE_ROUND_SETTINGS',
    entity: 'SETTINGS',
    entity_id: 'round_status',
    metadata: updated,
  });

  return updated;
}

