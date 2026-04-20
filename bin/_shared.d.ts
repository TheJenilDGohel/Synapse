/**
 * Ensure tsx/esm is loaded. If running without --import tsx/esm
 * (e.g. tsx resolved from CWD failed), re-exec with the correct path.
 *
 * Call this at the top of every bin entry point.
 */
export function ensureTsx(): void;
/**
 * Re-launch the current script with tsx resolved from the package's
 * own node_modules. Used as a fallback when the shebang --import tsx/esm
 * fails because Node resolves it from CWD instead of the package dir.
 */
export function relaunchWithTsx(): boolean;
export function hasVersionFlag(argv?: string[]): boolean;
export function buildForwardArgv(rest: any, argv?: string[]): any[];
export function buildLocalnestCommandArgv(commandArgs: any[] | undefined, metaUrl: any, argv?: string[]): any[];
export function printDeprecationWarning({ legacyCommand, replacementCommand, note }: {
    legacyCommand: any;
    replacementCommand: any;
    note?: string | undefined;
}): void;
export function forwardDeprecatedCommand({ metaUrl, legacyCommand, replacementCommand, commandArgs, note }: {
    metaUrl: any;
    legacyCommand: any;
    replacementCommand: any;
    commandArgs?: never[] | undefined;
    note?: string | undefined;
}): Promise<any>;
export function importRelative(modulePath: any, metaUrl: any): Promise<any>;
//# sourceMappingURL=_shared.d.ts.map