export interface MoveOptions {
    project?: string;
    section?: string | false;
    parent?: string | false;
    dryRun?: boolean;
}
export declare function moveTask(ref: string, options: MoveOptions): Promise<void>;
//# sourceMappingURL=move.d.ts.map