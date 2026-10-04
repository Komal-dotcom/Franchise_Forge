import { hashAccessCode } from './auth';
import { inMemoryDB, supabaseAdmin } from './supabase';
import { Team, TeamMember, Round1Submission, Round2Submission, AIEvaluation, Round3Submission, Round3ManualScore } from '@/types';

/**
 * Seeds complete demo dataset for Franchise Forge competition
 */
export async function seedDemoData() {
  const hash2 = await hashAccessCode('7K9PMQ');

  const team2: Team = {
    id: 'team-002',
    team_code: 'FF26-002',
    team_name: 'Studio Nebula',
    access_code_hash: hash2,
    access_code: '7K9PMQ',
    current_round: 3,
    status: 'QUALIFIED',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const membersTeam2: TeamMember[] = [
    {
      id: 'mem-201',
      team_id: 'team-002',
      member_name: 'Neha Kapoor',
      email: 'neha@studionebula.com',
      phone_number: '9876543220',
      semester: '3',
      section: 'B',
      created_at: new Date().toISOString(),
    },
    {
      id: 'mem-202',
      team_id: 'team-002',
      member_name: 'Aman Gupta',
      email: 'aman@studionebula.com',
      phone_number: '9876543221',
      semester: '3',
      section: 'B',
      created_at: new Date().toISOString(),
    },
    {
      id: 'mem-203',
      team_id: 'team-002',
      member_name: 'Kiran Rao',
      email: 'kiran@studionebula.com',
      phone_number: '9876543222',
      semester: '3',
      section: 'B',
      created_at: new Date().toISOString(),
    },
    {
      id: 'mem-204',
      team_id: 'team-002',
      member_name: 'Dev Patel',
      email: 'dev@studionebula.com',
      phone_number: '9876543223',
      semester: '3',
      section: 'B',
      created_at: new Date().toISOString(),
    },
  ];

  const r1Sub2: Round1Submission = {
    id: 'r1-sub-201',
    team_id: 'team-002',
    franchise_name: 'Aetherial Echoes',
    genre: 'Cyberpunk Supernatural Thriller',
    target_audience: 'Core Gamers & Anime Fans (16–30)',
    core_premise: 'In Neo-Kolkata 2099, memories are digitized and traded as black-market currency. A memory hacker uncovers a suppressed echo proving the city super-AI was created from human consciousness fragments.',
    central_conflict: 'Memory hacker Kael fights to broadcast the truth while corporate syndicates send elite ghost assassins to wipe his mind completely.',
    world_concept: 'Neo-Kolkata: A towering 300-tier megacity shrouded in perpetual monsoon neon mist.',
    elevator_pitch: 'Blade Runner meets Ghost in the Shell set in futuristic South Asia.',
    status: 'SUBMITTED',
    submitted_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const r2Sub2: Round2Submission = {
    id: 'r2-sub-201',
    team_id: 'team-002',
    hero_data: {
      name: 'Kael the Echo Hacker',
      personality: 'Rebellious, hyper-perceptive, secretive',
      goal: 'Expose the neural memory syndicate',
      strengths: 'Neural interface hacking, quick reflexes',
      weakness: 'Memory fragmentation disease',
      conflict: 'Losing his own real memories while holding stolen ones',
      description: 'A lean cyberpunk hacker with illuminated nerve tattoos wearing a weathered duster.'
    },
    villain_data: {
      name: 'Director Thorne',
      personality: 'Ruthless corporate patriarch',
      goal: 'Achieve digital immortality by harvesting citizens',
      strengths: 'Infinite corporate capital, military drone fleet',
      weakness: 'Overreliance on main core AI',
      conflict: 'Sees human individuality as inefficient noise',
      description: 'An elder executive in immaculate silk suits with cybernetic optic implants.'
    },
    hero_prompt: 'Cyberpunk high-contrast render of Kael hacking neural terminal in neon alley',
    villain_prompt: 'High-concept render of corporate Director Thorne in skyscraper penthouse',
    hero_image_s3_path: 'submissions/team-002/round2/hero/hero_201.png',
    villain_image_s3_path: 'submissions/team-002/round2/villain/villain_201.png',
    hero_villain_relationship: 'Cat-and-mouse dynamic between street hacker and corrupt tycoon',
    hero_villain_conflict: 'Battle for control of the master memory archive',
    status: 'EVALUATED',
    submitted_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const aiEval2: AIEvaluation = {
    id: 'eval-201',
    round2_submission_id: r2Sub2.id,
    safety_status: 'PASS',
    character_development_score: 25,
    relationship_score: 17,
    originality_score: 13,
    visual_quality_score: 13,
    prompt_quality_score: 8,
    prompt_image_consistency_score: 8,
    total_score: 84,
    decision: 'QUALIFIED',
    evaluation_status: 'COMPLETED',
    feedback: [
      'Compelling cyberpunk protagonist with tragic memory fragmentation flaw.',
      'Effective corporate antagonist motivation.',
      'Prompts produce strong atmospheric lighting and South Asian cyberpunk themes.',
    ],
    evaluated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  const r3Sub2: Round3Submission = {
    id: 'r3-sub-201',
    team_id: 'team-002',
    marketing_angle: 'Cyberpunk techno-thriller campaign emphasizing high-stakes memory theft',
    intended_audience_response: 'Fascinate tech-savvy fans of anime thrillers and futuristic noir',
    tagline: 'Your memories are no longer your own.',
    promotional_copy: 'Step into Neo-Kolkata 2099. Fight for the echo that changes everything.',
    promotional_asset_s3_path: 'submissions/team-002/round3/poster.png',
    status: 'SUBMITTED',
    submitted_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const r3ManualScore2: Round3ManualScore = {
    id: 'r3-manual-score-201',
    round3_submission_id: r3Sub2.id,
    team_id: 'team-002',
    judge_id: '1',
    judge_name: 'Judge 1',
    marketing_strategy_score: 22,
    tagline_punch_score: 18,
    audience_engagement_score: 17,
    copywriting_quality_score: 17,
    visual_poster_quality_score: 14,
    total_score: 88,
    comments: 'Tagline delivers an evocative promotional hook with strong South Asian cyberpunk aesthetic.',
    status: 'SUBMITTED',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Seed In-Memory Store
  inMemoryDB.teams.set(team2.id, team2);
  membersTeam2.forEach((m) => inMemoryDB.teamMembers.set(m.id, m));
  inMemoryDB.round1Submissions.set(r1Sub2.id, r1Sub2);
  inMemoryDB.round2Submissions.set(r2Sub2.id, r2Sub2);
  inMemoryDB.aiEvaluations.set(aiEval2.id, aiEval2);
  inMemoryDB.round3Submissions.set(r3Sub2.id, r3Sub2);
  inMemoryDB.round3ManualScores.set(r3ManualScore2.id, r3ManualScore2);

  // Seed Supabase if connected
  try {
    await supabaseAdmin.from('teams').upsert([team2], { onConflict: 'id' });
    await supabaseAdmin.from('team_members').upsert([...membersTeam2], { onConflict: 'id' });
    await supabaseAdmin.from('round1_submissions').upsert([r1Sub2], { onConflict: 'id' });
    await supabaseAdmin.from('round2_submissions').upsert([r2Sub2], { onConflict: 'id' });
    await supabaseAdmin.from('ai_evaluations').upsert([aiEval2], { onConflict: 'id' });
    await supabaseAdmin.from('round3_submissions').upsert([r3Sub2], { onConflict: 'id' });
    await supabaseAdmin.from('round3_manual_scores').upsert([r3ManualScore2], { onConflict: 'id' });
    console.log('✅ Successfully seeded Supabase database tables!');
  } catch (err) {
    console.log('ℹ️ Live Supabase not reachable, seeded in-memory database store.');
  }

  return { team2 };
}
