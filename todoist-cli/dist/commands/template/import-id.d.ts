export interface ImportIdOptions {
    project?: string;
    templateId: string;
    locale?: string;
    json?: boolean;
    dryRun?: boolean;
}
export declare function importTemplateById(projectRef: string, options: ImportIdOptions): Promise<void>;
//# sourceMappingURL=import-id.d.ts.map