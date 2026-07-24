interface UpdateOptions {
    before?: string;
    at?: string;
    urgent?: boolean;
    json?: boolean;
    dryRun?: boolean;
}
export declare function updateReminderCmd(reminderId: string, options: UpdateOptions): Promise<void>;
export {};
//# sourceMappingURL=update.d.ts.map