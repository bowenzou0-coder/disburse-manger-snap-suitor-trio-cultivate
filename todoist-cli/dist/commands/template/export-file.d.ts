export interface ExportFileOptions {
    project?: string;
    relativeDates?: boolean;
    output?: string;
    json?: boolean;
}
export declare function exportTemplateFile(projectRef: string, options: ExportFileOptions): Promise<void>;
//# sourceMappingURL=export-file.d.ts.map