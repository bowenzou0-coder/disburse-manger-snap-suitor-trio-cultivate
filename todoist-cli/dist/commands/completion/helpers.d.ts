import type { SupportedShell } from '@pnpm/tabtab';
export declare const COMPLETION_EXTENSIONS: Record<SupportedShell, string>;
/**
 * Find which shells have td completions installed by checking for the
 * completion script files that tabtab creates.
 *
 * FIXME: Workaround for https://github.com/pnpm/tabtab/issues/34 —
 * tabtab.uninstall() without a shell tries all shells and throws ENOENT
 * for ones that were never installed. We detect which shells are actually
 * installed and uninstall only those. Remove once the upstream issue is fixed.
 */
export declare function installedShells(): SupportedShell[];
//# sourceMappingURL=helpers.d.ts.map