import type { PaginatedViewOptions } from '../../lib/options.js';
type ListOptions = PaginatedViewOptions & {
    type?: string;
    unread?: boolean;
    read?: boolean;
    offset?: string;
};
export declare function listNotifications(options: ListOptions): Promise<void>;
export {};
//# sourceMappingURL=list.d.ts.map