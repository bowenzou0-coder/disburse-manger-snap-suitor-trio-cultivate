import { isWorkspaceProject } from '@doist/todoist-sdk';
import { getCurrentUserId } from './api/core.js';
import { CliError } from './errors.js';
import { extractId, isIdRef } from './refs.js';
export class CollaboratorCache {
    workspaceUsers = new Map();
    projectCollaborators = new Map();
    async preload(api, tasks, projects) {
        const projectsWithAssignees = new Set();
        for (const task of tasks) {
            if (task.responsibleUid) {
                projectsWithAssignees.add(task.projectId);
            }
        }
        if (projectsWithAssignees.size === 0)
            return;
        const workspaceIds = new Set();
        const sharedPersonalProjectIds = [];
        for (const projectId of projectsWithAssignees) {
            const project = projects.get(projectId);
            if (!project)
                continue;
            if (isWorkspaceProject(project)) {
                workspaceIds.add(project.workspaceId);
            }
            else if (project.isShared) {
                sharedPersonalProjectIds.push(projectId);
            }
        }
        const fetches = [];
        for (const workspaceId of workspaceIds) {
            if (!this.workspaceUsers.has(workspaceId)) {
                fetches.push(this.fetchWorkspaceUsers(api, workspaceId));
            }
        }
        for (const projectId of sharedPersonalProjectIds) {
            if (!this.projectCollaborators.has(projectId)) {
                fetches.push(this.fetchProjectCollaborators(api, projectId));
            }
        }
        await Promise.all(fetches);
    }
    async fetchWorkspaceUsers(api, workspaceId) {
        const userMap = new Map();
        let cursor;
        while (true) {
            const response = await api.getWorkspaceUsers({
                workspaceId,
                cursor,
                limit: 200,
            });
            for (const user of response.workspaceUsers) {
                userMap.set(user.userId, {
                    id: user.userId,
                    name: user.fullName,
                    email: user.userEmail,
                });
            }
            if (!response.hasMore || !response.nextCursor)
                break;
            cursor = response.nextCursor;
        }
        this.workspaceUsers.set(workspaceId, userMap);
    }
    async fetchProjectCollaborators(api, projectId) {
        const userMap = new Map();
        let cursor;
        while (true) {
            const response = await api.getProjectCollaborators(projectId, { cursor });
            for (const user of response.results) {
                userMap.set(user.id, {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                });
            }
            if (!response.nextCursor)
                break;
            cursor = response.nextCursor;
        }
        this.projectCollaborators.set(projectId, userMap);
    }
    getUserName({ userId, projectId, projects, }) {
        const project = projects.get(projectId);
        if (!project)
            return null;
        if (isWorkspaceProject(project)) {
            const workspaceMap = this.workspaceUsers.get(project.workspaceId);
            const user = workspaceMap?.get(userId);
            return user?.name ?? null;
        }
        const projectMap = this.projectCollaborators.get(projectId);
        const user = projectMap?.get(userId);
        return user?.name ?? null;
    }
}
export function formatUserShortName(fullName) {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) {
        return parts[0];
    }
    const firstName = parts[0];
    const lastInitial = parts[parts.length - 1][0];
    return `${firstName} ${lastInitial}.`;
}
export function formatAssignee({ userId, projectId, projects, cache, }) {
    if (!userId)
        return null;
    const name = cache.getUserName({ userId, projectId, projects });
    if (name) {
        return formatUserShortName(name);
    }
    return userId;
}
async function fetchCollaboratorsForProject(api, project) {
    if (isWorkspaceProject(project)) {
        const users = [];
        let cursor;
        while (true) {
            const response = await api.getWorkspaceUsers({
                workspaceId: project.workspaceId,
                cursor,
                limit: 200,
            });
            for (const user of response.workspaceUsers) {
                users.push({
                    id: user.userId,
                    name: user.fullName,
                    email: user.userEmail,
                });
            }
            if (!response.hasMore || !response.nextCursor)
                break;
            cursor = response.nextCursor;
        }
        return users;
    }
    if (project.isShared) {
        const users = [];
        let cursor;
        while (true) {
            const response = await api.getProjectCollaborators(project.id, {
                cursor,
            });
            for (const user of response.results) {
                users.push({
                    id: user.id,
                    name: user.name,
                    email: user.email,
                });
            }
            if (!response.nextCursor)
                break;
            cursor = response.nextCursor;
        }
        return users;
    }
    throw new CliError('NOT_SHARED', 'Cannot assign tasks in non-shared projects.');
}
export async function resolveAssigneeId(api, ref, project) {
    if (ref.toLowerCase() === 'me') {
        return getCurrentUserId();
    }
    if (isIdRef(ref)) {
        return extractId(ref);
    }
    const collaborators = await fetchCollaboratorsForProject(api, project);
    const lower = ref.toLowerCase();
    const exactName = collaborators.find((c) => c.name.toLowerCase() === lower);
    if (exactName)
        return exactName.id;
    const exactEmail = collaborators.find((c) => c.email.toLowerCase() === lower);
    if (exactEmail)
        return exactEmail.id;
    const partialName = collaborators.filter((c) => c.name.toLowerCase().includes(lower));
    if (partialName.length === 1)
        return partialName[0].id;
    if (partialName.length > 1) {
        throw new CliError('AMBIGUOUS_ASSIGNEE', `Multiple users match "${ref}":`, partialName.slice(0, 5).map((c) => `"${c.name}" (id:${c.id})`));
    }
    throw new CliError('ASSIGNEE_NOT_FOUND', `User "${ref}" not found.`);
}
//# sourceMappingURL=collaborators.js.map