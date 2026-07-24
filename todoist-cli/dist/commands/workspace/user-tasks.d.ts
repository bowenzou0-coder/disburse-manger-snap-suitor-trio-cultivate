export interface WorkspaceUserTasksOptions {
    user?: string;
    projectIds?: string;
    json?: boolean;
    ndjson?: boolean;
    full?: boolean;
}
export declare function listWorkspaceUserTasks(ref: string | undefined, options: WorkspaceUserTasksOptions): Promise<void>;
//# sourceMappingURL=user-tasks.d.ts.map