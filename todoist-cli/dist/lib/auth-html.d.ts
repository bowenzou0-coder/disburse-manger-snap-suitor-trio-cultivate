/**
 * Branded HTML pages served by the OAuth callback server. Wired into
 * cli-core's `registerAuthCommand` via the `renderSuccess` / `renderError`
 * options so the runtime stays generic while the CLI keeps its branding.
 *
 * The two consts (SUCCESS_HTML / ERROR_HTML) were lifted verbatim from the
 * pre-cli-core `src/lib/oauth-server.ts` to preserve the existing UX.
 */
export declare function renderAuthSuccessPage(): string;
export declare function renderAuthErrorPage(message: string): string;
//# sourceMappingURL=auth-html.d.ts.map