import type { PaginatedViewOptions } from '../../lib/options.js';
export interface ListLabelsOptions extends PaginatedViewOptions {
    search?: string;
}
export declare function listLabels(options: ListLabelsOptions): Promise<void>;
//# sourceMappingURL=list.d.ts.map