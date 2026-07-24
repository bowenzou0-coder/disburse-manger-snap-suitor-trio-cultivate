import { type LocationReminder, type LocationTrigger, type Reminder } from '@doist/todoist-sdk';
import type { ReminderDue } from '../../lib/api/reminders.js';
export type ReminderTypeFilter = 'time' | 'location';
export type TimeReminder = Extract<Reminder, {
    type: 'absolute' | 'relative';
}>;
interface ReminderLike {
    type: Reminder['type'];
    minuteOffset?: number;
    due?: {
        date: string;
    };
    isUrgent?: boolean;
}
export declare function formatUrgentBadge(isUrgent: boolean | undefined): string;
export declare function formatReminderTime(reminder: ReminderLike): string;
export declare function formatLocationReminderRow(reminder: LocationReminder): string;
export declare function parseDateTime(value: string): ReminderDue;
export declare function parseTrigger(value: string): LocationTrigger;
export declare function parseLat(value: string): string;
export declare function parseLong(value: string): string;
export declare function parseRadius(value: string): number;
export {};
//# sourceMappingURL=helpers.d.ts.map