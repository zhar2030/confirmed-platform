/**
 * initWhatsApp — creates the 3 WhatsApp integration tables at startup.
 * Tables are multi-tenant safe and designed for future expansion
 * (multiple numbers per salon, loyalty/membership flows, etc.)
 */

import { db } from './db';
import { sql } from 'drizzle-orm';

export async function initWhatsApp(): Promise<void> {
  try {
    // ── 1. Per-salon phone numbers (supports multiple numbers per tenant) ──────
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS whatsapp_phone_numbers (
        id                  SERIAL PRIMARY KEY,
        provider_id         INTEGER NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
        phone_number_id     TEXT NOT NULL,
        display_phone       TEXT NOT NULL DEFAULT '',
        waba_id             TEXT NOT NULL DEFAULT '',
        system_user_token   TEXT NOT NULL,          -- AES-256-GCM encrypted
        verify_token        TEXT NOT NULL DEFAULT '', -- unused (platform-level)
        is_active           BOOLEAN NOT NULL DEFAULT true,
        is_primary          BOOLEAN NOT NULL DEFAULT true,
        rate_limit_per_min  INTEGER NOT NULL DEFAULT 30
          CHECK (rate_limit_per_min BETWEEN 1 AND 1000),
        rate_limit_per_hour INTEGER NOT NULL DEFAULT 200
          CHECK (rate_limit_per_hour BETWEEN 10 AND 5000),
        created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (provider_id, phone_number_id)
      )
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_wa_phones_provider
        ON whatsapp_phone_numbers (provider_id)
        WHERE is_active = true
    `);

    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_wa_phones_number_id
        ON whatsapp_phone_numbers (phone_number_id)
        WHERE is_active = true
    `);

    // ── 2. Conversation sessions ───────────────────────────────────────────────
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS whatsapp_conversations (
        id               SERIAL PRIMARY KEY,
        provider_id      INTEGER NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
        phone_number_id  TEXT NOT NULL,
        wa_from          TEXT NOT NULL,
        state            TEXT NOT NULL DEFAULT 'GREETING',
        lang             TEXT NOT NULL DEFAULT 'ar' CHECK (lang IN ('ar','en')),
        context          JSONB NOT NULL DEFAULT '{}',
        branch_id        TEXT,
        staff_id         INTEGER,
        last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at       TIMESTAMPTZ NOT NULL,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_wa_conv_lookup
        ON whatsapp_conversations (provider_id, wa_from, expires_at DESC)
    `);

    // ── 3. Message audit log ───────────────────────────────────────────────────
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS whatsapp_messages (
        id              SERIAL PRIMARY KEY,
        conversation_id INTEGER REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
        direction       TEXT NOT NULL CHECK (direction IN ('in','out')),
        type            TEXT NOT NULL,
        content         JSONB NOT NULL DEFAULT '{}',
        wa_message_id   TEXT,
        status          TEXT DEFAULT 'sent'
          CHECK (status IN ('pending','sent','delivered','read','failed')),
        template_name   TEXT,
        error_code      TEXT,
        sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_wa_messages_conv
        ON whatsapp_messages (conversation_id, sent_at DESC)
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_wa_messages_wa_id
        ON whatsapp_messages (wa_message_id)
        WHERE wa_message_id IS NOT NULL
    `);

    // ── 4. Add WhatsApp columns to bookings if not exist ──────────────────────
    await db.execute(sql`
      ALTER TABLE bookings
        ADD COLUMN IF NOT EXISTS wa_conversation_id INTEGER
          REFERENCES whatsapp_conversations(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS reminder_24h_sent_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS reminder_1h_sent_at  TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS reminder_attempts     INTEGER NOT NULL DEFAULT 0
    `);

    console.info('[initWhatsApp] ✅ WhatsApp tables ready');
  } catch (err: any) {
    console.error('[initWhatsApp] ❌ Failed:', err?.message);
    // Non-fatal — app continues without WhatsApp
  }
}
