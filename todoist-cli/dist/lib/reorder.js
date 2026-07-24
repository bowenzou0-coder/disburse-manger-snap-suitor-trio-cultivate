import { CliError } from './errors.js';
export function validateReorderPlacement(options) {
    const flagCount = [options.before, options.after, options.position].filter((value) => value !== undefined).length;
    if (flagCount === 0) {
        throw new CliError('INVALID_OPTIONS', 'Specify exactly one of --before <ref>, --after <ref>, or --position <n>.');
    }
    if (flagCount > 1) {
        throw new CliError('INVALID_OPTIONS', '--before, --after, and --position are mutually exclusive.');
    }
}
//# sourceMappingURL=reorder.js.map