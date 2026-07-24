interface UpdateOptions {
    name?: string;
    description?: string;
    stdin?: boolean;
    json?: boolean;
    dryRun?: boolean;
}
export declare function updateSection(sectionId: string, options: UpdateOptions): Promise<void>;
export {};
//# sourceMappingURL=update.d.ts.map