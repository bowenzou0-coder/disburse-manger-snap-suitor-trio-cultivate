export type ReorderSectionOptions = {
    section?: string;
    project?: string;
    before?: string;
    after?: string;
    position?: number;
    json?: boolean;
    dryRun?: boolean;
};
export declare function reorderSection(ref: string, options: ReorderSectionOptions): Promise<void>;
//# sourceMappingURL=reorder.d.ts.map