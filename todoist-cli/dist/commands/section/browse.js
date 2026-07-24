import { openInBrowser } from '../../lib/browser.js';
import { lenientIdRef } from '../../lib/refs.js';
import { sectionUrl } from '../../lib/urls.js';
export async function browseSection(sectionId) {
    const id = lenientIdRef(sectionId, 'section');
    await openInBrowser(sectionUrl(id));
}
//# sourceMappingURL=browse.js.map