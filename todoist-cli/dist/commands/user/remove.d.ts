import type { Command } from 'commander';
import type { TodoistTokenStore } from '../../lib/auth-store.js';
/**
 * Attach `td accounts remove <ref>` via cli-core's `attachAccountRemoveCommand`.
 *
 * `store.clear(ref)` resolves the ref and deletes by the canonical `account.id`
 * in one token-free step (so a record whose secret is unreadable stays
 * removable), returning the removed account plus whether it was the default — a
 * miss surfaces as `ACCOUNT_NOT_FOUND`. The Todoist hook surfaces the
 * keyring-fallback warning that the `TokenStore.clear` contract can't carry.
 */
export declare function attachTodoistUserRemoveCommand(parent: Command, store: TodoistTokenStore): Command;
//# sourceMappingURL=remove.d.ts.map