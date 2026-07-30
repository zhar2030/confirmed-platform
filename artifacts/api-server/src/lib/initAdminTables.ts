/**
 * Creates platform-owner-only tables at startup.
 * All tables are scoped to the PLATFORM (not per-tenant).
 * Safe to call multiple times (idempotent).
 */
import { db } from './db';
import { sql } from 'drizzle-orm';
import { logger } from './logger';

export async function initAdminTables(): Promise<void> {
  try {
    // Feature flags — platform-wide or per-salon overrides
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS platform_feature_flags (
        id          SERIAL PRIMARY KEY,
        flag_key    VARCHAR(100) NOT NULL UNIQUE,
        enabled     BOOLEAN NOT NULL DEFAULT true,
        label_ar    TEXT NOT NULL DEFAULT '',
        label_en    TEXT NOT NULL DEFAULT '',
        category    VARCHAR(50) NOT NULL DEFAULT 'general',
        salon_id    INTEGER REFERENCES providers(id) ON DELETE CASCADE,
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Seed default flags if table is empty
    await db.execute(sql`
      INSERT INTO platform_feature_flags (flag_key, enabled, label_ar, label_en, category)
      VALUES
        ('online_booking',      true,  'حجز أونلاين للعملاء',    'Online Booking',       'booking'),
        ('pos_invoicing',       true,  'نقطة البيع والفواتير',   'POS & Invoicing',      'billing'),
        ('staff_management',    true,  'إدارة الموظفات',          'Staff Management',     'hr'),
        ('client_crm',          true,  'إدارة العميلات CRM',      'Client CRM',           'crm'),
        ('sms_notifications',   true,  'إشعارات SMS',             'SMS Notifications',    'notifications'),
        ('email_reports',       true,  'تقارير بريدية أسبوعية',  'Weekly Email Reports', 'notifications'),
        ('ai_insights',         false, 'رؤى الذكاء الاصطناعي',  'AI Insights',          'ai'),
        ('multi_branch',        true,  'إدارة متعددة الفروع',    'Multi-Branch',         'advanced'),
        ('loyalty_program',     false, 'برنامج الولاء',           'Loyalty Program',      'advanced'),
        ('zatca_einvoice',      true,  'فاتورة إلكترونية ZATCA', 'ZATCA e-Invoice',      'compliance')
      ON CONFLICT (flag_key) DO NOTHING
    `);

    // API keys — platform integration tokens
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS platform_api_keys (
        id           SERIAL PRIMARY KEY,
        name         VARCHAR(100) NOT NULL,
        key_prefix   VARCHAR(20)  NOT NULL,
        key_hash     VARCHAR(200) NOT NULL,
        permissions  TEXT[]       NOT NULL DEFAULT '{}',
        environment  VARCHAR(20)  NOT NULL DEFAULT 'production',
        last_used_at TIMESTAMPTZ,
        usage_count  INTEGER NOT NULL DEFAULT 0,
        created_by   VARCHAR(100) NOT NULL DEFAULT 'owner',
        is_active    BOOLEAN NOT NULL DEFAULT true,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Platform content — editable text blocks
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS platform_content (
        id         SERIAL PRIMARY KEY,
        content_key VARCHAR(100) NOT NULL UNIQUE,
        value_ar   TEXT NOT NULL DEFAULT '',
        value_en   TEXT NOT NULL DEFAULT '',
        section    VARCHAR(50) NOT NULL DEFAULT 'general',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Seed default content blocks
    await db.execute(sql`
      INSERT INTO platform_content (content_key, value_ar, value_en, section)
      VALUES
        ('hero_title',      'صالونك يشتغل بنظام.. وأنت تركّزين على الإبداع', 'Your salon runs itself... while you focus on creativity', 'homepage'),
        ('hero_subtitle',   'منصة SaaS سحابية متكاملة لإدارة صالونات التجميل', 'Complete cloud SaaS platform for beauty salon management', 'homepage'),
        ('cta_primary',     'ابدئي مجاناً', 'Start Free', 'homepage'),
        ('cta_secondary',   'طلبي عرضاً توضيحياً', 'Request a Demo', 'homepage'),
        ('faq_1_q',         'كيف يمكنني البدء؟', 'How can I get started?', 'faq'),
        ('faq_1_a',         'سجّلي حسابك مجاناً وابدئي في إدارة صالونك فوراً.', 'Register your free account and start managing your salon immediately.', 'faq'),
        ('email_welcome',   'مرحباً بك في منصة CONFIRMED! يسعدنا انضمامك.', 'Welcome to CONFIRMED! We are delighted to have you.', 'email'),
        ('email_trial_end', 'فترتك التجريبية تنتهي قريباً. جددي اشتراكك للاستمرار.', 'Your trial period is ending soon. Renew to continue.', 'email')
      ON CONFLICT (content_key) DO NOTHING
    `);

    // Backup log
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS platform_backups (
        id         SERIAL PRIMARY KEY,
        filename   VARCHAR(200) NOT NULL,
        size_bytes BIGINT NOT NULL DEFAULT 0,
        status     VARCHAR(20) NOT NULL DEFAULT 'completed',
        tables_backed_up INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    logger.info('Admin platform tables ready');
  } catch (err) {
    logger.warn({ err }, 'initAdminTables failed — continuing');
  }
}
