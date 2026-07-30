/**
 * /api/providers — Admin endpoints for provider (salon) management.
 * Used by PlatformOwnerDashboard to list and update salon accounts.
 */
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db, providers, clients, staff, bookings, subscriptionPackages } from '../lib/db';
import { eq, count, sql } from 'drizzle-orm';
import { requireAdmin } from '../middlewares/adminAuth';
import { tenantAuth } from '../middlewares/tenantAuth';
import { seedProviderServices } from '../lib/providerServicesInit';

const router = Router();

// ─── POST /api/providers/register ────────────────────────────────────────────
// Public endpoint — new salon owner self-registration
router.post('/providers/register', async (req, res) => {
  try {
    const { nameAr, nameEn, email, phone, city, storeName, username: requestedUsername, password } = req.body as {
      nameAr?: string;
      nameEn?: string;
      email: string;
      phone?: string;
      city?: string;
      storeName?: string;
      username?: string;
      password?: string;
    };

    const displayName = nameAr || storeName;
    if (!displayName || !email) {
      return res.status(400).json({ error: 'name_and_email_required' });
    }

    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'password_too_short' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const cleanEmail = email.trim().toLowerCase();

    // Check if email already registered
    const [existing] = await db
      .select({ id: providers.id })
      .from(providers)
      .where(eq(providers.email, cleanEmail))
      .limit(1);

    if (existing) {
      return res.status(409).json({ error: 'email_already_registered' });
    }

    // Check if requested username is already taken
    if (requestedUsername) {
      const cleanUsername = requestedUsername.trim().toLowerCase().replace(/[^\w.]/g, '');
      const [takenUsername] = await db
        .select({ id: providers.id })
        .from(providers)
        .where(eq(providers.username, cleanUsername))
        .limit(1);
      if (takenUsername) {
        return res.status(409).json({ error: 'username_already_taken' });
      }
    }

    // Username priority: requested → email prefix → 'provider'
    const emailPrefix = cleanEmail.split('@')[0]
      .replace(/[^\w.]/g, '')
      .slice(0, 30);

    const rawBase = (requestedUsername?.trim().toLowerCase().replace(/[^\w.]/g, '') || emailPrefix || 'provider').slice(0, 30);

    // Insert with ON CONFLICT DO NOTHING on email, retry username conflicts
    const baseValues = {
      email: cleanEmail,
      nameAr: displayName,
      nameEn: nameEn || storeName || displayName,
      status: 'trial' as const,
      subscriptionTier: 'basic' as const,
      subscriptionStatus: 'trial' as const,
      churnRisk: 'low' as const,
      mrr: 0,
      onlineBookingEnabled: false,
      phone: phone || null,
      city: city || null,
      passwordHash,
    };

    const makeProvider = async (username: string) => {
      try {
        const [created] = await db.insert(providers).values({
          username,
          slug: username,
          ...baseValues,
        }).returning();
        return created!;
      } catch (err: any) {
        // Username collision → retry with suffix (Drizzle wraps PG errors in cause)
        const pgCode = err?.code ?? err?.cause?.code;
        const pgDetail = err?.detail ?? err?.cause?.detail ?? '';
        if (pgCode === '23505' && pgDetail.includes('username')) {
          const suffix = Math.floor(1000 + Math.random() * 9000);
          const [created] = await db.insert(providers).values({
            username: `${rawBase}.${suffix}`,
            slug: `${rawBase}.${suffix}`,
            ...baseValues,
          }).returning();
          return created!;
        }
        throw err;
      }
    };

    const provider = await makeProvider(rawBase);

    // Seed default services immediately so the new salon isn't empty
    seedProviderServices(provider.id).catch(() => {/* fire-and-forget */});

    return res.status(201).json({
      success: true,
      id: provider.id,
      username: provider.username,
      email: provider.email,
    });
  } catch (err) {
    console.error('[POST /providers/register]', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

// ─── GET /api/providers ──────────────────────────────────────────────────────
router.get('/providers', requireAdmin, async (_req, res) => {
  try {
    const rows = await db
      .select({
        id: providers.id,
        username: providers.username,
        email: providers.email,
        nameAr: providers.nameAr,
        nameEn: providers.nameEn,
        slug: providers.slug,
        status: providers.status,
        subscriptionTier: providers.subscriptionTier,
        subscriptionStatus: providers.subscriptionStatus,
        churnRisk: providers.churnRisk,
        mrr: providers.mrr,
        onlineBookingEnabled: providers.onlineBookingEnabled,
        city: providers.city,
        phone: providers.phone,
        createdAt: providers.createdAt,
      })
      .from(providers)
      .orderBy(providers.createdAt);

    return res.json({ providers: rows });
  } catch (err) {
    console.error('[GET /providers]', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

// ─── GET /api/providers/:id ──────────────────────────────────────────────────
router.get('/providers/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params['id'] ?? ''));
    if (isNaN(id)) return res.status(400).json({ error: 'invalid_id' });

    const [provider] = await db
      .select({
        id: providers.id,
        username: providers.username,
        email: providers.email,
        nameAr: providers.nameAr,
        nameEn: providers.nameEn,
        slug: providers.slug,
        status: providers.status,
        subscriptionTier: providers.subscriptionTier,
        subscriptionStatus: providers.subscriptionStatus,
        churnRisk: providers.churnRisk,
        mrr: providers.mrr,
        onlineBookingEnabled: providers.onlineBookingEnabled,
        city: providers.city,
        phone: providers.phone,
        billingCycle: providers.billingCycle,
        role: providers.role,
        createdAt: providers.createdAt,
        updatedAt: providers.updatedAt,
        // ⛔ stripeCustomerId / stripeSubscriptionId excluded — admin-only via secure context
      })
      .from(providers)
      .where(eq(providers.id, id))
      .limit(1);

    if (!provider) return res.status(404).json({ error: 'not_found' });
    return res.json({ provider });
  } catch (err) {
    console.error('[GET /providers/:id]', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

// ─── PATCH /api/providers/:id ────────────────────────────────────────────────
router.patch('/providers/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params['id'] ?? ''));
    if (isNaN(id)) return res.status(400).json({ error: 'invalid_id' });

    const allowed = [
      'status', 'subscriptionTier', 'subscriptionStatus',
      'churnRisk', 'mrr', 'onlineBookingEnabled', 'city', 'phone',
      'nameAr', 'nameEn', 'slug',
    ] as const;

    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    updates['updatedAt'] = new Date();

    const [updated] = await db
      .update(providers)
      .set(updates as any)
      .where(eq(providers.id, id))
      .returning();

    if (!updated) return res.status(404).json({ error: 'not_found' });
    return res.json({ provider: updated });
  } catch (err) {
    console.error('[PATCH /providers/:id]', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

// ─── DELETE /api/providers/:id ───────────────────────────────────────────────
router.delete('/providers/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params['id'] ?? ''));
    if (isNaN(id)) return res.status(400).json({ error: 'invalid_id' });

    const [deleted] = await db
      .delete(providers)
      .where(eq(providers.id, id))
      .returning({ id: providers.id });

    if (!deleted) return res.status(404).json({ error: 'not_found' });
    return res.json({ success: true });
  } catch (err) {
    console.error('[DELETE /providers/:id]', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

// ─── GET /api/providers/stats/summary ───────────────────────────────────────
router.get('/providers/stats/summary', requireAdmin, async (_req, res) => {
  try {
    const [stats] = await db
      .select({
        total: count(),
        active: sql<number>`count(*) filter (where status = 'active')`,
        trial: sql<number>`count(*) filter (where status = 'trial')`,
        suspended: sql<number>`count(*) filter (where status = 'suspended')`,
        totalMrr: sql<number>`coalesce(sum(mrr),0)`,
        highChurn: sql<number>`count(*) filter (where churn_risk = 'high')`,
      })
      .from(providers);

    return res.json({ stats });
  } catch (err) {
    console.error('[GET /providers/stats/summary]', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

// ─── POST /api/providers ─────────────────────────────────────────────────────
// Admin manually creates a provider account — immediately active (no trial).
router.post('/providers', requireAdmin, async (req, res) => {
  try {
    const {
      nameAr, nameEn, email, phone, city,
      subscriptionTier = 'basic',
      billingCycle = 'monthly',
      username: requestedUsername,
    } = req.body as {
      nameAr: string;
      nameEn?: string;
      email: string;
      phone?: string;
      city?: string;
      subscriptionTier?: 'basic' | 'pro' | 'enterprise';
      billingCycle?: 'monthly' | 'yearly';
      username?: string;
    };

    if (!nameAr || !email) {
      return res.status(400).json({ error: 'name_and_email_required' });
    }

    const validTiers = ['basic', 'pro', 'enterprise'];
    if (!validTiers.includes(subscriptionTier)) {
      return res.status(400).json({ error: 'invalid_subscription_tier' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Block duplicate email
    const [emailExists] = await db
      .select({ id: providers.id })
      .from(providers)
      .where(eq(providers.email, cleanEmail))
      .limit(1);

    if (emailExists) {
      return res.status(409).json({ error: 'email_already_registered' });
    }

    // Compute subscriptionEndsAt from billing cycle
    const durationDays = billingCycle === 'yearly' ? 365 : 30;
    const subscriptionEndsAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

    // Username: use requested → derive from name → derive from email prefix
    const emailPrefix = cleanEmail.split('@')[0]
      .replace(/[^\w.]/g, '').slice(0, 30) || 'provider';

    const nameBase = (nameEn || '')
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '.')
      .slice(0, 30);

    const rawBase = (
      requestedUsername?.trim().toLowerCase().replace(/[^\w.]/g, '').slice(0, 30) ||
      nameBase ||
      emailPrefix
    );

    const insertValues = (username: string) => ({
      username,
      slug: username,
      email: cleanEmail,
      nameAr,
      nameEn: nameEn || nameAr,
      // Admin-created accounts start ACTIVE immediately
      status:             'active'  as const,
      subscriptionTier:   subscriptionTier as 'basic' | 'pro' | 'enterprise',
      subscriptionStatus: 'active'  as const,
      billingCycle,
      subscriptionEndsAt,
      remindersSent:      '',
      churnRisk:          'low'     as const,
      mrr: 0,
      onlineBookingEnabled: false,
      phone: phone?.trim() || null,
      city:  city?.trim()  || null,
    });

    const tryCreate = async (): Promise<typeof providers.$inferSelect> => {
      try {
        const [created] = await db.insert(providers).values(insertValues(rawBase)).returning();
        return created!;
      } catch (err: any) {
        const pgCode   = err?.code   ?? err?.cause?.code;
        const pgDetail = err?.detail ?? err?.cause?.detail ?? '';
        if (pgCode === '23505' && pgDetail.includes('username')) {
          const suffix = Math.floor(1000 + Math.random() * 9000);
          const [created] = await db.insert(providers).values(insertValues(`${rawBase}.${suffix}`)).returning();
          return created!;
        }
        throw err;
      }
    };

    const provider = await tryCreate();
    return res.status(201).json({ provider });
  } catch (err) {
    console.error('[POST /providers]', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

// ─── POST /api/providers/me/logo — Upload salon logo (base64) ────────────────
router.post('/providers/me/logo', tenantAuth, async (req: any, res) => {
  try {
    const tenantId: number = req.tenant?.tenantId ?? (req as any).providerId;
    const { logoBase64 } = req.body as { logoBase64?: string };
    if (!logoBase64) return res.status(400).json({ error: 'logoBase64_required' });

    // Validate it's a proper data URL (image only)
    if (!logoBase64.startsWith('data:image/')) {
      return res.status(400).json({ error: 'invalid_image_format' });
    }
    // Limit: ~500 KB after base64 (~375 KB raw)
    if (logoBase64.length > 700_000) {
      return res.status(400).json({ error: 'image_too_large', maxKb: 500 });
    }

    const [updated] = await db
      .update(providers)
      .set({ logoUrl: logoBase64, updatedAt: new Date() })
      .where(eq(providers.id, tenantId))
      .returning({ id: providers.id, logoUrl: providers.logoUrl });

    if (!updated) return res.status(404).json({ error: 'provider_not_found' });
    return res.json({ success: true, logoUrl: updated.logoUrl });
  } catch (err) {
    console.error('[POST /providers/me/logo]', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

// ─── DELETE /api/providers/me/logo — Remove salon logo ───────────────────────
router.delete('/providers/me/logo', tenantAuth, async (req: any, res) => {
  try {
    const tenantId: number = req.tenant?.tenantId ?? (req as any).providerId;
    await db.update(providers).set({ logoUrl: null, updatedAt: new Date() }).where(eq(providers.id, tenantId));
    return res.json({ success: true });
  } catch (err) {
    console.error('[DELETE /providers/me/logo]', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

// ─── GET /api/packages ───────────────────────────────────────────────────────
router.get('/packages', async (_req, res) => {
  try {
    const pkgs = await db.select().from(subscriptionPackages).orderBy(subscriptionPackages.priceMonthly);
    return res.json({ packages: pkgs });
  } catch (err) {
    console.error('[GET /packages]', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

export default router;
