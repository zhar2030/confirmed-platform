import app from "./app";
import { logger } from "./lib/logger";
import { initProviderServices } from "./lib/providerServicesInit";
import { initInvoices } from "./lib/initInvoices";
import { initBranches } from "./lib/initBranches";
import { initRLS } from "./lib/initRLS";
import { initAdminTables } from "./lib/initAdminTables";
import { startScheduler } from "./lib/scheduler";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { pool } from "./lib/db";

const rawPort = process.env["PORT"] ?? "3000";
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) throw new Error(`Invalid PORT: "${rawPort}"`);

// ── Auto-Migration: create DB tables if they don't exist ─────────────────────
async function runAutoMigration(): Promise<void> {
  if (!process.env["DATABASE_URL"]) {
    logger.warn("[migration] DATABASE_URL not set — skipping auto-migration");
    return;
  }

  try {
    // Check if the providers table exists using the shared pool
    const { rows } = await pool.query(`
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'providers'
    `);

    if (rows.length > 0) {
      logger.info("[migration] Database already initialised — skipping");
      return;
    }

    logger.info("[migration] First run detected — creating database tables…");

    const sqlPath = join(dirname(fileURLToPath(import.meta.url)), "database.sql");
    if (!existsSync(sqlPath)) {
      logger.warn("[migration] database.sql not found — skipping");
      return;
    }

    const sqlContent = readFileSync(sqlPath, "utf8");
    const statements = sqlContent
      .split("--> statement-breakpoint")
      .map(s => s.trim())
      .filter(Boolean);

    for (const stmt of statements) {
      try {
        await pool.query(stmt);
      } catch (e: any) {
        if (!e.message?.includes("already exists")) {
          logger.warn({ err: e.message, stmt: stmt.slice(0, 80) }, "[migration] statement warning");
        }
      }
    }

    logger.info(`[migration] ✓ Database tables created (${statements.length} statements)`);

    // Safe column/table additions (idempotent)
    const safeAlters = [
      `ALTER TABLE providers ADD COLUMN IF NOT EXISTS logo_url text`,
      `ALTER TABLE providers ADD COLUMN IF NOT EXISTS password_hash varchar(255)`,
      `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS client_email varchar(255)`,
      `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS branch_id integer`,
      `CREATE TABLE IF NOT EXISTS branches (
        id SERIAL PRIMARY KEY,
        provider_id INTEGER NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
        name_ar TEXT NOT NULL,
        name_en TEXT NOT NULL DEFAULT '',
        address_ar TEXT NOT NULL DEFAULT '',
        address_en TEXT NOT NULL DEFAULT '',
        city_ar TEXT NOT NULL DEFAULT '',
        city_en TEXT NOT NULL DEFAULT '',
        phone VARCHAR(30) NOT NULL DEFAULT '',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_branches_provider_id ON branches(provider_id)`,
    ];
    for (const alter of safeAlters) {
      try { await pool.query(alter); } catch { /* already exists */ }
    }
  } catch (err) {
    logger.error({ err }, "[migration] Auto-migration failed");
  }

  // Always run safe column additions (handles existing DBs)
  if (process.env["DATABASE_URL"]) {
    const columnMigrations = [
      `ALTER TABLE providers ADD COLUMN IF NOT EXISTS logo_url text`,
      `ALTER TABLE providers ADD COLUMN IF NOT EXISTS password_hash varchar(255)`,
      `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS client_email varchar(255)`,
      `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS branch_id integer`,
      `CREATE TABLE IF NOT EXISTS branches (
        id SERIAL PRIMARY KEY,
        provider_id INTEGER NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
        name_ar TEXT NOT NULL,
        name_en TEXT NOT NULL DEFAULT '',
        address_ar TEXT NOT NULL DEFAULT '',
        address_en TEXT NOT NULL DEFAULT '',
        city_ar TEXT NOT NULL DEFAULT '',
        city_en TEXT NOT NULL DEFAULT '',
        phone VARCHAR(30) NOT NULL DEFAULT '',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_branches_provider_id ON branches(provider_id)`,
    ];
    for (const stmt of columnMigrations) {
      try { await pool.query(stmt); } catch { /* already exists */ }
    }
    logger.info("[migration] ✓ Incremental column migrations applied");
  }
}

// ── Start listening FIRST so health checks respond immediately ────────────────
app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "✅ CONFIRMED server listening — open http://localhost:" + port);

  // Background startup tasks — errors are logged but never crash the process.
  void (async () => {
    // Run auto-migration before anything else
    await runAutoMigration();

    try {
      await initInvoices();
    } catch (err) {
      logger.warn({ err }, "[startup] initInvoices failed — continuing");
    }

    try {
      await initBranches();
    } catch (err) {
      logger.warn({ err }, "[startup] initBranches failed — continuing");
    }

    try {
      await initRLS();
    } catch (err) {
      logger.warn({ err }, "[startup] initRLS failed — continuing");
    }

    try {
      await initAdminTables();
    } catch (err) {
      logger.warn({ err }, "[startup] initAdminTables failed — continuing");
    }

    try {
      await Promise.race([
        initProviderServices(),
        new Promise<void>((_, reject) =>
          setTimeout(
            () => reject(new Error("initProviderServices timed out after 15 s")),
            15_000,
          ),
        ),
      ]);
    } catch (err) {
      logger.warn({ err }, "[startup] initProviderServices failed or timed out — continuing");
    }

    try {
      startScheduler();
    } catch (err) {
      logger.warn({ err }, "[startup] startScheduler failed — reminders will not run this instance");
    }

    try {
      const { initWhatsApp } = await import('./lib/initWhatsApp');
      await initWhatsApp();
    } catch (err) {
      logger.warn({ err }, "[startup] initWhatsApp failed — WhatsApp integration will not be available");
    }

    try {
      const { registerAll } = await import('./handlers/whatsapp/allHandlers');
      registerAll();
      logger.info("[startup] WhatsApp conversation handlers registered");
    } catch (err) {
      logger.warn({ err }, "[startup] WhatsApp handler registration failed");
    }

    try {
      const { startWhatsAppReminderScheduler } = await import('./lib/whatsappReminders');
      startWhatsAppReminderScheduler();
    } catch (err) {
      logger.warn({ err }, "[startup] WhatsApp reminder scheduler failed to start");
    }
  })();
});
