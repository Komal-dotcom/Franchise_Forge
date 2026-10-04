export type ActiveRound = 1 | 2 | 3;

export type RoundLifecycleStatus = 'STANDBY' | 'OPEN' | 'LOCKED' | 'ENDED' | 'PUBLISHED';

export interface RoundControlState {
  status: RoundLifecycleStatus;
  last_changed_at?: string;
  last_changed_by?: string;
  deadline?: string | null;
  manual_judging_open?: boolean;
  results_published?: boolean;
}

export interface CompetitionLifecycleSettings {
  active_round: number;
  round1: RoundControlState;
  round2: RoundControlState;
  round3: RoundControlState;
  top5_locked: boolean;
  ai_queue_paused?: boolean;
}

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
  status: 'DRAFT' | 'SUBMITTED' | 'LOCKED';
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
  status: 'DRAFT' | 'SUBMITTED' | 'PENDING_AI' | 'EVALUATED' | 'LOCKED';
  submitted_at?: string | null;
  created_at: string;
  updated_at: string;
}

export type SafetyStatus = 'PASS' | 'FAIL' | 'REVIEW_REQUIRED' | 'PENDING';
export type EvaluationDecision = 'QUALIFIED' | 'DISQUALIFIED' | 'REVIEW_REQUIRED' | 'PENDING';
export type EvaluationProcessingStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'REVIEW_REQUIRED' | 'FAILED' | 'DISQUALIFIED';

export interface AIEvaluation {
  id: string;
  round2_submission_id: string;
  safety_status: SafetyStatus;
  safety_reason?: string;
  safety_confidence?: number;
  validation?: {
    valid: boolean;
    status: 'VALID' | 'WARNING' | 'INVALID_SUBMISSION';
    reason: string;
    fieldDetails: Record<string, { field: string; label: string; valid: boolean; reason: string }>;
    scoreCap?: number;
  };
  character_development_score: number;
  relationship_score: number;
  originality_score: number;
  visual_quality_score: number;
  prompt_quality_score: number;
  prompt_image_consistency_score: number;
  total_score: number;
  decision: EvaluationDecision;
  evaluation_status?: EvaluationProcessingStatus;
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
  status: 'DRAFT' | 'SUBMITTED' | 'EVALUATED' | 'LOCKED';
  submitted_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Round3ManualScore {
  id: string;
  round3_submission_id: string;
  team_id: string;
  judge_id: string;
  judge_name: string;
  marketing_strategy_score: number;     // Max 25
  tagline_punch_score: number;           // Max 20
  audience_engagement_score: number;     // Max 20
  copywriting_quality_score: number;     // Max 20
  visual_poster_quality_score: number; // Max 15
  total_score: number;                    // Max 100
  comments?: string;
  status: 'DRAFT' | 'SUBMITTED' | 'LOCKED';
  created_at: string;
  updated_at: string;
}

export interface FinalScore {
  id: string;
  team_id: string;
  judge_id: string;
  judge_name?: string;
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
  previous_value?: any;
  new_value?: any;
  reason?: string;
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

export interface TeamDossierData {
  team: Team;
  members: TeamMember[];
  round1?: Round1Submission | null;
  round2?: Round2Submission | null;
  round2Evaluation?: AIEvaluation | null;
  round3?: Round3Submission | null;
  round3ManualScores?: Round3ManualScore[];
  finalScores?: FinalScore[];
  auditLogs?: AuditLog[];
}
