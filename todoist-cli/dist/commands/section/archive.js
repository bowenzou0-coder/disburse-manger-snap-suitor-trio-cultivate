import { getApi } from '../../lib/api/core.js';
import { isQuiet } from '../../lib/global-args.js';
import { printDryRun } from '../../lib/output.js';
import { lenientIdRef } from '../../lib/refs.js';
export async function archiveSection(sectionId, options) {
    const id = lenientIdRef(sectionId, 'section');
    const api = await getApi();
    const section = await api.getSection(id);
    if (section.isArchived) {
        console.log('Section already archived.');
        return;
    }
    if (options.dryRun) {
        printDryRun('archive section', { Section: section.name });
        return;
    }
    await api.archiveSection(id);
    if (!isQuiet())
        console.log(`Archived: ${section.name} (id:${id})`);
}
//# sourceMappingURL=archive.js.map