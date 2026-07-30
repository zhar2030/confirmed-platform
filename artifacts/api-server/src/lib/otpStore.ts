/**
 * DB-backed OTP store.
 * Reads/writes the otp_sessions table via Drizzle.
 * Failed attempts are tracked per-session in the failed_attempts column.
 */
import { db, otpSessions } from "./db";
import { eq, and, gt, lt, or, sql } from "drizzle-orm";

const OTP_EXPIRY_MINUTES = 10;
const MAX_ATTEMPTS = 5;

/** Delete expired + used sessions older than 1 hour to prevent table bloat. */
async function cleanupOldSessions(): Promise<void> {
  try {
    const cutoff = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
    await db
      .delete(otpSessions)
      .where(
        or(
          // Expired sessions older than 1 hour
          lt(otpSessions.expiresAt, cutoff),
          // Used sessions older than 1 hour
          and(eq(otpSessions.used, true), lt(otpSessions.createdAt, cutoff)),
        ),
      );
  } catch {
    // Non-fatal — cleanup failure should not block OTP flow
  }
}

export async function storeOtp(
  username: string,
  otp: string,
  email: string,
): Promise<void> {
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
  const cleanUsername = username.toLowerCase();

  // Invalidate any existing active OTP for this user
  await db
    .update(otpSessions)
    .set({ used: true })
    .where(
      and(
        eq(otpSessions.username, cleanUsername),
        eq(otpSessions.used, false),
      ),
    );

  await db.insert(otpSessions).values({
    username: cleanUsername,
    email,
    otp,
    expiresAt,
    used: false,
    failedAttempts: 0,
  });

  // Run cleanup asynchronously — don't await so it doesn't slow OTP send
  cleanupOldSessions();
}

export async function verifyOtp(
  username: string,
  otp: string,
): Promise<{ valid: boolean; reason?: string; attemptsLeft?: number }> {
  const now = new Date();
  const cleanUsername = username.toLowerCase();

  const [entry] = await db
    .select()
    .from(otpSessions)
    .where(
      and(
        eq(otpSessions.username, cleanUsername),
        eq(otpSessions.used, false),
        gt(otpSessions.expiresAt, now),
      ),
    )
    .orderBy(otpSessions.createdAt)
    .limit(1);

  if (!entry) {
    // Check if there's an expired session to give a better error
    const [expired] = await db
      .select({ id: otpSessions.id })
      .from(otpSessions)
      .where(
        and(
          eq(otpSessions.username, cleanUsername),
          eq(otpSessions.used, false),
          lt(otpSessions.expiresAt, now),
        ),
      )
      .limit(1);

    return { valid: false, reason: expired ? "expired" : "not_found" };
  }

  const currentFailed = entry.failedAttempts ?? 0;

  if (currentFailed >= MAX_ATTEMPTS) {
    await db
      .update(otpSessions)
      .set({ used: true })
      .where(eq(otpSessions.id, entry.id));
    return { valid: false, reason: "max_attempts", attemptsLeft: 0 };
  }

  if (entry.otp !== otp) {
    await db
      .update(otpSessions)
      .set({ failedAttempts: sql`${otpSessions.failedAttempts} + 1` })
      .where(eq(otpSessions.id, entry.id));
    const remaining = MAX_ATTEMPTS - (currentFailed + 1);
    return { valid: false, reason: "wrong_otp", attemptsLeft: remaining };
  }

  // ✅ Correct OTP — mark as used
  await db
    .update(otpSessions)
    .set({ used: true })
    .where(eq(otpSessions.id, entry.id));

  return { valid: true };
}

export async function getEmailForUsername(
  username: string,
): Promise<string | null> {
  const now = new Date();
  const [entry] = await db
    .select({ email: otpSessions.email })
    .from(otpSessions)
    .where(
      and(
        eq(otpSessions.username, username.toLowerCase()),
        eq(otpSessions.used, false),
        gt(otpSessions.expiresAt, now),
      ),
    )
    .orderBy(otpSessions.createdAt)
    .limit(1);
  return entry?.email ?? null;
}
