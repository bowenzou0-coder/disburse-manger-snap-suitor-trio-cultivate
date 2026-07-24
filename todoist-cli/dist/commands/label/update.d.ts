import type { ColorKey } from '@doist/todoist-sdk';
export interface UpdateLabelOptions {
    name?: string;
    color?: ColorKey;
    favorite?: boolean;
    json?: boolean;
    dryRun?: boolean;
}
export declare function updateLabel(nameOrId: string, options: UpdateLabelOptions): Promise<void>;
//# sourceMappingURL=update.d.ts.map