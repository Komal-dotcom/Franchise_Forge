import { AIProvider, EvaluationResult, RubricScores, SafetyCheckResult } from './types';
import { MockAIProvider } from './mock-provider';
import { LocalOllamaProvider } from './ollama-provider';
import { Round2Submission } from '@/types';

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
 * 
 * Programmatically calculates total score from individual criterion scores.
 * Preserves actual rubric scores and ties (no artificial unique-score manipulation).
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

  // If safety check fails completely (explicit prohibited content)
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
        'Prohibited explicit content detected in submission assets.',
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

  // 4. Validate & Score Calculation strictly in program code
  const scores: RubricScores = {
    character_development: Math.min(30, Math.max(0, charEval.character_development || 0)),
    relationship: Math.min(20, Math.max(0, charEval.relationship || 0)),
    originality: Math.min(15, Math.max(0, charEval.originality || 0)),
    visual_quality: Math.min(15, Math.max(0, visualEval.visual_quality || 0)),
    prompt_quality: Math.min(10, Math.max(0, visualEval.prompt_quality || 0)),
    prompt_image_consistency: Math.min(10, Math.max(0, visualEval.prompt_image_consistency || 0)),
  };

  const total_score = 
    scores.character_development +
    scores.relationship +
    scores.originality +
    scores.visual_quality +
    scores.prompt_quality +
    scores.prompt_image_consistency;

  // Qualification benchmark (Threshold >= 70 points out of 100)
  const decision = total_score >= 70 ? 'QUALIFIED' : 'DISQUALIFIED';

  const combinedFeedback = [...(charEval.feedback || []), ...(visualEval.feedback || [])];

  return {
    safety: safetyResult,
    scores,
    total_score,
    decision,
    feedback: combinedFeedback,
  };
}
