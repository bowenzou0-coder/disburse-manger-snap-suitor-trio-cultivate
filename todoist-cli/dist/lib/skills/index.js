import { createInstaller } from './create-installer.js';
export const skillInstallers = {
    'claude-code': createInstaller({
        name: 'claude-code',
        description: 'Claude Code skill for Todoist CLI',
        dirName: '.claude',
    }),
    codex: createInstaller({
        name: 'codex',
        description: 'Codex skill for Todoist CLI',
        dirName: '.codex',
    }),
    copilot: createInstaller({
        name: 'copilot',
        description: 'GitHub Copilot skill for Todoist CLI',
        dirName: '.copilot',
    }),
    cursor: createInstaller({
        name: 'cursor',
        description: 'Cursor skill for Todoist CLI',
        dirName: '.cursor',
    }),
    gemini: createInstaller({
        name: 'gemini',
        description: 'Gemini CLI skill for Todoist CLI',
        dirName: '.gemini',
    }),
    pi: createInstaller({
        name: 'pi',
        description: 'Pi skill for Todoist CLI',
        dirName: '.pi',
        globalDirName: '.pi/agent',
    }),
    universal: createInstaller({
        name: 'universal',
        description: 'Universal agent skill for Todoist CLI',
        dirName: '.agents',
    }),
};
export function getInstaller(agent) {
    return skillInstallers[agent];
}
export function listAgents() {
    return Object.keys(skillInstallers);
}
//# sourceMappingURL=index.js.map