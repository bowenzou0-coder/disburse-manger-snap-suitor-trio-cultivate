interface UpdateOptions {
    timezone?: string;
    timeFormat?: string;
    dateFormat?: string;
    startDay?: string;
    theme?: string;
    autoReminder?: string;
    nextWeek?: string;
    startPage?: string;
    reminderPush?: string;
    reminderDesktop?: string;
    reminderEmail?: string;
    completedSoundDesktop?: string;
    completedSoundMobile?: string;
}
export declare function updateSettings(options: UpdateOptions): Promise<void>;
export {};
//# sourceMappingURL=update.d.ts.map