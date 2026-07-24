export interface PaginatedResult<T> {
    results: T[];
    nextCursor: string | null;
}
export interface PaginateOptions {
    limit: number;
    perPage?: number;
    startCursor?: string;
}
type FetchPage<T> = (cursor: string | null, limit: number) => Promise<{
    results: T[];
    nextCursor: string | null;
}>;
export declare function paginate<T>(fetchPage: FetchPage<T>, options: PaginateOptions): Promise<PaginatedResult<T>>;
export declare const LIMITS: {
    readonly tasks: 300;
    readonly projects: 50;
    readonly sections: 300;
    readonly labels: 300;
    readonly comments: 10;
};
export {};
//# sourceMappingURL=pagination.d.ts.map