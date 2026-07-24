interface AddOptions {
    content?: string;
    stdin?: boolean;
    file?: string;
    fileName?: string;
    project?: boolean;
    json?: boolean;
    dryRun?: boolean;
}
export declare function addComment(ref: string, options: AddOptions): Promise<void>;
export {};
//# sourceMappingURL=add.d.ts.map