import { createClient, SupabaseClient } from '@supabase/supabase-js';

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
  round3AIEvaluations: Map<string, any> = new Map();
  finalScores: Map<string, any> = new Map();
  auditLogs: any[] = [];
  settings: Map<string, any> = new Map<string, any>([
    ['active_round', 1],
    ['round_status', { round1: 'OPEN', round2: 'CLOSED', round3: 'CLOSED', top5_locked: false }],
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

// Seed initial default team if empty
if (inMemoryDB.teams.size === 0) {
  const seedTeamId = 'seed-team-001';
  inMemoryDB.teams.set(seedTeamId, {
    id: seedTeamId,
    team_code: 'FF26-001',
    team_name: 'Studio Alpha',
    access_code_hash: '$2a$10$wN9F/00NqGZ/T738VvM/8.XfD6.gM2234567890abcdefghijkl',
    access_code: '3LEDAW',
    current_round: 1,
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  inMemoryDB.teamMembers.set('seed-mem-1', {
    id: 'seed-mem-1',
    team_id: seedTeamId,
    member_name: 'Rahul Sharma',
    email: 'rahul@studioalpha.com',
    phone_number: '9876543210',
    semester: '5',
    section: 'A',
    created_at: new Date().toISOString(),
  });

  inMemoryDB.teamMembers.set('seed-mem-2', {
    id: 'seed-mem-2',
    team_id: seedTeamId,
    member_name: 'Priya Verma',
    email: 'priya@studioalpha.com',
    phone_number: '9876543211',
    semester: '5',
    section: 'A',
    created_at: new Date().toISOString(),
  });
}

