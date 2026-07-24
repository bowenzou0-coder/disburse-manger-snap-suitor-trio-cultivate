import { updateGoals } from '../../lib/api/stats.js';
import { CliError } from '../../lib/errors.js';
export async function goalsCommand(options, command) {
    const hasOptions = options.daily !== undefined || options.weekly !== undefined;
    if (!hasOptions) {
        command.help();
        return;
    }
    const args = {};
    if (options.daily !== undefined) {
        const daily = parseInt(options.daily, 10);
        if (Number.isNaN(daily) || daily < 0) {
            throw new CliError('INVALID_GOAL', 'Daily goal must be a non-negative number.');
        }
        args.dailyGoal = daily;
    }
    if (options.weekly !== undefined) {
        const weekly = parseInt(options.weekly, 10);
        if (Number.isNaN(weekly) || weekly < 0) {
            throw new CliError('INVALID_GOAL', 'Weekly goal must be a non-negative number.');
        }
        args.weeklyGoal = weekly;
    }
    await updateGoals(args);
    console.log('Goals updated.');
}
//# sourceMappingURL=goals.js.map