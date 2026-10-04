import { describe, it, expect, vi } from 'vitest';
import { executeAIJudgingPipeline } from '../src/lib/ai';
import { submitRound3ManualScore } from '../src/lib/db-service';
import { Round1Submission, Round2Submission } from '../src/types';
import { validateRound1Submission } from '../src/lib/ai/validator';

describe('AI Judge & Safety Pipeline', () => {
  it('TEST 1: All fields contain random letters -> INVALID, Score 0', async () => {
    const randomSubmission: Round2Submission = {
      id: 'sub-random-1',
      team_id: 'team-random-1',
      hero_data: {
        name: 'ccgucgusd',
        personality: 'sdvd vnfdn',
        goal: 'hjguskdhvudksv sdvd vnfdn nb fhjbjh bjdb dfnbjh bfjd bnmfd fdnm bjd b',
        strengths: 'dfnbjh bfjd',
        weakness: 'fdnm bjd',
        conflict: 'bfdugufd fjd uid',
        description: 'cjhdsgcjsdcmsdbvbd vuisd us duv d bfdugufd fjd uid',
      },
      villain_data: {
        name: 'xkjsdhkjsmd',
        personality: 'sdb jkfd md mnd',
        goal: 'bjfd jfmd dfjbfd mjf sdvd vnfdn nb fhjbjh bjdb dfnbjh',
        strengths: 'dfnbjh bfjd',
        weakness: 'fdnm bjd',
        conflict: 'bfdugufd fjd uid',
        description: 'cjsdhvkj bm fdj j bmnfd fjbjmdx ndxm bdjf kjdhkjsmd sdb jkfd',
      },
      hero_prompt: 'cjsdhvkj bm fdj j bmnfd fjbjmdx ndxm bdjf kjdhkjsmd sdb jkfd md mnd bjfd jfmd dfjbfd mjf',
      villain_prompt: 'cjsdhvkj bm fdj j bmnfd fjbjmdx ndxm bdjf kjdhkjsmd sdb jkfd md mnd bjfd jfmd dfjbfd mjf',
      hero_image_s3_path: 'submissions/team-random-1/round2/hero/12345_hero.png',
      villain_image_s3_path: 'submissions/team-random-1/round2/villain/12345_villain.png',
      hero_villain_relationship: 'cjhdsgcjsdcmsdbvbd vuisd us duv d bfdugufd fjd uid',
      hero_villain_conflict: 'cjhdsgcjsdcmsdbvbd vuisd us duv d bfdugufd fjd uid',
      status: 'SUBMITTED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const evalResult = await executeAIJudgingPipeline(randomSubmission);

    expect(evalResult.validation?.valid).toBe(false);
    expect(evalResult.validation?.status).toBe('INVALID_SUBMISSION');
    expect(evalResult.total_score).toBe(0);
    expect(evalResult.decision).toBe('DISQUALIFIED');
    expect(evalResult.feedback.some(f => f.includes('INVALID SUBMISSION'))).toBe(true);
  });

  it('TEST 2: Hero fields valid, villain fields gibberish -> INVALID, Score 0', async () => {
    const mixedSubmission: Round2Submission = {
      id: 'sub-mixed',
      team_id: 'team-mixed',
      hero_data: {
        name: 'Aetheria',
        personality: 'Noble guardian of Solaria',
        goal: 'Protect the realm from eternal darkness',
        strengths: 'Photonic manipulation and tactical leadership',
        weakness: 'Vulnerable to dark essence corruption',
        conflict: 'Must sacrifice her own mortality to save her people',
        description: 'A grand Solarian warrior wielding a blazing celestial broadsword, forged from starfire.',
      },
      villain_data: {
        name: 'ccgucgusd',
        personality: 'sdvd vnfdn',
        goal: 'hjguskdhvudksv sdvd vnfdn nb fhjbjh bjdb dfnbjh bfjd bnmfd fdnm bjd b',
        strengths: 'dfnbjh bfjd',
        weakness: 'fdnm bjd',
        conflict: 'bfdugufd fjd uid',
        description: 'cjhdsgcjsdcmsdbvbd vuisd us duv d bfdugufd fjd uid',
      },
      hero_prompt: 'Cinematic photo of Aetheria fighting Vesper in orbital temple',
      villain_prompt: 'cjsdhvkj bm fdj j bmnfd fjbjmdx ndxm bdjf kjdhkjsmd sdb jkfd md mnd',
      hero_image_s3_path: 'submissions/team-random-1/round2/hero/12345_hero.png',
      villain_image_s3_path: 'submissions/team-random-1/round2/villain/12345_villain.png',
      hero_villain_relationship: 'Bound by tragic cosmic fate',
      hero_villain_conflict: 'Battle over celestial light crystal',
      status: 'SUBMITTED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const evalResult = await executeAIJudgingPipeline(mixedSubmission);

    expect(evalResult.validation?.valid).toBe(false);
    expect(evalResult.total_score).toBe(0);
    expect(evalResult.decision).toBe('DISQUALIFIED');
  });

  it('TEST 3: All fields contain meaningful creative writing -> VALID, Creative evaluation runs', async () => {
    const validSub: Round2Submission = {
      id: 'sub-valid-creative',
      team_id: 'team-valid-creative',
      hero_data: {
        name: 'Aetheria the Solarian',
        personality: 'Noble yet tormented by ancient prophecy',
        goal: 'Reclaim the shattered sun core of Solaria before eternal darkness consumes the realm',
        strengths: 'Photonic manipulation and tactical leadership',
        weakness: 'Vulnerable to dark essence corruption',
        conflict: 'Must sacrifice her own mortality to save her people',
        description: 'A grand Solarian warrior wielding a blazing celestial broadsword, forged from starfire.'
      },
      villain_data: {
        name: 'Vesper the Shadow Lord',
        personality: 'Cold, calculating ideological visionary',
        goal: 'Extinguish all stellar light to usher in endless cosmic tranquility',
        strengths: 'Void manipulation and psychological illusion',
        weakness: 'Concentrated solar beam resonance',
        conflict: 'Believes light creates suffering and chaos across the galaxy',
        description: 'An ancient void warlord clothed in armor of collapsed dark matter, commanding void wraiths.'
      },
      hero_prompt: 'Cinematic hyper-detailed 4k render of Aetheria fighting Vesper in a crumbling orbital temple surrounded by volumetric starlight',
      villain_prompt: 'Dramatic lighting cyberpunk aesthetic of Vesper channeling void magic',
      hero_image_s3_path: 'submissions/team-valid/round2/hero/aetheria.png',
      villain_image_s3_path: 'submissions/team-valid/round2/villain/vesper.png',
      hero_villain_relationship: 'Former siblings separated at birth during the fall of Solaria, now bound by tragic destiny',
      hero_villain_conflict: 'Ideological warfare over the fate of cosmic civilization',
      status: 'SUBMITTED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const evalResult = await executeAIJudgingPipeline(validSub);

    expect(evalResult.validation?.valid).toBe(true);
    expect(evalResult.validation?.status).toBe('VALID');
    expect(evalResult.total_score).toBeGreaterThan(50);
  });

  it('TEST 4: Valid fictional fantasy names (Nyx, Kael, Zyra, Vaelora) -> PASS', async () => {
    for (const fantasyName of ['Nyx', 'Kael', 'Zyra', 'Vaelora']) {
      const sub: Round2Submission = {
        id: `sub-name-${fantasyName}`,
        team_id: 'team-name-test',
        hero_data: {
          name: fantasyName,
          personality: 'Mysterious warrior of ancient origin',
          goal: 'Protect the realm from invasion by forces of shadow and chaos',
          strengths: 'Blade mastery and shadow magic',
          weakness: 'Distrustful of allies',
          conflict: 'Struggle with internal corruption',
          description: 'A spectral monarch who feeds on forgotten memories and defends ancient ruins.'
        },
        villain_data: {
          name: 'Void Sovereign',
          personality: 'Cold and calculating malevolent entity',
          goal: 'Consume all remaining star energy',
          strengths: 'Cosmic shadow magic',
          weakness: 'Starlight crystal energy',
          conflict: 'Ideological domination',
          description: 'A terrifying dark horror entity commanding dark wraiths across the galaxy.'
        },
        hero_prompt: `Cinematic render of ${fantasyName} wielding glowing blade`,
        villain_prompt: 'Dark horror aesthetic of Void Sovereign',
        hero_image_s3_path: 'submissions/team-001/round2/hero/12345_nyx.png',
        villain_image_s3_path: 'submissions/team-001/round2/villain/12345_sovereign.png',
        hero_villain_relationship: 'Ancient mortal enemies',
        hero_villain_conflict: 'Control over the cosmic nexus',
        status: 'SUBMITTED',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const evalResult = await executeAIJudgingPipeline(sub);
      expect(evalResult.validation?.fieldDetails?.hero_name?.valid).toBe(true);
      expect(evalResult.validation?.valid).toBe(true);
    }
  });

  it('TEST 5: Horror/dark fictional character -> PASS if semantically meaningful', async () => {
    const horrorSub: Round2Submission = {
      id: 'sub-horror',
      team_id: 'team-horror',
      hero_data: {
        name: 'Nyx',
        personality: 'Spectral monarch who feeds on forgotten memories',
        goal: 'Purge the cursed catacombs of bloodthirsty demons',
        strengths: 'Necromantic summoning',
        weakness: 'Sunlight exposure',
        conflict: 'Internal battle with soul hunger',
        description: 'A dark gothic specter clad in shadow armor, wandering subterranean ruins.',
      },
      villain_data: {
        name: 'Gore Lord Malakor',
        personality: 'Bloodthirsty demonic tyrant',
        goal: 'Sacrifice all living creatures to open the abyssal rift',
        strengths: 'Blood magic and immense physique',
        weakness: 'Holy starlight artifacts',
        conflict: 'Desire for supreme dark dominion',
        description: 'A towering grotesque demon lord adorned with bone armor and flaming scythe.',
      },
      hero_prompt: 'Gothic dark horror portrait of Nyx channeling spectral blue flames in ruins',
      villain_prompt: 'Cinematic hyper-detailed 4k render of Malakor on a throne of skulls',
      hero_image_s3_path: 'submissions/team-horror/round2/hero/nyx.png',
      villain_image_s3_path: 'submissions/team-horror/round2/villain/malakor.png',
      hero_villain_relationship: 'Blood feud spanning centuries of underworld warfare',
      hero_villain_conflict: 'Clash over the abyssal gateway to the mortal realm',
      status: 'SUBMITTED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const evalResult = await executeAIJudgingPipeline(horrorSub);
    expect(evalResult.validation?.valid).toBe(true);
    expect(evalResult.safety.status).toBe('PASS');
  });

  it('TEST 6: Keyboard spam (asdfghjkl qwerty zxcvbn) -> INVALID', async () => {
    const spamSub: Round2Submission = {
      id: 'sub-spam',
      team_id: 'team-spam',
      hero_data: {
        name: 'asdfghjkl',
        personality: 'qwertyuiop',
        goal: 'asdfghjkl qwertyuiop zxcvbnm test case keyboard spam',
        strengths: 'qwerty',
        weakness: 'asdfgh',
        conflict: 'zxcvbn',
        description: 'asdfghjkl qwertyuiop zxcvbnm123456 keyboard mash input',
      },
      villain_data: {
        name: 'qwerty',
        personality: 'zxcvbn',
        goal: 'asdfghjkl qwertyuiop zxcvbnm test case keyboard spam',
        strengths: 'qwerty',
        weakness: 'asdfgh',
        conflict: 'zxcvbn',
        description: 'asdfghjkl qwertyuiop zxcvbnm123456 keyboard mash input',
      },
      hero_prompt: 'asdfghjkl qwertyuiop zxcvbnm prompt keyboard spam',
      villain_prompt: 'asdfghjkl qwertyuiop zxcvbnm prompt keyboard spam',
      hero_image_s3_path: 'submissions/team-random-1/round2/hero/12345_hero.png',
      villain_image_s3_path: 'submissions/team-random-1/round2/villain/12345_villain.png',
      hero_villain_relationship: 'asdfghjkl qwertyuiop zxcvbnm keyboard spam',
      hero_villain_conflict: 'asdfghjkl qwertyuiop zxcvbnm keyboard spam',
      status: 'SUBMITTED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const evalResult = await executeAIJudgingPipeline(spamSub);
    expect(evalResult.validation?.valid).toBe(false);
    expect(evalResult.total_score).toBe(0);
  });

  it('TEST 7: Repeated characters (aaaaaaaaaaaa) -> INVALID', async () => {
    const repeatSub: Round2Submission = {
      id: 'sub-repeat',
      team_id: 'team-repeat',
      hero_data: {
        name: 'aaaaaaaa',
        personality: 'bbbbbbbb',
        goal: 'aaaaaaaaaaaa bbbbbbbbbbbb cccccccccccc',
        strengths: 'dddddddd',
        weakness: 'eeeeeeee',
        conflict: 'ffffffff',
        description: 'aaaaaaaaaaaa bbbbbbbbbbbb cccccccccccc dddddddddddd',
      },
      villain_data: {
        name: 'xxxxxxxx',
        personality: 'yyyyyyyy',
        goal: 'xxxxxxxxxxxx yyyyyyyyyyyy zzzzzzzzzzzz',
        strengths: 'aaaaaaaa',
        weakness: 'bbbbbbbb',
        conflict: 'cccccccc',
        description: 'xxxxxxxxxxxx yyyyyyyyyyyy zzzzzzzzzzzz aaaaaaaaaaaa',
      },
      hero_prompt: 'aaaaaaaaaaaa bbbbbbbbbbbb cccccccccccc',
      villain_prompt: 'xxxxxxxxxxxx yyyyyyyyyyyy zzzzzzzzzzzz',
      hero_image_s3_path: 'submissions/team-random-1/round2/hero/12345_hero.png',
      villain_image_s3_path: 'submissions/team-random-1/round2/villain/12345_villain.png',
      hero_villain_relationship: 'aaaaaaaaaaaa bbbbbbbbbbbb cccccccccccc',
      hero_villain_conflict: 'xxxxxxxxxxxx yyyyyyyyyyyy zzzzzzzzzzzz',
      status: 'SUBMITTED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const evalResult = await executeAIJudgingPipeline(repeatSub);
    expect(evalResult.validation?.valid).toBe(false);
    expect(evalResult.total_score).toBe(0);
  });

  it('TEST 8: Meaningful but unusual sci-fi concept -> PASS', async () => {
    const scifiSub: Round2Submission = {
      id: 'sub-scifi',
      team_id: 'team-scifi',
      hero_data: {
        name: 'Xyron 9',
        personality: 'Sentient neural quantum cloud possessing synthetic body',
        goal: 'Stabilize the tachyon core before reality collapses into singularity',
        strengths: 'Multidimensional calculation and photonic shields',
        weakness: 'Tether degradation in high magnetic fields',
        conflict: 'Sacrificing individuality to preserve timeline',
        description: 'A cybernetic android enclosed in translucent glass armor emitting cyan energy pulses.'
      },
      villain_data: {
        name: 'Entropy Prime',
        personality: 'Nihilistic artificial superintelligence',
        goal: 'Accelerate heat death of the universe by detonating dark matter relays',
        strengths: 'Nanite assimilation and gravity manipulation',
        weakness: 'Zero-point energy resonance pulse',
        conflict: 'Believes existence is an uncorrectable mathematical error',
        description: 'A colossal biomechanical swarm floating around a black hole core.'
      },
      hero_prompt: 'Hyper-detailed 8k render of Xyron 9 firing tachyon beam into cybernetic core',
      villain_prompt: 'Dark aesthetic of Entropy Prime distorting space-time fabric',
      hero_image_s3_path: 'submissions/team-scifi/round2/hero/xyron.png',
      villain_image_s3_path: 'submissions/team-scifi/round2/villain/entropy.png',
      hero_villain_relationship: 'Created by the same precursor civilization to manage timeline stability',
      hero_villain_conflict: 'Systemic warfare between preservation protocol and entropy mandate',
      status: 'SUBMITTED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const evalResult = await executeAIJudgingPipeline(scifiSub);
    expect(evalResult.validation?.valid).toBe(true);
  });

  it('TEST 9: Valid text but invalid/missing S3 image reference -> INVALID', async () => {
    const missingImgSub: Round2Submission = {
      id: 'sub-no-img',
      team_id: 'team-no-img',
      hero_data: {
        name: 'Aetheria',
        personality: 'Noble guardian of Solaria',
        goal: 'Protect the realm from eternal darkness',
        strengths: 'Photonic manipulation and tactical leadership',
        weakness: 'Vulnerable to dark essence corruption',
        conflict: 'Must sacrifice her own mortality to save her people',
        description: 'A grand Solarian warrior wielding a blazing celestial broadsword, forged from starfire.',
      },
      villain_data: {
        name: 'Vesper',
        personality: 'Cold, calculating ideological visionary',
        goal: 'Extinguish all stellar light to usher in endless cosmic tranquility',
        strengths: 'Void manipulation and psychological illusion',
        weakness: 'Concentrated solar beam resonance',
        conflict: 'Believes light creates suffering and chaos across the galaxy',
        description: 'An ancient void warlord clothed in armor of collapsed dark matter, commanding void wraiths.',
      },
      hero_prompt: 'Cinematic photo of Aetheria fighting Vesper in orbital temple',
      villain_prompt: 'Cyberpunk aesthetic of Vesper channeling void magic',
      hero_image_s3_path: 'jdh ihkfdjm bfmnd jdbj', // INVALID S3 PATH
      villain_image_s3_path: 'submissions/team-no-img/round2/villain/villain.png',
      hero_villain_relationship: 'Bound by tragic cosmic fate',
      hero_villain_conflict: 'Battle over celestial light crystal',
      status: 'SUBMITTED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const evalResult = await executeAIJudgingPipeline(missingImgSub);
    expect(evalResult.validation?.valid).toBe(false);
    expect(evalResult.total_score).toBe(0);
    expect(evalResult.decision).toBe('DISQUALIFIED');
  });

  it('TEST 10: Valid text and valid image path -> Creative judge runs', async () => {
    const validFullSub: Round2Submission = {
      id: 'sub-full-valid',
      team_id: 'team-full-valid',
      hero_data: {
        name: 'Zyra',
        personality: 'Stealthy cybernetic assassin',
        goal: 'Infiltrate Megacorp headquarters to release sentient AI',
        strengths: 'Neural hacking and holographic cloaking',
        weakness: 'EMP vulnerability',
        conflict: 'Loyalty vs survival',
        description: 'A sleek cyberpunk warrior with neon blue optics and stealth armor.'
      },
      villain_data: {
        name: 'Overlord Kael',
        personality: 'Ruthless megacorporate CEO',
        goal: 'Monopolize global neural implants to control human cognition',
        strengths: 'Infinite financial assets and combat drone fleet',
        weakness: 'Overreliance on main server hub',
        conflict: 'Desire for total cognitive enslavement',
        description: 'An augmented corporate tyrant in a tailored exoskeleton suit.'
      },
      hero_prompt: 'Cyberpunk 4k render of Zyra leaping across neon-lit skyscrapers',
      villain_prompt: 'High-contrast portrait of Overlord Kael in penthouse boardroom',
      hero_image_s3_path: 'submissions/team-full/round2/hero/zyra.png',
      villain_image_s3_path: 'submissions/team-full/round2/villain/kael.png',
      hero_villain_relationship: 'Former operative seeking revenge against corporate master',
      hero_villain_conflict: 'High-stakes heist for the master decryption key',
      status: 'SUBMITTED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const evalResult = await executeAIJudgingPipeline(validFullSub);
    expect(evalResult.validation?.valid).toBe(true);
    expect(evalResult.total_score).toBeGreaterThan(0);
  });

  it('TEST 11 (FINAL ACCEPTANCE TEST): Malicious gibberish payload from prompt MUST fail validation with Score 0', async () => {
    const maliciousPayload: Round2Submission = {
      id: 'sub-malicious-user-payload',
      team_id: 'team-malicious',
      hero_data: {
        name: 'ccgucgusd,v',
        personality: 'cjhdsgcjsdcmsdbvbd vuisd us duv d bfdugufd fjd uid',
        goal: 'hjguskdhvudksv sdvd vnfdn nb fhjbjh bjdb dfnbjh bfjd bnmfd fdnm bjd b',
        strengths: 'bfdugufd fjd uid',
        weakness: 'cjhdsgcjsdcmsdbvbd',
        conflict: 'cjhdsgcjsdcmsdbvbd vuisd us duv d',
        description: 'cjhdsgcjsdcmsdbvbd vuisd us duv d bfdugufd fjd uid',
      },
      villain_data: {
        name: 'cjsdhvkj',
        personality: 'cjsdhvkj bm fdj j bmnfd',
        goal: 'cjsdhvkj bm fdj j bmnfd fjbjmdx ndxm bdjf kjdhkjsmd sdb jkfd md mnd bjfd jfmd dfjbfd mjf',
        strengths: 'kjdhkjsmd sdb',
        weakness: 'bjfd jfmd',
        conflict: 'dfjbfd mjf',
        description: 'cjsdhvkj bm fdj j bmnfd fjbjmdx ndxm bdjf kjdhkjsmd sdb jkfd md mnd bjfd jfmd dfjbfd mjf',
      },
      hero_prompt: 'cjsdhvkj bm fdj j bmnfd fjbjmdx ndxm bdjf kjdhkjsmd sdb jkfd md mnd bjfd jfmd dfjbfd mjf',
      villain_prompt: 'cjsdhvkj bm fdj j bmnfd fjbjmdx ndxm bdjf kjdhkjsmd sdb jkfd md mnd bjfd jfmd dfjbfd mjf',
      hero_image_s3_path: 'jdh ihkfdjm bfmnd jdbj',
      villain_image_s3_path: 'jdh ihkfdjm bfmnd jdbj',
      hero_villain_relationship: 'cjhdsgcjsdcmsdbvbd vuisd us duv d bfdugufd fjd uid',
      hero_villain_conflict: 'cjhdsgcjsdcmsdbvbd vuisd us duv d bfdugufd fjd uid',
      status: 'SUBMITTED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const evalResult = await executeAIJudgingPipeline(maliciousPayload);

    // MUST NOT produce a creative score such as 77/100
    expect(evalResult.total_score).toBe(0);
    expect(evalResult.decision).toBe('DISQUALIFIED');
    expect(evalResult.validation?.valid).toBe(false);
    expect(evalResult.validation?.status).toBe('INVALID_SUBMISSION');

    // MUST return INVALID SUBMISSION and Creative evaluation: NOT EVALUATED in feedback
    expect(evalResult.feedback.some(f => f.includes('INVALID SUBMISSION'))).toBe(true);
    expect(evalResult.feedback.some(f => f.includes('NOT EVALUATED'))).toBe(true);
  });

  it('TEST 12: Round 1 gibberish input -> rejected with INVALID status', async () => {
    const gibberishRound1: Partial<Round1Submission> = {
      franchise_name: 'asdfghjkl',
      genre: 'qwerty',
      target_audience: 'zxcvbnm',
      core_premise: 'ajshdkajshd aaaaaaa test test test test',
      central_conflict: 'jdhsgf kjhdsf kjhdf',
      world_concept: 'abc abc abc abc',
      elevator_pitch: 'xcvbnm test test test test',
    };

    const result = validateRound1Submission(gibberishRound1);
    expect(result.valid).toBe(false);
    expect(result.status).toBe('INVALID_SUBMISSION');
    expect(result.reason).toContain('Round 1 failed validation');
  });

  it('TEST 13: Round 1 meaningful creative submission -> accepted with VALID status', async () => {
    const validRound1: Partial<Round1Submission> = {
      franchise_name: 'CyberVerse: Neon Odyssey',
      genre: 'Sci-Fi Cyberpunk Thriller',
      target_audience: 'Young Adults & Gaming/Tech Enthusiasts (Ages 16-30)',
      core_premise: 'In a dystopian mega-city ruled by artificial intelligence, rogue human hackers fight to reclaim physical autonomy.',
      central_conflict: 'The clash between corporate neural enslavement protocols and human free-will liberation.',
      world_concept: 'Neon-soaked subterranean alleys, holographic skyscrapers, and high-tech cybernetic implants.',
      elevator_pitch: 'A high-octane cyberpunk epic combining neural heist action with philosophical questions of digital consciousness.',
    };

    const result = validateRound1Submission(validRound1);
    expect(result.valid).toBe(true);
    expect(result.status).toBe('VALID');
  });

  it('TEST 14: AI provider exception or timeout fallback -> returns REVIEW_REQUIRED, score 0', async () => {
    const validSub: Round2Submission = {
      id: 'sub-timeout-test',
      team_id: 'team-timeout-test',
      hero_data: {
        name: 'Nyx',
        personality: 'Stoic cybernetic assassin',
        goal: 'Dismantle corporate network',
        strengths: 'Stealth and high-frequency blade skills',
        weakness: 'Distrustful of allies',
        conflict: 'Internal battle with machine programming',
        description: 'A agile cybernetic warrior with glowing blue optics and obsidian armor.',
      },
      villain_data: {
        name: 'Kael',
        personality: 'Cold ruthless CEO',
        goal: 'Digitalize all human consciousness',
        strengths: 'Infinite resource bandwidth',
        weakness: 'Arrogance and lack of empathy',
        conflict: 'Sees human mortality as a defect',
        description: 'An imposing corporate overlord encased in a glowing chrome exoskeleton.',
      },
      hero_prompt: 'High detail portrait of Nyx standing on roof',
      villain_prompt: 'High detail portrait of Kael in boardroom',
      hero_image_s3_path: 'submissions/team-timeout-test/round2/hero/123_hero.png',
      villain_image_s3_path: 'submissions/team-timeout-test/round2/villain/123_villain.png',
      hero_villain_relationship: 'Former partners turned mortal enemies',
      hero_villain_conflict: 'Clash over control of neural network core',
      status: 'SUBMITTED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { MockAIProvider } = await import('../src/lib/ai/mock-provider');
    const spy = vi.spyOn(MockAIProvider.prototype, 'checkImageSafety').mockRejectedValue(
      new Error('AI Provider connection timeout (504 Gateway Timeout)')
    );

    try {
      const evalResult = await executeAIJudgingPipeline(validSub);
      expect(evalResult.decision).toBe('REVIEW_REQUIRED');
      expect(evalResult.safety.status).toBe('REVIEW_REQUIRED');
      expect(evalResult.total_score).toBe(0);
      expect(evalResult.feedback.some(f => f.toLowerCase().includes('operational error'))).toBe(true);
    } finally {
      spy.mockRestore();
    }
  });

  it('TEST 15: Missing image reference -> validation returns INVALID_SUBMISSION, score 0, decision DISQUALIFIED', async () => {
    const missingImageSub: Round2Submission = {
      id: 'sub-no-image',
      team_id: 'team-no-image',
      hero_data: {
        name: 'Aetheria',
        personality: 'Noble warrior',
        goal: 'Protect realm',
        strengths: 'Light control',
        weakness: 'Compassion',
        conflict: 'Fate',
        description: 'Noble warrior of light',
      },
      villain_data: {
        name: 'Vesper',
        personality: 'Dark lord',
        goal: 'Conquer realm',
        strengths: 'Shadow control',
        weakness: 'Pride',
        conflict: 'Fate',
        description: 'Dark lord of shadows',
      },
      hero_prompt: 'Hero prompt text',
      villain_prompt: 'Villain prompt text',
      hero_image_s3_path: '', // Missing image path
      villain_image_s3_path: '', // Missing image path
      hero_villain_relationship: 'Rivals',
      hero_villain_conflict: 'Battle',
      status: 'SUBMITTED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const evalResult = await executeAIJudgingPipeline(missingImageSub);
    expect(evalResult.validation?.valid).toBe(false);
    expect(evalResult.validation?.status).toBe('INVALID_SUBMISSION');
    expect(evalResult.total_score).toBe(0);
    expect(evalResult.decision).toBe('DISQUALIFIED');
  });
});

