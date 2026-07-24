import { installedShells } from './helpers.js';
export async function uninstallAction() {
    // FIXME: Replace with plain tabtab.uninstall({ name: 'td' }) once
    // https://github.com/pnpm/tabtab/issues/34 is fixed.
    const shells = installedShells();
    if (shells.length === 0) {
        console.log('No shell completions installed.');
        return;
    }
    const tabtab = await import('@pnpm/tabtab');
    for (const shell of shells) {
        await tabtab.uninstall({
            name: 'td',
            shell,
        });
    }
    console.log('Shell completions removed.');
}
//# sourceMappingURL=uninstall.js.map