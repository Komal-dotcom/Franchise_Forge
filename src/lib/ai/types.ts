import { CharacterData, EvaluationDecision, SafetyStatus } from '@/types';

export interface SafetyCheckResult {
  status: SafetyStatus;
  reason: string;
  confidence: number; // 0.0 to 1.0
  flagged_elements?: string[];
}

export interface RubricScores {
  character_development: number; // Max 30
  relationship: number;           // Max 20
  originality: number;            // Max 15
  visual_quality: number;         // Max 15
  prompt_quality: number;         // Max 10
  prompt_image_consistency: number; // Max 10
}

export interface Round3RubricScores {
  marketing_strategy: number;       // Max 25
  tagline_punch: number;             // Max 20
  audience_engagement: number;       // Max 20
  copywriting_quality: number;       // Max 20
  visual_poster_quality: number;    // Max 15
}

import { SubmissionValidationResult } from './validator';

export interface EvaluationResult {
  safety: SafetyCheckResult;
  scores: RubricScores;
  total_score: number;
  decision: EvaluationDecision;
  feedback: string[];
  validation?: SubmissionValidationResult;
}

export interface Round3EvaluationResult {
  scores: Round3RubricScores;
  total_score: number;
  decision: 'WINNER_CANDIDATE' | 'QUALIFIED' | 'NEEDS_REVISION' | 'DISQUALIFIED';
  feedback: string[];
}

export interface AIProvider {
  name: string;
  checkImageSafety(imageUrlOrBase64: string, characterContext?: string): Promise<SafetyCheckResult>;
  evaluateCharacter(
    hero: CharacterData,
    villain: CharacterData,
    relationship: string,
    conflict: string,
    supporting?: CharacterData
  ): Promise<{ character_development: number; relationship: number; originality: number; feedback: string[] }>;
  evaluateVisuals(
    prompts: { hero: string; villain: string; supporting?: string },
    imageUrls: { hero?: string; villain?: string; supporting?: string }
  ): Promise<{ visual_quality: number; prompt_quality: number; prompt_image_consistency: number; feedback: string[] }>;
  evaluateRound3Marketing(
    marketingAngle: string,
    intendedAudienceResponse: string,
    tagline: string,
    promotionalCopy: string,
    promotionalAssetUrl?: string
  ): Promise<{
    marketing_strategy: number;
    tagline_punch: number;
    audience_engagement: number;
    copywriting_quality: number;
    visual_poster_quality: number;
    feedback: string[];
  }>;
}
