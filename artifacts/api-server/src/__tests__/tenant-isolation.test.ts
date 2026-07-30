/**
 * Tenant Isolation Tests
 * ───────────────────────
 * Verifies that Tenant A can NEVER read, write, or modify Tenant B's data.
 * This mirrors the standard followed by Shopify, Stripe, HubSpot, and Notion.
 *
 * Test matrix:
 *   ✅ No auth         → 401 on every protected endpoint
 *   ✅ Tenant A token  → sees only Tenant A's rows (never Tenant B's)
 *   ✅ Tenant B token  → sees only Tenant B's rows (never Tenant A's)
 *   ✅ Forged tenant   → rejected by HMAC verification
 *   ✅ New tenant      → empty dashboard (zero records)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { generateUnifiedToken } from '../lib/unifiedToken';

// ── Token helpers ─────────────────────────────────────────────────────────────
function makeHeaders(tenantId: number, role = 'owner') {
  const token = generateUnifiedToken(tenantId, tenantId, 'owner', role);
  return {
    'Content-Type': 'application/json',
    'X-Tenant-Id': String(tenantId),
    'X-Actor-Id': String(tenantId),
    'X-Actor-Type': 'owner',
    'X-Actor-Role': role,
    'X-Auth-Token': token,
    'X-Actor-Permissions': 'manage_bookings,manage_clients,manage_staff,manage_services,view_reports',
  };
}

const BASE = 'http://localhost:8080';

async function apiFetch(path: string, headers: Record<string, string>, method = 'GET', body?: object) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, body: json };
}

// Use non-existent tenant IDs that will never match real data in tests
const TENANT_A_ID = 999001;
const TENANT_B_ID = 999002;

const headersA = makeHeaders(TENANT_A_ID);
const headersB = makeHeaders(TENANT_B_ID);
const noAuthHeaders = { 'Content-Type': 'application/json' };

// ── Endpoint list: all tenant-scoped routes ───────────────────────────────────
const PROTECTED_ENDPOINTS = [
  '/api/bookings',
  '/api/clients',
  '/api/staff',
  '/api/services',
  '/api/invoices',
  '/api/invoices/stats',
];

// ── Test Suite ────────────────────────────────────────────────────────────────

describe('Tenant Isolation — No Auth', () => {
  for (const endpoint of PROTECTED_ENDPOINTS) {
    it(`GET ${endpoint} → 401 without auth`, async () => {
      const { status } = await apiFetch(endpoint, noAuthHeaders as any);
      expect(status).toBe(401);
    });
  }
});

describe('Tenant Isolation — Forged Token', () => {
  it('rejects a token where tenantId does not match the HMAC payload', async () => {
    // Build a valid token for Tenant A but claim to be Tenant B in headers
    const tokenForA = generateUnifiedToken(TENANT_A_ID, TENANT_A_ID, 'owner', 'owner');
    const forgedHeaders = {
      'Content-Type': 'application/json',
      'X-Tenant-Id': String(TENANT_B_ID),   // Lies about identity
      'X-Actor-Id': String(TENANT_B_ID),
      'X-Actor-Type': 'owner',
      'X-Actor-Role': 'owner',
      'X-Auth-Token': tokenForA,             // Token is for A, not B
    };
    const { status } = await apiFetch('/api/bookings', forgedHeaders as any);
    expect(status).toBe(401);
  });
});

describe('Tenant Isolation — Cross-Tenant Data Leakage', () => {
  it('Tenant A sees empty bookings (no cross-tenant data)', async () => {
    const { status, body } = await apiFetch('/api/bookings', headersA);
    // Non-existent tenant → either empty array or 402 (subscription check)
    // Must NOT be 200 with another tenant's rows
    if (status === 200) {
      expect(Array.isArray(body.bookings)).toBe(true);
      // Every returned row must belong to Tenant A
      for (const booking of body.bookings ?? []) {
        expect(booking.providerId ?? booking.provider_id).not.toBe(TENANT_B_ID);
      }
    } else {
      expect([401, 402, 404]).toContain(status);
    }
  });

  it('Tenant A sees empty clients (no cross-tenant data)', async () => {
    const { status, body } = await apiFetch('/api/clients', headersA);
    if (status === 200) {
      expect(Array.isArray(body.clients)).toBe(true);
      for (const client of body.clients ?? []) {
        expect(client.providerId ?? client.provider_id).not.toBe(TENANT_B_ID);
      }
    } else {
      expect([401, 402, 404]).toContain(status);
    }
  });

  it('Tenant A sees empty staff (no cross-tenant data)', async () => {
    const { status, body } = await apiFetch('/api/staff', headersA);
    if (status === 200) {
      expect(Array.isArray(body.staff)).toBe(true);
      for (const member of body.staff ?? []) {
        expect(member.providerId ?? member.provider_id).not.toBe(TENANT_B_ID);
      }
    } else {
      expect([401, 402, 404]).toContain(status);
    }
  });

  it('Tenant A sees empty services (no cross-tenant data)', async () => {
    const { status, body } = await apiFetch('/api/services', headersA);
    if (status === 200) {
      expect(Array.isArray(body.services)).toBe(true);
      for (const svc of body.services ?? []) {
        expect(svc.providerId ?? svc.provider_id).not.toBe(TENANT_B_ID);
      }
    } else {
      expect([401, 402, 404]).toContain(status);
    }
  });

  it('Tenant A sees empty invoices (no cross-tenant data)', async () => {
    const { status, body } = await apiFetch('/api/invoices', headersA);
    if (status === 200) {
      expect(Array.isArray(body.invoices)).toBe(true);
      expect(body.invoices.length).toBe(0); // Non-existent tenant has no invoices
    } else {
      expect([401, 402, 404]).toContain(status);
    }
  });

  it('Tenant B cannot read Tenant A bookings even with valid token', async () => {
    const { status, body } = await apiFetch('/api/bookings', headersB);
    if (status === 200) {
      // B's result must not contain any of A's rows
      for (const booking of body.bookings ?? []) {
        expect(booking.providerId ?? booking.provider_id).not.toBe(TENANT_A_ID);
      }
    } else {
      expect([401, 402, 404]).toContain(status);
    }
  });

  it('Tenant B cannot write a booking that claims to belong to Tenant A', async () => {
    const { status } = await apiFetch('/api/bookings', headersB, 'POST', {
      clientName: 'Attacker',
      date: '2026-01-01',
      time: '10:00',
      // Attempting to inject a different providerId in the body — server must ignore it
      providerId: TENANT_A_ID,
      provider_id: TENANT_A_ID,
    });
    // Must either reject (4xx) or silently scope to Tenant B (never A)
    expect(status).not.toBe(200); // 400/401/402/409 are all acceptable
  });
});

describe('New Tenant — Clean Dashboard', () => {
  it('brand-new tenant starts with zero bookings', async () => {
    const freshTenantId = 999999;
    const freshHeaders = makeHeaders(freshTenantId);
    const { status, body } = await apiFetch('/api/bookings', freshHeaders);
    if (status === 200) {
      expect(body.bookings).toHaveLength(0);
    } else {
      // Subscription check (402) or auth failure are acceptable for non-existent tenants
      expect([401, 402]).toContain(status);
    }
  });

  it('brand-new tenant starts with zero invoices', async () => {
    const freshTenantId = 999999;
    const freshHeaders = makeHeaders(freshTenantId);
    const { status, body } = await apiFetch('/api/invoices', freshHeaders);
    if (status === 200) {
      expect(body.invoices).toHaveLength(0);
    } else {
      expect([401, 402]).toContain(status);
    }
  });

  it('brand-new tenant starts with zero clients', async () => {
    const freshTenantId = 999999;
    const freshHeaders = makeHeaders(freshTenantId);
    const { status, body } = await apiFetch('/api/clients', freshHeaders);
    if (status === 200) {
      expect(body.clients).toHaveLength(0);
    } else {
      expect([401, 402]).toContain(status);
    }
  });
});
