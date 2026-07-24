import { parseDuration } from '../../lib/duration.js';
import { CliError } from '../../lib/errors.js';
export function applyDuration(args, durationStr) {
    const minutes = parseDuration(durationStr);
    if (minutes === null) {
        throw new CliError('INVALID_DURATION', `Invalid duration format: "${durationStr}"`, [
            'Examples: 30m, 1h, 2h15m, 1 hour 30 minutes',
        ]);
    }
    args.duration = minutes;
    args.durationUnit = 'minute';
}
//# sourceMappingURL=helpers.js.map