/**
 * Generic JSON adapter — our own standard format.
 * Use this as the default for any system that can export custom JSON.
 *
 * Expected input (single invoice OR array of invoices):
 * {
 *   id:             string;          // unique invoice ID
 *   date:           string;          // YYYY-MM-DD or ISO datetime
 *   clientName?:    string;
 *   items?:         [{ name, price, qty? }];
 *   subtotal?:      number;
 *   tax?:           number;
 *   total:          number;
 *   paymentMethod?: string;
 * }
 */
import type { AdapterFn, NormalizedInvoice } from './types';

export const genericAdapter: AdapterFn = (raw): NormalizedInvoice[] => {
  const rows = Array.isArray(raw) ? raw : [raw];

  return rows
    .filter((r: any) => r && r.id && r.total)
    .map((r: any) => {
      const total    = Number(r.total ?? 0);
      const tax      = Number(r.tax ?? 0);
      const subtotal = Number(r.subtotal ?? (total - tax));
      const dateRaw  = String(r.date ?? '');
      const date     = dateRaw.includes('T') ? dateRaw.split('T')[0] : dateRaw;

      return {
        externalId:    String(r.id),
        clientName:    String(r.clientName ?? r.client_name ?? 'عميل'),
        date:          date || new Date().toISOString().split('T')[0],
        items:         Array.isArray(r.items) ? r.items.map((i: any) => ({
          name:  String(i.name ?? 'خدمة'),
          price: Number(i.price ?? 0),
          qty:   Number(i.qty ?? 1),
        })) : [{ name: 'من نظام محاسبي', price: total }],
        subtotal,
        tax,
        total,
        paymentMethod: String(r.paymentMethod ?? r.payment_method ?? 'cash'),
        sourceSystem:  'generic',
      };
    });
};
