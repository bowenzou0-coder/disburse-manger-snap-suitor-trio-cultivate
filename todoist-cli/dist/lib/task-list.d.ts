import { type Task, type TodoistApi } from '@doist/todoist-sdk';
import { type Project } from './api/core.js';
import type { PaginatedViewOptions } from './options.js';
export declare function fetchProjects(api: TodoistApi): Promise<Map<string, Project>>;
interface FilterByWorkspaceOrPersonalOptions {
    api: TodoistApi;
    tasks: Task[];
    workspace?: string;
    personal?: boolean;
    prefetchedProjects?: Map<string, Project>;
}
export declare function filterByWorkspaceOrPersonal({ api, tasks, workspace, personal, prefetchedProjects, }: FilterByWorkspaceOrPersonalOptions): Promise<{
    tasks: Task[];
    projects: Map<string, Project>;
}>;
export type TaskListOptions = PaginatedViewOptions & {
    priority?: string;
    due?: string;
    filter?: string;
    label?: string;
    parent?: string;
    assignee?: string;
    unassigned?: boolean;
    workspace?: string;
    personal?: boolean;
};
export declare const PRIORITY_CHOICES: string[];
export declare function parsePriority(p: string): number;
export declare function listTasksForProject(projectId: string | null, options: TaskListOptions): Promise<void>;
export {};
//# sourceMappingURL=task-list.d.ts.map