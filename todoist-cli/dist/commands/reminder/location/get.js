import chalk from 'chalk';
import { getLocationReminderById } from '../../../lib/api/reminders.js';
import { formatJson } from '../../../lib/output.js';
import { lenientIdRef } from '../../../lib/refs.js';
import { formatLocationReminderRow } from '../helpers.js';
export async function getLocationReminderCmd(reminderId, options) {
    const id = lenientIdRef(reminderId, 'reminder');
    const reminder = await getLocationReminderById(id);
    if (options.json) {
        console.log(formatJson(reminder, 'location-reminder', options.full));
        return;
    }
    const idStr = chalk.dim(reminder.id);
    const type = chalk.magenta('[location]');
    console.log(`${idStr}  ${type} ${formatLocationReminderRow(reminder)}`);
    console.log(chalk.dim(`Task: ${reminder.itemId}`));
}
//# sourceMappingURL=get.js.map