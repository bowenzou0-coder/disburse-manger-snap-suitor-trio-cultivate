import { DAY_OF_WEEK_TO_API } from '@doist/todoist-sdk';
import chalk from 'chalk';
export function formatTrend(trend) {
    switch (trend) {
        case 'up':
            return chalk.green('\u2191');
        case 'down':
            return chalk.red('\u2193');
        default:
            return '';
    }
}
export function formatStreak(current, max) {
    if (current.count === 0 && max.count === 0)
        return chalk.dim('none');
    const best = max.count > current.count ? ` (best: ${max.count})` : '';
    return `${current.count}${best}`;
}
export function formatGoalProgress(completed, goal, label) {
    if (goal === 0)
        return chalk.dim('no goal set');
    const ratio = `${completed}/${goal}`;
    const met = completed >= goal;
    const progress = met ? chalk.green(ratio) : chalk.yellow(ratio);
    return `${progress} ${label}`;
}
export function getTodayCompleted(stats) {
    const today = new Date().toISOString().slice(0, 10);
    const todayItem = stats.daysItems.find((d) => d.date === today);
    return todayItem?.totalCompleted ?? 0;
}
export function getThisWeekCompleted(stats) {
    if (stats.weekItems.length === 0)
        return 0;
    return stats.weekItems[0].totalCompleted;
}
export function formatStatsView(stats) {
    const lines = [];
    const { goals } = stats;
    if (goals.vacationMode) {
        lines.push(chalk.yellow('Vacation mode is on'));
        lines.push('');
    }
    const trend = formatTrend(stats.karmaTrend);
    lines.push(`Karma: ${stats.karma.toLocaleString()} ${trend}`);
    lines.push('');
    const todayCompleted = getTodayCompleted(stats);
    const weekCompleted = getThisWeekCompleted(stats);
    const dailyProgress = formatGoalProgress(todayCompleted, goals.dailyGoal, 'today');
    const dailyStreak = formatStreak(goals.currentDailyStreak, goals.maxDailyStreak);
    lines.push(`Daily:  ${goals.dailyGoal} tasks   ${dailyProgress.padEnd(20)} streak: ${dailyStreak}`);
    const weeklyProgress = formatGoalProgress(weekCompleted, goals.weeklyGoal, 'this week');
    const weeklyStreak = formatStreak(goals.currentWeeklyStreak, goals.maxWeeklyStreak);
    lines.push(`Weekly: ${goals.weeklyGoal} tasks   ${weeklyProgress.padEnd(20)} streak: ${weeklyStreak}`);
    lines.push('');
    lines.push(`Completed: ${stats.completedCount.toLocaleString()} total`);
    return lines.join('\n');
}
export function formatStatsJson(stats, full) {
    const base = {
        karma: stats.karma,
        karmaTrend: stats.karmaTrend,
        completedCount: stats.completedCount,
        goals: {
            dailyGoal: stats.goals.dailyGoal,
            weeklyGoal: stats.goals.weeklyGoal,
            currentDailyStreak: stats.goals.currentDailyStreak,
            currentWeeklyStreak: stats.goals.currentWeeklyStreak,
            maxDailyStreak: stats.goals.maxDailyStreak,
            maxWeeklyStreak: stats.goals.maxWeeklyStreak,
            vacationMode: stats.goals.vacationMode,
        },
    };
    if (!full)
        return base;
    return {
        ...base,
        karmaLastUpdate: stats.karmaLastUpdate,
        goals: {
            ...base.goals,
            karmaDisabled: stats.goals.karmaDisabled,
            ignoreDays: stats.goals.ignoreDays.map((d) => DAY_OF_WEEK_TO_API[d]),
        },
        daysItems: stats.daysItems,
        weekItems: stats.weekItems,
    };
}
//# sourceMappingURL=helpers.js.map