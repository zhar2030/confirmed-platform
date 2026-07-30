/**
 * /api/bookings — Full CRUD for salon bookings.
 * All endpoints are scoped to a provider via X-Provider-Id header.
 */
import { Router } from 'express';
import { db, bookings, staff } from '../lib/db';
import { eq, and, ne, sql } from 'drizzle-orm';
import { tenantAuth } from '../middlewares/tenantAuth';
import { requireApprovalFor } from '../lib/approvalEngine';
import { logAudit, auditFromReq } from '../lib/auditLog';

const router = Router();

// All booking routes require tenant auth + subscription check
router.use('/bookings', tenantAuth);

// ── helpers ───────────────────────────────────────────────────────────────────
function resolveProviderId(req: any): number | null {
  return (req as any).tenant?.tenantId ?? (req as any).providerId ?? null;
}

function toFrontend(b: any) {
  return {
    id: String(b.id),
    clientName: b.clientName,
    clientPhone: b.clientPhone ?? '',
    serviceId: b.serviceId ?? '',
    serviceName: b.serviceName ?? '',
    staffId: b.staffId != null ? String(b.staffId) : '',
    date: typeof b.date === 'string' ? b.date : b.date?.toISOString?.().split('T')[0] ?? '',
    time: b.time,
    duration: b.duration,
    price: b.price,
    status: b.status,
    notes: b.notes ?? '',
    branchId: b.branchId ?? 'br-main',
    source: b.source,
  };
}

/** Parse HH:MM time string to total minutes since midnight. */
function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/**
 * Check if a staff member is already booked during the requested slot.
 * Returns true if there is a conflict (double-booking).
 */
async function hasStaffConflict(
  providerId: number,
  staffIdInt: number,
  date: string,
  time: string,
  duration: number,
  excludeBookingId?: number,
): Promise<boolean> {
  const newStart = timeToMinutes(time);
  const newEnd = newStart + duration;

  // Fetch all non-cancelled bookings for this staff on this date
  const existing = await db
    .select({
      id: bookings.id,
      time: bookings.time,
      duration: bookings.duration,
    })
    .from(bookings)
    .where(
      and(
        eq(bookings.providerId, providerId),
        eq(bookings.staffId, staffIdInt),
        eq(bookings.date, date),
        ne(bookings.status, 'cancelled'),
      ),
    );

  for (const b of existing) {
    if (excludeBookingId && b.id === excludeBookingId) continue;
    const existStart = timeToMinutes(b.time);
    const existEnd = existStart + b.duration;
    // Overlap if: newStart < existEnd AND newEnd > existStart
    if (newStart < existEnd && newEnd > existStart) {
      return true;
    }
  }
  return false;
}

// ── GET /api/bookings ─────────────────────────────────────────────────────────
router.get('/bookings', async (req, res) => {
  const providerId = resolveProviderId(req);
  if (!providerId) return res.status(400).json({ error: 'x-provider-id header required' });

  try {
    const { date, staffId } = req.query;
    const conditions: any[] = [eq(bookings.providerId, providerId)];

    if (date && typeof date === 'string') {
      conditions.push(eq(bookings.date, date));
    }
    if (staffId && staffId !== 'all' && typeof staffId === 'string') {
      const sid = parseInt(staffId, 10);
      if (!isNaN(sid)) conditions.push(eq(bookings.staffId, sid));
    }

    const rows = await db
      .select()
      .from(bookings)
      .where(and(...conditions))
      .orderBy(bookings.date, bookings.time);

    return res.json({ bookings: rows.map(toFrontend) });
  } catch (err) {
    console.error('[GET /bookings]', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

// ── POST /api/bookings ────────────────────────────────────────────────────────
router.post('/bookings', async (req, res) => {
  const providerId = resolveProviderId(req);
  if (!providerId) return res.status(400).json({ error: 'x-provider-id header required' });

  try {
    const {
      clientName, clientPhone, serviceId, serviceName,
      staffId, date, time, duration, price, status, notes, branchId,
    } = req.body;

    // ── Validation ─────────────────────────────────────────────────────────
    if (!clientName || typeof clientName !== 'string' || !clientName.trim()) {
      return res.status(400).json({ error: 'clientName is required' });
    }
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
      return res.status(400).json({ error: 'date is required (YYYY-MM-DD)' });
    }
    if (!time || !/^\d{2}:\d{2}$/.test(String(time))) {
      return res.status(400).json({ error: 'time is required (HH:MM)' });
    }

    const durationInt = duration ? Math.max(1, Math.min(480, Number(duration))) : 60;
    const priceInt = price ? Math.max(0, Number(price)) : 0;

    if (isNaN(durationInt) || isNaN(priceInt)) {
      return res.status(400).json({ error: 'duration and price must be valid numbers' });
    }

    const staffIdInt = staffId ? parseInt(String(staffId), 10) : null;
    const resolvedStaffId = staffIdInt && !isNaN(staffIdInt) ? staffIdInt : null;

    // ── Double-booking check ───────────────────────────────────────────────
    if (resolvedStaffId) {
      const conflict = await hasStaffConflict(
        providerId, resolvedStaffId, String(date), String(time), durationInt,
      );
      if (conflict) {
        return res.status(409).json({
          error: 'staff_conflict',
          message: 'الموظفة محجوزة في هذا الوقت',
        });
      }
    }

    const [created] = await db
      .insert(bookings)
      .values({
        providerId,
        clientName: clientName.trim(),
        clientPhone: clientPhone ? String(clientPhone).trim() : null,
        serviceId: serviceId ? String(serviceId) : null,
        serviceName: serviceName ? String(serviceName).trim() : null,
        staffId: resolvedStaffId,
        date: String(date),
        time: String(time),
        duration: durationInt,
        price: priceInt,
        status: status ?? 'confirmed',
        notes: notes ? String(notes).trim() : null,
        branchId: branchId ? String(branchId) : null,
        source: 'manual',
      })
      .returning();

    return res.status(201).json({ booking: toFrontend(created) });
  } catch (err) {
    console.error('[POST /bookings]', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

// ── PUT /api/bookings/:id ─────────────────────────────────────────────────────
router.put('/bookings/:id', async (req, res) => {
  const providerId = resolveProviderId(req);
  if (!providerId) return res.status(400).json({ error: 'x-provider-id header required' });

  try {
    const id = parseInt(String(req.params['id'] ?? ''), 10);
    if (isNaN(id)) return res.status(400).json({ error: 'invalid id' });

    const allowed = ['status', 'time', 'date', 'notes', 'staffId', 'duration', 'price', 'serviceName', 'serviceId'] as const;
    const updates: Record<string, unknown> = { updatedAt: new Date() };

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        if (key === 'staffId') {
          const sid = parseInt(String(req.body[key]), 10);
          updates[key] = isNaN(sid) ? null : sid;
        } else if (key === 'duration') {
          const d = Math.max(1, Math.min(480, Number(req.body[key])));
          updates[key] = isNaN(d) ? 60 : d;
        } else if (key === 'price') {
          const p = Math.max(0, Number(req.body[key]));
          updates[key] = isNaN(p) ? 0 : p;
        } else {
          updates[key] = req.body[key];
        }
      }
    }

    // Double-booking check if time/date/staff is changing
    const newDate = updates['date'] as string | undefined;
    const newTime = updates['time'] as string | undefined;
    const newStaffId = updates['staffId'] as number | null | undefined;

    if ((newDate || newTime || newStaffId !== undefined) && newStaffId) {
      // Fetch current booking to fill in missing fields
      const [current] = await db
        .select()
        .from(bookings)
        .where(and(eq(bookings.id, id), eq(bookings.providerId, providerId)))
        .limit(1);

      if (current) {
        const checkDate = (newDate ?? current.date) as string;
        const checkTime = (newTime ?? current.time) as string;
        const checkDuration = (updates['duration'] as number | undefined) ?? current.duration;

        const conflict = await hasStaffConflict(
          providerId, newStaffId, checkDate, checkTime, checkDuration, id,
        );
        if (conflict) {
          return res.status(409).json({
            error: 'staff_conflict',
            message: 'الموظفة محجوزة في هذا الوقت',
          });
        }
      }
    }

    const [updated] = await db
      .update(bookings)
      .set(updates as any)
      .where(and(eq(bookings.id, id), eq(bookings.providerId, providerId)))
      .returning();

    if (!updated) return res.status(404).json({ error: 'not_found' });
    return res.json({ booking: toFrontend(updated) });
  } catch (err) {
    console.error('[PUT /bookings/:id]', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

// ── DELETE /api/bookings/:id ──────────────────────────────────────────────────
// Soft delete — sets status to cancelled (requires approval for cashier/specialist)
router.delete('/bookings/:id',
  requireApprovalFor('booking_delete', { resourceType: 'booking' }),
  async (req, res) => {
  const providerId = resolveProviderId(req);
  if (!providerId) return res.status(400).json({ error: 'x-provider-id header required' });

  try {
    const id = parseInt(String(req.params['id'] ?? ''), 10);
    if (isNaN(id)) return res.status(400).json({ error: 'invalid id' });

    const [updated] = await db
      .update(bookings)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(and(eq(bookings.id, id), eq(bookings.providerId, providerId)))
      .returning();

    if (!updated) return res.status(404).json({ error: 'not_found' });

    logAudit({
      ...auditFromReq(req, 'booking_cancelled'),
      resourceType: 'booking',
      resourceId: id,
    }).catch(() => {});

    return res.json({ booking: toFrontend(updated) });
  } catch (err) {
    console.error('[DELETE /bookings/:id]', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

export default router;
