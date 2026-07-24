import { createCommand, DATE_FORMAT_TO_API, DAY_OF_WEEK_TO_API, TIME_FORMAT_TO_API, } from '@doist/todoist-sdk';
import { CliError } from '../errors.js';
import { getApi, pickDefined } from './core.js';
export async function fetchUserSettings() {
    const api = await getApi();
    const response = await api.sync({
        resourceTypes: ['user', 'user_settings'],
        syncToken: '*',
    });
    const user = response.user;
    const settings = response.userSettings;
    return {
        timezone: user?.tzInfo?.timezone ?? 'UTC',
        timeFormat: user?.timeFormat ?? '24h',
        dateFormat: user?.dateFormat ?? 'DD/MM/YYYY',
        startDay: user?.startDay ?? 'Monday',
        theme: Number(user?.themeId ?? 0),
        autoReminder: user?.autoReminder ?? 0,
        nextWeek: user?.nextWeek ?? 'Monday',
        startPage: user?.startPage ?? 'today',
        reminderPush: settings?.reminderPush ?? true,
        reminderDesktop: settings?.reminderDesktop ?? true,
        reminderEmail: settings?.reminderEmail ?? false,
        completedSoundDesktop: settings?.completedSoundDesktop ?? true,
        completedSoundMobile: settings?.completedSoundMobile ?? true,
    };
}
export async function updateUserSettings(args) {
    const commands = [];
    const userArgs = pickDefined({
        timezone: args.timezone,
        time_format: args.timeFormat !== undefined ? TIME_FORMAT_TO_API[args.timeFormat] : undefined,
        date_format: args.dateFormat !== undefined ? DATE_FORMAT_TO_API[args.dateFormat] : undefined,
        start_day: args.startDay !== undefined ? DAY_OF_WEEK_TO_API[args.startDay] : undefined,
        theme_id: args.theme !== undefined ? String(args.theme) : undefined,
        auto_reminder: args.autoReminder,
        next_week: args.nextWeek !== undefined ? DAY_OF_WEEK_TO_API[args.nextWeek] : undefined,
        start_page: args.startPage,
    });
    if (Object.keys(userArgs).length > 0) {
        commands.push(createCommand('user_update', userArgs));
    }
    const settingsArgs = pickDefined({
        reminderPush: args.reminderPush,
        reminderDesktop: args.reminderDesktop,
        reminderEmail: args.reminderEmail,
        completedSoundDesktop: args.completedSoundDesktop,
        completedSoundMobile: args.completedSoundMobile,
    });
    if (Object.keys(settingsArgs).length > 0) {
        commands.push(createCommand('user_settings_update', settingsArgs));
    }
    if (commands.length === 0) {
        throw new CliError('NO_CHANGES', 'No settings to update');
    }
    const api = await getApi();
    await api.sync({ commands });
}
//# sourceMappingURL=user-settings.js.map