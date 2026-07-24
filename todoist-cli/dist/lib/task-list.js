import { isWorkspaceProject } from '@doist/todoist-sdk';
import chalk from 'chalk';
import { getApi } from './api/core.js';
import { CollaboratorCache, formatAssignee } from './collaborators.js';
import { CliError } from './errors.js';
import { formatNextCursorFooter, formatPaginatedJson, formatPaginatedNdjson, formatTaskRow, } from './output.js';
import { LIMITS, paginate } from './pagination.js';
import { resolveWorkspaceRef } from './refs.js';
export async function fetchProjects(api) {
    const { results: allProjects } = await api.getProjects();
    return new Map(allProjects.map((p) => [p.id, p]));
}
export async function filterByWorkspaceOrPersonal({ api, tasks, workspace, personal, prefetchedProjects, }) {
    if (workspace && personal) {
        throw new CliError('CONFLICTING_FILTERS', '--workspace and --personal are mutually exclusive.');
    }
    const projects = prefetchedProjects ?? (await fetchProjects(api));
    if (!workspace && !personal) {
        return { tasks, projects };
    }
    let filtered = tasks;
    if (workspace) {
        const ws = await resolveWorkspaceRef(workspace);
        filtered = tasks.filter((t) => {
            const project = projects.get(t.projectId);
            return project && isWorkspaceProject(project) && project.workspaceId === ws.id;
        });
    }
    else if (personal) {
        filtered = tasks.filter((t) => {
            const project = projects.get(t.projectId);
            return project && !isWorkspaceProject(project);
        });
    }
    return { tasks: filtered, projects };
}
/** CLI value → Todoist API priority (p1=urgent maps to API 4, p4=low maps to API 1) */
const PRIORITY_MAP = {
    p1: 4,
    p2: 3,
    p3: 2,
    p4: 1,
};
export const PRIORITY_CHOICES = Object.keys(PRIORITY_MAP);
export function parsePriority(p) {
    const result = PRIORITY_MAP[p.toLowerCase()];
    if (result !== undefined)
        return result;
    throw new CliError('INVALID_PRIORITY', `Invalid priority "${p}".`);
}
function buildFilterQuery(options) {
    const parts = [];
    if (options.label) {
        const labels = options.label.split(',').map((l) => l.trim());
        if (labels.length === 1) {
            parts.push(`@${labels[0]}`);
        }
        else {
            parts.push(`(${labels.map((l) => `@${l}`).join(' | ')})`);
        }
    }
    if (options.priority) {
        parsePriority(options.priority); // Validate format
        parts.push(options.priority);
    }
    if (options.due) {
        if (options.due === 'today') {
            parts.push('today');
        }
        else if (options.due === 'overdue') {
            parts.push('overdue');
        }
        else {
            parts.push(`${options.due}`);
        }
    }
    if (options.assignee) {
        if (options.assignee.toLowerCase() === 'me') {
            parts.push('assigned to: me');
        }
        else if (options.assignee.startsWith('id:')) {
            // ID-based assignee filters are done client-side, separately
        }
        else {
            // Email or name provided directly
            parts.push(`assigned to: ${options.assignee}`);
        }
    }
    if (options.unassigned) {
        parts.push('!assigned');
    }
    if (options.workspace) {
        parts.push(`workspace: ${options.workspace}`);
    }
    if (options.personal) {
        parts.push('workspace: personal');
    }
    return parts.length > 0 ? parts.join(' & ') : null;
}
async function formatGroupedTaskList({ tasks, project, sections, projects, collaboratorCache, raw = false, showUrl = false, }) {
    if (tasks.length === 0) {
        return 'No tasks found.';
    }
    const taskIds = new Set(tasks.map((t) => t.id));
    const childrenMap = new Map();
    for (const task of tasks) {
        if (task.parentId && taskIds.has(task.parentId)) {
            const children = childrenMap.get(task.parentId) || [];
            children.push(task);
            childrenMap.set(task.parentId, children);
        }
    }
    async function renderTask(task, indent) {
        const assignee = formatAssignee({
            userId: task.responsibleUid,
            projectId: task.projectId,
            projects,
            cache: collaboratorCache,
        });
        lines.push(await formatTaskRow({
            task,
            assignee: assignee ?? undefined,
            raw,
            indent,
            showUrl,
        }));
        lines.push('');
        const children = childrenMap.get(task.id) || [];
        for (const child of children) {
            await renderTask(child, indent + 1);
        }
    }
    const lines = [];
    const noSection = tasks.filter((t) => !t.sectionId);
    const bySectionId = new Map();
    for (const task of tasks) {
        if (task.sectionId) {
            const list = bySectionId.get(task.sectionId) || [];
            list.push(task);
            bySectionId.set(task.sectionId, list);
        }
    }
    lines.push(chalk.bold(`${project.name} (${tasks.length})`));
    lines.push('');
    if (noSection.length > 0) {
        lines.push(chalk.italic.dim(`(no section) (${noSection.length})`));
        const topLevel = noSection.filter((t) => !t.parentId || !taskIds.has(t.parentId));
        for (const task of topLevel) {
            await renderTask(task, 0);
        }
    }
    for (const section of sections) {
        const sectionTasks = bySectionId.get(section.id);
        if (sectionTasks && sectionTasks.length > 0) {
            lines.push(`${section.name} (${sectionTasks.length})`);
            const topLevel = sectionTasks.filter((t) => !t.parentId || !taskIds.has(t.parentId));
            for (const task of topLevel) {
                await renderTask(task, 0);
            }
        }
    }
    return lines.join('\n').trimEnd();
}
async function formatFlatTaskList({ tasks, projects, collaboratorCache, raw = false, showUrl = false, }) {
    if (tasks.length === 0) {
        return 'No tasks found.';
    }
    const blocks = await Promise.all(tasks.map((task) => {
        const projectName = projects.get(task.projectId)?.name;
        const assignee = formatAssignee({
            userId: task.responsibleUid,
            projectId: task.projectId,
            projects,
            cache: collaboratorCache,
        });
        return formatTaskRow({
            task,
            projectName,
            assignee: assignee ?? undefined,
            raw,
            showUrl,
        });
    }));
    return blocks.join('\n\n');
}
export async function listTasksForProject(projectId, options) {
    const api = await getApi();
    const targetLimit = options.all
        ? Number.MAX_SAFE_INTEGER
        : options.limit
            ? parseInt(options.limit, 10)
            : LIMITS.tasks;
    let tasks;
    let nextCursor;
    const builtFilter = buildFilterQuery(options);
    const filterQuery = options.filter
        ? builtFilter
            ? `(${options.filter}) & (${builtFilter})`
            : options.filter
        : builtFilter;
    if (filterQuery) {
        const result = await paginate((cursor, limit) => api.getTasksByFilter({
            query: filterQuery,
            cursor: cursor ?? undefined,
            limit,
        }), { limit: targetLimit, startCursor: options.cursor });
        tasks = result.results;
        nextCursor = result.nextCursor;
    }
    else {
        const scope = options.parent ? { parentId: options.parent } : projectId ? { projectId } : {};
        const result = await paginate((cursor, limit) => api.getTasks({ ...scope, cursor: cursor ?? undefined, limit }), { limit: targetLimit, startCursor: options.cursor });
        tasks = result.results;
        nextCursor = result.nextCursor;
    }
    let filtered = tasks;
    // getTasksByFilter doesn't support parentId or projectId scoping,
    // so apply client-side when using the filter query path
    if (options.parent) {
        filtered = filtered.filter((t) => t.parentId === options.parent);
    }
    if (projectId) {
        filtered = filtered.filter((t) => t.projectId === projectId);
    }
    // ID-based assignee filtering requires client-side filtering
    // (name/email-based assignee filtering is done server-side via filter query)
    if (options.assignee?.startsWith('id:')) {
        const assigneeId = options.assignee.slice(3);
        filtered = filtered.filter((t) => t.responsibleUid === assigneeId);
    }
    if (options.json) {
        console.log(formatPaginatedJson({ results: filtered, nextCursor }, 'task', options.full, options.showUrls));
        return;
    }
    if (options.ndjson) {
        console.log(formatPaginatedNdjson({ results: filtered, nextCursor }, 'task', options.full, options.showUrls));
        return;
    }
    const collaboratorCache = new CollaboratorCache();
    if (projectId) {
        // When listing tasks for a specific project, we only need that project's info
        const [projectRes, sectionsRes] = await Promise.all([
            api.getProject(projectId),
            api.getSections({ projectId }),
        ]);
        const projects = new Map([[projectRes.id, projectRes]]);
        await collaboratorCache.preload(api, filtered, projects);
        console.log(await formatGroupedTaskList({
            tasks: filtered,
            project: projectRes,
            sections: sectionsRes.results,
            projects,
            collaboratorCache,
            raw: options.raw,
            showUrl: options.showUrls,
        }));
    }
    else {
        // When listing tasks across all projects, we need all projects for formatting
        const { results: allProjects } = await api.getProjects();
        const projects = new Map(allProjects.map((p) => [p.id, p]));
        await collaboratorCache.preload(api, filtered, projects);
        console.log(await formatFlatTaskList({
            tasks: filtered,
            projects,
            collaboratorCache,
            raw: options.raw,
            showUrl: options.showUrls,
        }));
    }
    console.log(formatNextCursorFooter(nextCursor));
}
//# sourceMappingURL=task-list.js.map