export interface UpdateOptions {
    content?: string;
    due?: string | false;
    deadline?: string | false;
    priority?: string;
    labels?: string | false;
    description?: string;
    stdin?: boolean;
    assignee?: string;
    unassign?: boolean;
    duration?: string;
    uncompletable?: boolean;
    completable?: boolean;
    order?: number;
    json?: boolean;
    dryRun?: boolean;
}
export declare function updateTask(ref: string, options: UpdateOptions): Promise<void>;
//# sourceMappingURL=update.d.ts.map