export type MoveOptions = {
    toWorkspace?: string;
    toPersonal?: boolean;
    folder?: string;
    visibility?: string;
    yes?: boolean;
    dryRun?: boolean;
};
export declare function moveProject(ref: string, options: MoveOptions): Promise<void>;
//# sourceMappingURL=move.d.ts.map