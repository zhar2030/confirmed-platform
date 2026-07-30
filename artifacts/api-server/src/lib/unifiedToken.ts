/**
 * Unified Auth Token — Multi-Tenant SaaS
 * ────────────────────────────────────────
 * Stateless HMAC-SHA256 token valid for the current UTC day.
 *
 * Payload string:  confirmed|{tenantId}|{actorId}|{actorType}|{role}|{YYYY-MM-DD}
 * Headers expected:
 *   X-Tenant-Id   : tenantId (providerId)
 *   X-Actor-Id    : actorId (providerId or staffId)
 *   X-Actor-Type  : 'owner' | 'staff'
 *   X-Actor-Role  : 'owner' | 'manager' | 'cashier' | 'specialist'
 *   X-Auth-Token  : HMAC hex
 */

import { createHmac } from 'node:crypto';
import type { Permission } from './permissions';
import { computePermissions } from './permissions';

const SECRET = process.env['SESSION_SECRET'] ?? 'fallback-dev-secret-change-in-prod';

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

export interface UnifiedTokenPayload {
  tenantId:    number;
  actorId:     number;
  actorType:   'owner' | 'staff';
  role:        string;
  permissions: Permission[];
}

function buildPayloadString(
  tenantId: number,
  actorId:  number,
  actorType: string,
  role:     string,
): string {
  return `confirmed|${tenantId}|${actorId}|${actorType}|${role}|${todayUTC()}`;
}

export function generateUnifiedToken(
  tenantId:  number,
  actorId:   number,
  actorType: 'owner' | 'staff',
  role:      string,
): string {
  return createHmac('sha256', SECRET)
    .update(buildPayloadString(tenantId, actorId, actorType, role))
    .digest('hex');
}

export function verifyUnifiedToken(
  tenantId:  number,
  actorId:   number,
  actorType: string,
  role:      string,
  token:     string,
): boolean {
  if (!token) return false;
  const expected = createHmac('sha256', SECRET)
    .update(buildPayloadString(tenantId, actorId, actorType, role))
    .digest('hex');
  if (expected.length !== token.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Parse headers from a request and return the payload if valid.
 * Returns null if headers are missing or token is invalid.
 */
export function extractUnifiedToken(headers: Record<string, string | string[] | undefined>): UnifiedTokenPayload | null {
  const tenantId  = parseInt(String(headers['x-tenant-id']  ?? ''), 10);
  const actorId   = parseInt(String(headers['x-actor-id']   ?? ''), 10);
  const actorType = String(headers['x-actor-type'] ?? '');
  const role      = String(headers['x-actor-role'] ?? '');
  const token     = String(headers['x-auth-token'] ?? '');
  const permsStr  = String(headers['x-actor-permissions'] ?? '');

  if (!tenantId || !actorId || !actorType || !role || !token) return null;
  if (actorType !== 'owner' && actorType !== 'staff') return null;
  if (isNaN(tenantId) || isNaN(actorId)) return null;

  if (!verifyUnifiedToken(tenantId, actorId, actorType, role, token)) return null;

  return {
    tenantId,
    actorId,
    actorType: actorType as 'owner' | 'staff',
    role,
    permissions: computePermissions(role, permsStr),
  };
}
