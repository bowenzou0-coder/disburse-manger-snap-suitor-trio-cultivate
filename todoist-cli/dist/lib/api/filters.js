import { createCommand } from '@doist/todoist-sdk';
import { getApi, pickDefined } from './core.js';
export async function fetchFilters() {
    const api = await getApi();
    const response = await api.sync({
        resourceTypes: ['filters'],
        syncToken: '*',
    });
    return (response.filters ?? []).filter((f) => !f.isDeleted);
}
export async function addFilter(args) {
    const api = await getApi();
    const tempId = crypto.randomUUID();
    const response = await api.sync({
        commands: [
            createCommand('filter_add', {
                name: args.name,
                query: args.query,
                ...pickDefined({
                    color: args.color,
                    isFavorite: args.isFavorite,
                }),
            }, tempId),
        ],
    });
    const id = response.tempIdMapping?.[tempId] ?? tempId;
    return {
        id,
        name: args.name,
        query: args.query,
        color: args.color ?? 'charcoal',
        isFavorite: args.isFavorite ?? false,
        isDeleted: false,
        isFrozen: false,
        itemOrder: 0,
    };
}
export async function updateFilter(id, args) {
    const api = await getApi();
    await api.sync({
        commands: [
            createCommand('filter_update', {
                id,
                ...pickDefined({
                    name: args.name,
                    query: args.query,
                    color: args.color,
                    isFavorite: args.isFavorite,
                }),
            }),
        ],
    });
}
export async function deleteFilter(id) {
    const api = await getApi();
    await api.sync({
        commands: [createCommand('filter_delete', { id })],
    });
}
//# sourceMappingURL=filters.js.map