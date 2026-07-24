import { type WorkspaceUser } from '@doist/todoist-sdk';
import type { Workspace } from '../../lib/api/workspaces.js';
export declare const WORKSPACE_ROLES: readonly string[];
/**
 * Curated JSON shape for a workspace, matching the output of
 * `workspace view --json` / `workspace list --json`. Used by create/update
 * so scripts that round-trip through these commands see a consistent
 * contract regardless of which operation produced the payload.
 */
export declare function formatWorkspaceJson(workspace: Workspace, full: boolean): Workspace | Record<string, unknown>;
/**
 * Throws `NOT_ADMIN` if the current user is not an ADMIN of the workspace.
 * Safe to call before a `--dry-run` early return so non-admins fail loudly
 * even when previewing.
 */
export declare function assertWorkspaceAdmin(workspace: Workspace, action: string): void;
/**
 * Resolves a workspace user reference (id:xxx, raw id, email, or full name)
 * to a `WorkspaceUser` by paginating `getWorkspaceUsers` for the workspace.
 * Matches are: (1) exact id, (2) exact email (case-insensitive),
 * (3) exact fullName (case-insensitive), (4) substring in fullName or email.
 * Ambiguous fuzzy matches throw; exact matches always win.
 */
export declare function resolveWorkspaceUserRef(workspaceId: string, ref: string): Promise<WorkspaceUser>;
/**
 * Paginates `getWorkspaceUsers` and returns the first user matching
 * `predicate`, or `null` if none match. Stops as soon as a match is found.
 */
export declare function findUser(workspaceId: string, predicate: (user: WorkspaceUser) => boolean): Promise<WorkspaceUser | null>;
//# sourceMappingURL=helpers.d.ts.map