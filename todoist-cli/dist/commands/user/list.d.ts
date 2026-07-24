import type { Command } from 'commander';
import type { TodoistTokenStore } from '../../lib/auth-store.js';
/**
 * Attach `td accounts list` via cli-core's generic `attachAccountListCommand`,
 * which reads `store.list()` and owns the `{ accounts, default }` machine
 * envelope. The Todoist overrides keep human output identical to the
 * hand-rolled version (`<email> (id:<id>)` + a default marker that respects
 * `--accessible`) and flatten each machine entry via `projectAccount`.
 *
 * `isDefault` now reflects the store's *effective* default (a lone account
 * counts as default even with no pinned `defaultUser`), matching what
 * `active()` would resolve.
 */
export declare function attachTodoistUserListCommand(parent: Command, store: TodoistTokenStore): Command;
//# sourceMappingURL=list.d.ts.map