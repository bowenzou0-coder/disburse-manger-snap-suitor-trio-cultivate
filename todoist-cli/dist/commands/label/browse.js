import { openInBrowser } from '../../lib/browser.js';
import { labelUrl } from '../../lib/urls.js';
import { resolveLabelRef } from './helpers.js';
export async function browseLabel(nameOrId) {
    const label = await resolveLabelRef(nameOrId);
    await openInBrowser(labelUrl(label.id));
}
//# sourceMappingURL=browse.js.map