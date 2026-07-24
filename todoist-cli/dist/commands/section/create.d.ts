interface CreateOptions {
    name: string;
    project: string;
    description?: string;
    stdin?: boolean;
    json?: boolean;
    dryRun?: boolean;
}
export declare function createSection(options: CreateOptions): Promise<void>;
export {};
//# sourceMappingURL=create.d.ts.map