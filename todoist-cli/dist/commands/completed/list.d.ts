import type { PaginatedViewOptions } from '../../lib/options.js';
interface CompletedListOptions extends PaginatedViewOptions {
    since?: string;
    until?: string;
    project?: string;
    search?: string;
}
export declare function listCompleted(options: CompletedListOptions): Promise<void>;
export {};
//# sourceMappingURL=list.d.ts.map