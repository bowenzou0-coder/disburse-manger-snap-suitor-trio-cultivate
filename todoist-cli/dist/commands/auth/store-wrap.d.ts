import type { TodoistTokenStore } from '../../lib/auth-store.js';
/**
 * Substitute `getRequestedUserRef()` for missing `ref` arguments on
 * `active` / `clear`. `index.ts` strips `--user` from argv before commander
 * runs, so cli-core's registrars (`attachLogoutCommand`,
 * `attachTokenViewCommand`) can't see the flag on their parsed args; this
 * wrap puts the global selector back into play.
 *
 * Existence is checked via `store.list()` rather than `store.active()` — the
 * latter loads the token and can throw `SecureStoreUnavailableError` when
 * the keyring is offline, which would crash `td auth logout --user <ref>`
 * instead of letting it clear the broken credential.
 *
 * The wrap is built with `Object.assign(Object.create(store), …)` so any
 * methods cli-core might later promote to a prototype still resolve via the
 * prototype chain instead of being silently dropped by a spread.
 */
export declare function withUserRefAware(store: TodoistTokenStore): TodoistTokenStore;
//# sourceMappingURL=store-wrap.d.ts.map