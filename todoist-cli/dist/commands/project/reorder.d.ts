export type ReorderOptions = {
    before?: string;
    after?: string;
    position?: number;
    json?: boolean;
    dryRun?: boolean;
};
export declare function reorderProject(ref: string, options: ReorderOptions): Promise<void>;
//# sourceMappingURL=reorder.d.ts.map