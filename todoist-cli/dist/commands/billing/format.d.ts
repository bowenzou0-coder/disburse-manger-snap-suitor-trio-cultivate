import type { PriceListing, TodoistApi } from '@doist/todoist-sdk';
import type { ViewOptions } from '../../lib/options.js';
export type BillingViewOptions = Pick<ViewOptions, 'json' | 'ndjson'>;
/**
 * Resolve the locale used to format money, from the user's Todoist language
 * (e.g. `pt_BR` → `pt-BR` for `Intl`). Only fetched for human output — machine
 * output dumps the raw payload, so it skips the extra `getUser` call entirely.
 * Returns `undefined` (the `Intl` default locale) when no fetch is made.
 */
export declare function resolveLocale(api: TodoistApi, options: BillingViewOptions): Promise<string | undefined>;
/**
 * Emit the raw payload as JSON (`--json`) or NDJSON (`--ndjson`) and report
 * whether machine output was produced, so callers can early-return before
 * rendering the human view. Reuses the shared `output.ts` helpers so billing
 * machine output matches the rest of the CLI.
 */
export declare function outputMachine(payload: object, options: BillingViewOptions): boolean;
/**
 * Format an amount given in a currency's minor units (e.g. cents) as money.
 * Mirrors todoist-web's `formatPrice`: the divisor comes from the currency's
 * fraction digits (so JPY isn't rendered 100× too small), and whole amounts
 * drop the decimals (`$6`, not `$6.00`). `locale` comes from the user's
 * Todoist language; `undefined` uses the `Intl` default.
 */
export declare function formatMoney(minorUnits: number, currency: string, locale?: string): string;
/** Render a single billing-cycle price listing, e.g. `monthly: $6, €6`. */
export declare function formatListing(listing: PriceListing, locale?: string): string;
//# sourceMappingURL=format.d.ts.map