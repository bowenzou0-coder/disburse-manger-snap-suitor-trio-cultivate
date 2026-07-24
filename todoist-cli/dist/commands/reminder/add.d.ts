interface AddOptions {
    before?: string;
    at?: string;
    urgent?: boolean;
    json?: boolean;
    dryRun?: boolean;
}
export declare function addReminder(taskRef: string, options: AddOptions): Promise<void>;
export {};
//# sourceMappingURL=add.d.ts.map