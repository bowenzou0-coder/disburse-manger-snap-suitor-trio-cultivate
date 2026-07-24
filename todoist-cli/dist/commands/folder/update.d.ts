interface UpdateFolderOptions {
    name?: string;
    defaultOrder?: number;
    workspace?: string;
    json?: boolean;
    dryRun?: boolean;
}
export declare function updateFolder(ref: string, options: UpdateFolderOptions): Promise<void>;
export {};
//# sourceMappingURL=update.d.ts.map