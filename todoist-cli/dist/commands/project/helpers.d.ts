import { type PersonalProject, type ProjectViewStyle, type TodoistApi } from '@doist/todoist-sdk';
import type { Project } from '../../lib/api/core.js';
export declare const VIEW_STYLE_CHOICES: ProjectViewStyle[];
/**
 * Resolve a project reference for use as a parent. Rejects workspace projects
 * — only personal projects can have sub-projects.
 */
export declare function resolvePersonalParent(api: TodoistApi, parentRef: string): Promise<PersonalProject>;
/**
 * Load every personal project the user has access to (paginated). Used by
 * commands that need to traverse the project hierarchy in memory rather than
 * making N round trips.
 */
export declare function loadPersonalProjects(api: TodoistApi): Promise<PersonalProject[]>;
/**
 * Returns true if `candidateId` is a descendant of `ancestorId` within the
 * given project set. Walks the parent chain in memory; bails on cycles.
 */
export declare function isDescendantOf(projects: PersonalProject[], candidateId: string, ancestorId: string): boolean;
export declare function isPersonal(p: Project): p is PersonalProject;
/**
 * Resolve a project reference against an in-memory personal-project list,
 * avoiding extra round trips when the caller has already paginated the
 * full list (e.g. `project reorder`). Mirrors the matching rules of
 * `resolveProjectRef` (id prefix → exact name → substring name) but is
 * scoped to personal projects only.
 */
export declare function resolvePersonalFromList(projects: PersonalProject[], ref: string): PersonalProject;
//# sourceMappingURL=helpers.d.ts.map