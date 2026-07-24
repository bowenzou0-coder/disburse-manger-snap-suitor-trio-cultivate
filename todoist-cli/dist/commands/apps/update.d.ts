export interface UpdateAppOptions {
    name?: string;
    description?: string;
    addOauthRedirect?: string;
    removeOauthRedirect?: string;
    setWebhookUrl?: string;
    yes?: boolean;
    dryRun?: boolean;
    json?: boolean;
}
export declare function updateApp(ref: string, options: UpdateAppOptions): Promise<void>;
//# sourceMappingURL=update.d.ts.map