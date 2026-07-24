export interface CreateFromTemplateOptions {
    name: string;
    file: string;
    fileName?: string;
    workspace?: string;
    json?: boolean;
    dryRun?: boolean;
}
export declare function createFromTemplate(options: CreateFromTemplateOptions): Promise<void>;
//# sourceMappingURL=create.d.ts.map