import { openInBrowser } from '../../lib/browser.js';
import { filterUrl } from '../../lib/urls.js';
import { resolveFilterRef } from './helpers.js';
export async function browseFilter(nameOrId) {
    const filter = await resolveFilterRef(nameOrId);
    await openInBrowser(filterUrl(filter.id));
}
//# sourceMappingURL=browse.js.map