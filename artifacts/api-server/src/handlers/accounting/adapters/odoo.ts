/**
 * Odoo adapter — normalizes Odoo account.move (invoice) records.
 *
 * Odoo JSON-RPC / REST response shape for invoices:
 * {
 *   name:                string;    // e.g. "INV/2024/00001"
 *   invoice_date:        string;    // YYYY-MM-DD
 *   partner_name?:       string;    // customer name (denormalized)
 *   invoice_line_ids?:   [{ name, price_unit, quantity, price_subtotal }];
 *   amount_untaxed:      number;
 *   amount_tax:          number;
 *   amount_total:        number;
 *   invoice_payment_term_id?: any;
 *   payment_state?:      string;
 * }
 *
 * Odoo also returns arrays under a "result" key from JSON-RPC — we unwrap it.
 */
import type { AdapterFn, NormalizedInvoice } from './types';

export const odooAdapter: AdapterFn = (raw): NormalizedInvoice[] => {
  // Unwrap Odoo JSON-RPC envelope if present
  let rows: any[] = [];
  if (Array.isArray(raw)) {
    rows = raw;
  } else if ((raw as any)?.result) {
    const result = (raw as any).result;
    rows = Array.isArray(result) ? result : [result];
  } else {
    rows = [raw];
  }

  return rows
    .filter((r: any) => r && r.name && r.amount_total !== undefined)
    .map((r: any) => {
      const total    = Number(r.amount_total ?? 0);
      const tax      = Number(r.amount_tax ?? 0);
      const subtotal = Number(r.amount_untaxed ?? (total - tax));
      const dateRaw  = String(r.invoice_date ?? r.date ?? '');
      const date     = dateRaw.split('T')[0] || new Date().toISOString().split('T')[0];

      const lines = r.invoice_line_ids ?? r.move_line_ids ?? r.line_ids ?? [];
      const items = Array.isArray(lines) && lines.length > 0
        ? lines
            .filter((l: any) => l && (l.name || l.product_id))
            .map((l: any) => ({
              name:  String(l.name ?? l.product_id?.[1] ?? 'خدمة'),
              price: Number(l.price_unit ?? l.price ?? 0),
              qty:   Number(l.quantity ?? 1),
            }))
        : [{ name: r.name, price: total }];

      // Odoo payment: 'not_paid' | 'in_payment' | 'paid' | 'reversed'
      const payState = String(r.payment_state ?? '');
      const payMethod = payState === 'paid' ? 'cash' : 'pending';

      return {
        externalId:    String(r.name ?? r.id ?? ''),
        clientName:    String(r.partner_name ?? r.partner_id?.[1] ?? 'عميل Odoo'),
        date,
        items,
        subtotal,
        tax,
        total,
        paymentMethod: payMethod,
        sourceSystem:  'odoo',
      };
    });
};
