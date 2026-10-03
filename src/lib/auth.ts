import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { Team, TeamWithMembers } from '@/types';
import { inMemoryDB, supabaseAdmin } from './supabase';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'franchise-forge-super-secret-jwt-key-2026'
);

const TEAM_SESSION_COOKIE = 'ff_team_session';
const ADMIN_SESSION_COOKIE = 'ff_admin_session';

export interface TeamJWTPayload {
  team_id: string;
  team_code: string;
  team_name: string;
  role: 'TEAM';
}

export interface AdminJWTPayload {
  role: 'ADMIN';
}

/**
 * Generates a secure random 6-character access code for imported teams
 */
export function generateAccessCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Securely hashes an access code using bcrypt
 */
export async function hashAccessCode(code: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(code, salt);
}

/**
 * Verifies a plaintext access code against a stored hash or raw access code
 */
export async function verifyAccessCode(plaintext: string, hash: string, rawCode?: string): Promise<boolean> {
  if (!plaintext) return false;
  const cleanInput = plaintext.trim();

  // 1. Case-insensitive comparison against raw plaintext access code if present
  if (rawCode && cleanInput.toUpperCase() === rawCode.trim().toUpperCase()) {
    return true;
  }

  if (hash) {
    const cleanHash = hash.trim();
    // 2. Direct string match in case code was stored as plaintext
    if (cleanInput.toUpperCase() === cleanHash.toUpperCase()) {
      return true;
    }

    // 3. Bcrypt comparison
    try {
      const isMatch = await bcrypt.compare(cleanInput, cleanHash);
      if (isMatch) return true;
    } catch (err) {
      // Ignore invalid bcrypt format
    }
  }

  return false;
}


/**
 * Creates a signed JWT token for a team session
 */
export async function createTeamToken(team: Team): Promise<string> {
  return new SignJWT({
    team_id: team.id,
    team_code: team.team_code,
    team_name: team.team_name,
    role: 'TEAM',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET);
}

/**
 * Creates a signed JWT token for an admin session
 */
export async function createAdminToken(): Promise<string> {
  return new SignJWT({ role: 'ADMIN' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET);
}

/**
 * Verifies a team session token
 */
export async function verifyTeamToken(token: string): Promise<TeamJWTPayload | null> {
  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    const payload = verified.payload as unknown as TeamJWTPayload;
    if (payload.role === 'TEAM') return payload;
    return null;
  } catch (err) {
    return null;
  }
}

/**
 * Verifies an admin session token
 */
export async function verifyAdminToken(token: string): Promise<boolean> {
  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    return verified.payload.role === 'ADMIN';
  } catch (err) {
    return false;
  }
}

/**
 * Retrieves current Team from server cookies
 */
export async function getCurrentTeamSession(): Promise<TeamJWTPayload | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(TEAM_SESSION_COOKIE)?.value;
    if (!token) return null;
    return verifyTeamToken(token);
  } catch (error) {
    return null;
  }
}

/**
 * Retrieves current Admin status from server cookies
 */
export async function getIsAdminSession(): Promise<boolean> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
    if (!token) return false;
    return verifyAdminToken(token);
  } catch (error) {
    return false;
  }
}

export { TEAM_SESSION_COOKIE, ADMIN_SESSION_COOKIE };
