import type { Command } from 'commander';
import type { TodoistTokenStore } from '../../lib/auth-store.js';
/**
 * Attach `td auth login` via cli-core's generic `attachLoginCommand`. The
 * registrar wires `--read-only`, `--callback-port`, `--json`, `--ndjson` and
 * drives `runOAuthFlow`; the bits below stay todoist-local: scope resolution
 * (comma-joined, custom validators), branded HTML, multi-user store via
 * `createTodoistTokenStore`, and the human-mode success line.
 *
 * `--additional-scopes` is attached after the registrar so the option lands on
 * the same Commander view; cli-core surfaces it through the `flags` argument
 * to `resolveScopes`.
 */
export declare function attachTodoistLoginCommand(auth: Command, store: TodoistTokenStore): Command;
//# sourceMappingURL=login.d.ts.map