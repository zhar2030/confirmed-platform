/**
 * Ensures the provider_services table exists and seeds default services
 * for any provider that currently has 0 services.
 * Safe to call multiple times (idempotent).
 */
import { db } from './db';
import { sql } from 'drizzle-orm';
import { logger } from './logger';

const DEFAULT_SERVICES = [
  { nameAr: 'قص وتصفيف الشعر', nameEn: 'Haircut & Style',      price: 150, duration: 60,  catAr: 'شعر',  catEn: 'Hair',  sort: 1 },
  { nameAr: 'صبغة كاملة',       nameEn: 'Full Color',           price: 350, duration: 120, catAr: 'شعر',  catEn: 'Hair',  sort: 2 },
  { nameAr: 'كيراتين',           nameEn: 'Keratin Treatment',    price: 500, duration: 150, catAr: 'شعر',  catEn: 'Hair',  sort: 3 },
  { nameAr: 'مانيكير',           nameEn: 'Manicure',             price: 80,  duration: 45,  catAr: 'أظافر', catEn: 'Nails', sort: 4 },
  { nameAr: 'بديكير',            nameEn: 'Pedicure',             price: 100, duration: 60,  catAr: 'أظافر', catEn: 'Nails', sort: 5 },
  { nameAr: 'تنظيف بشرة',        nameEn: 'Facial Cleansing',     price: 200, duration: 60,  catAr: 'بشرة', catEn: 'Skin',  sort: 6 },
  { nameAr: 'مساج',             nameEn: 'Massage',              price: 250, duration: 60,  catAr: 'جسم',  catEn: 'Body',  sort: 7 },
];

/** Seeds default services for a single newly-registered provider */
export async function seedProviderServices(providerId: number): Promise<void> {
  try {
    for (const svc of DEFAULT_SERVICES) {
      await db.execute(sql`
        INSERT INTO provider_services
          (provider_id, name_ar, name_en, price, duration, category_ar, category_en, sort_order)
        VALUES
          (${providerId}, ${svc.nameAr}, ${svc.nameEn}, ${svc.price}, ${svc.duration},
           ${svc.catAr}, ${svc.catEn}, ${svc.sort})
        ON CONFLICT DO NOTHING
      `);
    }
    logger.info({ providerId }, 'Seeded default services for new provider');
  } catch (err) {
    logger.warn({ err, providerId }, 'seedProviderServices failed — skipping');
  }
}

export async function initProviderServices(): Promise<void> {
  try {
    // 1. Create table if it does not exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS provider_services (
        id           SERIAL PRIMARY KEY,
        provider_id  INTEGER NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
        name_ar      TEXT NOT NULL,
        name_en      TEXT NOT NULL,
        price        NUMERIC(10,2) NOT NULL DEFAULT 0,
        duration     INTEGER NOT NULL DEFAULT 60,
        category_ar  TEXT,
        category_en  TEXT,
        is_active    BOOLEAN NOT NULL DEFAULT TRUE,
        sort_order   INTEGER NOT NULL DEFAULT 0,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // 2. Ensure index exists for fast lookups
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_provider_services_provider_id
      ON provider_services(provider_id)
    `);

    // 3. Seed default services for providers that have none
    const unseeded = await db.execute(sql`
      SELECT id FROM providers
      WHERE id NOT IN (SELECT DISTINCT provider_id FROM provider_services)
        AND status != 'suspended'
    `);

    if (unseeded.rows.length > 0) {
      logger.info({ count: unseeded.rows.length }, 'Seeding default services for providers');
      for (const row of unseeded.rows as Array<{ id: number }>) {
        const providerId = row.id;
        for (const svc of DEFAULT_SERVICES) {
          await db.execute(sql`
            INSERT INTO provider_services
              (provider_id, name_ar, name_en, price, duration, category_ar, category_en, sort_order)
            VALUES
              (${providerId}, ${svc.nameAr}, ${svc.nameEn}, ${svc.price}, ${svc.duration},
               ${svc.catAr}, ${svc.catEn}, ${svc.sort})
            ON CONFLICT DO NOTHING
          `);
        }
      }
      logger.info('Provider services seeding complete');
    } else {
      logger.info('Provider services already seeded — skipping');
    }
  } catch (err) {
    logger.warn({ err }, 'initProviderServices failed — continuing without it');
  }
}
