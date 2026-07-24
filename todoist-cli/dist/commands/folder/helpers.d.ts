import type { Folder } from '@doist/todoist-sdk';
import { type Workspace } from '../../lib/api/workspaces.js';
export declare function resolveWorkspaceForFolder(options: {
    workspace?: string;
}): Promise<Workspace>;
export declare function resolveFolderByRef(ref: string, options: {
    workspace?: string;
}): Promise<Folder>;
//# sourceMappingURL=helpers.d.ts.map