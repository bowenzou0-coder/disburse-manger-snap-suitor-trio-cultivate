import type { Command, Option } from 'commander';
/**
 * Set argChoices on an option without enabling Commander's built-in
 * validation. The choices are surfaced for shell completions but the
 * option still accepts any value at parse time.
 *
 * Useful when the option accepts values beyond the choices list
 * (e.g. comma-separated roles, boolean synonyms like true/false/yes/no/1/0).
 *
 * This sets Commander's internal `argChoices` property directly.
 */
export declare function withUnvalidatedChoices(opt: Option, values: string[]): Option;
export declare function withCaseInsensitiveChoices(opt: Option, values: string[]): Option;
/**
 * Parse COMP_LINE into words, stripping the binary name and the
 * 'completion-server' token that tabtab injects.
 *
 * FIXME: This splits on whitespace and does not handle quoted arguments.
 * A value like `"Buy milk tomorrow"` would be split into three words.
 * In practice this is fine because we only walk command/option names,
 * and shells provide the already-split COMP_WORDS separately. If a
 * positional arg value happens to match a subcommand name, the tree
 * walker could descend incorrectly (see tests under "parseCompLine
 * quoted argument limitation"). This can be fixed once tabtab exposes
 * the shell-provided words: https://github.com/pnpm/tabtab/issues/35
 */
export declare function parseCompLine(compLine: string): string[];
export interface CompletionItem {
    name: string;
    description?: string;
}
/**
 * Get completions for the current command line context.
 *
 * @param program - The root Commander program with all commands registered
 * @param words - The words on the command line (excluding the binary name)
 * @param current - The current word being typed (may be empty string)
 * @returns Array of completion items
 */
export declare function getCompletions(program: Command, words: string[], current: string): CompletionItem[];
//# sourceMappingURL=completion.d.ts.map