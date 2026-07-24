import type { Command } from 'commander';
import { type TodoistTokenStore } from '../../lib/auth-store.js';
/**
 * Attach `td auth status` via cli-core's generic `attachStatusCommand`.
 *
 * `TodoistTokenStore.active()` returns `null` for env-token mode + when no
 * default user is stored (per the adapter's documented contract — see
 * `auth-store.ts`). To preserve the existing UX for those cases we route the
 * full status fetch through `onNotAuthenticated`; when `active()` does return
 * a snapshot, `fetchLive` covers the same gather so renderText/renderJson can
 * read from a single closure-captured `StatusData` regardless of which path
 * we took. The snapshot path also short-circuits one credential resolve via
 * `gatherStatusData(token)` when no `--user <ref>` is in play; when `--user`
 * is set we re-resolve through `getApi()` so the displayed account matches
 * the selector instead of the snapshot's default.
 */
export declare function attachTodoistStatusCommand(auth: Command, store: TodoistTokenStore): Command;
//# sourceMappingURL=status.d.ts.map