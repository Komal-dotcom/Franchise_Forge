-- Franchise Forge: Initial PostgreSQL Database Migration
-- PostgreSQL extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TEAMS TABLE
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_code VARCHAR(32) NOT NULL UNIQUE,
    team_name TEXT NOT NULL,
    access_code_hash TEXT NOT NULL,
    current_round INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'QUALIFIED', 'DISQUALIFIED', 'ELIMINATED'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. TEAM MEMBERS TABLE (2-3 members per team)
CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    member_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    semester TEXT NOT NULL,
    section TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. ROUND 1 SUBMISSIONS (GREENLIGHT)
CREATE TABLE IF NOT EXISTS round1_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL UNIQUE REFERENCES teams(id) ON DELETE CASCADE,
    franchise_name TEXT NOT NULL,
    genre TEXT NOT NULL,
    target_audience TEXT NOT NULL,
    core_premise TEXT NOT NULL,
    central_conflict TEXT NOT NULL,
    world_concept TEXT NOT NULL,
    elevator_pitch TEXT NOT NULL,
    s3_path TEXT,
    status TEXT NOT NULL DEFAULT 'DRAFT', -- 'DRAFT', 'SUBMITTED'
    submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. ROUND 2 SUBMISSIONS (CHARACTER & VISUAL FORGE)
CREATE TABLE IF NOT EXISTS round2_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL UNIQUE REFERENCES teams(id) ON DELETE CASCADE,
    hero_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    villain_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    supporting_character_data JSONB DEFAULT '{}'::jsonb,
    hero_prompt TEXT NOT NULL DEFAULT '',
    villain_prompt TEXT NOT NULL DEFAULT '',
    supporting_character_prompt TEXT DEFAULT '',
    hero_image_s3_path TEXT,
    villain_image_s3_path TEXT,
    supporting_character_image_s3_path TEXT,
    hero_villain_relationship TEXT NOT NULL DEFAULT '',
    hero_villain_conflict TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'DRAFT', -- 'DRAFT', 'SUBMITTED', 'PENDING_AI', 'EVALUATED'
    submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. AI EVALUATIONS TABLE
CREATE TABLE IF NOT EXISTS ai_evaluations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    round2_submission_id UUID NOT NULL UNIQUE REFERENCES round2_submissions(id) ON DELETE CASCADE,
    safety_status TEXT NOT NULL DEFAULT 'PENDING', -- 'PASS', 'FAIL', 'REVIEW_REQUIRED'
    safety_reason TEXT,
    safety_confidence NUMERIC(5,2),
    character_development_score NUMERIC(5,2) DEFAULT 0,
    relationship_score NUMERIC(5,2) DEFAULT 0,
    originality_score NUMERIC(5,2) DEFAULT 0,
    visual_quality_score NUMERIC(5,2) DEFAULT 0,
    prompt_quality_score NUMERIC(5,2) DEFAULT 0,
    prompt_image_consistency_score NUMERIC(5,2) DEFAULT 0,
    total_score NUMERIC(5,2) DEFAULT 0,
    decision TEXT NOT NULL DEFAULT 'PENDING', -- 'QUALIFIED', 'DISQUALIFIED', 'REVIEW_REQUIRED', 'PENDING'
    feedback JSONB DEFAULT '[]'::jsonb,
    evaluated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. ROUND 3 SUBMISSIONS (MARKETING FORGE)
CREATE TABLE IF NOT EXISTS round3_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL UNIQUE REFERENCES teams(id) ON DELETE CASCADE,
    marketing_angle TEXT NOT NULL,
    intended_audience_response TEXT NOT NULL,
    tagline TEXT NOT NULL,
    promotional_copy TEXT NOT NULL,
    promotional_asset_s3_path TEXT,
    status TEXT NOT NULL DEFAULT 'DRAFT', -- 'DRAFT', 'SUBMITTED'
    submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. FINAL SCORES (HUMAN JUDGES)
CREATE TABLE IF NOT EXISTS final_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    judge_id TEXT NOT NULL,
    score NUMERIC(5,2) NOT NULL,
    comments TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. COMPETITION SETTINGS TABLE
CREATE TABLE IF NOT EXISTS competition_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor TEXT NOT NULL,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- INDEXES FOR MAXIMUM QUERY PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_teams_team_code ON teams(team_code);
CREATE INDEX IF NOT EXISTS idx_teams_current_round ON teams(current_round);
CREATE INDEX IF NOT EXISTS idx_teams_status ON teams(status);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_round1_team_id ON round1_submissions(team_id);
CREATE INDEX IF NOT EXISTS idx_round2_team_id ON round2_submissions(team_id);
CREATE INDEX IF NOT EXISTS idx_round3_team_id ON round3_submissions(team_id);
CREATE INDEX IF NOT EXISTS idx_ai_eval_round2_id ON ai_evaluations(round2_submission_id);
CREATE INDEX IF NOT EXISTS idx_ai_eval_safety_status ON ai_evaluations(safety_status);
CREATE INDEX IF NOT EXISTS idx_final_scores_team_id ON final_scores(team_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);

-- SEED DEFAULT COMPETITION SETTINGS
INSERT INTO competition_settings (key, value)
VALUES
    ('active_round', '1'::jsonb),
    ('round_status', '{"round1": "OPEN", "round2": "CLOSED", "round3": "CLOSED", "top5_locked": false}'::jsonb),
    ('rubric_weights', '{"character_development": 30, "relationship": 20, "originality": 15, "visual_quality": 15, "prompt_quality": 10, "prompt_image_consistency": 10}'::jsonb)
ON CONFLICT (key) DO NOTHING;
