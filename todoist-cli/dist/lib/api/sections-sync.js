import { createCommand } from '@doist/todoist-sdk';
import { getApi } from './core.js';
export async function reorderSections(items) {
    const api = await getApi();
    await api.sync({
        commands: [createCommand('section_reorder', { sections: items })],
    });
}
//# sourceMappingURL=sections-sync.js.map