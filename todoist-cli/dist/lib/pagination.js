export async function paginate(fetchPage, options) {
    const { limit, perPage = 200, startCursor } = options;
    const all = [];
    let cursor = startCursor ?? null;
    while (all.length < limit) {
        const remaining = limit - all.length;
        const pageSize = Math.min(remaining, perPage);
        const response = await fetchPage(cursor, pageSize);
        all.push(...response.results);
        cursor = response.nextCursor;
        if (!cursor)
            break;
    }
    return {
        results: all.slice(0, limit),
        nextCursor: cursor,
    };
}
export const LIMITS = {
    tasks: 300,
    projects: 50,
    sections: 300,
    labels: 300,
    comments: 10,
};
//# sourceMappingURL=pagination.js.map