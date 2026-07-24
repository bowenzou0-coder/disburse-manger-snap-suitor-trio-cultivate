import { type ColorKey } from '@doist/todoist-sdk';
export interface UpdateOptions {
    name?: string;
    color?: ColorKey;
    favorite?: boolean;
    folder?: string | false;
    parent?: string | false;
    viewStyle?: string;
    description?: string;
    stdin?: boolean;
    json?: boolean;
    dryRun?: boolean;
}
export declare function updateProject(ref: string, options: UpdateOptions): Promise<void>;
//# sourceMappingURL=update.d.ts.map