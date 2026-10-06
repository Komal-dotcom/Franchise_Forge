import { AuditLog } from '@/types';
import { inMemoryDB, supabaseAdmin } from './supabase';

export interface LogAuditParams {
  actor: string;
  action: string;
  entity: string;
  entity_id: string;
  previous_value?: any;
  new_value?: any;
  reason?: string;
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
    previous_value: params.previous_value,
    new_value: params.new_value,
    reason: params.reason,
    timestamp: new Date().toISOString(),
    metadata: params.metadata || {},
  };

  // Keep in-memory store updated
  inMemoryDB.auditLogs.unshift(auditEntry);

  try {
    const { error } = await supabaseAdmin.from('audit_logs').insert({
      id: auditEntry.id,
      actor: params.actor,
      action: params.action,
      entity: params.entity,
      entity_id: params.entity_id,
      timestamp: auditEntry.timestamp,
      metadata: {
        ...(params.metadata || {}),
        ...(params.previous_value && { previous_value: params.previous_value }),
        ...(params.new_value && { new_value: params.new_value }),
        ...(params.reason && { reason: params.reason }),
      },
    });

    if (error) {
      console.error('[Audit Log Error] Failed to persist audit log to Supabase:', error);
    }
  } catch (err) {
    // Graceful fallback logging
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
      return data.map((item: any) => ({
        id: item.id,
        actor: item.actor,
        action: item.action,
        entity: item.entity,
        entity_id: item.entity_id,
        timestamp: item.timestamp,
        reason: item.reason || item.metadata?.reason,
        previous_value: item.previous_value || item.metadata?.previous_value,
        new_value: item.new_value || item.metadata?.new_value,
        metadata: item.metadata || {},
      })) as AuditLog[];
    }
  } catch (err) {
    // Fall back to memory DB
  }

  return inMemoryDB.auditLogs.slice(0, limit);
}

