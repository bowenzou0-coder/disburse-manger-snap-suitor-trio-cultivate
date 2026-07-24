export type NotificationType = 'share_invitation_sent' | 'share_invitation_accepted' | 'share_invitation_rejected' | 'user_left_project' | 'user_removed_from_project' | 'item_assigned' | 'item_completed' | 'item_uncompleted' | 'note_added' | 'project_archived' | 'project_unarchived' | 'karma_daily_goal' | 'karma_weekly_goal' | 'biz_trial_will_end' | 'biz_payment_failed' | 'biz_account_disabled' | string;
export interface NotificationUser {
    id: string;
    name: string;
    email: string;
}
export interface NotificationProject {
    id: string;
    name: string;
}
export interface NotificationTask {
    id: string;
    content: string;
}
export interface Notification {
    id: string;
    type: NotificationType;
    isUnread: boolean;
    isDeleted: boolean;
    createdAt: Date;
    fromUser?: NotificationUser;
    project?: NotificationProject;
    task?: NotificationTask;
    invitationId?: string;
    invitationSecret?: string;
}
export declare function fetchNotifications(): Promise<Notification[]>;
export declare function markNotificationRead(id: string): Promise<void>;
export declare function markNotificationUnread(id: string): Promise<void>;
export declare function markAllNotificationsRead(): Promise<void>;
export declare function acceptInvitation(invitationId: string, secret: string): Promise<void>;
export declare function rejectInvitation(invitationId: string, secret: string): Promise<void>;
//# sourceMappingURL=notifications.d.ts.map