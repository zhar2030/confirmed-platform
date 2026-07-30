---
name: Customer Booking Portal
description: Public booking portal at /book/:slug — architecture decisions and auth patterns
---

## Architecture
- Route detection in `App.tsx` via `getBookingSlug()` — checks `window.location.pathname` against BASE_URL prefix before rendering any auth-gated UI
- API routes in `artifacts/api-server/src/routes/public.ts` — unauthenticated read/write except booking-toggle
- `provider_services` table initialized at API startup via `initProviderServices()` in `lib/providerServicesInit.ts` (idempotent: CREATE TABLE IF NOT EXISTS + seed if count=0)

## Availability semantics
- **Specific staff**: slot blocked when that staff member has a booking covering it (duration-based, 30-min slots)
- **Any staff**: slot blocked ONLY when ALL active staff are booked at that time — uses interval overlap per staff member
- Overlap check: `intervalsOverlap(s1, d1, s2, d2)` → `s1 < s2+d2 AND s2 < s1+d1`

## Auth pattern for provider write endpoints
- `PATCH /api/provider/booking-toggle` requires `X-Provider-Id` header + database lookup to verify provider exists and is not suspended
- **Why:** prevents forged cross-tenant writes even though header can be set by any HTTP client
- **How to apply:** all new provider-scoped WRITE endpoints should verify provider existence in DB, not just trust the header value

## SettingsManager props
- Now accepts `dbProviderId`, `providerSlug`, `initialOnlineBookingEnabled` props
- ProviderDashboard fetches `slug` and `online_booking_enabled` from `/api/auth/provider/:username` response and passes them down
