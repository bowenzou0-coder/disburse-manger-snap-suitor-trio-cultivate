export interface AddOptions {
    content: string;
    due?: string;
    deadline?: string;
    priority?: string;
    project?: string;
    section?: string;
    labels?: string;
    parent?: string;
    description?: string;
    stdin?: boolean;
    assignee?: string;
    duration?: string;
    uncompletable?: boolean;
    order?: number;
    json?: boolean;
    dryRun?: boolean;
}
export declare function addTask(options: AddOptions): Promise<void>;
//# sourceMappingURL=add.d.ts.map