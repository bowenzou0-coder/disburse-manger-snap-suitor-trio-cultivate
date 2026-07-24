import { skillInstallers } from './index.js';
export async function updateAllInstalledSkills(local) {
    const updated = [];
    const skipped = [];
    const errors = [];
    for (const [name, installer] of Object.entries(skillInstallers)) {
        try {
            const isInstalled = await installer.isInstalled(local);
            if (isInstalled) {
                await installer.update(local);
                updated.push(name);
            }
            else {
                skipped.push(name);
            }
        }
        catch {
            errors.push(name);
        }
    }
    return { updated, skipped, errors };
}
//# sourceMappingURL=update-installed.js.map