import { Option } from 'commander';
import { withUnvalidatedChoices } from '../../lib/completion.js';
import { CURSOR_DESCRIPTION } from '../../lib/constants.js';
import { CliError } from '../../lib/errors.js';
import { showWorkspaceActivity } from './activity.js';
import { createWorkspace } from './create.js';
import { deleteWorkspaceCommand } from './delete.js';
import { WORKSPACE_ROLES } from './helpers.js';
import { showWorkspaceInsights } from './insights.js';
import { listWorkspaces } from './list.js';
import { listWorkspaceProjects } from './projects.js';
import { updateWorkspaceCommand } from './update.js';
import { useWorkspace } from './use.js';
import { listWorkspaceUserTasks } from './user-tasks.js';
import { listWorkspaceUsers } from './users.js';
import { viewWorkspace } from './view.js';
export function registerWorkspaceCommand(program) {
    const workspace = program.command('workspace').description('Manage workspaces');
    workspace
        .command('list')
        .description('List all workspaces')
        .option('--json', 'Output as JSON')
        .option('--ndjson', 'Output as newline-delimited JSON')
        .option('--full', 'Include all fields in JSON output')
        .action(listWorkspaces);
    workspace
        .command('view [ref]', { isDefault: true })
        .description('View workspace details (uses the default workspace when [ref] is omitted)')
        .option('--json', 'Output as JSON')
        .option('--full', 'Include all fields in JSON output')
        .action((ref, options) => viewWorkspace(ref, options));
    const createCmd = workspace
        .command('create')
        .description('Create a new workspace')
        .option('--name <name>', 'Workspace name (required)')
        .option('--description <text>', 'Workspace description')
        .option('--link-sharing', 'Enable link sharing')
        .option('--no-link-sharing', 'Disable link sharing')
        .option('--guest-access', 'Allow guests')
        .option('--no-guest-access', 'Disallow guests')
        .option('--domain <domain>', 'Workspace email domain')
        .option('--domain-discovery', 'Allow matching domains to discover this workspace')
        .option('--no-domain-discovery', 'Disallow matching domains to discover this workspace')
        .option('--restrict-email-domains', 'Restrict invites to the workspace domain')
        .option('--no-restrict-email-domains', 'Do not restrict invites to the workspace domain')
        .option('--json', 'Output as JSON')
        .option('--full', 'Include all fields in JSON output')
        .option('--dry-run', 'Preview what would happen without executing')
        .action((options) => {
        if (!options.name) {
            createCmd.help();
            return;
        }
        return createWorkspace(options);
    });
    workspace
        .command('update [ref]')
        .description('Update a workspace (admin only)')
        .option('--name <name>', 'New workspace name')
        .option('--description <text>', 'Workspace description')
        .option('--link-sharing', 'Enable link sharing')
        .option('--no-link-sharing', 'Disable link sharing')
        .option('--guest-access', 'Allow guests')
        .option('--no-guest-access', 'Disallow guests')
        .option('--domain <domain>', 'Workspace email domain')
        .option('--domain-discovery', 'Allow matching domains to discover this workspace')
        .option('--no-domain-discovery', 'Disallow matching domains to discover this workspace')
        .option('--restrict-email-domains', 'Restrict invites to the workspace domain')
        .option('--no-restrict-email-domains', 'Do not restrict invites to the workspace domain')
        .option('--collapsed', 'Collapse workspace in the UI')
        .option('--no-collapsed', 'Uncollapse workspace in the UI')
        .option('--json', 'Output as JSON')
        .option('--full', 'Include all fields in JSON output')
        .option('--dry-run', 'Preview what would happen without executing')
        .action((ref, options) => updateWorkspaceCommand(ref, options));
    workspace
        .command('delete [ref]')
        .description('Delete a workspace (admin only)')
        .option('--yes', 'Skip confirmation prompt')
        .option('--dry-run', 'Preview what would happen without executing')
        .action((ref, options) => deleteWorkspaceCommand(ref, options));
    workspace
        .command('projects [ref]')
        .description('List projects in a workspace')
        .option('--workspace <ref>', 'Workspace name or id:xxx')
        .option('--limit <n>', 'Limit number of results')
        .option('--cursor <cursor>', CURSOR_DESCRIPTION)
        .option('--all', 'Fetch all results (no limit)')
        .option('--json', 'Output as JSON')
        .option('--ndjson', 'Output as newline-delimited JSON')
        .option('--full', 'Include all fields in JSON output')
        .action((refArg, options) => {
        if (refArg && options.workspace) {
            throw new CliError('CONFLICTING_OPTIONS', 'Cannot specify workspace both as argument and --workspace flag');
        }
        return listWorkspaceProjects(refArg || options.workspace, options);
    });
    workspace
        .command('users [ref]')
        .description('List users in a workspace')
        .option('--workspace <ref>', 'Workspace name or id:xxx')
        .addOption(withUnvalidatedChoices(new Option('--role <roles>', `Filter by role (comma-separated: ${WORKSPACE_ROLES.join(',')})`), [...WORKSPACE_ROLES]))
        .option('--limit <n>', 'Limit number of results')
        .option('--cursor <cursor>', CURSOR_DESCRIPTION)
        .option('--all', 'Fetch all results (no limit)')
        .option('--json', 'Output as JSON')
        .option('--ndjson', 'Output as newline-delimited JSON')
        .option('--full', 'Include all fields in JSON output')
        .action((refArg, options) => {
        if (refArg && options.workspace) {
            throw new CliError('CONFLICTING_OPTIONS', 'Cannot specify workspace both as argument and --workspace flag');
        }
        return listWorkspaceUsers(refArg || options.workspace, options);
    });
    workspace
        .command('user-tasks [ref]')
        .description('List tasks assigned to a user in a workspace')
        .option('--workspace <ref>', 'Workspace name or id:xxx')
        .option('--user <ref>', 'User email, full name, or id:xxx (required)')
        .option('--project-ids <ids>', 'Comma-separated project IDs to filter')
        .option('--json', 'Output as JSON')
        .option('--ndjson', 'Output as newline-delimited JSON')
        .option('--full', 'Include all fields in JSON output')
        .action((refArg, options) => {
        if (refArg && options.workspace) {
            throw new CliError('CONFLICTING_OPTIONS', 'Cannot specify workspace both as argument and --workspace flag');
        }
        return listWorkspaceUserTasks(refArg || options.workspace, options);
    });
    workspace
        .command('activity [ref]')
        .description('Show workspace members activity (tasks assigned/overdue)')
        .option('--workspace <ref>', 'Workspace name or id:xxx')
        .option('--user-ids <ids>', 'Comma-separated user IDs to filter')
        .option('--project-ids <ids>', 'Comma-separated project IDs to filter')
        .option('--json', 'Output as JSON')
        .option('--ndjson', 'Output as newline-delimited JSON')
        .option('--full', 'Enrich output with user names/emails')
        .action((refArg, options) => {
        if (refArg && options.workspace) {
            throw new CliError('CONFLICTING_OPTIONS', 'Cannot specify workspace both as argument and --workspace flag');
        }
        return showWorkspaceActivity(refArg || options.workspace, options);
    });
    workspace
        .command('insights [ref]')
        .description('Show health and progress insights for workspace projects')
        .option('--workspace <ref>', 'Workspace name or id:xxx')
        .option('--json', 'Output as JSON')
        .option('--project-ids <ids>', 'Comma-separated project IDs to filter')
        .action((refArg, options) => {
        if (refArg && options.workspace) {
            throw new CliError('CONFLICTING_OPTIONS', 'Cannot specify workspace both as argument and --workspace flag');
        }
        return showWorkspaceInsights(refArg || options.workspace, options);
    });
    workspace
        .command('use [ref]')
        .description('Set the default workspace used when [ref] is omitted from other commands')
        .option('--clear', 'Remove the saved default workspace')
        .action((ref, options) => useWorkspace(ref, options));
    workspace.addHelpText('after', `
Examples:
  $ td workspace create --name "Acme"
  $ td workspace update "Acme" --description "Acme Inc." --dry-run
  $ td workspace delete "Old WS" --yes
  $ td workspace user-tasks "Acme" --user alice@example.com
  $ td workspace activity "Acme" --json
  $ td workspace use "Acme"          # set default, used by subsequent commands
  $ td workspace projects            # uses the default workspace
  $ td workspace use --clear         # forget the default`);
}
//# sourceMappingURL=index.js.map