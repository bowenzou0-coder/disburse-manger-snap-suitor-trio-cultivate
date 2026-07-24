import chalk from 'chalk';
import { getApi } from '../../lib/api/core.js';
import { formatListing, outputMachine, resolveLocale } from './format.js';
export async function viewPlan(options = {}) {
    const api = await getApi();
    const locale = await resolveLocale(api, options);
    const details = await api.getProPlanDetails();
    if (outputMachine(details, options))
        return;
    console.log(chalk.bold('Pro plan'));
    console.log('');
    console.log(`  Status:             ${details.currentPlanStatus}`);
    console.log(`  Downgrade at:       ${details.downgradeAt ?? chalk.dim('(none)')}`);
    if (details.priceList.length > 0) {
        console.log('');
        console.log(chalk.bold('  Prices'));
        for (const listing of details.priceList) {
            console.log(`    ${formatListing(listing, locale)}`);
        }
    }
}
//# sourceMappingURL=plan.js.map