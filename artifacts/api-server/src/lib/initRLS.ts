/**
 * Row-Level Security (RLS) — PostgreSQL tenant isolation.
 *
 * Enforces that every row in business tables belongs to exactly one tenant.
 * This is a second layer of defense AFTER the application-layer provider_id filter.
 * Even if a query forgets the WHERE clause, Postgres will enforce isolation.
 *
 * Pattern used by Shopify, Stripe, HubSpot: DB-enforced tenant boundaries.
 *
 * Safe to call multiple times (idempotent).
 */
import { pool } from './db';
import { logger } from './logger';

const BUSINESS_TABLES = [
  'bookings',
  'clients',
  'staff',
  'provider_services',
  'invoices',
  'staff_credentials',
  'audit_logs',
  'approval_requests',
] as const;

export async function initRLS(): Promise<void> {
  try {
    for (const table of BUSINESS_TABLES) {
      // 1. Enable RLS on the table
      await pool.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);

      // 2. Drop old policy if it exists (idempotent)
      await pool.query(
        `DROP POLICY IF EXISTS tenant_isolation ON ${table}`
      );

      // 3. Determine the tenant column name per table
      const tenantCol =
        table === 'staff_credentials' ||
        table === 'audit_logs' ||
        table === 'approval_requests'
          ? 'tenant_id'
          : 'provider_id';

      // 4. Create the policy: app sets current_setting('app.current_tenant_id')
      //    before every query; Postgres enforces it at the row level.
      await pool.query(`
        CREATE POLICY tenant_isolation ON ${table}
          USING (${tenantCol} = NULLIF(current_setting('app.current_tenant_id', true), '')::integer)
      `);

      // 5. Allow the app role to bypass RLS for admin operations (superuser bypasses by default)
      // This ensures the API server can still perform maintenance without per-row overhead.
      await pool.query(
        `ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`
      );
    }

    logger.info('PostgreSQL Row-Level Security policies applied to all business tables');
  } catch (err: any) {
    // RLS setup is best-effort — the application-layer filter is the primary guard.
    // RLS adds defense-in-depth; if it fails we log and continue.
    logger.warn({ err: err?.message }, 'initRLS: could not apply RLS policies — continuing without RLS (app-layer filtering still active)');
  }
}
