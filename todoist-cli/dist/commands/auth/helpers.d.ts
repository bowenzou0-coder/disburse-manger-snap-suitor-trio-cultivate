import type { TokenStorageResult } from '../../lib/auth.js';
export declare function promptHiddenInput(prompt: string): Promise<string>;
/**
 * Surface a `TokenStorageResult` from a save/clear operation: the
 * human-readable confirmation goes to stdout, any keyring-fallback warning
 * goes to stderr. Pass `isMachineOutput: true` when the command is in
 * `--json` / `--ndjson` mode so the stdout confirmation is suppressed and
 * the warning still reaches the operator on stderr.
 */
export declare function logTokenStorageResult(result: TokenStorageResult, secureStoreMessage: string, isMachineOutput?: boolean): void;
//# sourceMappingURL=helpers.d.ts.map