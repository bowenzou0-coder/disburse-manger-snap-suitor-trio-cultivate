import { Command } from 'commander';
import type { PaginatedViewOptions } from '../lib/options.js';
interface TodayOptions extends PaginatedViewOptions {
    anyAssignee?: boolean;
    workspace?: string;
    personal?: boolean;
}
export declare function showToday(options: TodayOptions): Promise<void>;
export declare function registerTodayCommand(program: Command): void;
export {};
//# sourceMappingURL=today.d.ts.map