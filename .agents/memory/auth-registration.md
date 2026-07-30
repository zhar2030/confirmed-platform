---
name: Auth & Registration Flow
description: OTP login system, provider self-registration, and Brevo email setup quirks.
---

## Login Flow
- Purely OTP-based — no passwords in DB or UI.
- `POST /api/auth/send-otp` accepts username OR email; resolves to DB email via `resolveEmail()`.
- Frontend previously had hardcoded `validUsers` list + `password123` check — removed. Login now calls backend directly for any user.

## Provider Self-Registration
- `POST /api/providers/register` (public, no auth) — creates provider in DB immediately with `trial` status.
- Username generated from email prefix (e.g. `layla.salon@test.com` → `layla.salon`).
- Returns 409 if email already registered.
- On success, frontend shows username + "Log In Now" button pre-filled.

**Why:** Old flow saved to localStorage only; admin approval never created a DB record, so login always failed for new providers.

## Brevo Email (Transactional)
- Brevo requires manual activation of transactional/SMTP sending for new accounts — contact `contact@brevo.com`.
- Brevo also requires server IP to be whitelisted in Security → Authorized IPs (Replit IP: `34.100.186.150`).
- FROM_EMAIL env var controls sender address — must be a verified sender in Brevo.
- API key IP restriction must be deactivated or the exact server IP authorized.

**How to apply:** If email stops working after deploy, check Brevo authorized IPs — production server IP will differ from dev IP.
