import type { PaginatedViewOptions } from '../../lib/options.js';
type ListOptions = PaginatedViewOptions & {
    personal?: boolean;
    search?: string;
};
export declare function listProjects(options: ListOptions): Promise<void>;
export {};
//# sourceMappingURL=list.d.ts.map