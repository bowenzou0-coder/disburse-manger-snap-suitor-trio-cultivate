export interface WorkspaceActivityOptions {
    userIds?: string;
    projectIds?: string;
    json?: boolean;
    ndjson?: boolean;
    full?: boolean;
}
export declare function showWorkspaceActivity(ref: string | undefined, options: WorkspaceActivityOptions): Promise<void>;
//# sourceMappingURL=activity.d.ts.map