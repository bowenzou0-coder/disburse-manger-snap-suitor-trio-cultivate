import { getApi } from '../../lib/api/core.js';
import { resolveProjectId, resolveTaskRef } from '../../lib/refs.js';
import { listTasksForProject } from '../../lib/task-list.js';
export async function listTasks(options) {
    const api = await getApi();
    let projectId = null;
    if (options.project) {
        projectId = await resolveProjectId(api, options.project);
    }
    let parentId;
    if (options.parent) {
        const parentTask = await resolveTaskRef(api, options.parent);
        parentId = parentTask.id;
        if (!projectId)
            projectId = parentTask.projectId;
    }
    await listTasksForProject(projectId, { ...options, parent: parentId });
}
//# sourceMappingURL=list.js.map