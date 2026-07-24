export async function installAction(shell) {
    const tabtab = await import('@pnpm/tabtab');
    if (shell && !tabtab.isShellSupported(shell)) {
        console.error(`Unsupported shell: ${shell}. Supported: ${tabtab.SUPPORTED_SHELLS.join(', ')}`);
        process.exitCode = 1;
        return;
    }
    await tabtab.install({
        name: 'td',
        completer: 'td',
        shell: shell,
    });
    console.log('Shell completions installed successfully.');
    console.log('Restart your shell or source your shell config to activate.');
}
//# sourceMappingURL=install.js.map