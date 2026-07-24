interface AddOptions {
    name?: string;
    lat?: string;
    long?: string;
    trigger?: string;
    radius?: string;
    json?: boolean;
    dryRun?: boolean;
}
export declare function addLocationReminderCmd(taskRef: string, options: AddOptions): Promise<void>;
export {};
//# sourceMappingURL=add.d.ts.map