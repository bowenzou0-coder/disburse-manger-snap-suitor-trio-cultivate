import { type ShareProjectArgs } from '@doist/todoist-sdk';
export declare function moveProjectParent(id: string, parentId: string | null): Promise<void>;
export declare function reorderProjects(items: Array<{
    id: string;
    childOrder: number;
}>): Promise<void>;
export declare function shareProject(args: ShareProjectArgs): Promise<void>;
//# sourceMappingURL=projects-sync.d.ts.map