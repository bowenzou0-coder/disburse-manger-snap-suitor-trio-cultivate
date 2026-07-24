import type { Command } from 'commander';
interface GoalsOptions {
    daily?: string;
    weekly?: string;
}
export declare function goalsCommand(options: GoalsOptions, command: Command): Promise<void>;
export {};
//# sourceMappingURL=goals.d.ts.map