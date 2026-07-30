/**
 * Shared types for the WhatsApp integration.
 * Designed to be extensible — new flow types (loyalty, gift cards, etc.)
 * only require adding to ConversationState and registering a new handler.
 */

// ── Conversation states ────────────────────────────────────────────────────────
export type ConversationState =
  | 'GREETING'          // Entry: send welcome + main menu
  | 'MENU'              // Wait for menu selection (book/modify/cancel/inquire)
  | 'SERVICE_SELECT'    // Send service list, wait for pick
  | 'STAFF_SELECT'      // Send staff list (+ "any available"), wait for pick
  | 'DATE_SELECT'       // Send next-7-days, wait for pick
  | 'TIME_SELECT'       // Send available slots, wait for pick
  | 'NAME_COLLECT'      // Ask for client's full name (phone already known from wa_from)
  | 'BOOKING_CONFIRM'   // Send booking summary (no financial data), wait for confirm/back
  | 'MODIFY_PICK'       // Show upcoming bookings for modification
  | 'MODIFY_REBOOK'     // After picking which booking to modify, re-run booking flow
  | 'CANCEL_PICK'       // Show upcoming bookings for cancellation
  | 'CANCEL_CONFIRM'    // Confirm the cancellation
  | 'INQUIRY'           // Accept free text inquiry
  | 'COMPLETED'         // Terminal — any message restarts with greeting
  // Future extension points (register handler to activate):
  | 'LOYALTY_MENU'
  | 'MEMBERSHIP_SELECT'
  | 'GIFT_CARD_SELECT';

// ── Booking context (accumulated during the flow) ─────────────────────────────
// Financial fields (servicePrice) are retained ONLY for DB insert into bookings.
// They are NEVER displayed in WhatsApp messages — prices/invoices/VAT stay in the platform.
export interface BookingContext {
  // CRM fields — collected from conversation
  clientName?:      string;         // Collected via NAME_COLLECT state
  serviceId?:       string;
  serviceName?:     string;
  serviceDuration?: number;
  staffId?:         string | null;  // null = "any available"
  staffName?:       string;
  date?:            string;         // YYYY-MM-DD
  time?:            string;         // HH:MM
  branchId?:        string;
  // Internal — kept for DB insert, never shown in WhatsApp
  servicePrice?:    number;
  // Modification flow
  modifyBookingId?: string;
  // Free-text inquiry
  inquiry?:         string;
  // Internal
  menuPage?:        number;         // for paginated lists
}

// ── DB record shapes (raw from DB, context as JSONB) ──────────────────────────
export interface ConversationRecord {
  id:               number;
  provider_id:      number;
  phone_number_id:  string;
  wa_from:          string;
  state:            ConversationState;
  lang:             'ar' | 'en';
  context:          BookingContext;
  branch_id:        string | null;
  staff_id:         number | null;
  last_activity_at: string;
  expires_at:       string;
  created_at:       string;
}

export interface WhatsAppPhone {
  id:                  number;
  provider_id:         number;
  phone_number_id:     string;
  display_phone:       string;
  waba_id:             string;
  system_user_token:   string;    // encrypted at rest
  is_active:           boolean;
  is_primary:          boolean;
  rate_limit_per_min:  number;
  rate_limit_per_hour: number;
}

// ── Incoming message ───────────────────────────────────────────────────────────
export interface IncomingMessage {
  messageId:   string;
  wa_from:     string;
  type:        'text' | 'interactive' | 'button' | 'other';
  text?:       string;
  interactive?: {
    type:          'button_reply' | 'list_reply';
    button_reply?: { id: string; title: string };
    list_reply?:   { id: string; title: string };
  };
  button?: { payload: string; text: string };
}

// ── State transition returned by every handler ────────────────────────────────
export interface StateTransition {
  nextState:      ConversationState;
  contextUpdates?: Partial<BookingContext>;
  branchId?:       string | null;
  staffId?:        number | null;
}

// ── Handler contract ──────────────────────────────────────────────────────────
export interface StateHandler {
  readonly state: ConversationState;
  /**
   * Called once per incoming message when conv.state === this.state.
   * Must:
   *   1. Send a WhatsApp response via the provided client.
   *   2. Return the next state + any context updates.
   */
  handle(
    conv:  ConversationRecord,
    msg:   IncomingMessage,
    phone: WhatsAppPhone,
  ): Promise<StateTransition>;
}

// ── Provider data helpers ─────────────────────────────────────────────────────
export interface ServiceRow {
  id:       string;
  nameAr:   string;
  nameEn:   string;
  price:    number;
  duration: number;
  category: string;
  isActive: boolean;
}

export interface StaffRow {
  id:       number;
  name:     string;
  role:     string;
  isActive: boolean;
}

export interface BookingRow {
  id:          string;
  clientName:  string;
  serviceName: string;
  date:        string;
  time:        string;
  status:      string;
}
