import chalk from 'chalk';
import { getApi } from '../../lib/api/core.js';
import { addReminder as apiAddReminder, } from '../../lib/api/reminders.js';
import { formatDuration, parseDuration } from '../../lib/duration.js';
import { CliError } from '../../lib/errors.js';
import { isQuiet } from '../../lib/global-args.js';
import { formatJson, printDryRun } from '../../lib/output.js';
import { resolveTaskRef } from '../../lib/refs.js';
import { formatUrgentBadge, parseDateTime } from './helpers.js';
export async function addReminder(taskRef, options) {
    if (!options.before && !options.at) {
        throw new CliError('MISSING_TIME', 'Must specify --before or --at');
    }
    if (options.before && options.at) {
        throw new CliError('CONFLICTING_OPTIONS', 'Cannot use both --before and --at');
    }
    const api = await getApi();
    const task = await resolveTaskRef(api, taskRef);
    if (options.before) {
        const taskDue = task.due;
        if (!taskDue?.date) {
            throw new CliError('NO_DUE_DATE', 'Cannot use --before: task has no due date', [
                'Use --at to set a specific reminder time instead',
            ]);
        }
        if (!taskDue.date.includes('T')) {
            throw new CliError('NO_DUE_TIME', 'Cannot use --before: task has a due date but no time', ['Use --at to set a specific reminder time, or add a time to the task']);
        }
    }
    let minuteOffset;
    let due;
    if (options.before) {
        const parsed = parseDuration(options.before);
        if (parsed === null) {
            throw new CliError('INVALID_DURATION', `Invalid duration format: "${options.before}"`, [
                'Examples: 30m, 1h, 2h15m, 1 hour 30 minutes',
            ]);
        }
        minuteOffset = parsed;
    }
    if (options.at) {
        due = parseDateTime(options.at);
    }
    if (options.dryRun) {
        printDryRun('add reminder', {
            Task: task.content,
            Before: options.before,
            At: options.at,
            Urgent: options.urgent === undefined ? undefined : String(options.urgent),
        });
        return;
    }
    const reminderId = await apiAddReminder({
        itemId: task.id,
        minuteOffset,
        due,
        isUrgent: options.urgent,
    });
    if (options.json) {
        const reminder = {
            id: reminderId,
            itemId: task.id,
            type: minuteOffset !== undefined ? 'relative' : 'absolute',
            minuteOffset,
            due,
            isUrgent: options.urgent,
            isDeleted: false,
        };
        console.log(formatJson(reminder, 'reminder'));
        return;
    }
    if (isQuiet()) {
        console.log(reminderId);
        return;
    }
    const urgent = formatUrgentBadge(options.urgent);
    if (minuteOffset !== undefined) {
        console.log(`Added reminder: ${formatDuration(minuteOffset)} before due${urgent}`);
    }
    else if (due) {
        console.log(`Added reminder: at ${due.date.replace('T', ' ')}${urgent}`);
    }
    console.log(chalk.dim(`ID: ${reminderId}`));
}
//# sourceMappingURL=add.js.map