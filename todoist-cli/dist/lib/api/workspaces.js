import { getApi } from './core.js';
let workspaceCache = null;
let folderCache = null;
function toWorkspace(w) {
    const raw = w;
    const memberCounts = raw.member_count_by_type;
    return {
        id: String(w.id),
        name: w.name,
        role: w.role ?? null,
        plan: w.plan,
        domainName: w.domainName ?? null,
        currentMemberCount: w.currentMemberCount ?? 0,
        currentActiveProjects: w.currentActiveProjects ?? 0,
        memberCountByType: {
            adminCount: memberCounts?.admin_count ?? 0,
            memberCount: memberCounts?.member_count ?? 0,
            guestCount: memberCounts?.guest_count ?? 0,
        },
    };
}
function toFolder(f) {
    return {
        id: String(f.id),
        name: f.name,
        workspaceId: f.workspaceId,
    };
}
async function fetchWorkspaceData() {
    if (workspaceCache !== null && folderCache !== null) {
        return { workspaces: workspaceCache, folders: folderCache };
    }
    const api = await getApi();
    const response = await api.sync({
        resourceTypes: ['workspaces', 'folders'],
        syncToken: '*',
    });
    const workspaces = (response.workspaces ?? []).map(toWorkspace);
    const folders = (response.folders ?? []).map(toFolder);
    workspaceCache = workspaces;
    folderCache = folders;
    return { workspaces, folders };
}
export async function fetchWorkspaces() {
    const { workspaces } = await fetchWorkspaceData();
    return workspaces;
}
export async function fetchWorkspaceFolders() {
    try {
        const { folders } = await fetchWorkspaceData();
        return folders;
    }
    catch {
        return [];
    }
}
export function clearWorkspaceCache() {
    workspaceCache = null;
    folderCache = null;
}
//# sourceMappingURL=workspaces.js.map