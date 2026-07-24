import { type UpdateFilterArgs } from '../../lib/api/filters.js';
export interface UpdateOptions {
    name?: string;
    query?: string;
    color?: UpdateFilterArgs['color'];
    favorite?: boolean;
    dryRun?: boolean;
}
export declare function updateFilterCmd(nameOrId: string, options: UpdateOptions): Promise<void>;
//# sourceMappingURL=update.d.ts.map