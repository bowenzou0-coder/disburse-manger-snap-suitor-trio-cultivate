import type { ColorKey } from '@doist/todoist-sdk';
export interface CreateOptions {
    name: string;
    color?: ColorKey;
    favorite?: boolean;
    json?: boolean;
    dryRun?: boolean;
}
export declare function createLabel(options: CreateOptions): Promise<void>;
//# sourceMappingURL=create.d.ts.map