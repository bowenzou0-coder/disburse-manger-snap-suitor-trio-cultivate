import { getApi } from '../../lib/api/core.js';
import { CliError } from '../../lib/errors.js';
import { isQuiet } from '../../lib/global-args.js';
import { formatJson, printDryRun } from '../../lib/output.js';
import { resolveFolderByRef } from './helpers.js';
export async function updateFolder(ref, options) {
    const folder = await resolveFolderByRef(ref, options);
    const args = {};
    if (options.name)
        args.name = options.name;
    if (options.defaultOrder !== undefined)
        args.defaultOrder = options.defaultOrder;
    if (Object.keys(args).length === 0) {
        throw new CliError('NO_CHANGES', 'No changes specified.');
    }
    if (options.dryRun) {
        printDryRun('update folder', {
            Folder: folder.name,
            Name: args.name,
            'Default order': args.defaultOrder !== undefined ? String(args.defaultOrder) : undefined,
        });
        return;
    }
    const api = await getApi();
    const updated = await api.updateFolder(folder.id, args);
    if (options.json) {
        console.log(formatJson(updated, 'folder'));
        return;
    }
    if (!isQuiet())
        console.log(`Updated: ${folder.name}${options.name ? ` → ${updated.name}` : ''} (id:${folder.id})`);
}
//# sourceMappingURL=update.js.map