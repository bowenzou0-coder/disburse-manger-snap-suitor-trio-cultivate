import { Command } from 'commander';
import type { PaginatedViewOptions } from '../lib/options.js';
interface UpcomingOptions extends PaginatedViewOptions {
    anyAssignee?: boolean;
    workspace?: string;
    personal?: boolean;
}
export declare function showUpcoming(daysArg: string | undefined, options: UpcomingOptions): Promise<void>;
export declare function registerUpcomingCommand(program: Command): void;
export {};
//# sourceMappingURL=upcoming.d.ts.map