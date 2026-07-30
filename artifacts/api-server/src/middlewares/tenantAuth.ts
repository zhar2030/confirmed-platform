/**
 * tenantAuth — Unified Multi-Tenant Auth Middleware
 * ──────────────────────────────────────────────────
 * Validates X-Auth-Token (unified) or X-Provider-Token (legacy, backward-compat).
 * On success, attaches req.tenant with full actor context.
 * Enforces subscription check on every request — rejects with subscription_expired
 * if the tenant's subscription is not active.
 *
 * Also exports requirePermission(perm) — a middleware factory for permission checks.
 */

import { Request, Response, NextFunction } from 'express';
import { extractUnifiedToken } from '../lib/unifiedToken';
import { verifyProviderToken } from '../lib/providerToken';
import { computePermissions, hasPermission } from '../lib/permissions';
import { db, providers } from '../lib/db';
import { eq } from 'drizzle-orm';
import type { Permission } from '../lib/permissions';

export interface TenantContext {
  tenantId:    number;
  actorId:     number;
  actorType:   'owner' | 'staff';
  role:        string;
  permissions: Permission[];
}

declare module 'express' {
  interface Request {
    tenant?: TenantContext;
  }
}

// ── Subscription check cache (5-second TTL to avoid DB on every request) ────
const subCache = new Map<number, { ok: boolean; ts: number }>();
const SUB_CACHE_TTL = 5_000; // ms

async function isSubscriptionActive(tenantId: number): Promise<boolean> {
  const cached = subCache.get(tenantId);
  if (cached && Date.now() - cached.ts < SUB_CACHE_TTL) return cached.ok;

  const [row] = await db
    .select({ status: providers.status, subStatus: providers.subscriptionStatus })
    .from(providers)
    .where(eq(providers.id, tenantId))
    .limit(1);

  const ok = !!row && row.status !== 'suspended' &&
    (row.subStatus === 'active' || row.subStatus === 'trial');

  subCache.set(tenantId, { ok, ts: Date.now() });
  return ok;
}

// ── Main middleware ────────────────────────────────────────────────────────────
export async function tenantAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  // 1. Try unified token (new format)
  const unified = extractUnifiedToken(req.headers as Record<string, string | undefined>);

  if (unified) {
    // Subscription check
    const active = await isSubscriptionActive(unified.tenantId);
    if (!active) {
      res.status(402).json({
        error: 'subscription_expired',
        message: 'اشتراككم منتهٍ — يرجى التواصل مع إدارة المنصة للتجديد',
      });
      return;
    }

    req.tenant = unified;
    next();
    return;
  }

  // 2. Fallback: legacy providerToken (X-Provider-Id / X-Provider-Token / X-Provider-User)
  const rawId    = req.headers['x-provider-id'];
  const legToken = req.headers['x-provider-token'] as string | undefined;
  const legUser  = req.headers['x-provider-user']  as string | undefined;

  if (rawId && legToken && legUser) {
    const providerId = parseInt(String(rawId), 10);
    if (!isNaN(providerId) && verifyProviderToken(providerId, legUser, legToken)) {
      // Subscription check
      const active = await isSubscriptionActive(providerId);
      if (!active) {
        res.status(402).json({
          error: 'subscription_expired',
          message: 'اشتراككم منتهٍ — يرجى التواصل مع إدارة المنصة للتجديد',
        });
        return;
      }

      req.tenant = {
        tenantId:    providerId,
        actorId:     providerId,
        actorType:   'owner',
        role:        'owner',
        permissions: computePermissions('owner', ''),
      };
      // Also set legacy req.providerId for backward-compat
      (req as any).providerId = providerId;
      next();
      return;
    }
  }

  res.status(401).json({ error: 'auth_required' });
}

// ── Permission guard ───────────────────────────────────────────────────────────
export function requirePermission(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.tenant) {
      res.status(401).json({ error: 'auth_required' });
      return;
    }
    if (!hasPermission(req.tenant.permissions, permission)) {
      res.status(403).json({
        error: 'forbidden',
        required: permission,
        message: 'ليس لديك صلاحية لتنفيذ هذه العملية',
      });
      return;
    }
    next();
  };
}

// ── Owner-only guard ──────────────────────────────────────────────────────────
export function requireOwner(req: Request, res: Response, next: NextFunction): void {
  if (!req.tenant || req.tenant.actorType !== 'owner') {
    res.status(403).json({
      error: 'owner_only',
      message: 'هذه العملية متاحة لصاحب الصالون فقط',
    });
    return;
  }
  next();
}
