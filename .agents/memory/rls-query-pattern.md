---
name: RLS Query Pattern
description: Every query on business tables (provider_services, bookings, etc.) MUST use withTenantCtx — otherwise Postgres returns 0 rows silently due to FORCE ROW LEVEL SECURITY
---

## The Rule
All DB queries on business tables MUST be wrapped in `withTenantCtx(providerId, fn)`.

**Why:** `provider_services` (and all business tables) have `FORCE ROW LEVEL SECURITY` enabled with policy:
```sql
CREATE POLICY tenant_isolation ON provider_services
  USING (provider_id = NULLIF(current_setting('app.current_tenant_id', true), '')::integer)
```
Without `set_config('app.current_tenant_id', providerId, true)`, every SELECT returns 0 rows — no error, just empty. This affects GET (reads) as much as writes.

**How to apply:**
```js
async function withTenantCtx<T>(providerId: number, fn: (tx: typeof db) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${String(providerId)}, true)`);
    return fn(tx as unknown as typeof db);
  });
}

// GET example — must also use withTenantCtx:
const rows = await withTenantCtx(providerId, (tx) =>
  tx.execute(sql`SELECT * FROM provider_services WHERE provider_id = ${providerId}`)
);
```

**Tables affected:** bookings, clients, staff, provider_services, invoices, staff_credentials, audit_logs, approval_requests

**Debug symptom:** providerId resolves correctly (e.g. 9), DB has rows for that ID (confirmed by psql as superuser), but API returns empty array with 200 status. Superuser psql bypasses RLS — that's why direct queries show data but the app doesn't.
