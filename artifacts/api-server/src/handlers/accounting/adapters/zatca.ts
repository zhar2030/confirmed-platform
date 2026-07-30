/**
 * ZATCA e-invoicing adapter — Saudi Arabia's Fatoorah standard.
 * Handles JSON output from any ZATCA-compliant system (UBL-based JSON).
 *
 * Standard ZATCA JSON invoice shape:
 * {
 *   ID:              string;              // invoice number
 *   IssueDate:       string;              // YYYY-MM-DD
 *   AccountingCustomerParty?: {
 *     Party?: { PartyName?: [{ Name: string }] }
 *   };
 *   InvoiceLine?:    [{
 *     ID: string;
 *     InvoiceQuantity: { _: number };
 *     LineExtensionAmount: { _: number };
 *     Item: { Name: string };
 *     TaxTotal?: [{ TaxAmount: { _: number } }];
 *   }];
 *   LegalMonetaryTotal?: {
 *     TaxExclusiveAmount: { _: number };
 *     TaxInclusiveAmount: { _: number };
 *   };
 *   TaxTotal?:       [{ TaxAmount: { _: number } }];
 *   PaymentMeans?:   [{ PaymentMeansCode: { _: string } }];
 * }
 *
 * Many ZATCA-compliant systems also export a simpler flat JSON — we handle both.
 */
import type { AdapterFn, NormalizedInvoice } from './types';

function extractName(obj: any): string {
  // Handles both UBL-structured and flat formats
  try {
    return obj?.AccountingCustomerParty?.Party?.PartyName?.[0]?.Name
      ?? obj?.BuyerCustomerParty?.Party?.PartyName?.[0]?.Name
      ?? obj?.customerName
      ?? obj?.customer_name
      ?? obj?.buyerName
      ?? 'عميل';
  } catch { return 'عميل'; }
}

export const zatcaAdapter: AdapterFn = (raw): NormalizedInvoice[] => {
  const rows = Array.isArray(raw) ? raw : ((raw as any)?.Invoice ?? [raw]);

  return rows
    .filter((r: any) => r && r.ID)
    .map((r: any) => {
      // UBL monetary totals
      const monetary = r.LegalMonetaryTotal ?? r.legal_monetary_total;
      const totalUbl    = Number(monetary?.TaxInclusiveAmount?._ ?? monetary?.tax_inclusive_amount ?? 0);
      const subtotalUbl = Number(monetary?.TaxExclusiveAmount?._ ?? monetary?.tax_exclusive_amount ?? 0);
      const taxUbl      = Number(r.TaxTotal?.[0]?.TaxAmount?._ ?? r.tax_total?.[0]?.tax_amount ?? 0);

      // Flat fallbacks (simpler exports)
      const total    = totalUbl    || Number(r.total ?? r.payableAmount ?? r.amount_total ?? 0);
      const subtotal = subtotalUbl || Number(r.subtotal ?? r.taxExclusiveAmount ?? (total - taxUbl));
      const tax      = taxUbl      || Number(r.tax ?? r.taxAmount ?? r.amount_tax ?? 0);

      // Date
      const dateRaw = String(r.IssueDate ?? r.issue_date ?? r.date ?? '');
      const date    = dateRaw.split('T')[0] || new Date().toISOString().split('T')[0];

      // Line items
      const lines = r.InvoiceLine ?? r.invoice_line ?? r.lineItems ?? r.line_items ?? [];
      const items = Array.isArray(lines) && lines.length > 0
        ? lines.map((l: any) => ({
            name:  String(l.Item?.Name ?? l.item?.name ?? l.name ?? 'خدمة'),
            price: Number(l.LineExtensionAmount?._ ?? l.line_extension_amount ?? l.price ?? l.amount ?? 0),
            qty:   Number(l.InvoiceQuantity?._ ?? l.invoice_quantity ?? l.quantity ?? 1),
          }))
        : [{ name: 'فاتورة ZATCA', price: total }];

      // Payment means (UBL code: 10=cash, 42=bank, 48=card)
      const payCode  = String(r.PaymentMeans?.[0]?.PaymentMeansCode?._ ?? r.paymentMethod ?? '');
      const payMethod = payCode === '10' ? 'cash' : payCode === '48' ? 'card' : payCode === '42' ? 'bank' : (payCode || 'cash');

      return {
        externalId:    String(r.ID ?? r.id ?? ''),
        clientName:    extractName(r),
        date,
        items,
        subtotal,
        tax,
        total,
        paymentMethod: payMethod,
        sourceSystem:  'zatca',
      };
    });
};
