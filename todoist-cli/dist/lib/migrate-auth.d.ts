/**
 * One-time migration of v1 single-user auth state into the v2 multi-user
 * shape. Delegates to `@doist/cli-core/auth`'s generic `migrateLegacyAuth`,
 * supplying only the todoist-specific bits: the durable migration marker
 * (`config_version === CONFIG_VERSION`), how to read the v1 plaintext token,
 * how to identify the user behind a v1 token, and how to clean up the
 * top-level legacy fields after a successful migration.
 *
 * Invoked from `src/postinstall.ts`. Best-effort: any failure leaves v1 state
 * untouched so `resolveActiveUser`'s legacy fallback keeps serving the token
 * until the next attempt.
 */
export interface MigrateAuthResult {
    status: 'already-migrated' | 'no-legacy-state' | 'migrated' | 'skipped';
    reason?: string;
    migratedUserId?: string;
    migratedEmail?: string;
}
interface MigrateOptions {
    /** Suppress console output. Postinstall sets this; CLI surfaces use it via warn(). */
    silent?: boolean;
    /** Override fetch (for tests). */
    fetchImpl?: typeof fetch;
}
export declare function migrateLegacyAuth(opts?: MigrateOptions): Promise<MigrateAuthResult>;
export {};
//# sourceMappingURL=migrate-auth.d.ts.map