import { getApi } from '../../lib/api/core.js';
import { CliError } from '../../lib/errors.js';
import { openLocalFileAsBlob } from '../../lib/local-file.js';
import { printDryRun } from '../../lib/output.js';
import { resolveProjectRef } from '../../lib/refs.js';
import { formatImportResult } from './helpers.js';
export async function importTemplateFile(projectRef, options) {
    if (!options.file) {
        throw new CliError('MISSING_FILE', 'Template file path is required (--file)');
    }
    const { blob: file, filePath, fileName, } = await openLocalFileAsBlob({ file: options.file, fileName: options.fileName });
    if (options.dryRun) {
        printDryRun('import template into project', {
            Project: projectRef,
            File: filePath,
            'File name': options.fileName,
        });
        return;
    }
    const api = await getApi();
    const project = await resolveProjectRef(api, projectRef);
    const result = await api.importTemplateIntoProject({
        projectId: project.id,
        file,
        fileName,
    });
    if (options.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
    }
    formatImportResult(result);
}
//# sourceMappingURL=import-file.js.map