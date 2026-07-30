/**
 * Creates the invoices table and all performance indexes if they don't exist.
 * Composite indexes on (provider_id, date) follow the SaaS best practice of
 * always co-locating the tenant filter with the most common sort column.
 * Safe to call multiple times (idempotent).
 */
import { db } from './db';
import { sql } from 'drizzle-orm';
import { logger } from './logger';

export async function initInvoices(): Promise<void> {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS invoices (
        id             SERIAL PRIMARY KEY,
        provider_id    INTEGER NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
        client_name    TEXT NOT NULL,
        items          JSONB NOT NULL DEFAULT '[]',
        subtotal       NUMERIC(12,2) NOT NULL DEFAULT 0,
        tax            NUMERIC(12,2) NOT NULL DEFAULT 0,
        total          NUMERIC(12,2) NOT NULL DEFAULT 0,
        payment_method VARCHAR(20) NOT NULL DEFAULT 'cash',
        date           DATE NOT NULL,
        time           VARCHAR(10) NOT NULL DEFAULT '',
        branch_id      VARCHAR(50) NOT NULL DEFAULT '',
        created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Composite index: tenant + date — covers all dashboard queries efficiently
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_invoices_provider_date
      ON invoices(provider_id, date DESC)
    `);

    // Ensure composite indexes exist on all other business tables too
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_bookings_provider_date
      ON bookings(provider_id, date DESC)
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_clients_provider_id
      ON clients(provider_id)
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_staff_provider_id
      ON staff(provider_id)
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_provider_services_provider_id
      ON provider_services(provider_id)
    `);

    // ── Financial mode columns on providers ────────────────────────────────
    // financial_mode: 'manual' (default) | 'accounting' | 'gateway'
    // invoice_source_config: JSONB — reserved for future accounting/gateway config
    await db.execute(sql`
      ALTER TABLE providers
        ADD COLUMN IF NOT EXISTS financial_mode VARCHAR(20) NOT NULL DEFAULT 'manual'
    `);
    await db.execute(sql`
      ALTER TABLE providers
        ADD COLUMN IF NOT EXISTS invoice_source_config JSONB NOT NULL DEFAULT '{}'
    `);

    // ── source column on invoices ────────────────────────────────────────────
    // Tracks origin: 'manual' (POS), 'import' (CSV upload), 'gateway' (future)
    await db.execute(sql`
      ALTER TABLE invoices
        ADD COLUMN IF NOT EXISTS source VARCHAR(20) NOT NULL DEFAULT 'manual'
    `);

    // Index on source for filtered queries
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_invoices_provider_source
      ON invoices(provider_id, source)
    `);

    // ── Accounting integration columns on invoices ──────────────────────────
    // external_id: deduplication key from source system (e.g. Foodics order ID)
    // source_system: foodics | marn | odoo | zatca | generic
    await db.execute(sql`
      ALTER TABLE invoices
        ADD COLUMN IF NOT EXISTS external_id VARCHAR(100)
    `);
    await db.execute(sql`
      ALTER TABLE invoices
        ADD COLUMN IF NOT EXISTS source_system VARCHAR(30) NOT NULL DEFAULT ''
    `);
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_provider_external_id
      ON invoices(provider_id, external_id)
      WHERE external_id IS NOT NULL AND external_id <> ''
    `);

    // ── Accounting integration columns on providers ─────────────────────────
    // accounting_webhook_token: secret token for incoming push webhooks
    // accounting_pull_config: JSONB config for outgoing pull sync
    await db.execute(sql`
      ALTER TABLE providers
        ADD COLUMN IF NOT EXISTS accounting_webhook_token VARCHAR(64) UNIQUE
    `);
    await db.execute(sql`
      ALTER TABLE providers
        ADD COLUMN IF NOT EXISTS accounting_pull_config JSONB NOT NULL DEFAULT '{}'
    `);

    // ── Sync log table ────────────────────────────────────────────────────────
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS accounting_sync_logs (
        id             SERIAL PRIMARY KEY,
        provider_id    INTEGER NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
        sync_type      VARCHAR(20) NOT NULL,  -- webhook | pull | manual
        source_system  VARCHAR(30) NOT NULL,
        status         VARCHAR(20) NOT NULL,  -- success | error
        imported       INTEGER NOT NULL DEFAULT 0,
        skipped        INTEGER NOT NULL DEFAULT 0,
        duplicates     INTEGER NOT NULL DEFAULT 0,
        error_message  TEXT,
        created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_accounting_sync_logs_provider
      ON accounting_sync_logs(provider_id, created_at DESC)
    `);

    logger.info('Invoices table and composite tenant indexes ready');
  } catch (err) {
    logger.warn({ err }, 'initInvoices failed — continuing');
  }
}
