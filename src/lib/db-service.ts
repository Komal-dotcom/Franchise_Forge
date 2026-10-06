import {
  AIEvaluation,
  AuditLog,
  CSVRow,
  CompetitionLifecycleSettings,
  FinalScore,
  ImportSummary,
  Round1Submission,
  Round2Submission,
  Round3ManualScore,
  Round3Submission,
  RoundControlState,
  RoundLifecycleStatus,
  Team,
  TeamDossierData,
  TeamMember,
  TeamResetResult,
  TeamResetScope,
  TeamWithMembers,
} from '@/types';
import { inMemoryDB, supabaseAdmin } from './supabase';
import { hashAccessCode } from './auth';
import { logAuditEvent, getAuditLogs } from './audit';
export { getAuditLogs };
import { executeAIJudgingPipeline } from './ai';
import { deleteTeamS3Assets } from './s3';

const isProduction = process.env.NODE_ENV === 'production';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function isUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

/**
 * Commits parsed CSV imported teams into database
 */
export async function commitImportedTeams(summary: ImportSummary): Promise<{ success: boolean; count: number; error?: string }> {
  let importedCount = 0;

  for (const item of summary.preview) {
    if (item.errors.length > 0) continue;

    const cleanCode = item.team_code.trim().toUpperCase();
    const cleanName = item.team_name.trim();

    // Find all existing team rows matching team_code OR team_name in Supabase
    const { data: oldTeams } = await supabaseAdmin
      .from('teams')
      .select('id, current_round, status, created_at')
      .or(`team_code.eq.${cleanCode},team_name.ilike.${cleanName}`);

    let canonicalTeamId: string;
    let existingRound = 1;
    let existingStatus: 'ACTIVE' | 'QUALIFIED' | 'DISQUALIFIED' | 'ELIMINATED' = 'ACTIVE';
    let existingCreatedAt = new Date().toISOString();

    if (oldTeams && oldTeams.length > 0) {
      canonicalTeamId = oldTeams[0].id;
      existingRound = oldTeams[0].current_round || 1;
      existingStatus = (oldTeams[0].status as any) || 'ACTIVE';
      existingCreatedAt = oldTeams[0].created_at || existingCreatedAt;

      // Delete all child records for ALL matching old team IDs to prevent orphaned records & foreign key issues
      for (const ot of oldTeams) {
        await supabaseAdmin.from('final_scores').delete().eq('team_id', ot.id);
        await supabaseAdmin.from('round3_submissions').delete().eq('team_id', ot.id);
        await supabaseAdmin.from('round2_submissions').delete().eq('team_id', ot.id);
        await supabaseAdmin.from('round1_submissions').delete().eq('team_id', ot.id);
        await supabaseAdmin.from('team_members').delete().eq('team_id', ot.id);
      }

      // Delete all old team rows so re-inserting canonicalTeamId avoids PK / unique conflicts
      for (const ot of oldTeams) {
        await supabaseAdmin.from('teams').delete().eq('id', ot.id);
      }
    } else {
      canonicalTeamId = generateUUID();
    }

    const accessHash = await hashAccessCode(item.access_code);

    const teamRecord: Team = {
      id: canonicalTeamId,
      team_code: cleanCode,
      team_name: cleanName,
      access_code_hash: accessHash,
      access_code: item.access_code,
      current_round: existingRound,
      status: existingStatus,
      created_at: existingCreatedAt,
      updated_at: new Date().toISOString(),
    };

    // 3. Persist team record to Supabase authoritatively
    const { data: savedTeam, error: teamErr } = await supabaseAdmin
      .from('teams')
      .upsert(
        {
          id: canonicalTeamId,
          team_code: cleanCode,
          team_name: cleanName,
          access_code_hash: teamRecord.access_code_hash,
          current_round: teamRecord.current_round,
          status: teamRecord.status,
          updated_at: teamRecord.updated_at,
        },
        { onConflict: 'team_code' }
      )
      .select('id')
      .single();

    if (teamErr || !savedTeam) {
      console.error('[Import Error] Supabase team upsert failed:', teamErr);
      throw new Error(`Failed to persist team "${teamRecord.team_name}" to database: ${teamErr?.message}`);
    }

    canonicalTeamId = savedTeam.id;
    teamRecord.id = canonicalTeamId;

    const memberRecords: TeamMember[] = item.members.map((m) => ({
      id: generateUUID(),
      team_id: canonicalTeamId,
      member_name: m.member_name,
      email: m.email,
      phone_number: m.phone_number,
      semester: m.semester,
      section: m.section,
      created_at: new Date().toISOString(),
    }));

    // 4. Persist team_members to Supabase authoritatively
    const { error: memErr } = await supabaseAdmin.from('team_members').insert(
      memberRecords.map((mem) => ({
        id: mem.id,
        team_id: canonicalTeamId,
        member_name: mem.member_name,
        email: mem.email,
        phone_number: mem.phone_number,
        semester: mem.semester,
        section: mem.section,
      }))
    );

    if (memErr) {
      console.error('[Import Error] Supabase team_members insert failed:', memErr);
      await supabaseAdmin.from('teams').delete().eq('id', canonicalTeamId);
      throw new Error(`Failed to persist team members for team "${teamRecord.team_name}": ${memErr.message}`);
    }

    // 5. Update local inMemoryDB cache after verified Supabase persistence
    for (const [id, t] of inMemoryDB.teams.entries()) {
      if (
        (t.team_code && t.team_code.toUpperCase() === cleanCode) ||
        (t.team_name && t.team_name.toUpperCase() === cleanName.toUpperCase()) ||
        id === canonicalTeamId
      ) {
        inMemoryDB.teams.delete(id);
      }
    }
    inMemoryDB.teams.set(canonicalTeamId, teamRecord);

    for (const [memId, mem] of inMemoryDB.teamMembers.entries()) {
      if (mem.team_id === canonicalTeamId) {
        inMemoryDB.teamMembers.delete(memId);
      }
    }
    memberRecords.forEach((mem) => inMemoryDB.teamMembers.set(mem.id, mem));

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
 * Gets team by Team Code or Team Name (Supabase Authoritative)
 */
export async function getTeamByCode(teamCode: string): Promise<Team | null> {
  if (!teamCode || typeof teamCode !== 'string') return null;
  const cleanCode = teamCode.trim();
  const cleanUpper = cleanCode.toUpperCase();

  // 1. Authoritative query to Supabase PostgreSQL by team_code first
  const { data: byCode, error: codeErr } = await supabaseAdmin
    .from('teams')
    .select('*')
    .eq('team_code', cleanUpper)
    .limit(1);

  if (codeErr) {
    console.error('[DB Read Error] getTeamByCode failed:', codeErr);
    throw new Error(`Database query error fetching team: ${codeErr.message}`);
  }

  if (byCode && byCode.length > 0) {
    const teamObj = byCode[0] as Team;
    const memTeam = inMemoryDB.teams.get(teamObj.id);
    if (memTeam && memTeam.access_code) {
      teamObj.access_code = memTeam.access_code;
    }
    inMemoryDB.teams.set(teamObj.id, teamObj);
    return teamObj;
  }

  // 2. Authoritative query by team_name
  const { data: byName, error: nameErr } = await supabaseAdmin
    .from('teams')
    .select('*')
    .ilike('team_name', cleanCode)
    .limit(1);

  if (nameErr) {
    console.error('[DB Read Error] getTeamByCode by name failed:', nameErr);
    throw new Error(`Database query error fetching team: ${nameErr.message}`);
  }

  if (byName && byName.length > 0) {
    const teamObj = byName[0] as Team;
    const memTeam = inMemoryDB.teams.get(teamObj.id);
    if (memTeam && memTeam.access_code) {
      teamObj.access_code = memTeam.access_code;
    }
    inMemoryDB.teams.set(teamObj.id, teamObj);
    return teamObj;
  }

  // 3. Non-production / test environment fallback
  if (!isProduction) {
    const normalizedCleanCode = cleanUpper.replace(/[^A-Z0-9]/gi, '');
    for (const team of inMemoryDB.teams.values()) {
      const code = (team.team_code || '').trim().toUpperCase();
      const name = (team.team_name || '').trim().toUpperCase();
      const normCode = code.replace(/[^A-Z0-9]/gi, '');

      if (code === cleanUpper || normCode === normalizedCleanCode || name === cleanUpper) {
        return team;
      }
    }
  }

  return null;
}

/**
 * Gets team details with members roster (Supabase Authoritative)
 */
export async function getTeamWithMembers(teamIdOrCode: string): Promise<TeamWithMembers | null> {
  if (!teamIdOrCode || typeof teamIdOrCode !== 'string') return null;
  const clean = teamIdOrCode.trim();

  let team: Team | null = null;

  // 1. If UUID, query Supabase by ID first
  if (isUUID(clean)) {
    const { data: byId } = await supabaseAdmin.from('teams').select('*').eq('id', clean).limit(1);
    if (byId && byId.length > 0) {
      team = byId[0] as Team;
    }
  }

  // 2. If not found by UUID, query by code or name
  if (!team) {
    team = await getTeamByCode(clean);
  }

  // 3. Fallback to inMemoryDB if Supabase has no record and in non-production
  if (!team && !isProduction) {
    team = inMemoryDB.teams.get(clean) || null;
    if (!team) {
      const cleanUpper = clean.toUpperCase();
      for (const t of inMemoryDB.teams.values()) {
        if (
          t.id === clean ||
          (t.team_code && t.team_code.trim().toUpperCase() === cleanUpper) ||
          (t.team_name && t.team_name.trim().toUpperCase() === cleanUpper)
        ) {
          team = t;
          break;
        }
      }
    }
  }

  if (!team) return null;

  const memTeam = inMemoryDB.teams.get(team.id);
  if (memTeam && memTeam.access_code) {
    team.access_code = memTeam.access_code;
  }

  // 4. Query Supabase for team_members (Authoritative Source of Truth)
  const { data: membersData, error: membersErr } = await supabaseAdmin
    .from('team_members')
    .select('*')
    .eq('team_id', team.id);

  if (membersErr) {
    console.error('[DB Read Error] getTeamWithMembers members fetch failed:', membersErr);
    throw new Error(`Database query error: ${membersErr.message}`);
  }

  let members: TeamMember[] = (membersData as TeamMember[]) || [];

  if (members.length === 0 && !isProduction) {
    members = Array.from(inMemoryDB.teamMembers.values()).filter((m) => m.team_id === team!.id);
  }

  // Update inMemoryDB cache
  inMemoryDB.teams.set(team.id, team);
  members.forEach((mem) => inMemoryDB.teamMembers.set(mem.id, mem));

  return { ...team, members };
}

/**
 * Gets all teams with member rosters (Supabase Authoritative)
 */
export async function getAllTeamsWithMembers(): Promise<TeamWithMembers[]> {
  const { data, error } = await supabaseAdmin.from('teams').select('*, team_members(*)');

  if (error) {
    console.error('[DB Read Error] getAllTeamsWithMembers failed:', error);
    throw new Error(`Database query error: ${error.message}`);
  }

  if (data && Array.isArray(data) && data.length > 0) {
    return data.map((t: any) => {
      const memTeam = inMemoryDB.teams.get(t.id);
      const teamObj: TeamWithMembers = {
        id: t.id,
        team_code: t.team_code,
        team_name: t.team_name,
        access_code_hash: t.access_code_hash,
        access_code: memTeam?.access_code || t.access_code,
        current_round: t.current_round,
        status: t.status,
        created_at: t.created_at,
        updated_at: t.updated_at,
        members: t.team_members || [],
      };
      inMemoryDB.teams.set(t.id, teamObj);
      if (t.team_members && Array.isArray(t.team_members)) {
        t.team_members.forEach((m: any) => inMemoryDB.teamMembers.set(m.id, m));
      }
      return teamObj;
    });
  }

  if (!isProduction) {
    const teamsMap = new Map<string, TeamWithMembers>();
    for (const team of inMemoryDB.teams.values()) {
      const members = Array.from(inMemoryDB.teamMembers.values()).filter((m) => m.team_id === team.id);
      teamsMap.set(team.id, { ...team, members });
    }
    return Array.from(teamsMap.values());
  }

  return [];
}

export const getAllTeams = getAllTeamsWithMembers;

/**
 * Safe Data Reconciliation helper:
 * Scans teams in memory and Supabase to ensure all member roster records
 * are correctly mapped to their canonical team UUID in Supabase and fully persisted.
 */
export async function reconcileTeamMembersData(): Promise<{ reconciledTeamsCount: number; reconciledMembersCount: number }> {
  let reconciledTeamsCount = 0;
  let reconciledMembersCount = 0;

  for (const team of inMemoryDB.teams.values()) {
    const mems = Array.from(inMemoryDB.teamMembers.values()).filter((m) => m.team_id === team.id);
    if (mems.length > 0) {
      try {
        const { data: dbMems } = await supabaseAdmin.from('team_members').select('*').eq('team_id', team.id);
        if (!dbMems || (Array.isArray(dbMems) && dbMems.length === 0)) {
          const { error: upsertErr } = await supabaseAdmin.from('team_members').upsert(
            mems.map((mem) => ({
              id: mem.id,
              team_id: team.id,
              member_name: mem.member_name,
              email: mem.email,
              phone_number: mem.phone_number,
              semester: mem.semester,
              section: mem.section,
            }))
          );
          if (!upsertErr) {
            reconciledTeamsCount++;
            reconciledMembersCount += mems.length;
          }
        }
      } catch (e) {}
    }
  }

  return { reconciledTeamsCount, reconciledMembersCount };
}

/**
 * Helper to ensure parent team exists in Supabase before creating submissions
 */
async function ensureParentTeamInSupabase(teamId: string): Promise<void> {
  const { data: dbTeam } = await supabaseAdmin.from('teams').select('id').eq('id', teamId).limit(1);
  if (dbTeam && dbTeam.length > 0) {
    return;
  }

  const memTeam = inMemoryDB.teams.get(teamId);
  if (memTeam) {
    const { access_code, ...teamDbRecord } = memTeam;
    await supabaseAdmin.from('teams').upsert(teamDbRecord, { onConflict: 'id' });
  }
}

/**
 * Resets database state for clean test isolation across test suites
 */
export async function resetDatabaseForTesting(): Promise<void> {
  inMemoryDB.teams.clear();
  inMemoryDB.teamMembers.clear();
  inMemoryDB.round1Submissions.clear();
  inMemoryDB.round2Submissions.clear();
  inMemoryDB.aiEvaluations.clear();
  inMemoryDB.round3Submissions.clear();
  inMemoryDB.round3ManualScores.clear();
  inMemoryDB.finalScores.clear();
  inMemoryDB.settings.clear();
  inMemoryDB.auditLogs.length = 0;

  try {
    await supabaseAdmin.from('final_scores').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('round3_submissions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('ai_evaluations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('round2_submissions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('round1_submissions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('team_members').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('teams').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabaseAdmin.from('competition_settings').delete().neq('key', 'default_never_match');
  } catch (err) {
    console.error('[Reset Error] resetDatabaseForTesting failed:', err);
  }
}

/**
 * Round 1 Submission handling (Supabase Authoritative)
 */
export async function upsertRound1Submission(sub: Partial<Round1Submission> & { team_id: string }): Promise<Round1Submission> {
  await ensureParentTeamInSupabase(sub.team_id);
  const { data: dbSub } = await supabaseAdmin.from('round1_submissions').select('id, created_at, submitted_at').eq('team_id', sub.team_id).limit(1);
  const existing = dbSub && dbSub.length > 0 ? dbSub[0] : null;
  const now = new Date().toISOString();

  const record: Round1Submission = {
    id: existing?.id || generateUUID(),
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

  const { data: savedSub, error } = await supabaseAdmin
    .from('round1_submissions')
    .upsert(record, { onConflict: 'team_id' })
    .select('id')
    .single();

  if (error || !savedSub) {
    console.error('[DB Write Error] upsertRound1Submission failed:', error);
    throw new Error(`Failed to persist Round 1 submission: ${error?.message}`);
  }

  record.id = savedSub.id;
  inMemoryDB.round1Submissions.set(record.id, record);

  await logAuditEvent({
    actor: `TEAM:${sub.team_id}`,
    action: sub.status === 'SUBMITTED' ? 'SUBMIT_ROUND_1' : 'SAVE_DRAFT_ROUND_1',
    entity: 'ROUND1_SUBMISSION',
    entity_id: record.id,
  });

  return record;
}

export async function getRound1Submission(teamId: string): Promise<Round1Submission | null> {
  const { data, error } = await supabaseAdmin
    .from('round1_submissions')
    .select('*')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('[DB Read Error] getRound1Submission failed:', error);
    throw new Error(`Database error reading Round 1 submission: ${error.message}`);
  }

  if (data && data.length > 0) {
    const record = data[0] as Round1Submission;
    inMemoryDB.round1Submissions.set(record.id, record);
    return record;
  }

  if (!isProduction) {
    return Array.from(inMemoryDB.round1Submissions.values()).find((r) => r.team_id === teamId) || null;
  }

  return null;
}

/**
 * Round 2 Submission handling (Supabase Authoritative)
 */
export async function upsertRound2Submission(sub: Partial<Round2Submission> & { team_id: string }): Promise<Round2Submission> {
  await ensureParentTeamInSupabase(sub.team_id);
  const { data: dbSub } = await supabaseAdmin.from('round2_submissions').select('id, created_at, submitted_at').eq('team_id', sub.team_id).limit(1);
  const existing = dbSub && dbSub.length > 0 ? dbSub[0] : null;
  const now = new Date().toISOString();

  const record: Round2Submission = {
    id: existing?.id || generateUUID(),
    team_id: sub.team_id,
    hero_data: sub.hero_data || { name: '', personality: '', goal: '', strengths: '', weakness: '', conflict: '', description: '' },
    villain_data: sub.villain_data || { name: '', personality: '', goal: '', strengths: '', weakness: '', conflict: '', description: '' },
    supporting_character_data: sub.supporting_character_data || undefined,
    hero_prompt: sub.hero_prompt || '',
    villain_prompt: sub.villain_prompt || '',
    supporting_character_prompt: sub.supporting_character_prompt || '',
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

  const { data: savedSub, error } = await supabaseAdmin
    .from('round2_submissions')
    .upsert(record, { onConflict: 'team_id' })
    .select('id')
    .single();

  if (error || !savedSub) {
    console.error('[DB Write Error] upsertRound2Submission failed:', error);
    throw new Error(`Failed to persist Round 2 submission: ${error?.message}`);
  }

  record.id = savedSub.id;
  inMemoryDB.round2Submissions.set(record.id, record);

  await logAuditEvent({
    actor: `TEAM:${sub.team_id}`,
    action: sub.status === 'SUBMITTED' ? 'SUBMIT_ROUND_2' : 'SAVE_DRAFT_ROUND_2',
    entity: 'ROUND2_SUBMISSION',
    entity_id: record.id,
  });

  if (sub.status === 'SUBMITTED' || sub.status === 'PENDING_AI') {
    triggerAIJudgeForSubmission(record.id).catch(console.error);
  }

  return record;
}

export async function getRound2Submission(teamId: string): Promise<Round2Submission | null> {
  const { data, error } = await supabaseAdmin
    .from('round2_submissions')
    .select('*')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('[DB Read Error] getRound2Submission failed:', error);
    throw new Error(`Database error reading Round 2 submission: ${error.message}`);
  }

  if (data && data.length > 0) {
    const record = data[0] as Round2Submission;
    inMemoryDB.round2Submissions.set(record.id, record);
    return record;
  }

  if (!isProduction) {
    return Array.from(inMemoryDB.round2Submissions.values()).find((r) => r.team_id === teamId) || null;
  }

  return null;
}

/**
 * Triggers AI evaluation for a Round 2 Submission (Supabase Authoritative)
 */
export async function triggerAIJudgeForSubmission(round2SubId: string): Promise<AIEvaluation> {
  // 1. Prevent duplicate evaluations
  const existingEval = await getAIEvaluationBySubmissionId(round2SubId);
  if (existingEval) {
    return existingEval;
  }

  const { data: subData, error: subFetchErr } = await supabaseAdmin
    .from('round2_submissions')
    .select('*')
    .eq('id', round2SubId)
    .maybeSingle();

  let sub: Round2Submission | undefined = subData as Round2Submission | undefined;

  if (!sub && !isProduction) {
    for (const s of inMemoryDB.round2Submissions.values()) {
      if (s.id === round2SubId) { sub = s; break; }
    }
  }

  if (!sub) {
    throw new Error('Round 2 Submission not found');
  }

  // Ensure parent team and round2_submissions exist in Supabase before ai_evaluations insert
  await ensureParentTeamInSupabase(sub.team_id);
  const { data: dbSub } = await supabaseAdmin.from('round2_submissions').select('id').eq('id', round2SubId).maybeSingle();
  if (!dbSub) {
    await supabaseAdmin.from('round2_submissions').upsert(sub, { onConflict: 'team_id' });
  }

  let evalResult: any;
  try {
    evalResult = await executeAIJudgingPipeline(sub);
  } catch (err: any) {
    console.error('Unhandled AI Pipeline Exception:', err);
    evalResult = {
      safety: {
        status: 'REVIEW_REQUIRED',
        reason: `AI execution failure: ${err?.message || 'Unexpected exception'}`,
        confidence: 0,
      },
      scores: {
        character_development: 0,
        relationship: 0,
        originality: 0,
        visual_quality: 0,
        prompt_quality: 0,
        prompt_image_consistency: 0,
      },
      total_score: 0,
      decision: 'REVIEW_REQUIRED',
      feedback: ['AI evaluation exception occurred. Submission queued for manual review.'],
    };
  }

  const now = new Date().toISOString();

  let processingStatus: 'COMPLETED' | 'REVIEW_REQUIRED' | 'FAILED' | 'DISQUALIFIED' = 'COMPLETED';
  if (evalResult.safety.status === 'FAIL' || evalResult.decision === 'DISQUALIFIED') {
    processingStatus = 'DISQUALIFIED';
  } else if (evalResult.safety.status === 'REVIEW_REQUIRED' || evalResult.decision === 'REVIEW_REQUIRED') {
    processingStatus = 'REVIEW_REQUIRED';
  }

  const aiEvalRecord: AIEvaluation = {
    id: generateUUID(),
    round2_submission_id: round2SubId,
    safety_status: evalResult.safety.status,
    safety_reason: evalResult.safety.reason,
    safety_confidence: evalResult.safety.confidence,
    validation: evalResult.validation,
    character_development_score: evalResult.scores.character_development,
    relationship_score: evalResult.scores.relationship,
    originality_score: evalResult.scores.originality,
    visual_quality_score: evalResult.scores.visual_quality,
    prompt_quality_score: evalResult.scores.prompt_quality,
    prompt_image_consistency_score: evalResult.scores.prompt_image_consistency,
    total_score: evalResult.total_score,
    decision: evalResult.decision,
    evaluation_status: processingStatus,
    feedback: evalResult.feedback,
    evaluated_at: now,
    created_at: now,
  };

  const { evaluation_status, validation, ...aiEvalDbPayload } = aiEvalRecord;
  const { error: evalErr } = await supabaseAdmin.from('ai_evaluations').upsert(aiEvalDbPayload);
  if (evalErr) {
    console.error('[DB Write Error] AI evaluation upsert failed:', evalErr);
    throw new Error(`Failed to persist AI evaluation: ${evalErr.message}`);
  }

  const { error: subUpdateErr } = await supabaseAdmin
    .from('round2_submissions')
    .update({ status: 'EVALUATED', updated_at: now })
    .eq('id', round2SubId);

  if (subUpdateErr) {
    console.error('[DB Write Error] Submission status update failed:', subUpdateErr);
  }

  inMemoryDB.aiEvaluations.set(aiEvalRecord.id, aiEvalRecord);
  sub.status = 'EVALUATED';
  sub.updated_at = now;

  // Update team qualification status
  if (evalResult.decision === 'QUALIFIED') {
    await updateTeamAndMembers(sub.team_id, { status: 'QUALIFIED', current_round: 3 });
  } else if (evalResult.decision === 'DISQUALIFIED' || evalResult.safety.status === 'FAIL') {
    await updateTeamAndMembers(sub.team_id, { status: 'DISQUALIFIED' });
  }

  await logAuditEvent({
    actor: 'SYSTEM_AI_JUDGE',
    action: 'AI_EVALUATION_COMPLETED',
    entity: 'AI_EVALUATION',
    entity_id: aiEvalRecord.id,
    metadata: {
      team_id: sub.team_id,
      decision: evalResult.decision,
      safety_status: evalResult.safety.status,
      total_score: evalResult.total_score,
    },
  });

  return aiEvalRecord;
}

export async function getAIEvaluationBySubmissionId(round2SubId: string): Promise<AIEvaluation | null> {
  const { data, error } = await supabaseAdmin
    .from('ai_evaluations')
    .select('*')
    .eq('round2_submission_id', round2SubId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('[DB Read Error] getAIEvaluationBySubmissionId failed:', error);
    throw new Error(`Database error reading AI evaluation: ${error.message}`);
  }

  if (data && data.length > 0) {
    const record = data[0] as AIEvaluation;
    inMemoryDB.aiEvaluations.set(record.id, record);
    return record;
  }

  if (!isProduction) {
    return Array.from(inMemoryDB.aiEvaluations.values()).find((a) => a.round2_submission_id === round2SubId) || null;
  }

  return null;
}

/**
 * Round 3 Submission handling (Supabase Authoritative)
 */
export async function upsertRound3Submission(sub: Partial<Round3Submission> & { team_id: string }): Promise<Round3Submission> {
  await ensureParentTeamInSupabase(sub.team_id);
  const { data: dbSub } = await supabaseAdmin.from('round3_submissions').select('id, created_at, submitted_at').eq('team_id', sub.team_id).limit(1);
  const existing = dbSub && dbSub.length > 0 ? dbSub[0] : null;
  const now = new Date().toISOString();

  const record: Round3Submission = {
    id: existing?.id || generateUUID(),
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

  const { data: savedSub, error } = await supabaseAdmin
    .from('round3_submissions')
    .upsert(record, { onConflict: 'team_id' })
    .select('id')
    .single();

  if (error || !savedSub) {
    console.error('[DB Write Error] upsertRound3Submission failed:', error);
    throw new Error(`Failed to persist Round 3 submission: ${error?.message}`);
  }

  record.id = savedSub.id;
  inMemoryDB.round3Submissions.set(record.id, record);

  await logAuditEvent({
    actor: `TEAM:${sub.team_id}`,
    action: sub.status === 'SUBMITTED' ? 'SUBMIT_ROUND_3' : 'SAVE_DRAFT_ROUND_3',
    entity: 'ROUND3_SUBMISSION',
    entity_id: record.id,
  });

  return record;
}

export async function getRound3Submission(teamId: string): Promise<Round3Submission | null> {
  const { data, error } = await supabaseAdmin
    .from('round3_submissions')
    .select('*')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('[DB Read Error] getRound3Submission failed:', error);
    throw new Error(`Database error reading Round 3 submission: ${error.message}`);
  }

  if (data && data.length > 0) {
    const record = data[0] as Round3Submission;
    inMemoryDB.round3Submissions.set(record.id, record);
    return record;
  }

  if (!isProduction) {
    return Array.from(inMemoryDB.round3Submissions.values()).find((r) => r.team_id === teamId) || null;
  }

  return null;
}

/**
 * Round 3 Manual Judging Score Submissions
 */
export async function submitRound3ManualScore(
  round3SubId: string,
  teamId: string,
  judgeId: string,
  judgeName: string,
  scores: {
    marketing_strategy_score: number;
    tagline_punch_score: number;
    audience_engagement_score: number;
    copywriting_quality_score: number;
    visual_poster_quality_score: number;
  },
  comments?: string,
  status: 'DRAFT' | 'SUBMITTED' | 'LOCKED' = 'SUBMITTED'
): Promise<Round3ManualScore> {
  const now = new Date().toISOString();
  
  const mkt = Math.min(25, Math.max(0, scores.marketing_strategy_score || 0));
  const tag = Math.min(20, Math.max(0, scores.tagline_punch_score || 0));
  const aud = Math.min(20, Math.max(0, scores.audience_engagement_score || 0));
  const copy = Math.min(20, Math.max(0, scores.copywriting_quality_score || 0));
  const post = Math.min(15, Math.max(0, scores.visual_poster_quality_score || 0));
  
  const total_score = mkt + tag + aud + copy + post;

  const existingScores = await getRound3ManualScoresForSubmission(round3SubId);
  const existingScore = existingScores.find((s) => s.judge_id === judgeId);

  const record: Round3ManualScore = {
    id: existingScore?.id || generateUUID(),
    round3_submission_id: round3SubId,
    team_id: teamId,
    judge_id: judgeId,
    judge_name: judgeName,
    marketing_strategy_score: mkt,
    tagline_punch_score: tag,
    audience_engagement_score: aud,
    copywriting_quality_score: copy,
    visual_poster_quality_score: post,
    total_score,
    comments: comments || '',
    status,
    created_at: existingScore?.created_at || now,
    updated_at: now,
  };

  inMemoryDB.round3ManualScores.set(record.id, record);

  try {
    const { error } = await supabaseAdmin.from('round3_manual_scores').upsert(record);
    if (error && error.code !== 'PGRST301' && error.code !== 'PGRST205') {
      console.error('[DB Write Error] submitRound3ManualScore failed:', error);
    }
  } catch (e) {}

  const r3sub = await getRound3Submission(teamId);
  if (r3sub && status === 'SUBMITTED') {
    r3sub.status = 'EVALUATED';
    inMemoryDB.round3Submissions.set(r3sub.id, r3sub);
  }

  await logAuditEvent({
    actor: `JUDGE:${judgeId}:${judgeName}`,
    action: 'SUBMIT_ROUND3_MANUAL_SCORE',
    entity: 'ROUND3_MANUAL_SCORE',
    entity_id: record.id,
    metadata: { team_id: teamId, total_score, status },
  });

  return record;
}

export async function getRound3ManualScoresForSubmission(round3SubId: string): Promise<Round3ManualScore[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('round3_manual_scores')
      .select('*')
      .eq('round3_submission_id', round3SubId);

    if (!error && data && data.length > 0) {
      return data as Round3ManualScore[];
    }
  } catch (e) {}

  return Array.from(inMemoryDB.round3ManualScores.values()).filter((s) => s.round3_submission_id === round3SubId);
}

export async function getRound3ManualScoresForTeam(teamId: string): Promise<Round3ManualScore[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('round3_manual_scores')
      .select('*')
      .eq('team_id', teamId);

    if (!error && data && data.length > 0) {
      return data as Round3ManualScore[];
    }
  } catch (e) {}

  return Array.from(inMemoryDB.round3ManualScores.values()).filter((s) => s.team_id === teamId);
}

/**
 * Offline Final Pitch Human Scores handling (Supabase Authoritative)
 */
export async function addFinalScore(teamId: string, judgeId: string, score: number, comments?: string, judgeName?: string): Promise<FinalScore> {
  await ensureParentTeamInSupabase(teamId);
  const record: FinalScore = {
    id: generateUUID(),
    team_id: teamId,
    judge_id: judgeId,
    judge_name: judgeName || `Judge ${judgeId}`,
    score,
    comments: comments || '',
    created_at: new Date().toISOString(),
  };

  await supabaseAdmin.from('final_scores').delete().eq('team_id', teamId).eq('judge_id', judgeId);

  // Strip judge_name when inserting to Supabase because final_scores schema lacks judge_name column
  const { judge_name, ...dbRecord } = record;
  const { error } = await supabaseAdmin.from('final_scores').insert(dbRecord);

  if (error) {
    console.error('[DB Write Error] addFinalScore failed:', error);
    throw new Error(`Failed to persist final score: ${error.message}`);
  }

  inMemoryDB.finalScores.set(record.id, record);

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
  const { data, error } = await supabaseAdmin.from('final_scores').select('*').eq('team_id', teamId);

  if (error) {
    console.error('[DB Read Error] getFinalScoresForTeam failed:', error);
    throw new Error(`Database error reading final scores: ${error.message}`);
  }

  if (data && data.length > 0) {
    return data.map((item: any) => {
      const memScore = Array.from(inMemoryDB.finalScores.values()).find((f) => f.id === item.id);
      return {
        ...item,
        judge_name: memScore?.judge_name || (item.judge_id === 'judge-1' ? 'Judge Alpha' : item.judge_id === 'judge-2' ? 'Judge Beta' : `Judge ${item.judge_id}`),
      };
    }) as FinalScore[];
  }

  if (!isProduction) {
    return Array.from(inMemoryDB.finalScores.values()).filter((f) => f.team_id === teamId);
  }

  return [];
}

/**
 * Admin override for safety / AI evaluation
 */
export async function adminOverrideSafety(round2SubId: string, newSafetyStatus: 'PASS' | 'FAIL', reason: string): Promise<AIEvaluation> {
  const aiEval = await getAIEvaluationBySubmissionId(round2SubId);
  if (!aiEval) throw new Error('AI Evaluation not found');

  const prevSafety = aiEval.safety_status;
  const prevDecision = aiEval.decision;

  aiEval.safety_status = newSafetyStatus;
  aiEval.safety_reason = `Admin Override: ${reason}`;
  aiEval.decision = newSafetyStatus === 'PASS' ? 'QUALIFIED' : 'DISQUALIFIED';
  aiEval.evaluation_status = newSafetyStatus === 'PASS' ? 'COMPLETED' : 'DISQUALIFIED';

  const { error } = await supabaseAdmin.from('ai_evaluations').update({
    safety_status: aiEval.safety_status,
    safety_reason: aiEval.safety_reason,
    decision: aiEval.decision,
  }).eq('id', aiEval.id);

  if (error) {
    console.error('[DB Write Error] adminOverrideSafety failed:', error);
    throw new Error(`Failed to persist safety override: ${error.message}`);
  }

  inMemoryDB.aiEvaluations.set(aiEval.id, aiEval);

  const sub = await getRound2Submission(round2SubId);
  if (sub) {
    await updateTeamAndMembers(sub.team_id, {
      status: aiEval.decision === 'QUALIFIED' ? 'QUALIFIED' : 'DISQUALIFIED',
    });
  }

  await logAuditEvent({
    actor: 'ADMIN',
    action: 'ADMIN_SAFETY_OVERRIDE',
    entity: 'AI_EVALUATION',
    entity_id: aiEval.id,
    previous_value: { safety_status: prevSafety, decision: prevDecision },
    new_value: { safety_status: newSafetyStatus, decision: aiEval.decision },
    reason,
  });

  return aiEval;
}

/**
 * Explicit Admin Qualification Override for a Team
 */
export async function overrideTeamQualification(
  teamId: string,
  newStatus: 'ACTIVE' | 'QUALIFIED' | 'DISQUALIFIED' | 'ELIMINATED',
  reason: string
): Promise<TeamWithMembers | null> {
  const team = await getTeamWithMembers(teamId);
  const prevStatus = team?.status || 'UNKNOWN';

  const updated = await updateTeamAndMembers(teamId, { status: newStatus });

  await logAuditEvent({
    actor: 'ADMIN',
    action: 'ADMIN_QUALIFICATION_OVERRIDE',
    entity: 'TEAM',
    entity_id: teamId,
    previous_value: prevStatus,
    new_value: newStatus,
    reason,
  });

  return updated;
}

/**
 * Updates a team's details and members roster (Supabase Authoritative)
 */
export async function updateTeamAndMembers(
  teamId: string,
  teamUpdates: { team_name?: string; status?: 'ACTIVE' | 'QUALIFIED' | 'DISQUALIFIED' | 'ELIMINATED'; current_round?: number; access_code?: string },
  membersUpdates?: Array<{ id?: string; member_name: string; email: string; phone_number: string; semester: string; section: string }>
): Promise<TeamWithMembers | null> {
  await ensureParentTeamInSupabase(teamId);
  let newHash: string | undefined;
  if (teamUpdates.access_code) {
    newHash = await hashAccessCode(teamUpdates.access_code);
  }

  const teamPayload: any = {
    ...(teamUpdates.team_name && { team_name: teamUpdates.team_name }),
    ...(teamUpdates.status && { status: teamUpdates.status }),
    ...(teamUpdates.current_round !== undefined && { current_round: teamUpdates.current_round }),
    ...(newHash && { access_code_hash: newHash }),
    updated_at: new Date().toISOString(),
  };

  if (Object.keys(teamPayload).length > 0) {
    const { error } = await supabaseAdmin.from('teams').update(teamPayload).eq('id', teamId);
    if (error) {
      console.error('[DB Write Error] updateTeamAndMembers team update failed:', error);
      throw new Error(`Failed to update team record: ${error.message}`);
    }
  }

  if (membersUpdates) {
    for (const mem of membersUpdates) {
      if (mem.id) {
        const { error: memErr } = await supabaseAdmin.from('team_members').update(mem).eq('id', mem.id);
        if (memErr) {
          console.error('[DB Write Error] updateTeamAndMembers member update failed:', memErr);
          throw new Error(`Failed to update team member record: ${memErr.message}`);
        }
      }
    }
  }

  // Update inMemoryDB cache
  const existingTeam = inMemoryDB.teams.get(teamId);
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
 * Deletes a team and all associated members and submissions (Supabase Authoritative)
 */
export async function deleteTeam(teamId: string): Promise<boolean> {
  const { error: memErr } = await supabaseAdmin.from('team_members').delete().eq('team_id', teamId);
  if (memErr) {
    console.error('[DB Write Error] deleteTeam members failed:', memErr);
  }

  const { error: teamErr } = await supabaseAdmin.from('teams').delete().eq('id', teamId);
  if (teamErr) {
    console.error('[DB Write Error] deleteTeam failed:', teamErr);
    throw new Error(`Failed to delete team from database: ${teamErr.message}`);
  }

  inMemoryDB.teams.delete(teamId);
  for (const [id, mem] of inMemoryDB.teamMembers.entries()) {
    if (mem.team_id === teamId) inMemoryDB.teamMembers.delete(id);
  }

  await logAuditEvent({
    actor: 'ADMIN',
    action: 'DELETE_TEAM',
    entity: 'TEAM',
    entity_id: teamId,
  });

  return true;
}

/**
 * Authoritative Round Lifecycle Settings
 */
export async function getCompetitionLifecycle(): Promise<CompetitionLifecycleSettings> {
  const defaultLifecycle: CompetitionLifecycleSettings = {
    active_round: 1,
    round1: { status: 'OPEN', last_changed_at: new Date().toISOString(), last_changed_by: 'SYSTEM' },
    round2: { status: 'STANDBY', last_changed_at: new Date().toISOString(), last_changed_by: 'SYSTEM' },
    round3: { status: 'STANDBY', manual_judging_open: false, last_changed_at: new Date().toISOString(), last_changed_by: 'SYSTEM' },
    top5_locked: false,
    ai_queue_paused: false,
  };

  try {
    const { data, error } = await supabaseAdmin.from('competition_settings').select('*').eq('key', 'round_lifecycle').maybeSingle();
    if (!error && data && data.value) {
      return { ...defaultLifecycle, ...data.value };
    }
  } catch (err) {}

  const memSettings = inMemoryDB.settings.get('round_lifecycle');
  if (memSettings) {
    return { ...defaultLifecycle, ...memSettings };
  }

  inMemoryDB.settings.set('round_lifecycle', defaultLifecycle);
  return defaultLifecycle;
}

export async function updateRoundLifecycle(
  updates: Partial<CompetitionLifecycleSettings>,
  actor: string = 'ADMIN',
  reason?: string
): Promise<CompetitionLifecycleSettings> {
  const current = await getCompetitionLifecycle();
  const updated: CompetitionLifecycleSettings = {
    ...current,
    ...updates,
    round1: updates.round1 ? { ...current.round1, ...updates.round1, last_changed_at: new Date().toISOString(), last_changed_by: actor } : current.round1,
    round2: updates.round2 ? { ...current.round2, ...updates.round2, last_changed_at: new Date().toISOString(), last_changed_by: actor } : current.round2,
    round3: updates.round3 ? { ...current.round3, ...updates.round3, last_changed_at: new Date().toISOString(), last_changed_by: actor } : current.round3,
  };

  inMemoryDB.settings.set('round_lifecycle', updated);

  try {
    const { error: settingsErr } = await supabaseAdmin
      .from('competition_settings')
      .upsert({ key: 'round_lifecycle', value: updated }, { onConflict: 'key' });
    if (settingsErr) {
      console.error('[Settings Write Error] Failed to persist competition_settings:', settingsErr);
    }
  } catch (err) {
    console.error('[Settings Write Exception] Failed to persist competition_settings:', err);
  }

  await logAuditEvent({
    actor,
    action: 'UPDATE_ROUND_LIFECYCLE',
    entity: 'LIFECYCLE_SETTINGS',
    entity_id: 'round_lifecycle',
    previous_value: current,
    new_value: updated,
    reason: reason || 'Admin state transition',
  });

  return updated;
}

export interface RoundSettings {
  round1: 'OPEN' | 'CLOSED';
  round2: 'OPEN' | 'CLOSED';
  round3: 'OPEN' | 'CLOSED';
  top5_locked: boolean;
}

/**
 * Gets legacy round settings for backward compatibility
 */
export async function getRoundSettings(): Promise<RoundSettings> {
  const lc = await getCompetitionLifecycle();
  return {
    round1: lc.round1.status === 'OPEN' ? 'OPEN' : 'CLOSED',
    round2: lc.round2.status === 'OPEN' ? 'OPEN' : 'CLOSED',
    round3: lc.round3.status === 'OPEN' ? 'OPEN' : 'CLOSED',
    top5_locked: lc.top5_locked,
  };
}

export async function updateRoundSettings(newSettings: Partial<{ round1: 'OPEN' | 'CLOSED'; round2: 'OPEN' | 'CLOSED'; round3: 'OPEN' | 'CLOSED'; top5_locked: boolean }>): Promise<{ round1: 'OPEN' | 'CLOSED'; round2: 'OPEN' | 'CLOSED'; round3: 'OPEN' | 'CLOSED'; top5_locked: boolean }> {
  const currentLc = await getCompetitionLifecycle();
  const updates: Partial<CompetitionLifecycleSettings> = {};

  if (newSettings.round1) updates.round1 = { ...currentLc.round1, status: newSettings.round1 === 'OPEN' ? 'OPEN' : 'LOCKED' };
  if (newSettings.round2) updates.round2 = { ...currentLc.round2, status: newSettings.round2 === 'OPEN' ? 'OPEN' : 'LOCKED' };
  if (newSettings.round3) updates.round3 = { ...currentLc.round3, status: newSettings.round3 === 'OPEN' ? 'OPEN' : 'LOCKED' };
  if (newSettings.top5_locked !== undefined) updates.top5_locked = newSettings.top5_locked;

  await updateRoundLifecycle(updates, 'ADMIN', 'Legacy settings toggle');
  return getRoundSettings();
}

/**
 * Complete Team Inspection / Dossier Generator
 */
export async function getTeamDossier(teamId: string): Promise<TeamDossierData | null> {
  const teamWithMembers = await getTeamWithMembers(teamId);
  if (!teamWithMembers) return null;

  const round1 = await getRound1Submission(teamId);
  const round2 = await getRound2Submission(teamId);
  let round2Evaluation: AIEvaluation | null = null;

  if (round2) {
    round2Evaluation = await getAIEvaluationBySubmissionId(round2.id);
  }

  const round3 = await getRound3Submission(teamId);
  const round3ManualScores = await getRound3ManualScoresForTeam(teamId);
  const finalScores = await getFinalScoresForTeam(teamId);
  const allLogs = await getAuditLogs();
  const teamLogs = allLogs.filter(
    (l) => l.entity_id === teamId || l.metadata?.team_id === teamId || l.actor === `TEAM:${teamId}`
  );

  return {
    team: teamWithMembers,
    members: teamWithMembers.members,
    round1,
    round2,
    round2Evaluation,
    round3,
    round3ManualScores,
    finalScores,
    auditLogs: teamLogs,
  };
}

/**
 * Retrieves all teams with full inspection summaries for Admin Dashboard
 */
export async function getTeamsWithFullInspection(): Promise<Array<{
  team: Team;
  members: TeamMember[];
  round1Status: 'NOT_STARTED' | 'DRAFT' | 'SUBMITTED' | 'LOCKED';
  round2Status: 'NOT_STARTED' | 'DRAFT' | 'SUBMITTED' | 'PENDING_AI' | 'EVALUATED' | 'LOCKED';
  round2SafetyStatus?: string;
  round2Score?: number;
  round2Decision?: string;
  round3Status: 'NOT_STARTED' | 'DRAFT' | 'SUBMITTED' | 'EVALUATED' | 'LOCKED';
  round3AverageScore?: number;
  finalScoreAverage?: number;
}>> {
  const teams = await getAllTeamsWithMembers();
  const result = [];

  for (const team of teams) {
    const r1 = await getRound1Submission(team.id);
    const r2 = await getRound2Submission(team.id);
    let r2Eval: AIEvaluation | null = null;
    if (r2) {
      r2Eval = await getAIEvaluationBySubmissionId(r2.id);
    }
    const r3 = await getRound3Submission(team.id);
    const r3Scores = await getRound3ManualScoresForTeam(team.id);
    const fScores = await getFinalScoresForTeam(team.id);

    let r3Avg = 0;
    if (r3Scores.length > 0) {
      const sum = r3Scores.reduce((acc, curr) => acc + curr.total_score, 0);
      r3Avg = Math.round((sum / r3Scores.length) * 10) / 10;
    }

    let fAvg = 0;
    if (fScores.length > 0) {
      const sum = fScores.reduce((acc, curr) => acc + curr.score, 0);
      fAvg = Math.round((sum / fScores.length) * 10) / 10;
    }

    result.push({
      team,
      members: team.members,
      round1Status: r1 ? r1.status : ('NOT_STARTED' as const),
      round2Status: r2 ? r2.status : ('NOT_STARTED' as const),
      round2SafetyStatus: r2Eval?.safety_status,
      round2Score: r2Eval?.total_score,
      round2Decision: r2Eval?.decision,
      round3Status: r3 ? r3.status : ('NOT_STARTED' as const),
      round3AverageScore: r3Scores.length > 0 ? r3Avg : undefined,
      finalScoreAverage: fScores.length > 0 ? fAvg : undefined,
    });
  }

  return result;
}

/**
 * Safe Admin-Only Team Reset Handler (Supabase Authoritative)
 */
export async function resetTeamProgress(
  teamIdParam: string,
  scopes: TeamResetScope[],
  reason?: string,
  adminActor: string = 'ADMIN'
): Promise<TeamResetResult> {
  if (!teamIdParam || typeof teamIdParam !== 'string') {
    throw new Error('Valid team_id parameter is required.');
  }

  if (!scopes || !Array.isArray(scopes) || scopes.length === 0) {
    throw new Error('At least one reset scope must be selected.');
  }

  const teamWithMembers = await getTeamWithMembers(teamIdParam);
  if (!teamWithMembers) {
    throw new Error(`Team with ID "${teamIdParam}" not found.`);
  }

  const teamId = teamWithMembers.id;

  const isResetAll = scopes.includes('all') || scopes.includes('reset_all' as any);
  const activeScopes: Set<TeamResetScope> = isResetAll
    ? new Set(['round1', 'round2', 'round3', 'final_pitch', 'ai_evaluations', 'assets'])
    : new Set(scopes);

  const s3PathsToDelete: (string | null | undefined)[] = [];

  const r1Sub = await getRound1Submission(teamId);
  const r2Sub = await getRound2Submission(teamId);
  const r3Sub = await getRound3Submission(teamId);

  if (r1Sub?.s3_path) s3PathsToDelete.push(r1Sub.s3_path);
  if (r2Sub) {
    if (r2Sub.hero_image_s3_path) s3PathsToDelete.push(r2Sub.hero_image_s3_path);
    if (r2Sub.villain_image_s3_path) s3PathsToDelete.push(r2Sub.villain_image_s3_path);
    if (r2Sub.supporting_character_image_s3_path) s3PathsToDelete.push(r2Sub.supporting_character_image_s3_path);
  }
  if (r3Sub?.promotional_asset_s3_path) s3PathsToDelete.push(r3Sub.promotional_asset_s3_path);

  // Round 1 Reset
  if (activeScopes.has('round1')) {
    const { error } = await supabaseAdmin.from('round1_submissions').delete().eq('team_id', teamId);
    if (error) console.error('[Reset Error] Round 1 delete failed:', error);
    for (const [id, r] of inMemoryDB.round1Submissions.entries()) {
      if (r.team_id === teamId) inMemoryDB.round1Submissions.delete(id);
    }
  }

  // Round 2 Reset
  if (activeScopes.has('round2')) {
    if (r2Sub) {
      const { error } = await supabaseAdmin.from('ai_evaluations').delete().eq('round2_submission_id', r2Sub.id);
      if (error) console.error('[Reset Error] AI evaluations delete failed:', error);
      for (const [id, evalItem] of inMemoryDB.aiEvaluations.entries()) {
        if (evalItem.round2_submission_id === r2Sub.id) inMemoryDB.aiEvaluations.delete(id);
      }
    }

    const { error } = await supabaseAdmin.from('round2_submissions').delete().eq('team_id', teamId);
    if (error) console.error('[Reset Error] Round 2 delete failed:', error);
    for (const [id, r] of inMemoryDB.round2Submissions.entries()) {
      if (r.team_id === teamId) inMemoryDB.round2Submissions.delete(id);
    }
  }

  // Round 3 Reset
  if (activeScopes.has('round3')) {
    try {
      await supabaseAdmin.from('round3_manual_scores').delete().eq('team_id', teamId);
    } catch (e) {}
    for (const [id, sc] of inMemoryDB.round3ManualScores.entries()) {
      if (sc.team_id === teamId || (r3Sub && sc.round3_submission_id === r3Sub.id)) inMemoryDB.round3ManualScores.delete(id);
    }

    const { error } = await supabaseAdmin.from('round3_submissions').delete().eq('team_id', teamId);
    if (error) console.error('[Reset Error] Round 3 delete failed:', error);
    for (const [id, r] of inMemoryDB.round3Submissions.entries()) {
      if (r.team_id === teamId) inMemoryDB.round3Submissions.delete(id);
    }
  }

  // Final Pitch Reset
  if (activeScopes.has('final_pitch')) {
    const { error } = await supabaseAdmin.from('final_scores').delete().eq('team_id', teamId);
    if (error) console.error('[Reset Error] Final scores delete failed:', error);
    for (const [id, fs] of inMemoryDB.finalScores.entries()) {
      if (fs.team_id === teamId) inMemoryDB.finalScores.delete(id);
    }
  }

  // AI Evaluations Reset
  if (activeScopes.has('ai_evaluations') && !activeScopes.has('round2')) {
    if (r2Sub) {
      const { error } = await supabaseAdmin.from('ai_evaluations').delete().eq('round2_submission_id', r2Sub.id);
      if (error) console.error('[Reset Error] AI evaluations delete failed:', error);
      for (const [id, evalItem] of inMemoryDB.aiEvaluations.entries()) {
        if (evalItem.round2_submission_id === r2Sub.id) inMemoryDB.aiEvaluations.delete(id);
      }

      r2Sub.status = 'SUBMITTED';
      r2Sub.updated_at = new Date().toISOString();
      await supabaseAdmin.from('round2_submissions').update({ status: 'SUBMITTED', updated_at: r2Sub.updated_at }).eq('id', r2Sub.id);
      inMemoryDB.round2Submissions.set(r2Sub.id, r2Sub);
    }
  }

  // S3 Assets Reset
  let s3Report: { success: boolean; deletedCount: number; errors: string[]; isMock: boolean } | undefined;
  if (activeScopes.has('assets')) {
    s3Report = await deleteTeamS3Assets(teamId, s3PathsToDelete);

    if (!activeScopes.has('round1') && r1Sub) {
      r1Sub.s3_path = null;
      r1Sub.updated_at = new Date().toISOString();
      await supabaseAdmin.from('round1_submissions').update({ s3_path: null, updated_at: r1Sub.updated_at }).eq('id', r1Sub.id);
      inMemoryDB.round1Submissions.set(r1Sub.id, r1Sub);
    }

    if (!activeScopes.has('round2') && r2Sub) {
      r2Sub.hero_image_s3_path = null;
      r2Sub.villain_image_s3_path = null;
      r2Sub.supporting_character_image_s3_path = null;
      r2Sub.updated_at = new Date().toISOString();
      await supabaseAdmin.from('round2_submissions').update({
        hero_image_s3_path: null,
        villain_image_s3_path: null,
        supporting_character_image_s3_path: null,
        updated_at: r2Sub.updated_at,
      }).eq('id', r2Sub.id);
      inMemoryDB.round2Submissions.set(r2Sub.id, r2Sub);
    }

    if (!activeScopes.has('round3') && r3Sub) {
      r3Sub.promotional_asset_s3_path = null;
      r3Sub.updated_at = new Date().toISOString();
      await supabaseAdmin.from('round3_submissions').update({
        promotional_asset_s3_path: null,
        updated_at: r3Sub.updated_at,
      }).eq('id', r3Sub.id);
      inMemoryDB.round3Submissions.set(r3Sub.id, r3Sub);
    }
  }

  // Update Team status and current round
  const updatedTeam = teamWithMembers;
  let targetRound = updatedTeam.current_round;
  let targetStatus = updatedTeam.status;

  if (activeScopes.has('round1') || isResetAll) {
    targetRound = 1;
  } else if (activeScopes.has('round2') && targetRound > 2) {
    targetRound = 2;
  } else if (activeScopes.has('round3') && targetRound > 3) {
    targetRound = 3;
  }

  if (targetStatus === 'QUALIFIED' || targetStatus === 'DISQUALIFIED') {
    if (activeScopes.has('round2') || activeScopes.has('ai_evaluations') || activeScopes.has('round1') || isResetAll) {
      targetStatus = 'ACTIVE';
    }
  }

  updatedTeam.current_round = targetRound;
  updatedTeam.status = targetStatus;
  updatedTeam.updated_at = new Date().toISOString();

  const { error: teamUpdateErr } = await supabaseAdmin.from('teams').update({
    current_round: targetRound,
    status: targetStatus,
    updated_at: updatedTeam.updated_at,
  }).eq('id', teamId);

  if (teamUpdateErr) {
    console.error('[Reset Error] Team update failed:', teamUpdateErr);
  }

  inMemoryDB.teams.set(teamId, updatedTeam);

  const scopeList = Array.from(activeScopes);
  await logAuditEvent({
    actor: adminActor,
    action: 'RESET_TEAM_PROGRESS',
    entity: 'TEAM',
    entity_id: teamId,
    reason: reason || 'Admin team progress reset',
    metadata: {
      team_code: teamWithMembers.team_code,
      team_name: teamWithMembers.team_name,
      scopes: scopeList,
      is_reset_all: isResetAll,
      s3_report: s3Report,
      timestamp: new Date().toISOString(),
    },
  });

  return {
    success: true,
    message: 'Team reset completed successfully.',
    team_id: teamId,
    team_code: teamWithMembers.team_code,
    scopes_reset: scopeList as TeamResetScope[],
    s3_report: s3Report ? {
      deleted_count: s3Report.deletedCount,
      errors: s3Report.errors,
      is_mock: s3Report.isMock,
    } : undefined,
  };
}
