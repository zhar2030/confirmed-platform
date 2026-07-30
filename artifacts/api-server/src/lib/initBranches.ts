import { db } from './db';
import { sql } from 'drizzle-orm';
import { logger } from './logger';

export async function initBranches(): Promise<void> {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS branches (
        id          SERIAL PRIMARY KEY,
        provider_id INTEGER NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
        name_ar     TEXT NOT NULL,
        name_en     TEXT NOT NULL DEFAULT '',
        address_ar  TEXT NOT NULL DEFAULT '',
        address_en  TEXT NOT NULL DEFAULT '',
        city_ar     TEXT NOT NULL DEFAULT '',
        city_en     TEXT NOT NULL DEFAULT '',
        phone       VARCHAR(30) NOT NULL DEFAULT '',
        is_active   BOOLEAN NOT NULL DEFAULT TRUE,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_branches_provider_id
      ON branches(provider_id)
    `);

    logger.info('Branches table ready');
  } catch (err) {
    logger.warn({ err }, 'initBranches failed — continuing');
  }
}
