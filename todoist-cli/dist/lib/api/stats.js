import { createCommand } from '@doist/todoist-sdk';
import { CliError } from '../errors.js';
import { getApi, pickDefined } from './core.js';
export async function fetchProductivityStats() {
    const api = await getApi();
    return api.getProductivityStats();
}
export async function updateGoals(args) {
    const goalsArgs = pickDefined({
        dailyGoal: args.dailyGoal,
        weeklyGoal: args.weeklyGoal,
        vacationMode: args.vacationMode,
        karmaDisabled: args.karmaDisabled,
    });
    if (Object.keys(goalsArgs).length === 0) {
        throw new CliError('NO_CHANGES', 'No goals to update');
    }
    const api = await getApi();
    await api.sync({
        commands: [createCommand('update_goals', goalsArgs)],
    });
}
//# sourceMappingURL=stats.js.map