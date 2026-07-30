---
name: WhatsApp Business Integration
description: Architecture and key decisions for the WhatsApp Business Cloud API integration built for the multi-tenant salon SaaS.
---

# WhatsApp Business Integration

## Architecture

- **Single Meta App** — platform-level. Each salon connects via Meta Embedded Signup.
- **Tenant identification** — `whatsapp_phone_numbers.phone_number_id` → `provider_id`.
- **Token storage** — AES-256-GCM encrypted via `src/lib/encryption.ts` using SESSION_SECRET-derived key.
- **State machine** — plugin-based registry in `src/lib/conversationEngine.ts`. New flows (loyalty, gift cards) = register a new handler only.

## New DB Tables
- `whatsapp_phone_numbers` — per-tenant, supports multiple numbers (multi-number per salon ready)
- `whatsapp_conversations` — session state with `last_activity_at`, `branch_id`, `staff_id` as dedicated columns
- `whatsapp_messages` — audit log with `wa_message_id`, `status`, `template_name`, `error_code`
- Added 4 columns to `bookings`: `wa_conversation_id`, `reminder_24h_sent_at`, `reminder_1h_sent_at`, `reminder_attempts`

## Key Files
- `src/lib/initWhatsApp.ts` — DB init (called at startup after initAdminTables)
- `src/lib/encryption.ts` — AES-256-GCM encrypt/decrypt
- `src/lib/languageDetector.ts` — Arabic/English detection + manual override
- `src/lib/whatsappClient.ts` — Meta Cloud API v19 sender (text, buttons, list, template)
- `src/lib/conversationEngine.ts` — state machine dispatcher + session management
- `src/handlers/whatsapp/allHandlers.ts` — all 12 handlers + registerAll()
- `src/routes/whatsapp-webhook.ts` — GET challenge + POST messages (HMAC verified, public)
- `src/routes/whatsapp-config.ts` — tenant-scoped config CRUD + OAuth callback
- `src/lib/whatsappReminders.ts` — node-cron every 15min, 24h + 1h reminders with retry

## Required Environment Variables (user must configure in Replit Secrets)
- `WHATSAPP_APP_ID` — Meta App ID
- `WHATSAPP_APP_SECRET` — HMAC-SHA256 webhook signature verification + token exchange
- `WHATSAPP_VERIFY_TOKEN` — Meta webhook challenge token
- `WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID` — optional; Embedded Signup Config from Meta App → WhatsApp → Embedded Signup

## Session Timeout
30 minutes from last message. Session expires_at updated on every message.

## Language Detection
Character frequency (Arabic Unicode > Latin → Arabic). Manual override via keywords "English"/"عربي".

## Rate Limiting
In-memory Map per wa_from, configurable per phone number in DB (rate_limit_per_min, rate_limit_per_hour).

**Why:** User specifically asked for configurable rate limits stored in DB, not hardcoded constants.

## rawBody for Webhook Signature
Added `verify` callback to `express.json()` in `app.ts` that saves `req.rawBody = buf`.
**Why:** HMAC-SHA256 verification requires the raw unparsed body.

## Public Endpoints (no tenantAuth)
`GET /api/whatsapp/app-config` and `POST /api/whatsapp/fetch-waba-phones` are registered BEFORE `router.use(tenantAuth)` in whatsapp-config.ts — they must stay above that line.
**Why:** app-config is called before OAuth; fetch-waba-phones receives the code immediately after FB.login(), before tenant session may be re-checked.

## Reminder Action Interceptor
Pre-dispatch check in `processMessage()` in conversationEngine.ts handles `confirm_reminder_*`, `reschedule_*`, `cancel_reminder_*` button payloads before normal state routing.
**Why:** Reminder buttons arrive regardless of conversation state (may be expired/COMPLETED), so they can't rely on state dispatch.

## Embedded Signup Flow (Frontend)
1. Fetch `/api/whatsapp/app-config` → get appId + configId
2. Preload FB SDK on mount (loadFBSDK) so click→FB.login is instant
3. Click "Connect" → `FB.login()` → get `{ code }` or `{ accessToken }`
4. POST `/api/whatsapp/fetch-waba-phones` → exchange code, get long-lived token, discover WABA phones
5. If 1 phone: auto-save. If multiple: show selection UI
6. POST `/api/whatsapp/oauth/callback` → store encrypted token

## Conversation Flow States
GREETING → MENU → SERVICE_SELECT → STAFF_SELECT → DATE_SELECT → TIME_SELECT → BOOKING_CONFIRM → COMPLETED
Parallel paths: MODIFY_PICK, CANCEL_PICK → CANCEL_CONFIRM
