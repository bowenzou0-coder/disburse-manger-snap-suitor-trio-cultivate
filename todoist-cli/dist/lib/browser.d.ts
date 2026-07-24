type OpenInBrowserOptions = {
    /**
     * Print an `Opening <url>` line before launching. Default `true`. Callers
     * that already surface the URL themselves (e.g. `auth login`, where
     * cli-core prints the authorize URL) pass `false` to avoid a duplicate.
     */
    announce?: boolean;
};
export declare function openInBrowser(url: string, { announce }?: OpenInBrowserOptions): Promise<void>;
export {};
//# sourceMappingURL=browser.d.ts.map