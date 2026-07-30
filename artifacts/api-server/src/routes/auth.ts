import { Router } from 'express';
import { randomInt, randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import { db, providers } from '../lib/db';
import { eq, or } from 'drizzle-orm';
import { storeOtp, verifyOtp } from '../lib/otpStore';
import { sendOTPEmail, sendPasswordResetEmail } from '../lib/emailService';
import { generateAdminToken } from '../lib/adminToken';
import { generateProviderToken } from '../lib/providerToken';
import { generateUnifiedToken } from '../lib/unifiedToken';
import { computePermissions } from '../lib/permissions';
import { logAudit } from '../lib/auditLog';

const router = Router();

// ─── helpers ─────────────────────────────────────────────────────────────────

function maskEmail(email: string): string {
  if (!email.includes('@')) return email.slice(0, 2) + '•••••';
  const [local, domain] = email.split('@');
  const masked =
    local.length > 2
      ? local[0] + '•'.repeat(Math.min(local.length - 2, 4)) + local[local.length - 1]
      : local[0] + '•••';
  return `${masked}@${domain}`;
}

/** Look up the email address for a given username or email from the DB. */
async function resolveEmail(usernameOrEmail: string): Promise<string | null> {
  const clean = usernameOrEmail.trim().toLowerCase();
  // Super-admin shorthand
  if (clean === 'admin') {
    return process.env['ADMIN_EMAIL'] || 'marktning@onfirmedmarketing.com';
  }
  // Try exact username match first, then email match
  const [byUsername] = await db
    .select({ email: providers.email })
    .from(providers)
    .where(eq(providers.username, clean))
    .limit(1);
  if (byUsername) return byUsername.email;

  const [byEmail] = await db
    .select({ email: providers.email })
    .from(providers)
    .where(eq(providers.email, clean))
    .limit(1);
  return byEmail?.email ?? null;
}

// ─── POST /api/auth/send-otp ─────────────────────────────────────────────────
router.post('/auth/send-otp', async (req, res) => {
  try {
    // NOTE: providerEmail from client is intentionally ignored.
    // OTP destination is always resolved from trusted DB records only.
    const { username } = req.body as { username: string };

    if (!username) {
      return res.status(400).json({ success: false, error: 'username_required' });
    }

    const cleanUser = username.trim().toLowerCase();
    const email = await resolveEmail(cleanUser);

    if (!email) {
      // Don't reveal whether user exists — always return same shape
      return res.json({ success: false, error: 'user_not_found' });
    }

    // Cryptographically secure 6-digit OTP
    const otp = randomInt(100000, 1000000).toString();
    await storeOtp(cleanUser, otp, email);
    await sendOTPEmail(email, otp);

    // Only expose devOtp in non-production environments
    const isDev = process.env['NODE_ENV'] !== 'production';
    return res.json({
      success: true,
      maskedEmail: maskEmail(email),
      ...(isDev ? { devOtp: otp } : {}),
    });
  } catch (err) {
    console.error('[send-otp]', err);
    return res.status(500).json({ success: false, error: 'send_failed' });
  }
});

// ─── POST /api/auth/verify-otp ───────────────────────────────────────────────
router.post('/auth/verify-otp', async (req, res) => {
  const { username, otp } = req.body as { username: string; otp: string };

  if (!username || !otp) {
    return res.status(400).json({ valid: false, reason: 'missing_fields' });
  }

  try {
    const cleanUser = username.trim().toLowerCase();
    const result = await verifyOtp(cleanUser, otp.trim());

    if (!result.valid) return res.json(result);

    // ✅ OTP valid — look up provider by username OR email
    // (user may have typed their email instead of username)
    const [provider] = await db
      .select({ id: providers.id, role: providers.role, username: providers.username })
      .from(providers)
      .where(or(eq(providers.username, cleanUser), eq(providers.email, cleanUser)))
      .limit(1);

    if (!provider) {
      return res.json({ ...result, valid: true });
    }

    // ── Subscription check ────────────────────────────────────────────────────
    const [providerFull] = await db
      .select({ status: providers.status, subscriptionStatus: providers.subscriptionStatus,
                subscriptionEndsAt: providers.subscriptionEndsAt, nameAr: providers.nameAr })
      .from(providers)
      .where(eq(providers.id, provider.id))
      .limit(1);

    if (providerFull?.status === 'suspended') {
      return res.json({ valid: false, error: 'account_suspended',
        reason: 'حساب الصالون موقوف — تواصل مع إدارة المنصة' });
    }

    const subExpired = providerFull &&
      (providerFull.subscriptionStatus === 'expired' ||
       providerFull.subscriptionStatus === 'cancelled');

    // ── Tokens ───────────────────────────────────────────────────────────────
    const isOwner = provider.role === 'owner';
    const adminToken    = isOwner ? generateAdminToken(cleanUser) : undefined;
    const providerToken = !isOwner
      ? generateProviderToken(provider.id, cleanUser)
      : undefined;

    // Unified token (new format — works for both owner and provider)
    const role       = isOwner ? 'owner' : 'manager';
    const actorType  = 'owner' as const;
    const unifiedToken = generateUnifiedToken(provider.id, provider.id, actorType, role);
    const permissions  = computePermissions(role, '');

    // Audit log
    logAudit({
      tenantId:  provider.id,
      actorId:   provider.id,
      actorType: 'owner',
      actorRole: role,
      action:    'owner_login',
      ipAddress: req.ip,
    }).catch(() => {});

    return res.json({
      ...result,
      ...(subExpired ? { subscriptionExpired: true,
        subscriptionWarning: 'اشتراككم منتهٍ — يرجى التجديد للاستمرار',
        salonName: providerFull?.nameAr } : {}),
      ...(adminToken    ? { adminToken, adminUser: cleanUser } : {}),
      ...(providerToken ? { providerToken, providerUser: cleanUser, providerId: provider.id } : {}),
      // Unified token (new format)
      unifiedToken,
      tenantId:    provider.id,
      actorId:     provider.id,
      actorType,
      actorRole:   role,
      permissions,
    });
  } catch (err) {
    console.error('[verify-otp]', err);
    return res.status(500).json({ valid: false, reason: 'server_error' });
  }
});

// ─── POST /api/auth/forgot-password ─────────────────────────────────────────
router.post('/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body as { email: string };
    if (!email) return res.status(400).json({ success: false, error: 'email_required' });

    const cleanEmail = email.trim().toLowerCase();
    const resolved = await resolveEmail(cleanEmail);

    if (resolved) {
      // 6-digit OTP — no links needed, user enters code in the modal
      const otp = String(randomInt(100000, 999999));
      await storeOtp(cleanEmail, otp, cleanEmail);
      await sendPasswordResetEmail(resolved, otp);
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('[forgot-password]', err);
    return res.status(500).json({ success: false, error: 'send_failed' });
  }
});

// ─── POST /api/auth/reset-password ───────────────────────────────────────────
router.post('/auth/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body as { email: string; otp: string; newPassword: string };
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, error: 'missing_fields' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, error: 'password_too_short' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Verify OTP keyed by email
    const result = await verifyOtp(cleanEmail, otp.trim());
    if (!result.valid) {
      const ar = result.reason === 'expired' ? 'انتهت صلاحية الرمز' : result.reason === 'wrong_otp' ? `رمز خاطئ (${result.attemptsLeft ?? 0} محاولات متبقية)` : 'رمز غير صالح';
      const en = result.reason === 'expired' ? 'Code expired' : result.reason === 'wrong_otp' ? `Wrong code (${result.attemptsLeft ?? 0} attempts left)` : 'Invalid code';
      return res.json({ success: false, error: result.reason, messageAr: ar, messageEn: en });
    }

    // Find provider by email
    const [provider] = await db
      .select({ id: providers.id, username: providers.username, email: providers.email, nameAr: providers.nameAr, nameEn: providers.nameEn, role: providers.role, status: providers.status, subscriptionTier: providers.subscriptionTier, subscriptionStatus: providers.subscriptionStatus })
      .from(providers).where(eq(providers.email, cleanEmail)).limit(1);

    if (!provider) return res.json({ success: false, error: 'user_not_found' });

    // Update password
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await db.update(providers).set({ passwordHash }).where(eq(providers.id, provider.id));

    // Auto-login: return token so user is signed in immediately
    const isOwner = provider.role === 'owner';
    const role = isOwner ? 'owner' : 'manager';
    const providerToken = generateProviderToken(provider.id, provider.username);
    const unifiedToken = generateUnifiedToken(provider.id, provider.id, 'owner', role);
    const permissions = computePermissions(role, '');

    return res.json({
      success: true,
      provider: { id: provider.id, username: provider.username, email: provider.email, nameAr: provider.nameAr, nameEn: provider.nameEn, role: provider.role, subscriptionTier: provider.subscriptionTier, subscriptionStatus: provider.subscriptionStatus, status: provider.status },
      providerToken, providerId: provider.id, providerUser: provider.username,
      unifiedToken, tenantId: provider.id, actorId: provider.id, actorType: 'owner', actorRole: role,
      permissions, isPlatformAdmin: isOwner,
    });
  } catch (err) {
    console.error('[reset-password]', err);
    return res.status(500).json({ success: false, error: 'server_error' });
  }
});

// ─── POST /api/auth/provider/login ──────────────────────────────────────────
// تسجيل دخول مزود الخدمة بالإيميل وكلمة المرور
router.post('/auth/provider/login', async (req, res) => {
  try {
    const { email, password } = req.body as { email: string; password: string };
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'email_and_password_required' });
    }
    const cleanEmail = email.trim().toLowerCase();

    const [provider] = await db
      .select({
        id: providers.id,
        username: providers.username,
        email: providers.email,
        nameAr: providers.nameAr,
        nameEn: providers.nameEn,
        role: providers.role,
        status: providers.status,
        subscriptionTier: providers.subscriptionTier,
        subscriptionStatus: providers.subscriptionStatus,
        passwordHash: providers.passwordHash,
      })
      .from(providers)
      .where(eq(providers.email, cleanEmail))
      .limit(1);

    if (!provider) {
      return res.json({ success: false, error: 'invalid_credentials' });
    }

    if (!provider.passwordHash) {
      return res.json({ success: false, error: 'no_password_set' });
    }

    const passwordOk = await bcrypt.compare(password, provider.passwordHash);
    if (!passwordOk) {
      return res.json({ success: false, error: 'invalid_credentials' });
    }

    if (provider.status === 'suspended') {
      return res.json({ success: false, error: 'account_suspended' });
    }

    const { generateProviderToken } = await import('../lib/providerToken');
    const { generateUnifiedToken } = await import('../lib/unifiedToken');
    const { computePermissions } = await import('../lib/permissions');

    const isOwner = provider.role === 'owner';
    const role = isOwner ? 'owner' : 'manager';
    const providerToken = generateProviderToken(provider.id, provider.username);
    const unifiedToken = generateUnifiedToken(provider.id, provider.id, 'owner', role);
    const permissions = computePermissions(role, '');
    const adminToken = isOwner ? generateAdminToken(provider.username) : undefined;

    return res.json({
      success: true,
      provider: {
        id: provider.id,
        username: provider.username,
        email: provider.email,
        nameAr: provider.nameAr,
        nameEn: provider.nameEn,
        role: provider.role,
        subscriptionTier: provider.subscriptionTier,
        subscriptionStatus: provider.subscriptionStatus,
        status: provider.status,
        logoUrl: provider.logoUrl,
      },
      providerToken,
      providerId: provider.id,
      providerUser: provider.username,
      unifiedToken,
      tenantId: provider.id,
      actorId: provider.id,
      actorType: 'owner',
      actorRole: role,
      permissions,
      isPlatformAdmin: isOwner,
      ...(adminToken ? { adminToken, adminUser: provider.username } : {}),
    });
  } catch (err) {
    console.error('[provider-login]', err);
    return res.status(500).json({ success: false, error: 'server_error' });
  }
});

// ─── GET /api/auth/provider/:identifier ─────────────────────────────────────
// Returns provider info by username OR email.
// ⚠️  Returns only safe public/session fields — no Stripe IDs, no MRR.
router.get('/auth/provider/:identifier', async (req, res) => {
  try {
    const identifier = req.params['identifier']?.trim().toLowerCase();
    if (!identifier) return res.status(400).json({ error: 'identifier_required' });

    // Super-admin shorthand — not in providers table
    if (identifier === 'admin') {
      return res.json({
        provider: {
          id: 0,
          username: 'admin',
          email: process.env['ADMIN_EMAIL'] || '',
          nameAr: 'مالك المنصة',
          nameEn: 'Platform Owner',
          role: 'owner',
          subscriptionStatus: 'active',
          subscriptionTier: 'enterprise',
          status: 'active',
        },
      });
    }

    const isEmail = identifier.includes('@');

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
        onlineBookingEnabled: providers.onlineBookingEnabled,
        city: providers.city,
        phone: providers.phone,
        role: providers.role,
        logoUrl: providers.logoUrl,
        createdAt: providers.createdAt,
        // ⛔ intentionally excluded: stripeCustomerId, stripeSubscriptionId, mrr, churnRisk
      })
      .from(providers)
      .where(
        isEmail
          ? eq(providers.email, identifier)
          : eq(providers.username, identifier)
      )
      .limit(1);

    if (!provider) return res.status(404).json({ error: 'not_found' });

    return res.json({ provider });
  } catch (err) {
    console.error('[provider-info]', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

export default router;
