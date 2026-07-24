import { type ProductivityStats } from '@doist/todoist-sdk';
export declare function fetchProductivityStats(): Promise<ProductivityStats>;
export interface UpdateGoalsArgs {
    dailyGoal?: number;
    weeklyGoal?: number;
    vacationMode?: boolean;
    karmaDisabled?: boolean;
}
export declare function updateGoals(args: UpdateGoalsArgs): Promise<void>;
//# sourceMappingURL=stats.d.ts.map