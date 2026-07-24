import type { Command } from 'commander';
import type { TodoistTokenStore } from '../../lib/auth-store.js';
/**
 * Attach `td accounts current` via cli-core's `attachAccountCurrentCommand`.
 *
 * A signed-in stored account resolves through `store.activeAccount()` and is
 * rendered by `renderText` / `renderJson`. The env-token and legacy
 * single-user sources live outside the store (so `activeAccount()` returns
 * `null` for them — env via the adapter's short-circuit, legacy because it has
 * no record), and are rendered in `onNotAuthenticated` via the read-side
 * resolver. The stored-case `--json` `source` is read off the account (the
 * adapter's `activeAccount` annotates `secure-store` vs `config-file`); the
 * env/legacy sources come from the fallback branch.
 */
export declare function attachTodoistUserCurrentCommand(parent: Command, store: TodoistTokenStore): Command;
//# sourceMappingURL=current.d.ts.map