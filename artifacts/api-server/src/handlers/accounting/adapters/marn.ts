/**
 * Marn (مرن) adapter — Saudi cloud POS system.
 *
 * Marn webhook/API invoice shape:
 * {
 *   invoiceId:     string;
 *   date:          string;          // YYYY-MM-DD or ISO
 *   customerName?: string;
 *   items?:        [{ name, amount, quantity }];
 *   subtotal:      number;
 *   vatAmount:     number;
 *   totalAmount:   number;
 *   paymentType?:  string;
 * }
 */
import type { AdapterFn, NormalizedInvoice } from './types';

export const marnAdapter: AdapterFn = (raw): NormalizedInvoice[] => {
  const rows = Array.isArray(raw) ? raw : ((raw as any)?.invoices ?? [raw]);

  return rows
    .filter((r: any) => r && (r.invoiceId || r.invoice_id) && r.totalAmount !== undefined)
    .map((r: any) => {
      const total    = Number(r.totalAmount ?? r.total_amount ?? 0);
      const tax      = Number(r.vatAmount ?? r.vat_amount ?? r.tax ?? 0);
      const subtotal = Number(r.subtotal ?? (total - tax));
      const dateRaw  = String(r.date ?? r.invoiceDate ?? r.invoice_date ?? '');
      const date     = dateRaw.includes('T') ? dateRaw.split('T')[0] : (dateRaw || new Date().toISOString().split('T')[0]);

      const items = Array.isArray(r.items)
        ? r.items.map((i: any) => ({
            name:  String(i.name ?? i.itemName ?? 'خدمة'),
            price: Number(i.amount ?? i.price ?? i.unitPrice ?? 0),
            qty:   Number(i.quantity ?? i.qty ?? 1),
          }))
        : [{ name: 'مرن — فاتورة', price: total }];

      return {
        externalId:    String(r.invoiceId ?? r.invoice_id ?? ''),
        clientName:    String(r.customerName ?? r.customer_name ?? r.clientName ?? 'عميل مرن'),
        date,
        items,
        subtotal,
        tax,
        total,
        paymentMethod: String(r.paymentType ?? r.payment_type ?? r.paymentMethod ?? 'cash'),
        sourceSystem:  'marn',
      };
    });
};
