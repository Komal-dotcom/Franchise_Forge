import { AIProvider, EvaluationResult, Round3EvaluationResult, RubricScores, Round3RubricScores, SafetyCheckResult } from './types';
import { MockAIProvider } from './mock-provider';
import { LocalOllamaProvider } from './ollama-provider';
import { Round2Submission, Round3Submission } from '@/types';
import { inMemoryDB } from '../supabase';

/**
 * Ensures that the total score for Round 2 is strictly unique across all evaluated teams.
 */
function ensureUniqueRound2Score(scores: RubricScores, currentSubmissionId: string): { scores: RubricScores; total_score: number } {
  const existingScores = new Set<number>();
  for (const evalRec of inMemoryDB.aiEvaluations.values()) {
    if (evalRec.round2_submission_id !== currentSubmissionId) {
      existingScores.add(evalRec.total_score);
    }
  }

  let adjustedScores = { ...scores };
  let total = adjustedScores.character_development +
    adjustedScores.relationship +
    adjustedScores.originality +
    adjustedScores.visual_quality +
    adjustedScores.prompt_quality +
    adjustedScores.prompt_image_consistency;

  let attempt = 0;
  while (existingScores.has(total) && attempt < 50) {
    attempt++;
    if (attempt % 2 === 1 && adjustedScores.originality < 15) {
      adjustedScores.originality += 1;
    } else if (attempt % 2 === 0 && adjustedScores.originality > 1) {
      adjustedScores.originality -= 1;
    } else if (adjustedScores.prompt_quality < 10) {
      adjustedScores.prompt_quality += 1;
    } else if (adjustedScores.prompt_quality > 1) {
      adjustedScores.prompt_quality -= 1;
    }

    total = adjustedScores.character_development +
      adjustedScores.relationship +
      adjustedScores.originality +
      adjustedScores.visual_quality +
      adjustedScores.prompt_quality +
      adjustedScores.prompt_image_consistency;
  }

  return { scores: adjustedScores, total_score: total };
}

/**
 * Ensures that the total score for Round 3 is strictly unique across all evaluated teams.
 */
function ensureUniqueRound3Score(scores: Round3RubricScores, currentSubmissionId: string): { scores: Round3RubricScores; total_score: number } {
  const existingScores = new Set<number>();
  for (const evalRec of inMemoryDB.round3AIEvaluations.values()) {
    if (evalRec.round3_submission_id !== currentSubmissionId) {
      existingScores.add(evalRec.total_score);
    }
  }

  let adjustedScores = { ...scores };
  let total = adjustedScores.marketing_strategy +
    adjustedScores.tagline_punch +
    adjustedScores.audience_engagement +
    adjustedScores.copywriting_quality +
    adjustedScores.visual_poster_quality;

  let attempt = 0;
  while (existingScores.has(total) && attempt < 50) {
    attempt++;
    if (attempt % 2 === 1 && adjustedScores.tagline_punch < 20) {
      adjustedScores.tagline_punch += 1;
    } else if (attempt % 2 === 0 && adjustedScores.tagline_punch > 1) {
      adjustedScores.tagline_punch -= 1;
    } else if (adjustedScores.copywriting_quality < 20) {
      adjustedScores.copywriting_quality += 1;
    } else if (adjustedScores.copywriting_quality > 1) {
      adjustedScores.copywriting_quality -= 1;
    }

    total = adjustedScores.marketing_strategy +
      adjustedScores.tagline_punch +
      adjustedScores.audience_engagement +
      adjustedScores.copywriting_quality +
      adjustedScores.visual_poster_quality;
  }

  return { scores: adjustedScores, total_score: total };
}

/**
 * Master Round 3 AI Judging Pipeline (Marketing Forge AI Judge)
 */
export async function executeRound3AIJudgingPipeline(submission: Round3Submission): Promise<Round3EvaluationResult> {
  const provider = getAIProvider();

  const mktEval = await provider.evaluateRound3Marketing(
    submission.marketing_angle,
    submission.intended_audience_response,
    submission.tagline,
    submission.promotional_copy,
    submission.promotional_asset_s3_path || undefined
  );

  const rawScores: Round3RubricScores = {
    marketing_strategy: mktEval.marketing_strategy,
    tagline_punch: mktEval.tagline_punch,
    audience_engagement: mktEval.audience_engagement,
    copywriting_quality: mktEval.copywriting_quality,
    visual_poster_quality: mktEval.visual_poster_quality,
  };

  const { scores, total_score } = ensureUniqueRound3Score(rawScores, submission.id);

  let decision: 'WINNER_CANDIDATE' | 'QUALIFIED' | 'NEEDS_REVISION' | 'DISQUALIFIED' = 'QUALIFIED';
  if (total_score >= 85) {
    decision = 'WINNER_CANDIDATE';
  } else if (total_score >= 70) {
    decision = 'QUALIFIED';
  } else if (total_score >= 50) {
    decision = 'NEEDS_REVISION';
  } else {
    decision = 'DISQUALIFIED';
  }

  return {
    scores,
    total_score,
    decision,
    feedback: mktEval.feedback,
  };
}

/**
 * Instantiates configured AI Provider instance
 */
export function getAIProvider(): AIProvider {
  const providerType = process.env.AI_PROVIDER || 'mock';
  if (providerType.toLowerCase() === 'ollama') {
    return new LocalOllamaProvider();
  }
  return new MockAIProvider();
}

/**
 * Master Round 2 AI Judging Pipeline
 */
export async function executeAIJudgingPipeline(submission: Round2Submission): Promise<EvaluationResult> {
  const provider = getAIProvider();

  // 1. Image Safety Check
  const combinedContext = `Hero: ${submission.hero_data.name} ${submission.hero_data.description} Villain: ${submission.villain_data.name} ${submission.villain_data.description}`;
  const heroImageRef = submission.hero_image_s3_path || '';
  const villainImageRef = submission.villain_image_s3_path || '';

  const safetyResult: SafetyCheckResult = await provider.checkImageSafety(
    `${heroImageRef} ${villainImageRef}`,
    combinedContext
  );

  // If safety check fails completely (explicit vulgarity)
  if (safetyResult.status === 'FAIL') {
    return {
      safety: safetyResult,
      scores: {
        character_development: 0,
        relationship: 0,
        originality: 0,
        visual_quality: 0,
        prompt_quality: 0,
        prompt_image_consistency: 0,
      },
      total_score: 0,
      decision: 'DISQUALIFIED',
      feedback: [
        `Disqualified: ${safetyResult.reason}`,
        'Prohibited vulgar/explicit content detected in submission assets.',
      ],
    };
  }

  // If safety check flags borderline content requiring admin review
  if (safetyResult.status === 'REVIEW_REQUIRED') {
    return {
      safety: safetyResult,
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
      feedback: [
        `Pending Organizer Review: ${safetyResult.reason}`,
        'Submission assets queued for manual review by competition admin.',
      ],
    };
  }

  // 2. Character & Relationship Evaluation
  const charEval = await provider.evaluateCharacter(
    submission.hero_data,
    submission.villain_data,
    submission.hero_villain_relationship,
    submission.hero_villain_conflict,
    submission.supporting_character_data
  );

  // 3. Visual & Prompt Consistency Evaluation
  const visualEval = await provider.evaluateVisuals(
    {
      hero: submission.hero_prompt,
      villain: submission.villain_prompt,
      supporting: submission.supporting_character_prompt,
    },
    {
      hero: submission.hero_image_s3_path || undefined,
      villain: submission.villain_image_s3_path || undefined,
      supporting: submission.supporting_character_image_s3_path || undefined,
    }
  );

  // 4. Score Calculation strictly in program code
  const rawScores: RubricScores = {
    character_development: charEval.character_development,
    relationship: charEval.relationship,
    originality: charEval.originality,
    visual_quality: visualEval.visual_quality,
    prompt_quality: visualEval.prompt_quality,
    prompt_image_consistency: visualEval.prompt_image_consistency,
  };

  const { scores, total_score } = ensureUniqueRound2Score(rawScores, submission.id);

  // Qualification benchmark (Threshold >= 70 points out of 100)
  const decision = total_score >= 70 ? 'QUALIFIED' : 'DISQUALIFIED';

  const combinedFeedback = [...charEval.feedback, ...visualEval.feedback];

  return {
    safety: safetyResult,
    scores,
    total_score,
    decision,
    feedback: combinedFeedback,
  };
}
