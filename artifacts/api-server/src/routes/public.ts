/**
 * /api/public — Unauthenticated routes for the customer booking portal.
 * No X-Provider-Id or auth required for read/booking endpoints (by design).
 * The booking-toggle write endpoint requires a valid, database-verified X-Provider-Id.
 */
import { Router } from 'express';
import { db } from '../lib/db';
import { sql } from 'drizzle-orm';

const router = Router();

// ── Tenant context helper ─────────────────────────────────────────────────────
// All business tables have FORCE ROW LEVEL SECURITY. Every query on provider_services,
// staff, branches, bookings must run inside a transaction with set_config first.
async function withTenantCtx<T>(providerId: number, fn: (tx: typeof db) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${String(providerId)}, true)`);
    return fn(tx as unknown as typeof db);
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

/** Returns all 30-min slot strings occupied by a booking at `startTime` lasting `duration` minutes. */
function occupiedSlotsForBooking(startTime: string, duration: number): string[] {
  const startMin = timeToMinutes(startTime);
  const slots: string[] = [];
  for (let offset = 0; offset < duration; offset += 30) {
    const total = startMin + offset;
    if (total >= 9 * 60 && total < 21 * 60) { // portal hours: 9am–9pm
      const hh = Math.floor(total / 60).toString().padStart(2, '0');
      const mm = (total % 60).toString().padStart(2, '0');
      slots.push(`${hh}:${mm}`);
    }
  }
  return slots;
}

/**
 * True if two bookings overlap.
 * Uses half-open interval semantics: [start, start+duration).
 */
function intervalsOverlap(
  start1: string, dur1: number,
  start2: string, dur2: number
): boolean {
  const s1 = timeToMinutes(start1);
  const s2 = timeToMinutes(start2);
  return s1 < s2 + dur2 && s2 < s1 + dur1;
}

// ── GET /api/public/profile/:slug ────────────────────────────────────────────
// Public salon profile page — no auth, no booking-enabled gate.
// Returns: logo, name, city, phone, services, staff, branches.
router.get('/public/profile/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    if (!slug) return res.status(400).json({ error: 'slug_required' });

    const providerRows = await db.execute(sql`
      SELECT id, name_ar, name_en, slug, city, phone, logo_url, online_booking_enabled
      FROM providers
      WHERE slug = ${slug} AND status != 'suspended'
      LIMIT 1
    `);
    if (providerRows.rows.length === 0) return res.status(404).json({ error: 'salon_not_found' });
    const p = providerRows.rows[0] as any;

    const [svcRows, staffRows, branchRows] = await withTenantCtx(p.id, async (tx) => {
      return Promise.all([
        tx.execute(sql`
          SELECT id, name_ar, name_en, price, duration, category_ar, category_en
          FROM provider_services
          WHERE provider_id = ${p.id} AND is_active = true
          ORDER BY sort_order, id
        `),
        tx.execute(sql`
          SELECT id, name, role
          FROM staff
          WHERE provider_id = ${p.id} AND is_active = true
          ORDER BY name
        `),
        tx.execute(sql`
          SELECT id, name_ar, name_en, city_ar, city_en, address_ar, address_en, phone, is_active
          FROM branches
          WHERE provider_id = ${p.id}
          ORDER BY id
        `),
      ]);
    });

    return res.json({
      salon: {
        nameAr:               p.name_ar,
        nameEn:               p.name_en,
        slug:                 p.slug,
        city:                 p.city,
        phone:                p.phone,
        logoUrl:              p.logo_url,
        onlineBookingEnabled: p.online_booking_enabled,
      },
      services: svcRows.rows.map((s: any) => ({
        id:         s.id,
        nameAr:     s.name_ar,
        nameEn:     s.name_en,
        price:      s.price,
        duration:   s.duration,
        categoryAr: s.category_ar,
        categoryEn: s.category_en,
      })),
      staff: staffRows.rows.map((s: any) => ({ id: s.id, name: s.name, role: s.role })),
      branches: branchRows.rows.map((b: any) => ({
        id:       b.id,
        nameAr:   b.name_ar,
        nameEn:   b.name_en,
        cityAr:   b.city_ar,
        cityEn:   b.city_en,
        addressAr: b.address_ar,
        addressEn: b.address_en,
        phone:    b.phone,
        isActive: b.is_active,
      })),
    });
  } catch (err: any) {
    console.error('[GET /public/profile/:slug]', err.message);
    return res.status(500).json({ error: 'server_error' });
  }
});

// ── GET /api/public/salon/:slug ───────────────────────────────────────────────
// Returns salon info, services, active staff, and branches for the booking portal.
router.get('/public/salon/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    if (!slug) return res.status(400).json({ error: 'slug required' });

    const providerRows = await db.execute(sql`
      SELECT id, name_ar, name_en, slug, city, phone, online_booking_enabled
      FROM providers
      WHERE slug = ${slug} AND status != 'suspended'
      LIMIT 1
    `);

    if (providerRows.rows.length === 0) return res.status(404).json({ error: 'salon_not_found' });

    const provider = providerRows.rows[0] as any;
    if (!provider.online_booking_enabled) return res.status(403).json({ error: 'online_booking_disabled' });

    const [servicesRows, staffRows, branchRows] = await withTenantCtx(provider.id, async (tx) => {
      return Promise.all([
        tx.execute(sql`
          SELECT id, name_ar, name_en, price, duration, category_ar, category_en, sort_order
          FROM provider_services
          WHERE provider_id = ${provider.id} AND is_active = true
          ORDER BY sort_order, id
        `),
        tx.execute(sql`
          SELECT id, name, role
          FROM staff
          WHERE provider_id = ${provider.id} AND is_active = true
          ORDER BY name
        `),
        tx.execute(sql`
          SELECT id, name_ar, name_en, city_ar, city_en, address_ar, address_en
          FROM branches
          WHERE provider_id = ${provider.id} AND is_active = true
          ORDER BY id
        `),
      ]);
    });

    return res.json({
      salon: {
        id: provider.id,
        nameAr: provider.name_ar,
        nameEn: provider.name_en,
        slug: provider.slug,
        city: provider.city,
        phone: provider.phone,
      },
      services: servicesRows.rows.map((s: any) => ({
        id: s.id,
        nameAr: s.name_ar,
        nameEn: s.name_en,
        price: s.price,
        duration: s.duration,
        categoryAr: s.category_ar,
        categoryEn: s.category_en,
      })),
      staff: staffRows.rows.map((s: any) => ({
        id: s.id,
        name: s.name,
        role: s.role,
      })),
      branches: branchRows.rows.map((b: any) => ({
        id: b.id,
        nameAr: b.name_ar,
        nameEn: b.name_en,
        cityAr: b.city_ar,
        cityEn: b.city_en,
        addressAr: b.address_ar,
        addressEn: b.address_en,
      })),
    });
  } catch (err: any) {
    console.error('[GET /public/salon/:slug]', err.message);
    return res.status(500).json({ error: 'server_error' });
  }
});

// ── GET /api/public/salon/:slug/availability ──────────────────────────────────
// Returns occupied time slots for a given date so the portal can hide them.
//
// Semantics:
//   - staffId provided  → slot occupied if that staff member has a booking covering it
//   - no staffId (any)  → slot occupied only when ALL active staff are booked at that time
//     (i.e. if even one staff member is free, the slot is available)
router.get('/public/salon/:slug/availability', async (req, res) => {
  try {
    const { slug } = req.params;
    const { date, staffId } = req.query as Record<string, string>;

    if (!date) return res.status(400).json({ error: 'date required (YYYY-MM-DD)' });

    const provRows = await db.execute(sql`
      SELECT id FROM providers WHERE slug = ${slug} LIMIT 1
    `);
    if (provRows.rows.length === 0) return res.status(404).json({ error: 'salon_not_found' });
    const providerId = (provRows.rows[0] as any).id;

    if (staffId) {
      // ── Specific staff mode ───────────────────────────────────────────────
      const bookingRows = await withTenantCtx(providerId, (tx) => tx.execute(sql`
        SELECT time, duration FROM bookings
        WHERE provider_id = ${providerId}
          AND date = ${date}::date
          AND staff_id = ${parseInt(staffId)}
          AND status != 'cancelled'
      `));

      const occupied = new Set<string>();
      for (const b of bookingRows.rows as any[]) {
        for (const slot of occupiedSlotsForBooking(b.time, b.duration)) {
          occupied.add(slot);
        }
      }
      return res.json({ date, occupied: [...occupied] });

    } else {
      // ── Any-staff mode ────────────────────────────────────────────────────
      const { staffRows, bookingRows } = await withTenantCtx(providerId, async (tx) => {
        const [staffRows, bookingRows] = await Promise.all([
          tx.execute(sql`SELECT id FROM staff WHERE provider_id = ${providerId} AND is_active = true`),
          tx.execute(sql`
            SELECT staff_id, time, duration FROM bookings
            WHERE provider_id = ${providerId}
              AND date = ${date}::date
              AND status != 'cancelled'
              AND staff_id IS NOT NULL
          `),
        ]);
        return { staffRows, bookingRows };
      });

      const allStaffIds = (staffRows.rows as any[]).map(s => s.id as number);

      if (allStaffIds.length === 0) {
        return res.json({ date, occupied: [] });
      }

      const bookings = bookingRows.rows as Array<{ staff_id: number; time: string; duration: number }>;

      const occupied: string[] = [];
      for (let totalMin = 9 * 60; totalMin < 21 * 60; totalMin += 30) {
        const hh = Math.floor(totalMin / 60).toString().padStart(2, '0');
        const mm = (totalMin % 60).toString().padStart(2, '0');
        const slotStr = `${hh}:${mm}`;

        const allBusy = allStaffIds.every(staffId => {
          return bookings.some(b =>
            b.staff_id === staffId &&
            intervalsOverlap(slotStr, 1, b.time, b.duration)
          );
        });

        if (allBusy) occupied.push(slotStr);
      }

      return res.json({ date, occupied });
    }
  } catch (err: any) {
    console.error('[GET /public/salon/:slug/availability]', err.message);
    return res.status(500).json({ error: 'server_error' });
  }
});

// ── POST /api/public/bookings ─────────────────────────────────────────────────
// Creates a booking from the customer portal (no auth required).
// Conflict checks use duration-based interval overlap to prevent double bookings.
router.post('/public/bookings', async (req, res) => {
  try {
    const { salonSlug, serviceId, staffId, branchId, date, time, clientName, clientPhone, clientEmail, notes } = req.body;

    if (!salonSlug || !serviceId || !date || !time || !clientName) {
      return res.status(400).json({
        error: 'missing_fields',
        required: ['salonSlug', 'serviceId', 'date', 'time', 'clientName'],
      });
    }

    // Validate phone format if provided
    if (clientPhone && !/^[\d\s+\-]{7,15}$/.test(clientPhone)) {
      return res.status(400).json({ error: 'invalid_phone' });
    }

    // Validate email format if provided
    if (clientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) {
      return res.status(400).json({ error: 'invalid_email' });
    }

    // Validate time format (HH:MM)
    if (!/^\d{2}:\d{2}$/.test(time)) {
      return res.status(400).json({ error: 'invalid_time_format' });
    }
    const startMin = timeToMinutes(time);
    if (startMin < 9 * 60 || startMin >= 21 * 60) {
      return res.status(400).json({ error: 'time_out_of_hours', message: 'Bookings only 9am–9pm' });
    }

    // Resolve provider
    const provRows = await db.execute(sql`
      SELECT id, online_booking_enabled FROM providers WHERE slug = ${salonSlug} LIMIT 1
    `);
    if (provRows.rows.length === 0) return res.status(404).json({ error: 'salon_not_found' });
    const provider = provRows.rows[0] as any;
    if (!provider.online_booking_enabled) return res.status(403).json({ error: 'online_booking_disabled' });

    // Sanitize inputs early
    const resolvedStaffId  = staffId  ? parseInt(staffId)  : null;
    const resolvedBranchId = branchId ? parseInt(branchId) : null;
    const safeName  = String(clientName).trim().slice(0, 255);
    const safePhone = String(clientPhone  ?? '').trim().slice(0, 30);
    const safeEmail = String(clientEmail  ?? '').trim().slice(0, 255);
    const safeNotes = String(notes ?? '').trim().slice(0, 1000);

    // All queries on RLS-protected tables + INSERT must run inside one tenant transaction
    const { bookingId, service, staffName } = await withTenantCtx(provider.id, async (tx) => {
      // Resolve service
      const svcRows = await tx.execute(sql`
        SELECT id, name_ar, price, duration
        FROM provider_services
        WHERE id = ${parseInt(serviceId)} AND provider_id = ${provider.id} AND is_active = true
        LIMIT 1
      `);
      if (svcRows.rows.length === 0) throw Object.assign(new Error('service_not_found'), { status: 404 });
      const service = svcRows.rows[0] as any;
      const newDuration: number = service.duration;

      if (resolvedStaffId) {
        // ── Specific staff requested ────────────────────────────────────────
        const staffRows = await tx.execute(sql`
          SELECT id FROM staff WHERE id = ${resolvedStaffId} AND provider_id = ${provider.id} AND is_active = true LIMIT 1
        `);
        if (staffRows.rows.length === 0) throw Object.assign(new Error('staff_not_found'), { status: 404 });

        const existingRows = await tx.execute(sql`
          SELECT time, duration FROM bookings
          WHERE provider_id = ${provider.id}
            AND date = ${date}::date
            AND staff_id = ${resolvedStaffId}
            AND status != 'cancelled'
        `);
        const conflict = (existingRows.rows as any[]).some(b =>
          intervalsOverlap(time, newDuration, b.time, b.duration)
        );
        if (conflict) throw Object.assign(new Error('slot_taken'), { status: 409 });

      } else {
        // ── Any-staff mode ──────────────────────────────────────────────────
        const allStaffRows = await tx.execute(sql`
          SELECT id FROM staff WHERE provider_id = ${provider.id} AND is_active = true
        `);
        const allStaffIds = (allStaffRows.rows as any[]).map(s => s.id as number);

        if (allStaffIds.length > 0) {
          const allBookings = await tx.execute(sql`
            SELECT staff_id, time, duration FROM bookings
            WHERE provider_id = ${provider.id}
              AND date = ${date}::date
              AND status != 'cancelled'
              AND staff_id IS NOT NULL
          `);
          const bookings = allBookings.rows as Array<{ staff_id: number; time: string; duration: number }>;
          const hasAvailableStaff = allStaffIds.some(sid =>
            !bookings.some(b => b.staff_id === sid && intervalsOverlap(time, newDuration, b.time, b.duration))
          );
          if (!hasAvailableStaff) throw Object.assign(new Error('slot_taken'), { status: 409 });
        }
      }

      // INSERT booking
      const result = await tx.execute(sql`
        INSERT INTO bookings
          (provider_id, staff_id, branch_id, client_name, client_phone, client_email,
           service_id, service_name, date, time, duration, price,
           status, source, notes, updated_at)
        VALUES
          (${provider.id}, ${resolvedStaffId}, ${resolvedBranchId},
           ${safeName}, ${safePhone}, ${safeEmail || null},
           ${String(service.id)}, ${service.name_ar}, ${date}::date, ${time},
           ${newDuration}, ${service.price},
           'confirmed', 'online', ${safeNotes}, NOW())
        RETURNING id
      `);
      const bookingId = (result.rows[0] as any).id;

      // Fetch staff name if assigned
      let staffName: string | null = null;
      if (resolvedStaffId) {
        const sRow = await tx.execute(sql`SELECT name FROM staff WHERE id = ${resolvedStaffId} LIMIT 1`);
        staffName = (sRow.rows[0] as any)?.name ?? null;
      }

      return { bookingId, service, staffName };
    });

    return res.status(201).json({
      success: true,
      bookingId,
      bookingRef: `BK-${String(bookingId).padStart(5, '0')}`,
      message: 'Booking confirmed',
      details: {
        serviceName: service.name_ar,
        staffName,
        date,
        time,
        duration: newDuration,
        price: service.price,
      },
    });
  } catch (err: any) {
    const status = err.status ?? 500;
    const known = ['service_not_found', 'staff_not_found', 'slot_taken'];
    if (known.includes(err.message)) {
      return res.status(status).json({ error: err.message });
    }
    console.error('[POST /public/bookings]', err.message);
    return res.status(500).json({ error: 'booking_failed', message: err.message });
  }
});

// ── PATCH /api/provider/booking-toggle ───────────────────────────────────────
// Toggles online_booking_enabled for a provider.
// Requires X-Provider-Id header AND verifies that the provider actually exists
// in the database (prevents forged cross-tenant writes).
router.patch('/provider/booking-toggle', async (req, res) => {
  try {
    // Require signed provider token (IDOR fix)
    const rawId    = req.headers['x-provider-id'];
    const token    = req.headers['x-provider-token'] as string | undefined;
    const username = req.headers['x-provider-user']  as string | undefined;

    if (!rawId || !token || !username) {
      return res.status(401).json({ error: 'provider_auth_required' });
    }

    const providerId = parseInt(String(rawId), 10);
    if (isNaN(providerId) || providerId <= 0) {
      return res.status(401).json({ error: 'invalid_provider_id' });
    }

    const { verifyProviderToken } = await import('../lib/providerToken');
    if (!verifyProviderToken(providerId, username, token)) {
      return res.status(401).json({ error: 'invalid_provider_token' });
    }

    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'body.enabled (boolean) required' });
    }

    // Verify the provider exists and is not suspended
    const provRows = await db.execute(sql`
      SELECT id FROM providers WHERE id = ${providerId} AND status != 'suspended' LIMIT 1
    `);
    if (provRows.rows.length === 0) {
      return res.status(403).json({ error: 'provider_not_found_or_suspended' });
    }

    await db.execute(sql`
      UPDATE providers
      SET online_booking_enabled = ${enabled}, updated_at = NOW()
      WHERE id = ${providerId}
    `);

    return res.json({ success: true, onlineBookingEnabled: enabled });
  } catch (err: any) {
    console.error('[PATCH /provider/booking-toggle]', err.message);
    return res.status(500).json({ error: 'update_failed' });
  }
});

export default router;
