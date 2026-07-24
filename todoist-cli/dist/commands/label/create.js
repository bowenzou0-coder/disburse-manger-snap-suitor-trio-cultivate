import chalk from 'chalk';
import { getApi } from '../../lib/api/core.js';
import { isQuiet } from '../../lib/global-args.js';
import { formatJson, printDryRun } from '../../lib/output.js';
export async function createLabel(options) {
    if (options.dryRun) {
        printDryRun('create label', {
            Name: `@${options.name}`,
            Color: options.color,
            Favorite: options.favorite ? 'yes' : undefined,
        });
        return;
    }
    const api = await getApi();
    const label = await api.addLabel({
        name: options.name,
        color: options.color,
        isFavorite: options.favorite,
    });
    if (options.json) {
        console.log(formatJson(label, 'label'));
        return;
    }
    if (isQuiet()) {
        console.log(label.id);
        return;
    }
    console.log(`Created: @${label.name}`);
    console.log(chalk.dim(`ID: ${label.id}`));
}
//# sourceMappingURL=create.js.map