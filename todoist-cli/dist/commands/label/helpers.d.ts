import type { Label } from '@doist/todoist-sdk';
export declare function resolveSharedLabelName(nameArg: string): Promise<string>;
export declare function resolveLabelRef(nameOrId: string): Promise<Label>;
export interface ResolvedLabelForView {
    name: string;
    label: Label | null;
}
export declare function resolveLabelNameForView(nameOrId: string): Promise<ResolvedLabelForView>;
//# sourceMappingURL=helpers.d.ts.map