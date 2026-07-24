import chalk from 'chalk';
import { addFilter } from '../../lib/api/filters.js';
import { isQuiet } from '../../lib/global-args.js';
import { formatJson, printDryRun } from '../../lib/output.js';
export async function createFilter(options) {
    if (options.dryRun) {
        printDryRun('create filter', {
            Name: options.name,
            Query: options.query,
            Color: options.color,
            Favorite: options.favorite ? 'yes' : undefined,
        });
        return;
    }
    const filter = await addFilter({
        name: options.name,
        query: options.query,
        color: options.color,
        isFavorite: options.favorite,
    });
    if (options.json) {
        console.log(formatJson(filter, 'filter'));
        return;
    }
    if (isQuiet()) {
        console.log(filter.id);
        return;
    }
    console.log(`Created: ${filter.name}`);
    console.log(chalk.dim(`ID: id:${filter.id}`));
    console.log(chalk.dim(`Query: ${filter.query}`));
}
//# sourceMappingURL=create.js.map