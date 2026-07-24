import { getApi } from '../../lib/api/core.js';
import { isQuiet } from '../../lib/global-args.js';
import { formatJson, printDryRun } from '../../lib/output.js';
import { lenientIdRef } from '../../lib/refs.js';
export async function updateComment(commentId, options) {
    const id = lenientIdRef(commentId, 'comment');
    if (options.dryRun) {
        const preview = options.content.length > 80 ? `${options.content.slice(0, 80)}...` : options.content;
        printDryRun('update comment', { ID: id, Content: preview });
        return;
    }
    const api = await getApi();
    if (options.json) {
        const updated = await api.updateComment(id, { content: options.content });
        console.log(formatJson(updated, 'comment'));
        return;
    }
    const comment = await api.getComment(id);
    const oldPreview = comment.content.length > 50 ? `${comment.content.slice(0, 50)}...` : comment.content;
    await api.updateComment(id, { content: options.content });
    if (!isQuiet())
        console.log(`Updated comment: ${oldPreview} (id:${id})`);
}
//# sourceMappingURL=update.js.map