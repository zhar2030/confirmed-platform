/**
 * Shared types for all accounting system adapters.
 * Every adapter receives raw JSON from the external system and returns
 * a NormalizedInvoice array ready for DB insert.
 */

export interface NormalizedInvoice {
  externalId:    string;   // Unique ID from source system — used for deduplication
  clientName:    string;
  date:          string;   // YYYY-MM-DD
  items:         Array<{ name: string; price: number; qty?: number }>;
  subtotal:      number;   // Before tax
  tax:           number;   // VAT / GST
  total:         number;   // subtotal + tax
  paymentMethod: string;
  sourceSystem:  string;   // 'foodics' | 'marn' | 'odoo' | 'zatca' | 'generic'
}

export type AdapterFn = (raw: unknown) => NormalizedInvoice[];
