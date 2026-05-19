import { parseFlags } from '../parse-flags.js';
/**
 * Skill CLI subcommands.
 *
 *   synapse skill install [--force] [--project] [--user] [--dest PATH]
 *   synapse skill list
 *   synapse skill remove <name> [-f|--force]
 *
 * @module src/cli/commands/skill
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createInterface } from 'node:readline';
import { printSubcommandHelp } from '../help.js';
import type { VerbDef } from '../help.js';
import { writeError as sharedWriteError } from '../output.js';
// Lazy-loaded from scripts/runtime — outside rootDir, computed path prevents tsc from analyzing it
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SKILL_SCRIPT = path.resolve(__dirname, '..', '..', '..', '..', 'scripts', 'runtime', 'install-synapse-skill.mjs');
let _skillModule: {
  listBundledSkillDirs: () => string[];
  getKnownToolSkillDirs: (home: string) => string[];
  getKnownProjectSkillDirs: (cwd: string) => string[];
  detectSkillToolFamily: (dir: string) => string;
} | null = null;
async function getSkillModule() {
  if (!_skillModule) {
    _skillModule = await import(/* webpackIgnore: true */ pathToFileURL(SKILL_SCRIPT).href) as typeof _skillModule;
  }
  return _skillModule!;
}
import type { GlobalOptions } from '../options.js';

const SKILL_METADATA_FILE = '.synapse-skill.json';

const VERBS: VerbDef[] = [
  { name: 'install', desc: 'Install bundled skills to AI clients' },
  { name: 'list', desc: 'List installed skills and their locations' },
  { name: 'remove', desc: 'Remove a skill from all installed locations' },
];

/* ------------------------------------------------------------------ */
/*  Output helpers                                                     */
/* ------------------------------------------------------------------ */

function writeJson(data: unknown): void {
  process.stdout.write(JSON.stringify(data, null, 2) + '\n');
}

function writeError(msg: string, json: boolean): void {
  if (json) {
    writeJson({ error: msg });
  } else {
    sharedWriteError(msg);
  }
  process.exitCode = 1;
}

/* ------------------------------------------------------------------ */
/*  Interactive confirmation                                           */
/* ------------------------------------------------------------------ */

function confirm(prompt: string): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stderr });
    rl.question(prompt, (answer: string) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'y' || answer.trim().toLowerCase() === 'yes');
    });
  });
}

/* ------------------------------------------------------------------ */
/*  Skill discovery helpers                                            */
/* ------------------------------------------------------------------ */

interface SkillMeta {
  name: string;
  version: string;
}

interface InstalledSkill {
  name: string;
  version: string;
  toolFamily: string;
  path: string;
}

/**
 * Read skill metadata from a skill directory.
 */
function readSkillMeta(skillDir: string): SkillMeta | null {
  try {
    const raw = fs.readFileSync(path.join(skillDir, SKILL_METADATA_FILE), 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      name: typeof parsed.name === 'string' ? parsed.name : path.basename(skillDir),
      version: typeof parsed.version === 'string' ? parsed.version : '',
    };
  } catch {
    return null;
  }
}

/**
 * Scan known skill directories for installed skills.
 */
async function scanInstalledSkills(): Promise<InstalledSkill[]> {
  const mod = await getSkillModule();
  const homeDir = os.homedir();
  const cwd = process.cwd();
  const userDirs: string[] = mod.getKnownToolSkillDirs(homeDir);
  const projectDirs: string[] = mod.getKnownProjectSkillDirs(cwd);
  const allDirs = [...userDirs, ...projectDirs];

  const results: InstalledSkill[] = [];

  for (const skillsDir of allDirs) {
    if (!fs.existsSync(skillsDir)) continue;

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(skillsDir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const skillPath = path.join(skillsDir, entry.name);
      const meta = readSkillMeta(skillPath);
      if (!meta) continue;

      const toolFamily: string = mod.detectSkillToolFamily(skillPath);
      results.push({
        name: meta.name,
        version: meta.version,
        toolFamily,
        path: skillPath,
      });
    }
  }

  return results;
}

/* ------------------------------------------------------------------ */
/*  Subcommand handlers                                                */
/* ------------------------------------------------------------------ */

async function handleInstall(args: string[], opts: GlobalOptions): Promise<void> {
  const { flags } = parseFlags(args, {
    force: { alias: 'f', type: 'boolean' },
    project: { alias: 'p', type: 'boolean' },
    user: { alias: 'u', type: 'boolean' },
    dest: { alias: 'd', type: 'string' },
    quiet: { alias: 'q', type: 'boolean' },
  });

  // Build argv for the install script's main() function
  const fwdArgs: string[] = [];
  if (flags.force) fwdArgs.push('--force');
  if (flags.project) fwdArgs.push('--project');
  if (flags.user) fwdArgs.push('--user');
  if (flags.dest) fwdArgs.push('--dest', flags.dest as string);
  if (flags.quiet || opts.quiet) fwdArgs.push('--quiet');

  // Save and restore process.argv so the install script sees the right flags
  const savedArgv = process.argv;
  process.argv = [process.argv[0], process.argv[1], ...fwdArgs];

  try {
    const { main } = await import(/* webpackIgnore: true */ pathToFileURL(SKILL_SCRIPT).href);
    main();

    if (opts.json) {
      // After install, report what was installed
      const installed = await scanInstalledSkills();
      writeJson({ success: true, installed });
    }
  } catch (err: unknown) {
    writeError((err as Error).message || String(err), opts.json);
  } finally {
    process.argv = savedArgv;
  }
}

async function handleList(_args: string[], opts: GlobalOptions): Promise<void> {
  const installed = await scanInstalledSkills();

  if (opts.json) {
    writeJson({ count: installed.length, skills: installed });
    return;
  }

  if (installed.length === 0) {
    process.stdout.write('No skills installed.\n');
    process.stdout.write('Run `synapse skill install` to install bundled skills.\n');
    return;
  }

  process.stdout.write(`Found ${installed.length} installed skill(s):\n\n`);

  const nameW = 20;
  const verW = 14;
  const toolW = 14;

  process.stdout.write(
    `  ${'NAME'.padEnd(nameW)}  ${'VERSION'.padEnd(verW)}  ${'CLIENT'.padEnd(toolW)}  PATH\n`
  );
  process.stdout.write(
    `  ${'-'.repeat(nameW)}  ${'-'.repeat(verW)}  ${'-'.repeat(toolW)}  ${'-'.repeat(40)}\n`
  );

  for (const s of installed) {
    const name = (s.name || '').padEnd(nameW);
    const ver = (s.version || '-').padEnd(verW);
    const tool = (s.toolFamily || 'default').padEnd(toolW);
    process.stdout.write(`  ${name}  ${ver}  ${tool}  ${s.path}\n`);
  }
  process.stdout.write('\n');

  // Show bundled skills available for install
  const mod = await getSkillModule();
  const bundled: string[] = mod.listBundledSkillDirs();
  if (bundled.length > 0) {
    const bundledNames = bundled.map((d: string) => path.basename(d));
    process.stdout.write(`Bundled skills available: ${bundledNames.join(', ')}\n`);
  }
}

async function handleRemove(args: string[], opts: GlobalOptions): Promise<void> {
  const { flags, positionals } = parseFlags(args, {
    force: { alias: 'f', type: 'boolean' },
  });

  const name = positionals[0];
  if (!name) {
    writeError('Skill name is required. Usage: synapse skill remove <name> [-f|--force]', opts.json);
    return;
  }

  const installed = (await scanInstalledSkills()).filter((s) => s.name === name);

  if (installed.length === 0) {
    writeError(`No installed skill found with name: ${name}`, opts.json);
    return;
  }

  if (!flags.force) {
    const locations = installed.map((s) => s.path).join('\n    ');
    const yes = await confirm(
      `Remove skill "${name}" from ${installed.length} location(s)?\n    ${locations}\n[y/N] `
    );
    if (!yes) {
      process.stdout.write('Cancelled.\n');
      return;
    }
  }

  const removed: string[] = [];
  const errors: Array<{ path: string; error: string }> = [];

  for (const s of installed) {
    try {
      fs.rmSync(s.path, { recursive: true, force: true });
      removed.push(s.path);
    } catch (err: unknown) {
      errors.push({ path: s.path, error: (err as Error).message });
    }
  }

  if (opts.json) {
    writeJson({
      name,
      removed,
      errors: errors.length > 0 ? errors : undefined,
    });
    return;
  }

  for (const p of removed) {
    process.stdout.write(`Removed: ${p}\n`);
  }
  for (const e of errors) {
    sharedWriteError(`Failed to remove ${e.path}: ${e.error}`);
  }

  if (errors.length > 0) {
    process.exitCode = 1;
  } else {
    process.stdout.write(`\nRemoved "${name}" from ${removed.length} location(s).\n`);
  }
}

/* ------------------------------------------------------------------ */
/*  Router                                                             */
/* ------------------------------------------------------------------ */

type Handler = (args: string[], opts: GlobalOptions) => Promise<void>;

const HANDLERS: Record<string, Handler> = {
  install: handleInstall,
  list: handleList,
  remove: handleRemove,
};

export async function run(args: string[], opts: GlobalOptions): Promise<void> {
  const verb = args[0] || '';

  if (!verb || verb === 'help' || verb === '--help' || verb === '-h') {
    printSubcommandHelp('skill', VERBS);
    return;
  }

  const handler = HANDLERS[verb];
  if (!handler) {
    sharedWriteError(`Unknown skill command: ${verb}`);
    printSubcommandHelp('skill', VERBS);
    process.exitCode = 1;
    return;
  }

  try {
    await handler(args.slice(1), opts);
  } catch (err: unknown) {
    writeError((err as Error).message || String(err), opts.json);
  }
}
