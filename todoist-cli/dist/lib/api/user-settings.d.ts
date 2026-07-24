import { type DateFormat, type DayOfWeek, type TimeFormat } from '@doist/todoist-sdk';
export interface UserSettings {
    timezone: string;
    timeFormat: TimeFormat;
    dateFormat: DateFormat;
    startDay: DayOfWeek;
    theme: number;
    autoReminder: number;
    nextWeek: DayOfWeek;
    startPage: string;
    reminderPush: boolean;
    reminderDesktop: boolean;
    reminderEmail: boolean;
    completedSoundDesktop: boolean;
    completedSoundMobile: boolean;
}
export declare function fetchUserSettings(): Promise<UserSettings>;
export interface UpdateUserSettingsArgs {
    timezone?: string;
    timeFormat?: TimeFormat;
    dateFormat?: DateFormat;
    startDay?: DayOfWeek;
    theme?: number;
    autoReminder?: number;
    nextWeek?: DayOfWeek;
    startPage?: string;
    reminderPush?: boolean;
    reminderDesktop?: boolean;
    reminderEmail?: boolean;
    completedSoundDesktop?: boolean;
    completedSoundMobile?: boolean;
}
export declare function updateUserSettings(args: UpdateUserSettingsArgs): Promise<void>;
//# sourceMappingURL=user-settings.d.ts.map