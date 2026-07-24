export type ProjectShareOptions = {
    role?: string;
    message?: string;
    autoInvite?: boolean;
    json?: boolean;
    dryRun?: boolean;
};
export declare function shareProject(ref: string, email: string, options?: ProjectShareOptions): Promise<void>;
//# sourceMappingURL=share.d.ts.map