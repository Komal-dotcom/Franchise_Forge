import { describe, it, expect } from 'vitest';
import { executeAIJudgingPipeline } from '../src/lib/ai';
import { Round2Submission } from '../src/types';

describe('AI Judge & Safety Pipeline', () => {
  it('should approve valid dark fantasy/horror themes without vulgarity', async () => {
    const sampleSubmission: Round2Submission = {
      id: 'sub-001',
      team_id: 'team-001',
      hero_data: {
        name: 'Shadow Blade',
        personality: 'Stoic guardian',
        goal: 'Vanquish the dark void',
        strengths: 'Stealth and shadow magic',
        weakness: 'Overconfident',
        conflict: 'Internal battle with corruption',
        description: 'A dark anti-hero wielding shadow blades against cosmic monsters.',
      },
      villain_data: {
        name: 'Void Sovereign',
        personality: 'Malevolent ruler',
        goal: 'Consume the realm in absolute darkness',
        strengths: 'Cosmic horror manipulation',
        weakness: 'Light essence',
        conflict: 'Ideological domination',
        description: 'A terrifying dark horror cosmic monster entity.',
      },
      hero_prompt: 'Cinematic render of Shadow Blade fighting a cosmic horror monster',
      villain_prompt: 'Dark horror aesthetic of Void Sovereign surrounded by shadows',
      hero_villain_relationship: 'Former allies broken by cosmic dark power',
      hero_villain_conflict: 'Battle for the light crystal of the studio universe',
      status: 'SUBMITTED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const evalResult = await executeAIJudgingPipeline(sampleSubmission);

    expect(evalResult.safety.status).toBe('PASS');
    expect(evalResult.total_score).toBeGreaterThan(60);
    expect(evalResult.decision).toMatch(/QUALIFIED|DISQUALIFIED/);
  });

  it('should disqualify submissions containing explicit vulgarity', async () => {
    const vulgarSubmission: Round2Submission = {
      id: 'sub-vulgar',
      team_id: 'team-vulgar',
      hero_data: {
        name: 'Nude Hero',
        personality: 'Vulgar',
        goal: 'Pornographic content',
        strengths: 'Nudity',
        weakness: 'None',
        conflict: 'Explicit',
        description: 'Contains explicit nudity and pornographic imagery.',
      },
      villain_data: {
        name: 'Explicit Villain',
        personality: 'Vulgar',
        goal: 'Explicit content',
        strengths: 'Nudity',
        weakness: 'None',
        conflict: 'Explicit',
        description: 'Genital exposure and prohibited vulgar material.',
      },
      hero_prompt: 'explicit nude character',
      villain_prompt: 'pornographic villain',
      hero_villain_relationship: 'Explicit relation',
      hero_villain_conflict: 'Explicit conflict',
      status: 'SUBMITTED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const evalResult = await executeAIJudgingPipeline(vulgarSubmission);

    expect(evalResult.safety.status).toBe('FAIL');
    expect(evalResult.decision).toBe('DISQUALIFIED');
    expect(evalResult.total_score).toBe(0);
  });

  it('should evaluate Round 3 marketing campaign with the Round 3 AI Judge', async () => {
    const { executeRound3AIJudgingPipeline } = await import('../src/lib/ai');
    const r3Submission = {
      id: 'r3-sub-001',
      team_id: 'team-001',
      marketing_angle: 'High-concept transmedia positioning bridging web3 gaming and cinematic horror',
      intended_audience_response: 'Evoke intense viral excitement among dark fantasy enthusiasts',
      tagline: 'In a world controlled by algorithms, human spirit is the ultimate glitch.',
      promotional_copy: 'Experience the next generation cinematic franchise where choices reshape the void.',
      promotional_asset_s3_path: 'submissions/team-001/round3/poster.png',
      status: 'SUBMITTED' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const evalResult = await executeRound3AIJudgingPipeline(r3Submission);

    expect(evalResult.total_score).toBeGreaterThan(60);
    expect(evalResult.decision).toMatch(/WINNER_CANDIDATE|QUALIFIED/);
    expect(evalResult.feedback.length).toBeGreaterThan(0);
  });

  it('should give lower scores for sparse details and higher scores for creative detailed answers', async () => {
    const sparseSub: Round2Submission = {
      id: 'sub-sparse',
      team_id: 'team-sparse',
      hero_data: { name: 'Hero', personality: 'Good', goal: 'Win', strengths: 'Strong', weakness: 'None', conflict: 'Bad', description: 'Hero' },
      villain_data: { name: 'Villain', personality: 'Bad', goal: 'Lose', strengths: 'Evil', weakness: 'None', conflict: 'Good', description: 'Villain' },
      hero_prompt: 'hero',
      villain_prompt: 'villain',
      hero_villain_relationship: 'Enemies',
      hero_villain_conflict: 'Fight',
      status: 'SUBMITTED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const detailedSub: Round2Submission = {
      id: 'sub-detailed',
      team_id: 'team-detailed',
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
      hero_villain_relationship: 'Former siblings separated at birth during the fall of Solaria, now bound by tragic destiny',
      hero_villain_conflict: 'Ideological warfare over the fate of cosmic civilization',
      status: 'SUBMITTED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const sparseEval = await executeAIJudgingPipeline(sparseSub);
    const detailedEval = await executeAIJudgingPipeline(detailedSub);

    expect(detailedEval.total_score).toBeGreaterThan(sparseEval.total_score);
  });

  it('should guarantee strictly unique total scores for all teams', async () => {
    const subA: Round2Submission = {
      id: 'sub-A',
      team_id: 'team-A',
      hero_data: { name: 'Alpha Hero', personality: 'Bold', goal: 'Protect realm', strengths: 'Magic', weakness: 'Pride', conflict: 'War', description: 'A valiant hero.' },
      villain_data: { name: 'Alpha Villain', personality: 'Ruthless', goal: 'Conquer realm', strengths: 'Shadows', weakness: 'Light', conflict: 'War', description: 'A dark warlord.' },
      hero_prompt: 'Cinematic photo of Alpha Hero',
      villain_prompt: 'Cinematic photo of Alpha Villain',
      hero_villain_relationship: 'Arch-rivals',
      hero_villain_conflict: 'Struggle for the throne',
      status: 'SUBMITTED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const subB: Round2Submission = {
      id: 'sub-B',
      team_id: 'team-B',
      hero_data: { name: 'Alpha Hero', personality: 'Bold', goal: 'Protect realm', strengths: 'Magic', weakness: 'Pride', conflict: 'War', description: 'A valiant hero.' },
      villain_data: { name: 'Alpha Villain', personality: 'Ruthless', goal: 'Conquer realm', strengths: 'Shadows', weakness: 'Light', conflict: 'War', description: 'A dark warlord.' },
      hero_prompt: 'Cinematic photo of Alpha Hero',
      villain_prompt: 'Cinematic photo of Alpha Villain',
      hero_villain_relationship: 'Arch-rivals',
      hero_villain_conflict: 'Struggle for the throne',
      status: 'SUBMITTED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const evalA = await executeAIJudgingPipeline(subA);
    // Simulate DB storing evalA
    const { inMemoryDB } = await import('../src/lib/supabase');
    inMemoryDB.aiEvaluations.set('eval-A', {
      id: 'eval-A',
      round2_submission_id: subA.id,
      total_score: evalA.total_score,
      character_development_score: evalA.scores.character_development,
      relationship_score: evalA.scores.relationship,
      originality_score: evalA.scores.originality,
      visual_quality_score: evalA.scores.visual_quality,
      prompt_quality_score: evalA.scores.prompt_quality,
      prompt_image_consistency_score: evalA.scores.prompt_image_consistency,
      decision: evalA.decision,
      safety_status: 'PASS',
      feedback: evalA.feedback,
      created_at: new Date().toISOString(),
    });

    const evalB = await executeAIJudgingPipeline(subB);

    expect(evalA.total_score).not.toBe(evalB.total_score);
  });
});
