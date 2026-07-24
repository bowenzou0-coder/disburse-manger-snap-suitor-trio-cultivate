import { type Notification } from '../../lib/api/notifications.js';
export declare function formatRelativeTime(date: Date): string;
export declare function formatNotificationDetails(n: Notification): string;
export declare function stripInvitationSecret(n: Notification): Omit<Notification, 'invitationSecret'>;
export declare function resolveNotification(idRef: string): Promise<Notification>;
//# sourceMappingURL=helpers.d.ts.map