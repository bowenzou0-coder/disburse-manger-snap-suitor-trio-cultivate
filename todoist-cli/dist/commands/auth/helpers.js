import { createInterface } from 'node:readline';
import chalk from 'chalk';
export function promptHiddenInput(prompt) {
    return new Promise((resolve) => {
        const rl = createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        // biome-ignore lint/suspicious/noExplicitAny: accessing private readline property
        const origWrite = rl._writeToOutput;
        rl._writeToOutput = (str) => {
            if (str.includes(prompt)) {
                origWrite.call(rl, prompt);
            }
        };
        rl.question(prompt, (answer) => {
            rl.close();
            process.stdout.write('\n');
            resolve(answer);
        });
    });
}
/**
 * Surface a `TokenStorageResult` from a save/clear operation: the
 * human-readable confirmation goes to stdout, any keyring-fallback warning
 * goes to stderr. Pass `isMachineOutput: true` when the command is in
 * `--json` / `--ndjson` mode so the stdout confirmation is suppressed and
 * the warning still reaches the operator on stderr.
 */
export function logTokenStorageResult(result, secureStoreMessage, isMachineOutput = false) {
    if (!isMachineOutput && result.storage === 'secure-store') {
        console.log(chalk.dim(secureStoreMessage));
    }
    if (result.warning) {
        console.error(chalk.yellow('Warning:'), result.warning);
    }
}
//# sourceMappingURL=helpers.js.map