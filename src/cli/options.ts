/**
 * Global CLI option parser.
 *
 * Extracts --json, --verbose, --quiet, --config <path> from argv
 * and returns both the parsed flags and the remaining arguments.
 *
 * @module src/cli/options
 */

export interface GlobalOptions {
  json: boolean;
  verbose: boolean;
  quiet: boolean;
  config: string | null;
  args: string[];
}

/**
 * Parse global flags from an argv-style array (without node/bin prefix).
 *
 * Supports:
 *   --json        JSON output
 *   --verbose     Verbose output
 *   --quiet       Suppress output
 *   --config <p>  Custom config path (next positional consumed)
 *
 * Flags are removed from the returned `args` so downstream commands
 * receive a clean argument list.
 */
export function parseGlobalOptions(argv: string[]): GlobalOptions {
  const opts: GlobalOptions = { json: false, verbose: false, quiet: false, config: null, args: [] };
  const remaining: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--json') {
      opts.json = true;
    } else if (arg === '--verbose') {
      opts.verbose = true;
    } else if (arg === '--quiet') {
      opts.quiet = true;
    } else if (arg === '--config') {
      i++;
      opts.config = argv[i] ?? null;
    } else if (arg.startsWith('--config=')) {
      opts.config = arg.slice('--config='.length) || null;
    } else {
      remaining.push(arg);
    }
  }

  opts.args = remaining;
  return opts;
}
