import { type LocationReminder, type LocationTrigger, type Reminder as SdkReminder } from '@doist/todoist-sdk';
export interface ReminderDue {
    date: string;
    timezone?: string;
    isRecurring?: boolean;
    string?: string;
    lang?: string;
}
export interface Reminder {
    id: string;
    itemId: string;
    type: 'absolute' | 'relative' | 'location';
    due?: ReminderDue;
    minuteOffset?: number;
    isUrgent?: boolean;
    isDeleted: boolean;
}
export declare function fetchReminders(): Promise<Reminder[]>;
export declare function getTaskReminders(taskId: string): Promise<Reminder[]>;
export interface AddReminderArgs {
    itemId: string;
    minuteOffset?: number;
    due?: ReminderDue;
    isUrgent?: boolean;
}
export declare function addReminder(args: AddReminderArgs): Promise<string>;
export interface UpdateReminderArgs {
    minuteOffset?: number;
    due?: ReminderDue;
    isUrgent?: boolean;
}
export declare function updateReminder(id: string, args: UpdateReminderArgs): Promise<void>;
export declare function deleteReminder(id: string): Promise<void>;
export declare function getReminderById(id: string): Promise<SdkReminder>;
export declare function getLocationReminderById(id: string): Promise<LocationReminder>;
export interface AddLocationReminderArgs {
    taskId: string;
    name: string;
    locLat: string;
    locLong: string;
    locTrigger: LocationTrigger;
    radius?: number;
}
export declare function addLocationReminder(args: AddLocationReminderArgs): Promise<LocationReminder>;
export interface UpdateLocationReminderArgs {
    name?: string;
    locLat?: string;
    locLong?: string;
    locTrigger?: LocationTrigger;
    radius?: number;
}
export declare function updateLocationReminder(id: string, args: UpdateLocationReminderArgs): Promise<LocationReminder>;
export declare function deleteLocationReminder(id: string): Promise<void>;
//# sourceMappingURL=reminders.d.ts.map