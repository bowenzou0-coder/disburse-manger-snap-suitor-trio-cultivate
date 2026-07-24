export interface LocalFileOptions {
    /** Path to the file on disk (relative paths resolve against cwd). */
    file: string;
    /** Optional override for the upload's user-facing filename. Defaults to `basename(file)`. */
    fileName?: string;
}
/**
 * Open a local file as a streaming `Blob` for upload, with CLI-grade
 * error reporting. The returned Blob is file-backed — undici reads it
 * lazily when serializing the multipart request body, so the payload
 * never has to fit in memory all at once.
 *
 * Returns the resolved absolute path and the effective `fileName`
 * (caller's override, falling back to `basename(filePath)`) so call
 * sites don't have to recompute either.
 *
 * Why `open` + `close` rather than `stat`: `stat` only proves the path
 * exists; an unreadable file (chmod 000) would slip past and then
 * fail later inside undici, where the error surfaces as a generic
 * transport failure and renders as `INTERNAL_ERROR`. Opening for read
 * and immediately closing verifies actual readability and keeps any
 * fs failure (ENOENT / EACCES / EPERM / EISDIR / …) on the structured
 * `CliError` path. Also disambiguates the opaque
 * `ERR_INVALID_ARG_VALUE` TypeError that `openAsBlob` rewraps fs
 * errors as.
 */
export declare function openLocalFileAsBlob(options: LocalFileOptions): Promise<{
    blob: Blob;
    filePath: string;
    fileName: string;
}>;
//# sourceMappingURL=local-file.d.ts.map