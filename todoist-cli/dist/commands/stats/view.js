import { fetchProductivityStats } from '../../lib/api/stats.js';
import { formatStatsJson, formatStatsView } from './helpers.js';
export async function viewStats(options) {
    const stats = await fetchProductivityStats();
    if (options.json) {
        console.log(JSON.stringify(formatStatsJson(stats, options.full ?? false), null, 2));
        return;
    }
    console.log(formatStatsView(stats));
}
//# sourceMappingURL=view.js.map