import { type ColorKey, type Filter as SdkFilter } from '@doist/todoist-sdk';
export type Filter = SdkFilter;
export interface AddFilterArgs {
    name: string;
    query: string;
    color?: ColorKey;
    isFavorite?: boolean;
}
export declare function fetchFilters(): Promise<Filter[]>;
export declare function addFilter(args: AddFilterArgs): Promise<Filter>;
export interface UpdateFilterArgs {
    name?: string;
    query?: string;
    color?: ColorKey;
    isFavorite?: boolean;
}
export declare function updateFilter(id: string, args: UpdateFilterArgs): Promise<void>;
export declare function deleteFilter(id: string): Promise<void>;
//# sourceMappingURL=filters.d.ts.map