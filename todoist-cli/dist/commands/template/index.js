import { CliError } from '../../lib/errors.js';
import { createFromTemplate } from './create.js';
import { exportTemplateFile } from './export-file.js';
import { exportTemplateUrl } from './export-url.js';
import { importTemplateFile } from './import-file.js';
import { importTemplateById } from './import-id.js';
export function registerTemplateCommand(program) {
    const template = program
        .command('template')
        .description('Manage project templates (export, import, create)');
    const exportFileCmd = template
        .command('export-file [project]')
        .description('Export a project as a CSV template file')
        .option('--project <ref>', 'Project reference (name or id:xxx)')
        .option('--relative-dates', 'Use relative dates in the export')
        .option('--output <path>', 'Write to file instead of stdout')
        .option('--json', 'Output as JSON')
        .action((projectArg, options) => {
        if (projectArg && options.project) {
            throw new CliError('CONFLICTING_OPTIONS', 'Cannot specify project both as argument and --project flag');
        }
        const ref = projectArg || options.project;
        if (!ref) {
            exportFileCmd.help();
            return;
        }
        return exportTemplateFile(ref, options);
    });
    const exportUrlCmd = template
        .command('export-url [project]')
        .description('Export a project as a template URL')
        .option('--project <ref>', 'Project reference (name or id:xxx)')
        .option('--relative-dates', 'Use relative dates in the export')
        .option('--json', 'Output as JSON')
        .action((projectArg, options) => {
        if (projectArg && options.project) {
            throw new CliError('CONFLICTING_OPTIONS', 'Cannot specify project both as argument and --project flag');
        }
        const ref = projectArg || options.project;
        if (!ref) {
            exportUrlCmd.help();
            return;
        }
        return exportTemplateUrl(ref, options);
    });
    template
        .command('create')
        .description('Create a new project from a template file')
        .requiredOption('--name <name>', 'Name for the new project')
        .requiredOption('--file <path>', 'Path to the template file')
        .option('--file-name <name>', 'Override the file name sent to the API')
        .option('--workspace <ref>', 'Workspace to create the project in')
        .option('--json', 'Output as JSON')
        .option('--dry-run', 'Preview what would happen without executing')
        .action((options) => {
        return createFromTemplate(options);
    });
    const importFileCmd = template
        .command('import-file [project]')
        .description('Import a template file into an existing project')
        .option('--project <ref>', 'Project reference (name or id:xxx)')
        .requiredOption('--file <path>', 'Path to the template file')
        .option('--file-name <name>', 'Override the file name sent to the API')
        .option('--json', 'Output as JSON')
        .option('--dry-run', 'Preview what would happen without executing')
        .action((projectArg, options) => {
        if (projectArg && options.project) {
            throw new CliError('CONFLICTING_OPTIONS', 'Cannot specify project both as argument and --project flag');
        }
        const ref = projectArg || options.project;
        if (!ref) {
            importFileCmd.help();
            return;
        }
        return importTemplateFile(ref, options);
    });
    const importIdCmd = template
        .command('import-id [project]')
        .description('Import a template by ID into an existing project')
        .option('--project <ref>', 'Project reference (name or id:xxx)')
        .requiredOption('--template-id <id>', 'The template ID to import')
        .option('--locale <locale>', 'Locale for the import (default: en)')
        .option('--json', 'Output as JSON')
        .option('--dry-run', 'Preview what would happen without executing')
        .action((projectArg, options) => {
        if (projectArg && options.project) {
            throw new CliError('CONFLICTING_OPTIONS', 'Cannot specify project both as argument and --project flag');
        }
        const ref = projectArg || options.project;
        if (!ref) {
            importIdCmd.help();
            return;
        }
        return importTemplateById(ref, options);
    });
}
//# sourceMappingURL=index.js.map