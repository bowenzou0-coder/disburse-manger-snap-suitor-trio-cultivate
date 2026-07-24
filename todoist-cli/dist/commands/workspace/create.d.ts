export interface CreateWorkspaceOptions {
    name?: string;
    description?: string;
    linkSharing?: boolean;
    guestAccess?: boolean;
    domain?: string;
    domainDiscovery?: boolean;
    restrictEmailDomains?: boolean;
    json?: boolean;
    full?: boolean;
    dryRun?: boolean;
}
export declare function createWorkspace(options: CreateWorkspaceOptions): Promise<void>;
//# sourceMappingURL=create.d.ts.map