import { type ProductivityStats } from '@doist/todoist-sdk';
type Streak = ProductivityStats['goals']['currentDailyStreak'];
export declare function formatTrend(trend: string): string;
export declare function formatStreak(current: Streak, max: Streak): string;
export declare function formatGoalProgress(completed: number, goal: number, label: string): string;
export declare function getTodayCompleted(stats: ProductivityStats): number;
export declare function getThisWeekCompleted(stats: ProductivityStats): number;
export declare function formatStatsView(stats: ProductivityStats): string;
export declare function formatStatsJson(stats: ProductivityStats, full: boolean): object;
export {};
//# sourceMappingURL=helpers.d.ts.map