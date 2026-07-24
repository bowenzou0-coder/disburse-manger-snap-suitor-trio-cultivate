import { type TodoistApi } from '@doist/todoist-sdk';
import { type Project, type Task } from './api/core.js';
export interface CollaboratorInfo {
    id: string;
    name: string;
    email: string;
}
export declare class CollaboratorCache {
    private workspaceUsers;
    private projectCollaborators;
    preload(api: TodoistApi, tasks: Task[], projects: Map<string, Project>): Promise<void>;
    private fetchWorkspaceUsers;
    private fetchProjectCollaborators;
    getUserName({ userId, projectId, projects, }: {
        userId: string;
        projectId: string;
        projects: Map<string, Project>;
    }): string | null;
}
export declare function formatUserShortName(fullName: string): string;
export interface FormatAssigneeOptions {
    userId: string | null;
    projectId: string;
    projects: Map<string, Project>;
    cache: CollaboratorCache;
}
export declare function formatAssignee({ userId, projectId, projects, cache, }: FormatAssigneeOptions): string | null;
export declare function resolveAssigneeId(api: TodoistApi, ref: string, project: Project): Promise<string>;
//# sourceMappingURL=collaborators.d.ts.map