interface CreateFolderOptions {
    name: string;
    workspace?: string;
    defaultOrder?: number;
    childOrder?: number;
    json?: boolean;
    dryRun?: boolean;
}
export declare function createFolder(workspaceRef: string | undefined, options: CreateFolderOptions): Promise<void>;
export {};
//# sourceMappingURL=create.d.ts.map