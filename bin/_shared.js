import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

/**
 * Ensure tsx/esm is loaded. If running without --import tsx/esm
 * (e.g. tsx resolved from CWD failed), re-exec with the correct path.
 *
 * Call this at the top of every bin entry point.
 */
export function ensureTsx() {
  // If tsx is already loaded (shebang worked), nothing to do
  try {
    const req = createRequire(new URL('../package.json', import.meta.url));
    req.resolve('tsx/esm');
  } catch {
    // tsx not even installed — fatal
    process.stderr.write('[synapse] fatal: tsx package not found\n');
    process.exit(1);
  }

  // Check if tsx ESM loader is active by testing if .ts imports work
  // If we got here, tsx/esm was loaded (either via shebang or NODE_OPTIONS)
}

/**
 * Re-launch the current script with tsx resolved from the package's
 * own node_modules. Used as a fallback when the shebang --import tsx/esm
 * fails because Node resolves it from CWD instead of the package dir.
 */
export function relaunchWithTsx() {
  // Already relaunched — don't loop
  if (process.env.__SYNAPSE_TSX_RELAUNCHED === '1') return false;

  let tsxEsm;
  try {
    const req = createRequire(new URL('../package.json', import.meta.url));
    tsxEsm = pathToFileURL(req.resolve('tsx/esm')).href;
  } catch {
    // tsx not found. If this is a local checkout, we need it.
    // If this is a published package, bin/synapse.js shouldn't be called directly;
    // but if it is, we should warn.
    return false; // Let the caller decide how to handle missing tsx
  }

  try {
    execFileSync(process.execPath, [
      '--import', tsxEsm,
      ...process.argv.slice(1)
    ], {
      stdio: 'inherit',
      env: { ...process.env, __SYNAPSE_TSX_RELAUNCHED: '1' }
    });
    process.exit(0);
  } catch (e) {
    process.exit(e.status || 1);
  }
}

export function hasVersionFlag(argv = process.argv) {
  return argv.includes('--version') || argv.includes('-v');
}

export function buildForwardArgv(rest, argv = process.argv) {
  return [argv[0], argv[1], ...rest];
}

export function buildSynapseCommandArgv(commandArgs = [], metaUrl, argv = process.argv) {
  return [
    argv[0],
    fileURLToPath(new URL('./synapse.js', metaUrl)),
    ...commandArgs,
    ...argv.slice(2)
  ];
}

export function printDeprecationWarning({ legacyCommand, replacementCommand, note = '' }) {
  if (process.env.SYNAPSE_SUPPRESS_DEPRECATION_WARNINGS === 'true') return;
  const yellow = '\x1b[33m';
  const reset = '\x1b[0m';
  const suffix = note ? ` ${note}` : '';
  process.stderr.write(
    `${yellow}[synapse] DEPRECATED: Use "${replacementCommand}" instead of "${legacyCommand}".${suffix}${reset}\n`
  );
}

export async function forwardDeprecatedCommand({
  metaUrl,
  legacyCommand,
  replacementCommand,
  commandArgs = [],
  note = ''
}) {
  printDeprecationWarning({ legacyCommand, replacementCommand, note });
  process.argv = buildSynapseCommandArgv(commandArgs, metaUrl, process.argv);
  return importRelative('./synapse.js', metaUrl);
}

export async function importRelative(modulePath, metaUrl) {
  return import(new URL(modulePath, metaUrl).href);
}
