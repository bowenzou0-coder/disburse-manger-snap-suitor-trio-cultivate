import { createCommand } from '@doist/todoist-sdk';
import { getApi } from './core.js';
export async function moveProjectParent(id, parentId) {
    const api = await getApi();
    await api.sync({
        commands: [createCommand('project_move', { id, parentId })],
    });
}
export async function reorderProjects(items) {
    const api = await getApi();
    await api.sync({
        commands: [createCommand('project_reorder', { projects: items })],
    });
}
export async function shareProject(args) {
    const api = await getApi();
    await api.sync({
        commands: [createCommand('share_project', args)],
    });
}
//# sourceMappingURL=projects-sync.js.map