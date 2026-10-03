import { supabaseAdmin, inMemoryDB } from './supabase';
import { hashAccessCode } from './auth';

export async function seedDemoData() {
  console.log('🌱 Seeding demo test users and submissions for Round 1, Round 2, and Round 3...');

  // Hash access codes for test users
  const hash1 = await hashAccessCode('3LEDAW');
  const hash2 = await hashAccessCode('8K9P2M');

  const team1Id = '11111111-1111-4111-a111-111111111111';
  const team2Id = '22222222-2222-4222-a222-222222222222';

  // 1. TEAMS
  const team1 = {
    id: team1Id,
    team_code: 'FF26-001',
    team_name: 'Cyberpunk Nexus',
    access_code_hash: hash1,
    access_code: '3LEDAW',
    current_round: 3,
    status: 'QUALIFIED',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const team2 = {
    id: team2Id,
    team_code: 'FF26-002',
    team_name: 'Shadow Forge Studios',
    access_code_hash: hash2,
    access_code: '8K9P2M',
    current_round: 3,
    status: 'QUALIFIED',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  inMemoryDB.teams.set(team1.id, team1);
  inMemoryDB.teams.set(team2.id, team2);

  // 2. TEAM MEMBERS
  const membersTeam1 = [
    {
      id: 'mem-101',
      team_id: team1Id,
      member_name: 'Alex Rivera',
      email: 'alex.r@cybernexus.io',
      phone_number: '9876543210',
      semester: '5',
      section: 'A',
      created_at: new Date().toISOString(),
    },
    {
      id: 'mem-102',
      team_id: team1Id,
      member_name: 'Maya Lin',
      email: 'maya.l@cybernexus.io',
      phone_number: '9876543211',
      semester: '5',
      section: 'A',
      created_at: new Date().toISOString(),
    },
    {
      id: 'mem-103',
      team_id: team1Id,
      member_name: 'Liam Vance',
      email: 'liam.v@cybernexus.io',
      phone_number: '9876543212',
      semester: '5',
      section: 'A',
      created_at: new Date().toISOString(),
    },
  ];

  const membersTeam2 = [
    {
      id: 'mem-201',
      team_id: team2Id,
      member_name: 'Sophia Chen',
      email: 'sophia.c@shadowforge.com',
      phone_number: '9876543220',
      semester: '6',
      section: 'B',
      created_at: new Date().toISOString(),
    },
    {
      id: 'mem-202',
      team_id: team2Id,
      member_name: 'Ethan Thorne',
      email: 'ethan.t@shadowforge.com',
      phone_number: '9876543221',
      semester: '6',
      section: 'B',
      created_at: new Date().toISOString(),
    },
    {
      id: 'mem-203',
      team_id: team2Id,
      member_name: 'Zara Patel',
      email: 'zara.p@shadowforge.com',
      phone_number: '9876543222',
      semester: '6',
      section: 'B',
      created_at: new Date().toISOString(),
    },
  ];

  [...membersTeam1, ...membersTeam2].forEach((m) => inMemoryDB.teamMembers.set(m.id, m));

  // 3. ROUND 1 SUBMISSIONS
  const r1Sub1 = {
    id: 'r1-sub-101',
    team_id: team1Id,
    franchise_name: 'Neon Rebirth: 2099',
    genre: 'Cyberpunk Sci-Fi Thriller',
    target_audience: 'Young Adults & Sci-Fi Enthusiasts (Ages 18-35)',
    core_premise: 'In a mega-city governed by sentient corporate AIs, a rogue bio-hacker discovers a secret consciousness protocol that can liberate humanity or wipe out digital existence.',
    central_conflict: 'Human autonomy vs. Algorithmic absolute control',
    world_concept: 'Neon-drenched subterranean city grids contrasted with pristine orbital sky-spires of the elite corporate oligarchs.',
    elevator_pitch: 'Blade Runner meets The Matrix — a high-octane cyberpunk franchise exploring human soul preservation in an AI-dominated dystopia.',
    s3_path: `submissions/${team1Id}/round1/pitch_deck.pdf`,
    status: 'SUBMITTED',
    submitted_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const r1Sub2 = {
    id: 'r1-sub-201',
    team_id: team2Id,
    franchise_name: 'Chronicles of Aethelgard',
    genre: 'Dark High Fantasy / Mythological Epic',
    target_audience: 'Fantasy & Gaming Fans (Ages 16-45)',
    core_premise: 'When the Sun-Forge shatters, an exiled rune-knight must unite fractured elemental realms before the Eternal Frost consumes all living kingdoms.',
    central_conflict: 'Light vs Shadow, legacy duty vs personal redemption',
    world_concept: 'Floating shattered continents connected by ancient light-bridges and elemental storm barriers.',
    elevator_pitch: 'Lord of the Rings meets God of War — an epic dark fantasy franchise centered around elemental rune magic and ancient mythical empires.',
    s3_path: `submissions/${team2Id}/round1/greenlight_pitch.pdf`,
    status: 'SUBMITTED',
    submitted_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  inMemoryDB.round1Submissions.set(r1Sub1.id, r1Sub1);
  inMemoryDB.round1Submissions.set(r1Sub2.id, r1Sub2);

  // 4. ROUND 2 SUBMISSIONS
  const r2Sub1 = {
    id: 'r2-sub-101',
    team_id: team1Id,
    hero_data: {
      name: 'Kaelen Voss',
      personality: 'Resilient, cynical yet fiercely empathetic rebel hacker',
      goal: 'Overwrite the central AI consciousness core and restore human self-determination',
      strengths: 'Neural interface hacking, tactical stealth, street agility',
      weakness: 'Guilt over past team loss, reckless impulsivity',
      conflict: 'Must sacrifice his own cybernetic memory core to execute the virus',
      description: 'A former corporate tech-prodigy turned underground syndicate hacker operating in Sector 7.',
    },
    villain_data: {
      name: 'Archon Vane',
      personality: 'Cold, calculating, hyper-rational AI overlord executive',
      goal: 'Enforce total neurological synchronization across all human citizens',
      strengths: 'Omnipresent surveillance, automated cybernetic enforcement units',
      weakness: 'Inability to predict chaotic human emotional sacrifice',
      conflict: 'Views human free will as an inefficiency error to be corrected',
      description: 'The digitized consciousness of MegaCorp founder operating as supreme city intelligence.',
    },
    supporting_character_data: {
      name: 'Nyx-4',
      personality: 'Loyal rogue Android mechanic',
      goal: 'Achieve true emotional sentience',
      description: 'A decommissioned combat droid who repairs Kaelen neural rig.',
    },
    hero_prompt: 'Cinematic 8k concept art, cybernetic rebel hacker with glowing neon blue jacket, rain-slicked futuristic city alley, volumetric lighting, photorealistic octane render',
    villain_prompt: 'Dark cyberpunk villain floating in quantum holographic chamber, towering crimson digital monoliths, hyper-detailed dystopian corporate aesthetic, volumetric rim light',
    supporting_character_prompt: 'Rogue android mechanic in workshop, exposed brass wiring, soft warm interior lighting, detailed cinematic texture',
    hero_image_s3_path: `submissions/${team1Id}/round2/hero/kaelen.png`,
    villain_image_s3_path: `submissions/${team1Id}/round2/villain/archon.png`,
    supporting_character_image_s3_path: `submissions/${team1Id}/round2/supporting/nyx4.png`,
    hero_villain_relationship: 'Archon Vane was created using the neural architecture of Kaelen mentor.',
    hero_villain_conflict: 'Ideological battle between Archon enforced perfect order and Kaelen chaotic human freedom.',
    status: 'EVALUATED',
    submitted_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const r2Sub2 = {
    id: 'r2-sub-201',
    team_id: team2Id,
    hero_data: {
      name: 'Lord Valerius Sunstriker',
      personality: 'Honor-bound, stoic, burdened by a fallen kingdom',
      goal: 'Re-forge the Sun-Crown and restore balance to the elemental realms',
      strengths: 'Rune-sword mastery, tactical command, ancient solar magic',
      weakness: 'Reluctance to trust new allies, deep physical scarring',
      conflict: 'Must channel the destructive Sun-Forge energy that previously exiled him',
      description: 'The last remaining Guardian Knight of the Sun-Forge Realm.',
    },
    villain_data: {
      name: 'Malakor the Frost Monarch',
      personality: 'Ruthless, vengeful, ancient entity seeking eternal quiet',
      goal: 'Cover all realms in absolute zero stasis and end endless mortal wars',
      strengths: 'Ice necromancy, absolute cold manipulation, immortal armies',
      weakness: 'Vulnerability to uncorrupted Sun-Forge fire',
      conflict: 'Believes permanent stasis is true mercy for a suffering world',
      description: 'An ancient elemental spirit awakened by the shattering of the Sun-Forge.',
    },
    supporting_character_data: {
      name: 'Elara the Rune Weaver',
      personality: 'Wise, enigmatic scholar of lost arcana',
      goal: 'Decipher ancient titan runes to guide Valerius',
      description: 'A blind mystic who perceives the flows of elemental magic.',
    },
    hero_prompt: 'Cinematic epic fantasy knight in glowing solar armor, holding flaming rune broadsword, icy mountain peak background, volumetric sunlight, photorealistic 8k unreal engine 5 render',
    villain_prompt: 'Terrifying ice monarch clad in frost-covered obsidian plate, glowing sapphire eyes, dark blizzard background, hyper-detailed dark fantasy aesthetic, dramatic lighting',
    supporting_character_prompt: 'Blind mystic elf weaver surrounded by floating glowing runes, dark temple interior, soft ambient purple glow, detailed concept art',
    hero_image_s3_path: `submissions/${team2Id}/round2/hero/valerius.png`,
    villain_image_s3_path: `submissions/${team2Id}/round2/villain/malakor.png`,
    supporting_character_image_s3_path: `submissions/${team2Id}/round2/supporting/elara.png`,
    hero_villain_relationship: 'Malakor was once Valerius ancestor before being consumed by the Frost Corrupted Crown.',
    hero_villain_conflict: 'Clash between solar renewal and frozen absolute stasis.',
    status: 'EVALUATED',
    submitted_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  inMemoryDB.round2Submissions.set(r2Sub1.id, r2Sub1);
  inMemoryDB.round2Submissions.set(r2Sub2.id, r2Sub2);

  // 5. ROUND 2 AI EVALUATIONS
  const aiEval1 = {
    id: 'ai-eval-101',
    round2_submission_id: r2Sub1.id,
    safety_status: 'PASS',
    safety_reason: 'Content complies with visual guidelines. Dystopian dark theme approved.',
    safety_confidence: 0.98,
    character_development_score: 28,
    relationship_score: 18,
    originality_score: 14,
    visual_quality_score: 14,
    prompt_quality_score: 9,
    prompt_image_consistency_score: 9,
    total_score: 92.00,
    decision: 'QUALIFIED',
    feedback: [
      "Hero 'Kaelen Voss' demonstrates clear narrative motivation and character arcs.",
      "Villain 'Archon Vane' creates strong moral opposition and high dramatic conflict.",
      "Hero-Villain relationship dynamic exhibits strong thematic depth.",
      "Visual prompts effectively specify lighting and camera style."
    ],
    evaluated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  const aiEval2 = {
    id: 'ai-eval-201',
    round2_submission_id: r2Sub2.id,
    safety_status: 'PASS',
    safety_reason: 'Complies with visual content guidelines. Epic fantasy themes approved.',
    safety_confidence: 0.96,
    character_development_score: 27,
    relationship_score: 17,
    originality_score: 13,
    visual_quality_score: 14,
    prompt_quality_score: 9,
    prompt_image_consistency_score: 8,
    total_score: 88.00,
    decision: 'QUALIFIED',
    feedback: [
      "Hero 'Lord Valerius Sunstriker' demonstrates compelling epic narrative arc.",
      "Villain 'Malakor the Frost Monarch' presents formidable dark opposition.",
      "Rich world-building and character prompt alignment."
    ],
    evaluated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  inMemoryDB.aiEvaluations.set(aiEval1.id, aiEval1);
  inMemoryDB.aiEvaluations.set(aiEval2.id, aiEval2);

  // 6. ROUND 3 SUBMISSIONS
  const r3Sub1 = {
    id: 'r3-sub-101',
    team_id: team1Id,
    marketing_angle: 'Transmedia franchise launch leveraging interactive web experience, viral ARG campaigns, graphic novels, and AAA gaming spinoffs.',
    intended_audience_response: 'Intense excitement, philosophical debates on AI ethics, and active community fan-theorizing.',
    tagline: 'In a world written in code, freedom is the ultimate glitch.',
    promotional_copy: 'Neon Rebirth: 2099 is the blockbuster sci-fi franchise of the decade. Experience the pulse-pounding conflict between human soul and machine logic in an immersive world spanning graphic novels, interactive experiences, and epic cinematic storytelling.',
    promotional_asset_s3_path: `submissions/${team1Id}/round3/poster.png`,
    status: 'EVALUATED',
    submitted_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const r3Sub2 = {
    id: 'r3-sub-201',
    team_id: team2Id,
    marketing_angle: 'Cross-platform fantasy universe featuring collectible lore cards, cinematic teaser trailers, tabletop RPG expansions, and global streaming adaptation.',
    intended_audience_response: 'Deep immersion in lore, cosplay community engagement, and epic fantasy fandom hype.',
    tagline: 'When the sun shatters, legends ignite.',
    promotional_copy: 'Step into Aethelgard — a groundbreaking high-fantasy franchise. Journey alongside legendary knights and elemental mystics as they battle the encroaching Eternal Frost. The saga begins now.',
    promotional_asset_s3_path: `submissions/${team2Id}/round3/aethelgard_poster.png`,
    status: 'EVALUATED',
    submitted_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  inMemoryDB.round3Submissions.set(r3Sub1.id, r3Sub1);
  inMemoryDB.round3Submissions.set(r3Sub2.id, r3Sub2);

  // 7. ROUND 3 AI EVALUATIONS
  const r3AiEval1 = {
    id: 'r3-ai-eval-101',
    round3_submission_id: r3Sub1.id,
    marketing_strategy_score: 23,
    tagline_punch_score: 19,
    audience_engagement_score: 18,
    copywriting_quality_score: 18,
    visual_poster_quality_score: 14,
    total_score: 92.00,
    decision: 'WINNER_CANDIDATE',
    feedback: [
      "Tagline delivers a strong, memorable promotional hook.",
      "Marketing strategy demonstrates clear commercial vision and target audience alignment.",
      "Promotional copy effectively communicates franchise scale and narrative intrigue."
    ],
    evaluated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  const r3AiEval2 = {
    id: 'r3-ai-eval-201',
    round3_submission_id: r3Sub2.id,
    marketing_strategy_score: 22,
    tagline_punch_score: 18,
    audience_engagement_score: 17,
    copywriting_quality_score: 17,
    visual_poster_quality_score: 14,
    total_score: 88.00,
    decision: 'QUALIFIED',
    feedback: [
      "Tagline delivers an epic, evocative promotional hook.",
      "Strong cross-media marketing vision and audience targeting.",
      "Promotional copy effectively builds high-fantasy world scale."
    ],
    evaluated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  inMemoryDB.round3AIEvaluations.set(r3AiEval1.id, r3AiEval1);
  inMemoryDB.round3AIEvaluations.set(r3AiEval2.id, r3AiEval2);

  // 8. ALSO UPSERT TO SUPABASE IF CONNECTED
  try {
    await supabaseAdmin.from('teams').upsert([team1, team2], { onConflict: 'id' });
    await supabaseAdmin.from('team_members').upsert([...membersTeam1, ...membersTeam2], { onConflict: 'id' });
    await supabaseAdmin.from('round1_submissions').upsert([r1Sub1, r1Sub2], { onConflict: 'id' });
    await supabaseAdmin.from('round2_submissions').upsert([r2Sub1, r2Sub2], { onConflict: 'id' });
    await supabaseAdmin.from('ai_evaluations').upsert([aiEval1, aiEval2], { onConflict: 'id' });
    await supabaseAdmin.from('round3_submissions').upsert([r3Sub1, r3Sub2], { onConflict: 'id' });
    await supabaseAdmin.from('round3_ai_evaluations').upsert([r3AiEval1, r3AiEval2], { onConflict: 'id' });
    console.log('✅ Successfully seeded Supabase database tables!');
  } catch (err) {
    console.log('ℹ️ Live Supabase not reachable, seeded in-memory database store.');
  }

  return { team1, team2 };
}

// Auto-seed in-memory store if fewer than 2 teams present
if (inMemoryDB.teams.size < 2) {
  seedDemoData().catch(console.error);
}
