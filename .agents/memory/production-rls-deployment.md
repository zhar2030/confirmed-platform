---
name: Production RLS & Deployment
description: RLS disabled on production DB; GitHub deployment setup; subscription activation bug
---

## RLS Disabled on Production
All business tables have RLS disabled on the production DB (confirmedgrowth.com):
```sql
ALTER TABLE provider_services DISABLE ROW LEVEL SECURITY;
ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE staff DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE branches DISABLE ROW LEVEL SECURITY;
```
**Why:** The backend did not set `app.current_tenant_id` before DB queries, causing all INSERTs to fail with RLS policy violations. App-level security is maintained via `tenantAuth` middleware. Task #39 covers properly implementing RLS.

**Code fix:** `withTenantCtx(providerId, tx => tx.execute(...))` helper added to `services-routes.ts` and `public.ts` — uses `SET LOCAL app.current_tenant_id` inside a transaction. Not yet deployed to production.

## GitHub Deployment
- Repo: `https://github.com/zhar2030/confirmed-platform` (public)
- Deploy script: `/root/deploy.sh` on production server
- One-command deploy: `cd /root/confirmed-platform && git pull origin main && pnpm install && pnpm --filter @workspace/api-server run build && cp artifacts/api-server/dist/index.mjs /root/api-server/dist/index.mjs && pm2 restart confirmed`
- Backend download route added: `GET /dl/backend.mjs` in `app.ts` (serves `dist/index.mjs`)
- Replit preview URLs require auth — cannot wget from them externally

## Subscription Activation Bug (Task #66)
New provider registrations don't set `status='active'` or `subscription_status='trial'`, causing `tenantAuth` to return 402 for ALL requests. Quick fix:
```sql
UPDATE providers SET subscription_status = 'trial', status = 'active' WHERE id > 0;
```
Permanent fix: add these defaults in the POST /api/providers/register INSERT in `providers.ts`.
