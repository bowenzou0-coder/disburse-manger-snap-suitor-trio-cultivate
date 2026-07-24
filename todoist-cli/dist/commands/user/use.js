import { attachAccountUseCommand } from '@doist/cli-core/auth';
/**
 * Attach `td accounts use <ref>` (alias `td accounts default <ref>`) via cli-core's
 * generic `attachAccountUseCommand`, which calls `store.setDefault(ref)` and
 * owns the success line / `--json` (`{ ok, default }`) / silent-`--ndjson`
 * output. `setDefault`'s `CliError('ACCOUNT_NOT_FOUND', …)` on a ref miss
 * propagates to the top-level handler unchanged.
 */
export function attachTodoistUserUseCommand(parent, store) {
    return attachAccountUseCommand(parent, {
        store,
        description: 'Set the default account used when --user is not provided',
    }).alias('default');
}
//# sourceMappingURL=use.js.map