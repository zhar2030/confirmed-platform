/**
 * ConversationEngine — Plugin-based state machine dispatcher.
 *
 * Handlers register themselves via registerHandler().
 * The engine is state-agnostic: it routes each incoming message to
 * the handler registered for the conversation's current state.
 *
 * Adding new flows (loyalty, membership, gift cards) = register a new handler.
 * The engine itself never changes.
 */

import { db } from './db';
import { sql } from 'drizzle-orm';
import { decrypt } from './encryption';
import { detectLanguage, isLanguageOverride } from './languageDetector';
import { WhatsAppClient } from './whatsappClient';
import type {
  ConversationRecord,
  ConversationState,
  IncomingMessage,
  StateHandler,
  StateTransition,
  WhatsAppPhone,
} from './whatsappTypes';

// ── Handler registry ──────────────────────────────────────────────────────────

const registry = new Map<ConversationState, StateHandler>();

export function registerHandler(handler: StateHandler): void {
  registry.set(handler.state, handler);
}

// ── Session helpers ───────────────────────────────────────────────────────────

const SESSION_MS = 30 * 60 * 1_000; // 30 minutes

function expiresAt(): string {
  return new Date(Date.now() + SESSION_MS).toISOString();
}

export async function getOrCreateConversation(
  providerId:     number,
  phoneNumberId:  string,
  waFrom:         string,
  initialLang?:   'ar' | 'en',
): Promise<ConversationRecord> {
  // Find active session
  const found = await db.execute(sql`
    SELECT * FROM whatsapp_conversations
    WHERE provider_id = ${providerId}
      AND wa_from      = ${waFrom}
      AND expires_at   > NOW()
    ORDER BY last_activity_at DESC
    LIMIT 1
  `);

  if (found.rows.length > 0) {
    const r = found.rows[0] as any;
    // Touch the session
    await db.execute(sql`
      UPDATE whatsapp_conversations
      SET last_activity_at = NOW(), expires_at = ${expiresAt()}
      WHERE id = ${r.id}
    `);
    return { ...r, context: r.context ?? {} };
  }

  // Create new session
  const created = await db.execute(sql`
    INSERT INTO whatsapp_conversations
      (provider_id, phone_number_id, wa_from, state, lang, context, expires_at)
    VALUES
      (${providerId}, ${phoneNumberId}, ${waFrom},
       'GREETING', ${initialLang ?? 'ar'}, '{}', ${expiresAt()})
    RETURNING *
  `);
  const r = created.rows[0] as any;
  return { ...r, context: {} };
}

export async function updateConversation(
  id:      number,
  updates: {
    state?:      ConversationState;
    lang?:       'ar' | 'en';
    context?:    Record<string, unknown>;
    branch_id?:  string | null;
    staff_id?:   number | null;
  },
): Promise<void> {
  await db.execute(sql`
    UPDATE whatsapp_conversations
    SET
      state    = COALESCE(${updates.state    ?? null}, state),
      lang     = COALESCE(${updates.lang     ?? null}, lang),
      context  = CASE WHEN ${updates.context != null}::boolean
                 THEN ${JSON.stringify(updates.context ?? {})}::jsonb
                 ELSE context END,
      branch_id = CASE WHEN ${updates.branch_id !== undefined}::boolean
                  THEN ${updates.branch_id ?? null}
                  ELSE branch_id END,
      staff_id  = CASE WHEN ${updates.staff_id !== undefined}::boolean
                  THEN ${updates.staff_id ?? null}
                  ELSE staff_id END,
      last_activity_at = NOW(),
      expires_at       = ${expiresAt()}
    WHERE id = ${id}
  `);
}

export async function logMessage(
  conversationId: number,
  direction:      'in' | 'out',
  type:           string,
  content:        unknown,
  opts: {
    waMessageId?:   string;
    status?:        string;
    templateName?:  string;
    errorCode?:     string;
  } = {},
): Promise<void> {
  try {
    await db.execute(sql`
      INSERT INTO whatsapp_messages
        (conversation_id, direction, type, content, wa_message_id,
         status, template_name, error_code)
      VALUES
        (${conversationId}, ${direction}, ${type},
         ${JSON.stringify(content)}::jsonb,
         ${opts.waMessageId   ?? null},
         ${opts.status        ?? 'sent'},
         ${opts.templateName  ?? null},
         ${opts.errorCode     ?? null})
    `);
  } catch { /* non-blocking */ }
}

/** Look up which provider owns this phone_number_id. */
export async function resolvePhoneToProvider(
  phoneNumberId: string,
): Promise<WhatsAppPhone | null> {
  const res = await db.execute(sql`
    SELECT * FROM whatsapp_phone_numbers
    WHERE phone_number_id = ${phoneNumberId}
      AND is_active = true
    LIMIT 1
  `);
  return res.rows.length > 0 ? (res.rows[0] as unknown as WhatsAppPhone) : null;
}

// ── Main dispatcher ───────────────────────────────────────────────────────────

const RESET_WORDS_AR = ['مرحبا', 'هلا', 'ابدأ', 'البداية', 'رئيسية', 'قائمة', '0'];
const RESET_WORDS_EN = ['hi', 'hello', 'start', 'menu', 'home', '0'];

function isReset(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return RESET_WORDS_AR.includes(lower) || RESET_WORDS_EN.includes(lower);
}

export async function processMessage(
  phone:      WhatsAppPhone,
  providerId: number,
  msg:        IncomingMessage,
): Promise<void> {
  const rawText = (
    msg.text ??
    msg.interactive?.button_reply?.title ??
    msg.interactive?.list_reply?.title ??
    msg.button?.text ??
    ''
  ).trim();

  // Detect language override (user explicitly switches)
  const langOverride = isLanguageOverride(rawText);

  // Get or create session
  let conv = await getOrCreateConversation(
    providerId, phone.phone_number_id, msg.wa_from,
    langOverride ?? detectLanguage(rawText),
  );

  const lang = langOverride ?? (conv.lang as 'ar' | 'en');

  // Log incoming message
  await logMessage(conv.id, 'in', msg.type, { text: rawText, raw: msg }, {
    waMessageId: msg.messageId,
    status:      'received',
  });

  // Build client
  const client = new WhatsAppClient(
    phone.phone_number_id,
    decrypt(phone.system_user_token),
  );

  // Mark as read (best-effort)
  void client.markRead(msg.messageId);

  // Apply lang override
  if (langOverride && langOverride !== conv.lang) {
    await updateConversation(conv.id, { lang });
    conv = { ...conv, lang };
  }

  // Global reset command → restart from GREETING
  if (isReset(rawText) && conv.state !== 'GREETING') {
    await updateConversation(conv.id, { state: 'GREETING', context: {} });
    conv = { ...conv, state: 'GREETING', context: {} };
  }

  // ── Global reminder-action interceptor ────────────────────────────────────
  // Handles buttons sent WITH appointment-reminder messages (24h / 1h).
  // These arrive at any conversation state, so we intercept before normal dispatch.
  const pickIdVal =
    msg.interactive?.button_reply?.id ??
    msg.button?.payload ??
    '';

  if (pickIdVal.startsWith('confirm_reminder_')) {
    // Customer confirmed they're coming — acknowledge and complete
    const ack = lang === 'ar'
      ? '✅ شكراً! نحن بانتظارك. نتطلع لرؤيتكِ 💇‍♀️'
      : '✅ Great! We look forward to seeing you 💇‍♀️';
    const r = await client.send(msg.wa_from, { type: 'text', text: ack });
    await logMessage(conv.id, 'out', 'text', { text: ack }, { waMessageId: r.messageId });
    await updateConversation(conv.id, { state: 'COMPLETED', context: {} });
    return;
  }

  if (pickIdVal.startsWith('reschedule_')) {
    // Customer wants to reschedule — restart booking flow
    const bookingId = pickIdVal.replace('reschedule_', '');
    const intro = lang === 'ar'
      ? '📅 لنعيد جدولة موعدك. اختاري الخدمة التي تريدينها:'
      : '📅 Let\'s reschedule your appointment. Choose a service:';
    await client.send(msg.wa_from, { type: 'text', text: intro });
    await logMessage(conv.id, 'out', 'text', { text: intro }, {});
    await updateConversation(conv.id, { state: 'SERVICE_SELECT', context: { modifyBookingId: bookingId } });
    conv = { ...conv, state: 'SERVICE_SELECT', context: { modifyBookingId: bookingId } };
    // Fall through to normal dispatch so ServiceSelectHandler sends the service list
  }

  if (pickIdVal.startsWith('cancel_reminder_')) {
    // Customer wants to cancel — jump straight to cancel confirmation
    const bookingId = pickIdVal.replace('cancel_reminder_', '');
    await updateConversation(conv.id, { state: 'CANCEL_CONFIRM', context: { modifyBookingId: bookingId } });
    conv = { ...conv, state: 'CANCEL_CONFIRM', context: { modifyBookingId: bookingId } };
    // Synthesise the button press so CancelConfirmHandler sees "yes_cancel"
    msg = { ...msg, interactive: { type: 'button_reply', button_reply: { id: 'yes_cancel', title: '' } } } as IncomingMessage;
    // Fall through to normal dispatch so CancelConfirmHandler handles it
  }

  // Dispatch to handler
  const handler = registry.get(conv.state);
  if (!handler) {
    // Unregistered state → reset gracefully
    console.warn(`[ConversationEngine] No handler for state "${conv.state}" — resetting`);
    await updateConversation(conv.id, { state: 'GREETING', context: {} });
    const fallback = registry.get('GREETING');
    if (fallback) await fallback.handle({ ...conv, state: 'GREETING', context: {} }, msg, phone);
    return;
  }

  let transition: StateTransition;
  try {
    transition = await handler.handle({ ...conv, lang }, msg, phone);
  } catch (err: any) {
    console.error(`[ConversationEngine] Handler "${conv.state}" threw:`, err?.message);
    const errText = lang === 'ar'
      ? '⚠️ حدث خطأ غير متوقع. أرسل "مرحبا" للعودة للقائمة الرئيسية.'
      : '⚠️ An unexpected error occurred. Send "Hello" to restart.';
    const r = await client.send(msg.wa_from, { type: 'text', text: errText });
    await logMessage(conv.id, 'out', 'text', { text: errText }, {
      waMessageId: r.messageId,
      errorCode:   r.error,
    });
    return;
  }

  // Persist state update
  await updateConversation(conv.id, {
    state:   transition.nextState,
    lang,
    context: transition.contextUpdates
      ? { ...(conv.context ?? {}), ...transition.contextUpdates }
      : undefined,
    branch_id: transition.branchId,
    staff_id:  transition.staffId,
  });
}
