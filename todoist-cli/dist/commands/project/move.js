import { isPersonalProject, isWorkspaceProject, ProjectVisibilitySchema, } from '@doist/todoist-sdk';
import { getApi } from '../../lib/api/core.js';
import { CliError } from '../../lib/errors.js';
import { isQuiet } from '../../lib/global-args.js';
import { resolveFolderRef, resolveProjectRef, resolveWorkspaceRef } from '../../lib/refs.js';
const validVisibilities = ProjectVisibilitySchema.options;
export async function moveProject(ref, options) {
    if (options.toWorkspace && options.toPersonal) {
        throw new CliError('INVALID_OPTIONS', 'Cannot specify both --to-workspace and --to-personal.');
    }
    if (!options.toWorkspace && !options.toPersonal) {
        throw new CliError('MISSING_DESTINATION', 'Specify --to-workspace <ref> or --to-personal.');
    }
    if (options.folder && !options.toWorkspace) {
        throw new CliError('INVALID_OPTIONS', '--folder is only valid with --to-workspace.');
    }
    if (options.visibility && !options.toWorkspace) {
        throw new CliError('INVALID_OPTIONS', '--visibility is only valid with --to-workspace.');
    }
    if (options.visibility &&
        !validVisibilities.includes(options.visibility)) {
        throw new CliError('INVALID_VISIBILITY', `Invalid visibility "${options.visibility}".`, [
            `Valid values: ${validVisibilities.join(', ')}`,
        ]);
    }
    const api = await getApi();
    const project = await resolveProjectRef(api, ref);
    if (options.toWorkspace) {
        const workspace = await resolveWorkspaceRef(options.toWorkspace);
        if (isWorkspaceProject(project) && project.workspaceId === workspace.id) {
            throw new CliError('SAME_WORKSPACE', `Project "${project.name}" is already in workspace "${workspace.name}".`);
        }
        const args = {
            projectId: project.id,
            workspaceId: workspace.id,
        };
        let folderName;
        if (options.folder) {
            const folder = await resolveFolderRef(options.folder, workspace.id);
            args.folderId = folder.id;
            folderName = folder.name;
        }
        if (options.visibility) {
            args.access = { visibility: options.visibility };
        }
        if (options.dryRun || !options.yes) {
            let preview = `Would move "${project.name}" to workspace "${workspace.name}"`;
            if (folderName) {
                preview += ` (folder: ${folderName})`;
            }
            if (options.visibility) {
                preview += ` (visibility: ${options.visibility})`;
            }
            console.log(preview);
            if (!options.dryRun)
                console.log('Use --yes to confirm.');
            return;
        }
        await api.moveProjectToWorkspace(args);
        if (!isQuiet()) {
            let output = `Moved "${project.name}" to workspace "${workspace.name}"`;
            if (folderName) {
                output += ` (folder: ${folderName})`;
            }
            output += ` (id:${project.id})`;
            console.log(output);
        }
    }
    else {
        if (isPersonalProject(project)) {
            throw new CliError('ALREADY_PERSONAL', `Project "${project.name}" is already a personal project.`);
        }
        if (options.dryRun || !options.yes) {
            console.log(`Would move "${project.name}" to personal`);
            if (!options.dryRun)
                console.log('Use --yes to confirm.');
            return;
        }
        await api.moveProjectToPersonal({ projectId: project.id });
        if (!isQuiet())
            console.log(`Moved "${project.name}" to personal (id:${project.id})`);
    }
}
//# sourceMappingURL=move.js.map