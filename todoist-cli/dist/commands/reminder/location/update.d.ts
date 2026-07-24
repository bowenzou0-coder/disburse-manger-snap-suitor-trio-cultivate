interface UpdateOptions {
    name?: string;
    lat?: string;
    long?: string;
    trigger?: string;
    radius?: string;
    json?: boolean;
    dryRun?: boolean;
}
export declare function updateLocationReminderCmd(reminderId: string, options: UpdateOptions): Promise<void>;
export {};
//# sourceMappingURL=update.d.ts.map