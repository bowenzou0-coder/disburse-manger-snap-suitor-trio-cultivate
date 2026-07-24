import chalk from 'chalk';
import { getApi } from '../../lib/api/core.js';
import { CliError } from '../../lib/errors.js';
import { isQuiet } from '../../lib/global-args.js';
import { formatJson, printDryRun } from '../../lib/output.js';
import { readStdin } from '../../lib/stdin.js';
import { resolvePersonalParent } from './helpers.js';
export async function createProject(options) {
    if (options.stdin && options.description !== undefined) {
        throw new CliError('CONFLICTING_OPTIONS', 'Cannot use both --description and --stdin');
    }
    let description;
    if (options.stdin) {
        description = await readStdin();
    }
    else if (options.description) {
        description = options.description;
    }
    if (options.dryRun) {
        printDryRun('create project', {
            Name: options.name,
            Color: options.color,
            Favorite: options.favorite ? 'yes' : undefined,
            Parent: options.parent,
            'View style': options.viewStyle,
            Description: description,
        });
        return;
    }
    const api = await getApi();
    let parentId;
    if (options.parent) {
        const parentProject = await resolvePersonalParent(api, options.parent);
        parentId = parentProject.id;
    }
    const project = await api.addProject({
        name: options.name,
        color: options.color,
        isFavorite: options.favorite,
        parentId,
        viewStyle: options.viewStyle,
        description,
    });
    if (options.json) {
        console.log(formatJson(project, 'project'));
        return;
    }
    if (isQuiet()) {
        console.log(project.id);
        return;
    }
    console.log(`Created: ${project.name}`);
    console.log(chalk.dim(`ID: ${project.id}`));
}
//# sourceMappingURL=create.js.map