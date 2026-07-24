export interface Workspace {
    id: string;
    name: string;
    role: 'ADMIN' | 'MEMBER' | 'GUEST' | null;
    plan: string;
    domainName: string | null;
    currentMemberCount: number;
    currentActiveProjects: number;
    memberCountByType: {
        adminCount: number;
        memberCount: number;
        guestCount: number;
    };
}
export interface WorkspaceFolder {
    id: string;
    name: string;
    workspaceId: string;
}
export declare function fetchWorkspaces(): Promise<Workspace[]>;
export declare function fetchWorkspaceFolders(): Promise<WorkspaceFolder[]>;
export declare function clearWorkspaceCache(): void;
//# sourceMappingURL=workspaces.d.ts.map