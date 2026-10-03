export type ActiveRound = 1 | 2 | 3;

export interface Team {
  id: string;
  team_code: string;
  team_name: string;
  access_code_hash: string;
  access_code?: string;
  current_round: number;
  status: 'ACTIVE' | 'QUALIFIED' | 'DISQUALIFIED' | 'ELIMINATED';
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  member_name: string;
  email: string;
  phone_number: string;
  semester: string;
  section: string;
  created_at: string;
}

export interface TeamWithMembers extends Team {
  members: TeamMember[];
}

export interface Round1Submission {
  id: string;
  team_id: string;
  franchise_name: string;
  genre: string;
  target_audience: string;
  core_premise: string;
  central_conflict: string;
  world_concept: string;
  elevator_pitch: string;
  s3_path?: string | null;
  status: 'DRAFT' | 'SUBMITTED';
  submitted_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CharacterData {
  name: string;
  personality: string;
  goal: string;
  strengths: string;
  weakness: string;
  conflict: string;
  description: string;
}

export interface Round2Submission {
  id: string;
  team_id: string;
  hero_data: CharacterData;
  villain_data: CharacterData;
  supporting_character_data?: CharacterData;
  hero_prompt: string;
  villain_prompt: string;
  supporting_character_prompt?: string;
  hero_image_s3_path?: string | null;
  villain_image_s3_path?: string | null;
  supporting_character_image_s3_path?: string | null;
  hero_villain_relationship: string;
  hero_villain_conflict: string;
  status: 'DRAFT' | 'SUBMITTED' | 'PENDING_AI' | 'EVALUATED';
  submitted_at?: string | null;
  created_at: string;
  updated_at: string;
}

export type SafetyStatus = 'PASS' | 'FAIL' | 'REVIEW_REQUIRED' | 'PENDING';
export type EvaluationDecision = 'QUALIFIED' | 'DISQUALIFIED' | 'REVIEW_REQUIRED' | 'PENDING';

export interface AIEvaluation {
  id: string;
  round2_submission_id: string;
  safety_status: SafetyStatus;
  safety_reason?: string;
  safety_confidence?: number;
  character_development_score: number;
  relationship_score: number;
  originality_score: number;
  visual_quality_score: number;
  prompt_quality_score: number;
  prompt_image_consistency_score: number;
  total_score: number;
  decision: EvaluationDecision;
  feedback: string[];
  evaluated_at?: string;
  created_at: string;
}

export interface Round3Submission {
  id: string;
  team_id: string;
  marketing_angle: string;
  intended_audience_response: string;
  tagline: string;
  promotional_copy: string;
  promotional_asset_s3_path?: string | null;
  status: 'DRAFT' | 'SUBMITTED' | 'PENDING_AI' | 'EVALUATED';
  submitted_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Round3AIEvaluation {
  id: string;
  round3_submission_id: string;
  marketing_strategy_score: number;
  tagline_punch_score: number;
  audience_engagement_score: number;
  copywriting_quality_score: number;
  visual_poster_quality_score: number;
  total_score: number;
  decision: 'WINNER_CANDIDATE' | 'QUALIFIED' | 'NEEDS_REVISION' | 'DISQUALIFIED';
  feedback: string[];
  evaluated_at?: string;
  created_at: string;
}

export interface FinalScore {
  id: string;
  team_id: string;
  judge_id: string;
  score: number;
  comments?: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor: string;
  action: string;
  entity: string;
  entity_id: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface CSVRow {
  team_name: string;
  member_name: string;
  email: string;
  phone_number: string;
  semester: string;
  section: string;
}

export interface ImportPreviewItem {
  team_name: string;
  team_code: string;
  access_code: string;
  members: Array<{
    member_name: string;
    email: string;
    phone_number: string;
    semester: string;
    section: string;
  }>;
  errors: string[];
}

export interface ImportSummary {
  total_rows: number;
  valid_teams_count: number;
  valid_members_count: number;
  error_rows_count: number;
  preview: ImportPreviewItem[];
  has_errors: boolean;
}
