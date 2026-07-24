import { type AppWithUserCount, TodoistApi } from '@doist/todoist-sdk';
import type { Project, Task } from './api/core.js';
import { type Workspace, type WorkspaceFolder } from './api/workspaces.js';
declare const URL_ENTITY_TYPES: readonly ["task", "project", "label", "filter"];
export type UrlEntityType = (typeof URL_ENTITY_TYPES)[number];
export interface ParsedTodoistUrl {
    entityType: UrlEntityType;
    id: string;
}
export declare function parseTodoistUrl(url: string): ParsedTodoistUrl | null;
declare const VIEW_TYPES: readonly ["today", "upcoming"];
type ViewType = (typeof VIEW_TYPES)[number];
export type TodoistRoute = {
    kind: 'entity';
    entityType: UrlEntityType;
    id: string;
} | {
    kind: 'view';
    view: ViewType;
};
export declare function classifyTodoistUrl(url: string): TodoistRoute | null;
export declare function isIdRef(ref: string): boolean;
export declare function extractId(ref: string): string;
export declare function looksLikeRawId(ref: string): boolean;
/**
 * Synchronous ID extraction — validates ref format and returns an ID string
 * without making any API calls. Use for entities where name matching isn't
 * feasible (e.g., comments, reminders) or when only the ID is needed.
 *
 * Returns a `string` ID, not the entity object (contrast with `resolveRef`
 * which returns the full entity `T`).
 *
 * Resolution order:
 *  1. `id:` prefix → extract and return the ID
 *  2. Todoist URL → validate entity type matches, return parsed ID
 *  3. `looksLikeRawId()` → return ref as-is
 *  4. Throw `INVALID_REF` with contextual hints
 *
 * Error hints include "paste a Todoist URL" only for entity types that have
 * web URLs (task, project, label, filter). Other entities (comment, section,
 * reminder) omit the URL hint.
 */
export declare function lenientIdRef(ref: string, entityName: string): string;
export declare function resolveFromList<T extends {
    id: string;
}>(ref: string, items: T[], getName: (item: T) => string, entityType: string, context?: string): T;
export declare function resolveTaskRef(api: TodoistApi, ref: string): Promise<Task>;
export declare function resolveProjectRef(api: TodoistApi, ref: string): Promise<Project>;
/**
 * App IDs are pure-numeric strings (the apps endpoint 400s on alphanumeric IDs
 * — unlike most entities, where IDs can mix letters and digits). So we can't
 * use the generic `resolveRef`'s `looksLikeRawId` fallback, which would
 * happily try `getApp('abc123')` and surface a confusing 400.
 *
 * Always returns `AppWithUserCount` — the only caller (`apps view`) wants the
 * detail record, and folding the guarantee in here avoids a redundant fetch
 * on the id and raw-numeric paths (which already return the detail shape).
 *
 * Resolution order:
 *  1. `id:N` prefix → `getApp(N)` directly
 *  2. Pure-numeric ref → `getApp(ref)` directly (skip the listing roundtrip)
 *  3. Otherwise → `getApps()` then exact / substring match on `displayName`
 *     via the in-memory `resolveFromList`, then `getApp(matchedId)` to
 *     enrich with `userCount`
 */
export declare function resolveAppRef(api: TodoistApi, ref: string): Promise<AppWithUserCount>;
export declare function resolveProjectId(api: TodoistApi, ref: string): Promise<string>;
export declare function resolveSectionId(api: TodoistApi, ref: string, projectId: string): Promise<string>;
export declare function resolveParentTaskId(api: TodoistApi, ref: string, projectId: string, sectionId?: string): Promise<string>;
/**
 * Resolve a workspace ref, falling back to the default configured via
 * `td workspace use` when the caller doesn't pass one. Throws
 * WORKSPACE_REQUIRED with actionable hints if neither is available.
 */
export declare function resolveWorkspaceRef(ref?: string): Promise<Workspace>;
/**
 * Return the stored default workspace as a ref string (`id:xxx`) if one is
 * configured, else undefined. Shared by callers that need to distinguish
 * "default available" from "no default" instead of letting
 * `resolveWorkspaceRef` throw — e.g. folder commands with their own
 * single-workspace fallback.
 */
export declare function readDefaultWorkspaceRef(): Promise<string | undefined>;
export declare function resolveFolderRef(ref: string, workspaceId: string): Promise<WorkspaceFolder>;
export {};
//# sourceMappingURL=refs.d.ts.map