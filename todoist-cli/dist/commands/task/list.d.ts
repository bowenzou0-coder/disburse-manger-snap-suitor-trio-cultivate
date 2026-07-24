import { type TaskListOptions } from '../../lib/task-list.js';
export type ListOptions = TaskListOptions & {
    project?: string;
};
export declare function listTasks(options: ListOptions): Promise<void>;
//# sourceMappingURL=list.d.ts.map