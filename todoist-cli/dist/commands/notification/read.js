import { fetchNotifications, markAllNotificationsRead, markNotificationRead, } from '../../lib/api/notifications.js';
import { CliError } from '../../lib/errors.js';
import { isQuiet } from '../../lib/global-args.js';
import { resolveNotification } from './helpers.js';
export async function markRead(idRef, options) {
    if (options.all) {
        if (!options.yes) {
            console.log('Use --all --yes to mark all notifications as read.');
            return;
        }
        const notifications = await fetchNotifications();
        const unreadCount = notifications.filter((n) => n.isUnread).length;
        await markAllNotificationsRead();
        if (!isQuiet())
            console.log(`Marked ${unreadCount} notification${unreadCount === 1 ? '' : 's'} as read.`);
        return;
    }
    if (!idRef) {
        throw new CliError('MISSING_ID', 'Provide a notification ID or use --all');
    }
    const n = await resolveNotification(idRef);
    await markNotificationRead(n.id);
    if (!isQuiet())
        console.log(`Marked as read. (id:${n.id})`);
}
//# sourceMappingURL=read.js.map