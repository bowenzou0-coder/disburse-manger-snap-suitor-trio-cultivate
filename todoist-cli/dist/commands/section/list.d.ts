import type { PaginatedViewOptions } from '../../lib/options.js';
type ListSectionOptions = PaginatedViewOptions & {
    project?: string;
    search?: string;
};
export declare function listSections(projectRef: string | undefined, options: ListSectionOptions): Promise<void>;
export {};
//# sourceMappingURL=list.d.ts.map