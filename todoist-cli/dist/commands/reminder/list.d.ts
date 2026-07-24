import type { PaginatedViewOptions } from '../../lib/options.js';
import { type ReminderTypeFilter } from './helpers.js';
interface ListOptions extends PaginatedViewOptions {
    task?: string;
    type?: ReminderTypeFilter;
}
export declare function listReminders(taskRef: string | undefined, options: ListOptions): Promise<void>;
export {};
//# sourceMappingURL=list.d.ts.map