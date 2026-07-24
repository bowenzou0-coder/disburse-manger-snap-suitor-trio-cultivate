import type { Command } from 'commander';
import type { TodoistTokenStore } from '../../lib/auth-store.js';
/**
 * `td auth logout`. cli-core owns the success line + `--json` / `--ndjson`
 * envelopes; the Todoist hook surfaces the keyring-fallback warning that
 * cli-core's `TokenStore.clear: void` contract can't carry. The `--user
 * <ref>` injection lives on the wrapped store the caller passes in (see
 * `withUserRefAware` in `store-wrap.ts`).
 */
export declare function attachTodoistLogoutCommand(auth: Command, store: TodoistTokenStore): Command;
//# sourceMappingURL=logout.d.ts.map