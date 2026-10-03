import { AuditLog } from '@/types';
import { inMemoryDB, supabaseAdmin } from './supabase';

export interface LogAuditParams {
  actor: string;
  action: string;
  entity: string;
  entity_id: string;
  metadata?: Record<string, any>;
}

/**
 * Persists system audit events to database with fallback to in-memory store
 */
export async function logAuditEvent(params: LogAuditParams): Promise<void> {
  const auditEntry: AuditLog = {
    id: typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString(36).substring(2),
    actor: params.actor,
    action: params.action,
    entity: params.entity,
    entity_id: params.entity_id,
    timestamp: new Date().toISOString(),
    metadata: params.metadata || {},
  };

  // Always keep in memory store
  inMemoryDB.auditLogs.unshift(auditEntry);

  try {
    const { error } = await supabaseAdmin.from('audit_logs').insert({
      actor: params.actor,
      action: params.action,
      entity: params.entity,
      entity_id: params.entity_id,
      timestamp: auditEntry.timestamp,
      metadata: params.metadata || {},
    });

    if (error) {
      console.warn('Database audit insert notice:', error.message);
    }
  } catch (err) {
    // Graceful fallback for local offline environment
  }
}

/**
 * Retrieves audit logs ordered by newest first
 */
export async function getAuditLogs(limit = 100): Promise<AuditLog[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('audit_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (!error && data && data.length > 0) {
      return data as AuditLog[];
    }
  } catch (err) {
    // Fall back to memory DB
  }

  return inMemoryDB.auditLogs.slice(0, limit);
}
