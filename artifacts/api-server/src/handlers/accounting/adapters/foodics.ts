/**
 * Foodics adapter — normalizes Foodics POS receipt/order objects.
 *
 * Foodics webhook payload shape (order closed event):
 * {
 *   reference:    string;
 *   closed_at:    string;          // ISO datetime
 *   customer?:    { name?: string };
 *   products?:    [{ name, quantity, unit_price, tax_amount }];
 *   subtotal:     number;          // cents or float (Foodics uses float SAR)
 *   tax:          number;
 *   total:        number;
 *   payment_method?: string;
 * }
 *
 * Foodics API pull (/orders or /receipts) returns an array of the above.
 */
import type { AdapterFn, NormalizedInvoice } from './types';

export const foodicsAdapter: AdapterFn = (raw): NormalizedInvoice[] => {
  const rows = Array.isArray(raw) ? raw : ((raw as any)?.data ?? [raw]);

  return rows
    .filter((r: any) => r && (r.reference || r.id) && r.total !== undefined)
    .map((r: any) => {
      const total    = Number(r.total ?? 0);
      const tax      = Number(r.tax ?? r.total_taxes ?? 0);
      const subtotal = Number(r.subtotal ?? (total - tax));
      const dateRaw  = String(r.closed_at ?? r.created_at ?? r.date ?? '');
      const date     = dateRaw ? dateRaw.split('T')[0] : new Date().toISOString().split('T')[0];

      const items = Array.isArray(r.products)
        ? r.products.map((p: any) => ({
            name:  String(p.name ?? p.product_name ?? 'منتج'),
            price: Number(p.unit_price ?? p.price ?? 0),
            qty:   Number(p.quantity ?? 1),
          }))
        : [{ name: 'Foodics Order', price: total }];

      return {
        externalId:    String(r.reference ?? r.id ?? r.hashed_id ?? ''),
        clientName:    String(r.customer?.name ?? r.customer_name ?? 'عميل Foodics'),
        date,
        items,
        subtotal,
        tax,
        total,
        paymentMethod: String(r.payment_method ?? r.payment_type ?? 'cash'),
        sourceSystem:  'foodics',
      };
    });
};
