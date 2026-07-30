---
name: Multi-Tenant Frontend Wiring
description: How the multi-tenant auth system is wired into the frontend — login toggle, staff invite acceptance, unified headers, subscription wall, and approval queue nav.
---

## What was built

### LandingPage.tsx
- Added `loginType` state (`'owner' | 'staff'`), toggled by a two-button switcher rendered before the modal card.
- **Owner tab**: original OTP flow unchanged. After successful OTP verify, `saveUnifiedSession()` is called if `otpResponseData.unifiedToken + tenantId` are present.
- **Staff tab**: email/password form → `POST /api/auth/staff/login` → `saveUnifiedSession()` → `onLogin()`. Handles `subscription_expired`, `invitation_pending`, `account_inactive` error codes.

### App.tsx
- Added `getStaffInvitationToken()` helper — detects `/staff/accept?token=...` in the URL.
- If token present, renders `<StaffInvitationAcceptPage>` instead of the normal app; on success calls `window.location.reload()` (session is already in sessionStorage).
- Imports `StaffInvitationAcceptPage` and `SubscriptionExpiredWall`.

### ProviderDashboard.tsx
- `apiHeaders()` now calls `getUnifiedHeaders()` (which returns both unified + legacy X-Provider-* headers — backward-compat guaranteed).
- `apiFetch()` wrapper: after any response, checks for `status 402 + body.error === 'subscription_expired'` and sets `subscriptionExpired` state.
- When `subscriptionExpired === true`, renders `<SubscriptionExpiredWall>` with owner-only Renew CTA (the wall reads `actorType` from session internally).
- `approvals` tab added to `allTabs`; filtered from sidebar unless `perms.canReviewApprovals` (roles: manager, owner).
- `<AdminApprovals />` rendered when `activeTab === 'approvals'`.

## Key conventions
- **Why getUnifiedHeaders()**: returns both new `X-Tenant-Id / X-Auth-Token` and legacy `X-Provider-Id / X-Provider-Token` so no existing API calls break during transition.
- **Why 402 check in apiFetch**: tenantAuth middleware is the single enforcement point; frontend just needs to react to it globally rather than per-request.
- **Why loginType toggle**: owners use OTP (existing Brevo-based flow); staff use password (bcrypt, no OTP infra needed per-employee).
- **Why canReviewApprovals gate**: cashier / specialist roles should never see the approval queue UI.
