export interface ImportFileOptions {
    project?: string;
    file: string;
    fileName?: string;
    json?: boolean;
    dryRun?: boolean;
}
export declare function importTemplateFile(projectRef: string, options: ImportFileOptions): Promise<void>;
//# sourceMappingURL=import-file.d.ts.map