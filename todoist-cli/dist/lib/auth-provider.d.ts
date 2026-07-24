import { type AuthProvider } from '@doist/cli-core/auth';
import { type TodoistAccount } from './auth-store.js';
/**
 * Build an `AuthProvider<TodoistAccount>` driven by cli-core's PKCE factory.
 *
 * The wrapper only overrides `validateToken` — `runOAuthFlow` automatically
 * folds the runtime `flags` and `readOnly` values into the handshake
 * between `authorize` and `exchangeCode`/`validateToken`, so we read them
 * back out here to assemble the `auth_mode` / `auth_scope` / `auth_flags`
 * triplet that todoist persists per account.
 *
 * The token-endpoint POST is routed through `fetchTodoist` so the usage-
 * tracking headers (User-Agent, Doist-OS, …) are included.
 */
export declare function createTodoistAuthProvider(): AuthProvider<TodoistAccount>;
//# sourceMappingURL=auth-provider.d.ts.map