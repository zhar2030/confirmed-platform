/**
 * Adapter registry — maps source system names to their adapter functions.
 * All adapters return NormalizedInvoice[] from raw external JSON.
 */
import { genericAdapter } from './adapters/generic';
import { foodicsAdapter }  from './adapters/foodics';
import { marnAdapter }     from './adapters/marn';
import { zatcaAdapter }    from './adapters/zatca';
import { odooAdapter }     from './adapters/odoo';
import type { NormalizedInvoice } from './adapters/types';

export type { NormalizedInvoice };

type SystemKey = 'generic' | 'foodics' | 'marn' | 'zatca' | 'odoo';

const ADAPTERS: Record<SystemKey, (raw: unknown) => NormalizedInvoice[]> = {
  generic: genericAdapter,
  foodics: foodicsAdapter,
  marn:    marnAdapter,
  zatca:   zatcaAdapter,
  odoo:    odooAdapter,
};

/**
 * Normalize raw JSON from any supported accounting system.
 * Falls back to the generic adapter if the system is unknown.
 */
export function normalize(system: string, raw: unknown): NormalizedInvoice[] {
  const key = (system ?? 'generic').toLowerCase() as SystemKey;
  const fn  = ADAPTERS[key] ?? genericAdapter;
  try {
    return fn(raw);
  } catch (err) {
    console.error(`[accounting/normalize] Adapter "${key}" threw:`, err);
    return [];
  }
}

export const SUPPORTED_SYSTEMS: SystemKey[] = ['generic', 'foodics', 'marn', 'zatca', 'odoo'];
