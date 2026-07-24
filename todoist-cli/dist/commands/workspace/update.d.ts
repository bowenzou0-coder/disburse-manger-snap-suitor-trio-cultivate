export interface UpdateWorkspaceOptions {
    name?: string;
    description?: string;
    linkSharing?: boolean;
    guestAccess?: boolean;
    domain?: string;
    domainDiscovery?: boolean;
    restrictEmailDomains?: boolean;
    collapsed?: boolean;
    json?: boolean;
    full?: boolean;
    dryRun?: boolean;
}
export declare function updateWorkspaceCommand(ref: string | undefined, options: UpdateWorkspaceOptions): Promise<void>;
//# sourceMappingURL=update.d.ts.map