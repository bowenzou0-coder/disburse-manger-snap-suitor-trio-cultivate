import { type UpdateFilterArgs } from '../../lib/api/filters.js';
export interface CreateOptions {
    name: string;
    query: string;
    color?: UpdateFilterArgs['color'];
    favorite?: boolean;
    json?: boolean;
    dryRun?: boolean;
}
export declare function createFilter(options: CreateOptions): Promise<void>;
//# sourceMappingURL=create.d.ts.map