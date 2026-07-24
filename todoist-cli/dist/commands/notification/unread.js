import { markNotificationUnread } from '../../lib/api/notifications.js';
import { resolveNotification } from './helpers.js';
export async function markUnread(idRef) {
    const n = await resolveNotification(idRef);
    await markNotificationUnread(n.id);
    console.log('Marked as unread.');
}
//# sourceMappingURL=unread.js.map