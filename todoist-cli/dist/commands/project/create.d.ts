import type { ColorKey } from '@doist/todoist-sdk';
export interface CreateOptions {
    name: string;
    color?: ColorKey;
    favorite?: boolean;
    parent?: string;
    viewStyle?: string;
    description?: string;
    stdin?: boolean;
    json?: boolean;
    dryRun?: boolean;
}
export declare function createProject(options: CreateOptions): Promise<void>;
//# sourceMappingURL=create.d.ts.map