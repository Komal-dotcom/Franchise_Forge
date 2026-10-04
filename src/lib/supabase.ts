import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-anon-key';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;

// Public client for client-side operations (subject to RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Service role privileged client for backend server operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

/**
 * In-memory fallback mock database engine for zero-cost offline local testing
 * when a live Supabase server instance is not connected.
 */
class InMemoryDatabase {
  teams: Map<string, any> = new Map();
  teamMembers: Map<string, any> = new Map();
  round1Submissions: Map<string, any> = new Map();
  round2Submissions: Map<string, any> = new Map();
  aiEvaluations: Map<string, any> = new Map();
  round3Submissions: Map<string, any> = new Map();
  round3ManualScores: Map<string, any> = new Map();
  finalScores: Map<string, any> = new Map();
  auditLogs: any[] = [];
  settings: Map<string, any> = new Map<string, any>([
    ['active_round', 1],
    ['round_lifecycle', {
      active_round: 1,
      round1: { status: 'OPEN', last_changed_at: new Date().toISOString(), last_changed_by: 'SYSTEM' },
      round2: { status: 'STANDBY', last_changed_at: new Date().toISOString(), last_changed_by: 'SYSTEM' },
      round3: { status: 'STANDBY', manual_judging_open: false, last_changed_at: new Date().toISOString(), last_changed_by: 'SYSTEM' },
      top5_locked: false,
      ai_queue_paused: false,
    }],
    ['rubric_weights', {
      character_development: 30,
      relationship: 20,
      originality: 15,
      visual_quality: 15,
      prompt_quality: 10,
      prompt_image_consistency: 10
    }]
  ]);
}

const globalForDB = globalThis as unknown as { inMemoryDB?: InMemoryDatabase };

export const inMemoryDB = globalForDB.inMemoryDB || (globalForDB.inMemoryDB = new InMemoryDatabase());


