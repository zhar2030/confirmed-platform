# CONFIRMED – منصة إدارة الصالونات

منصة SaaS سحابية سعودية متكاملة لإدارة صالونات التجميل والسبا، تشمل الحجوزات، نقطة البيع، المخزون، CRM، وأكثر.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/api-server run test` — run tenant-isolation tests
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Tests: Vitest (`src/__tests__/tenant-isolation.test.ts`)

## Where things live

- API routes: `artifacts/api-server/src/routes/`
- DB schema: `lib/db/src/schema/index.ts`
- Auth middleware: `artifacts/api-server/src/middlewares/tenantAuth.ts`
- Token logic: `artifacts/api-server/src/lib/unifiedToken.ts`
- Frontend dashboard: `artifacts/salon-platform/src/components/ProviderDashboard.tsx`
- Tenant isolation tests: `artifacts/api-server/src/__tests__/tenant-isolation.test.ts`

## Role Hierarchy — Critical, Read First

This platform has three distinct roles. **Never confuse them.**

```
┌─────────────────────────────────────────────────────────────────────┐
│  PLATFORM OWNER  (Super Admin)  —  providers.role = 'owner'        │
│  • Operates the CONFIRMED SaaS platform itself                      │
│  • Sees ALL salons, ALL revenue, ALL audit logs (cross-tenant)      │
│  • Approves/suspends/deletes salon accounts                         │
│  • Sets subscription packages and platform-wide settings            │
│  • Dashboard: PlatformOwnerDashboard.tsx                           │
│  • API protection: requireAdmin middleware (X-Admin-Token)          │
├─────────────────────────────────────────────────────────────────────┤
│  SALON OWNER  (Provider / Customer)  —  providers.role = 'provider'│
│  • A CUSTOMER of the platform — owns a single salon                │
│  • Sees ONLY their own salon's data (tenant-scoped)                │
│  • CANNOT access any admin endpoint or PlatformOwnerDashboard      │
│  • Dashboard: ProviderDashboard.tsx                                │
│  • API protection: tenantAuth middleware                            │
├─────────────────────────────────────────────────────────────────────┤
│  SALON STAFF  (Employee)                                            │
│  • Employee of a salon — role-scoped within one tenant             │
│  • Same dashboard as salon owner but with restricted tabs          │
│  • API protection: tenantAuth middleware (staff credentials)       │
└─────────────────────────────────────────────────────────────────────┘
```

**Rules:**
- `isPlatformAdmin` is set ONLY when `providers.role = 'owner'` comes from the DB.  No username matching, no hardcodes.
- Salon owners are **customers** — they must never reach `PlatformOwnerDashboard`.
- Admin endpoints (`requireAdmin`) reject salon-owner tokens completely.

## Architecture decisions

- **Multi-tenant isolation via provider_id**: every business table carries `provider_id` (= tenant ID). Every query filters by it — no unscoped SELECTs are ever allowed.
- **HMAC token ties session to tenant**: `X-Auth-Token` is an HMAC-SHA256 of `tenantId|actorId|actorType|role|date`. Forging a different tenant ID invalidates the token.
- **Hard reset on tenant switch**: `ProviderDashboard` wipes all React state to `[]` the moment `dbProviderId` changes, before any API call, preventing any cross-tenant flash.
- **Dashboard auto-refresh every 30 s**: data stays accurate without requiring page reload.
- **PostgreSQL RLS as defense-in-depth**: Row-Level Security policies are applied at DB startup as a second layer after the application filter.

## Database Security Policies

This platform follows the same multi-tenant data isolation standard as Shopify, Stripe, HubSpot, and Notion.

### Row Ownership
- Every business table **must** contain `provider_id` (tenant_id), `created_at`, and where applicable `updated_at`.
- Each row is owned by exactly **one tenant**. No shared rows across tenants.

### Query Rules — strictly enforced, zero exceptions
- ✅ **Correct**: `SELECT * FROM bookings WHERE provider_id = $currentTenant`
- ❌ **Never**: `SELECT * FROM bookings`
- ❌ **Never**: `SELECT * FROM bookings WHERE status = 'active'` (missing tenant filter)
- Every `SELECT`, `INSERT`, `UPDATE`, and `DELETE` on a business table must include `WHERE provider_id = currentTenant`.
- The `provider_id` in `INSERT` must always come from the **authenticated token** (`req.tenant.tenantId`), never from the request body.

### Access Control
- **Salon owner**: full control over their own tenant's data only.
- **Staff**: access is role-scoped within the same tenant (`permissions` field in token).
- **Super Admin**: platform-wide access only through the dedicated admin panel — never through tenant endpoints.

### Demo & Cross-Tenant Data
- Demo data (seed arrays) **must never** be used as `useState` initial values in tenant-scoped components.
- Every new tenant starts with a completely empty dashboard — zero bookings, zero sales, zero clients.
- No tenant's data is ever visible to another tenant, even for a single render frame.

### Performance Indexes
All business tables must have composite indexes: `(provider_id, <main_sort_column>)`, e.g.:
- `(provider_id, date DESC)` on `bookings` and `invoices`
- `(provider_id)` on `clients`, `staff`, `provider_services`

### Defense-in-Depth
1. **Application layer**: `tenantAuth` middleware validates HMAC token and sets `req.tenant.tenantId`
2. **Query layer**: every route explicitly filters `WHERE provider_id = req.tenant.tenantId`
3. **Database layer**: PostgreSQL Row-Level Security (RLS) as a final backstop

### Adding a New Endpoint — Checklist
Before merging any new route file:
- [ ] `router.use(tenantAuth)` at the top
- [ ] `resolveProviderId(req)` called and checked for null → 401
- [ ] Every SELECT includes `WHERE provider_id = ${providerId}`
- [ ] Every INSERT includes `provider_id: providerId` from token, not request body
- [ ] No `sql.raw()` with string interpolation — use `sql` tagged template literals only
- [ ] Test added to `tenant-isolation.test.ts`

## Product

منصة SaaS لإدارة الصالونات تشمل: الحجوزات الآلية، نقطة البيع (POS)، CRM العميلات، إدارة الموظفات، الفواتير الإلكترونية المتوافقة مع ZATCA، بوابة الحجز الأونلاين، وتحليلات الإيرادات.

## User preferences

- اللغة الافتراضية: العربية مع دعم الإنجليزية
- اتجاه RTL
- النظام السحابي متعدد المستأجرين (multi-tenant SaaS)

## Gotchas

- لا تستخدم `sql.raw()` مطلقاً مع string interpolation — استخدم `sql` tagged template literals دائماً
- `provider_id` يجب أن يأتي دائماً من `req.tenant.tenantId` وليس من `req.body`
- الـ states في ProviderDashboard تبدأ `[]` — لا demo data أبداً
- عند تغيير `dbProviderId` يجب مسح كل الـ states قبل جلب بيانات الحساب الجديد

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
