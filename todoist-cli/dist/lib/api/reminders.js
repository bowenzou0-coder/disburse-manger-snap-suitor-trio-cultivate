import { createCommand, } from '@doist/todoist-sdk';
import { getApi, pickDefined } from './core.js';
function toReminder(r) {
    return {
        id: r.id,
        itemId: r.itemId,
        type: r.type,
        due: 'due' in r && r.due ? r.due : undefined,
        minuteOffset: 'minuteOffset' in r ? r.minuteOffset : undefined,
        isUrgent: 'isUrgent' in r ? r.isUrgent : undefined,
        isDeleted: r.isDeleted,
    };
}
export async function fetchReminders() {
    const api = await getApi();
    const response = await api.sync({
        resourceTypes: ['reminders'],
        syncToken: '*',
    });
    return (response.reminders ?? []).map(toReminder).filter((r) => !r.isDeleted);
}
export async function getTaskReminders(taskId) {
    const reminders = await fetchReminders();
    return reminders.filter((r) => r.itemId === taskId);
}
export async function addReminder(args) {
    const api = await getApi();
    const tempId = crypto.randomUUID();
    const type = args.minuteOffset !== undefined ? 'relative' : 'absolute';
    const response = await api.sync({
        commands: [
            createCommand('reminder_add', {
                type,
                itemId: args.itemId,
                ...pickDefined({
                    minuteOffset: args.minuteOffset,
                    due: args.due,
                    isUrgent: args.isUrgent,
                }),
            }, tempId),
        ],
    });
    return response.tempIdMapping?.[tempId] ?? tempId;
}
export async function updateReminder(id, args) {
    const api = await getApi();
    // The sync command's `type` is a discriminated literal, so for urgency-only
    // patches we read the existing reminder to preserve its type — otherwise a
    // relative reminder would silently be re-tagged as absolute.
    let type;
    if (args.minuteOffset !== undefined) {
        type = 'relative';
    }
    else if (args.due !== undefined) {
        type = 'absolute';
    }
    else {
        const existing = await api.getReminder(id);
        if (existing.type !== 'absolute' && existing.type !== 'relative') {
            throw new Error(`Cannot update non-time reminder ${id} via 'reminder update'`);
        }
        type = existing.type;
    }
    await api.sync({
        commands: [
            createCommand('reminder_update', {
                id,
                type,
                ...pickDefined({
                    minuteOffset: args.minuteOffset,
                    due: args.due,
                    isUrgent: args.isUrgent,
                }),
            }),
        ],
    });
}
export async function deleteReminder(id) {
    const api = await getApi();
    await api.sync({
        commands: [createCommand('reminder_delete', { id })],
    });
}
export async function getReminderById(id) {
    const api = await getApi();
    return api.getReminder(id);
}
export async function getLocationReminderById(id) {
    const api = await getApi();
    const reminder = await api.getLocationReminder(id);
    return reminder;
}
export async function addLocationReminder(args) {
    const api = await getApi();
    const reminder = await api.addLocationReminder({
        taskId: args.taskId,
        name: args.name,
        locLat: args.locLat,
        locLong: args.locLong,
        locTrigger: args.locTrigger,
        ...pickDefined({ radius: args.radius }),
    });
    return reminder;
}
export async function updateLocationReminder(id, args) {
    const api = await getApi();
    const reminder = await api.updateLocationReminder(id, pickDefined({
        name: args.name,
        locLat: args.locLat,
        locLong: args.locLong,
        locTrigger: args.locTrigger,
        radius: args.radius,
    }));
    return reminder;
}
export async function deleteLocationReminder(id) {
    const api = await getApi();
    await api.deleteLocationReminder(id);
}
//# sourceMappingURL=reminders.js.map