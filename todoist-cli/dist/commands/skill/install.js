import chalk from 'chalk';
import { CliError } from '../../lib/errors.js';
import { getInstaller, listAgents } from '../../lib/skills/index.js';
export async function installSkill(agent, options) {
    const installer = getInstaller(agent);
    if (!installer) {
        const available = listAgents().join(', ');
        throw new CliError('UNKNOWN_AGENT', `Unknown agent: ${agent}`, [
            `Available agents: ${available}`,
        ]);
    }
    const local = options.local ?? false;
    const force = options.force ?? false;
    await installer.install(local, force);
    const filepath = installer.getInstallPath(local);
    console.log(chalk.green('✓'), `Installed ${installer.name} skill`);
    console.log(chalk.dim(filepath));
}
//# sourceMappingURL=install.js.map