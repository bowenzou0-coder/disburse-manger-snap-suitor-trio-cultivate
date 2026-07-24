import type { PaginatedViewOptions } from '../../lib/options.js';
type ListOptions = PaginatedViewOptions & {
    lines?: string;
    project?: boolean;
};
export declare function listComments(ref: string, options: ListOptions): Promise<void>;
export {};
//# sourceMappingURL=list.d.ts.map