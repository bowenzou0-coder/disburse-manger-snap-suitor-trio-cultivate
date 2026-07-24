import { createCommand } from '@doist/todoist-sdk';
import { getApi } from './core.js';
function parseNotification(n) {
    // The SDK type uses passthrough() so extra fields are preserved
    const raw = n;
    let fromUser;
    if (n.fromUid) {
        const fromUserData = raw.from_user;
        fromUser = {
            id: String(n.fromUid),
            name: String(fromUserData?.full_name ?? fromUserData?.name ?? ''),
            email: String(fromUserData?.email ?? ''),
        };
    }
    let project;
    if (n.projectId) {
        project = {
            id: String(n.projectId),
            name: String(raw.project_name ?? ''),
        };
    }
    let task;
    if (n.itemId) {
        task = {
            id: String(n.itemId),
            content: String(n.itemContent ?? ''),
        };
    }
    return {
        id: String(n.id),
        type: n.notificationType,
        isUnread: n.isUnread,
        isDeleted: Boolean(raw.is_deleted ?? false),
        createdAt: n.createdAt,
        fromUser,
        project,
        task,
        invitationId: n.invitationId ? String(n.invitationId) : undefined,
        invitationSecret: raw.invitation_secret ? String(raw.invitation_secret) : undefined,
    };
}
export async function fetchNotifications() {
    const api = await getApi();
    const response = await api.sync({
        resourceTypes: ['live_notifications'],
        syncToken: '*',
    });
    const notifications = (response.liveNotifications ?? [])
        .map(parseNotification)
        .filter((n) => !n.isDeleted);
    notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return notifications;
}
export async function markNotificationRead(id) {
    const api = await getApi();
    await api.sync({
        commands: [createCommand('live_notifications_mark_read', { ids: [id] })],
    });
}
export async function markNotificationUnread(id) {
    const api = await getApi();
    await api.sync({
        commands: [createCommand('live_notifications_mark_unread', { ids: [id] })],
    });
}
export async function markAllNotificationsRead() {
    const api = await getApi();
    await api.sync({
        commands: [createCommand('live_notifications_mark_read_all', {})],
    });
}
export async function acceptInvitation(invitationId, secret) {
    const api = await getApi();
    await api.sync({
        commands: [
            createCommand('accept_invitation', {
                invitationId,
                invitationSecret: secret,
            }),
        ],
    });
}
export async function rejectInvitation(invitationId, secret) {
    const api = await getApi();
    await api.sync({
        commands: [
            createCommand('reject_invitation', {
                invitationId,
                invitationSecret: secret,
            }),
        ],
    });
}
//# sourceMappingURL=notifications.js.map