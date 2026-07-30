/**
 * WhatsAppClient — wrapper around Meta Cloud API v19.
 * Supports text, interactive buttons, interactive lists, and template messages.
 */

const GRAPH_VERSION = 'v19.0';
const BASE_URL      = `https://graph.facebook.com/${GRAPH_VERSION}`;

// ── Message payload types ─────────────────────────────────────────────────────

export interface TextMsg {
  type: 'text';
  text: string;
}

export interface ButtonMsg {
  type: 'buttons';
  body: string;
  footer?: string;
  buttons: Array<{ id: string; title: string }>;   // Max 3 buttons, title ≤ 20 chars
}

export interface ListMsg {
  type: 'list';
  header?: string;
  body: string;
  footer?: string;
  buttonLabel: string;                              // Label for the "open list" button ≤ 20 chars
  sections: Array<{
    title?: string;
    rows: Array<{ id: string; title: string; description?: string }>;
  }>;
}

export interface TemplateMsg {
  type: 'template';
  name: string;
  language: 'ar' | 'en';
  components?: unknown[];
}

export type OutgoingMsg = TextMsg | ButtonMsg | ListMsg | TemplateMsg;

export interface SendResult {
  ok:        boolean;
  messageId?: string;
  error?:    string;
  errorCode?: string;
}

// ── Client ────────────────────────────────────────────────────────────────────

export class WhatsAppClient {
  constructor(
    private readonly phoneNumberId: string,
    private readonly accessToken:   string,
  ) {}

  async send(to: string, msg: OutgoingMsg): Promise<SendResult> {
    const payload = this.buildPayload(to, msg);
    try {
      const res  = await fetch(`${BASE_URL}/${this.phoneNumberId}/messages`, {
        method:  'POST',
        headers: {
          Authorization:  `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json() as any;
      if (!res.ok) {
        const err = data?.error;
        console.error('[WhatsAppClient] send failed:', err);
        return { ok: false, error: err?.message, errorCode: String(err?.code ?? '') };
      }
      return { ok: true, messageId: data?.messages?.[0]?.id };
    } catch (err: any) {
      console.error('[WhatsAppClient] network error:', err?.message);
      return { ok: false, error: err?.message ?? 'network_error' };
    }
  }

  async markRead(messageId: string): Promise<void> {
    try {
      await fetch(`${BASE_URL}/${this.phoneNumberId}/messages`, {
        method:  'POST',
        headers: {
          Authorization:  `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          status:            'read',
          message_id:        messageId,
        }),
      });
    } catch { /* non-critical */ }
  }

  private buildPayload(to: string, msg: OutgoingMsg): object {
    const base = { messaging_product: 'whatsapp', recipient_type: 'individual', to };

    if (msg.type === 'text') {
      return { ...base, type: 'text', text: { preview_url: false, body: msg.text } };
    }

    if (msg.type === 'buttons') {
      return {
        ...base,
        type: 'interactive',
        interactive: {
          type: 'button',
          body: { text: msg.body },
          ...(msg.footer ? { footer: { text: msg.footer } } : {}),
          action: {
            buttons: msg.buttons.slice(0, 3).map(b => ({
              type:  'reply',
              reply: { id: b.id, title: b.title.slice(0, 20) },
            })),
          },
        },
      };
    }

    if (msg.type === 'list') {
      return {
        ...base,
        type: 'interactive',
        interactive: {
          type: 'list',
          ...(msg.header ? { header: { type: 'text', text: msg.header } } : {}),
          body: { text: msg.body },
          ...(msg.footer ? { footer: { text: msg.footer } } : {}),
          action: {
            button:   msg.buttonLabel.slice(0, 20),
            sections: msg.sections.map(sec => ({
              ...(sec.title ? { title: sec.title } : {}),
              rows: sec.rows.slice(0, 10).map(r => ({
                id:          r.id.slice(0, 256),
                title:       r.title.slice(0, 24),
                ...(r.description ? { description: r.description.slice(0, 72) } : {}),
              })),
            })),
          },
        },
      };
    }

    // template
    const tmpl = msg as TemplateMsg;
    return {
      ...base,
      type:     'template',
      template: {
        name:     tmpl.name,
        language: { code: tmpl.language === 'ar' ? 'ar' : 'en_US' },
        ...(tmpl.components ? { components: tmpl.components } : {}),
      },
    };
  }
}

/** Build a WhatsAppClient from an already-decrypted token. */
export function makeClient(phoneNumberId: string, plainToken: string): WhatsAppClient {
  return new WhatsAppClient(phoneNumberId, plainToken);
}
