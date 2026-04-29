#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const argv = process.argv.slice(2);

// ANSI Colors
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

const SKILL_TOOL_PREAMBLES = {
  codex: 'Tool target: Codex. Prefer concise action-oriented guidance and Codex-compatible file/task workflows.',
  copilot: 'Tool target: GitHub Copilot / VS Code agent mode. Keep guidance aligned with Agent Skills conventions and repo/project-first workflows.',
  claude: 'Tool target: Claude Code. Keep instructions direct, text-first, and compatible with Claude-style skill discovery.',
  cline: 'Tool target: Cline. Keep steps explicit and avoid assuming hidden project context.',
  continue: 'Tool target: Continue. Prefer short instructions that work well with IDE-driven agent loops.',
  cursor: 'Tool target: Cursor. Keep instructions optimized for editor-first coding workflows and Agent Skills compatibility.',
  windsurf: 'Tool target: Windsurf / Cascade. Prefer concise, task-scoped instructions that fit Windsurf skill usage patterns.',
  opencode: 'Tool target: OpenCode. Keep guidance CLI-friendly and compatible with OpenCode skill discovery.',
  gemini: 'Tool target: Gemini CLI. Keep guidance compact and explicit because Gemini uses extension-oriented local workflows.',
  antigravity: 'Tool target: Antigravity. Keep guidance concise and compatible with Gemini/Antigravity local agent workflows.',
  kiro: 'Tool target: Kiro (AWS). Keep guidance compatible with Kiro steering and agent skills conventions.',
  agents: 'Tool target: generic agents-compatible skill directory. Keep instructions portable and convention-based.',
  github: 'Tool target: project-level GitHub Agent Skills. Keep instructions team-safe and repository-oriented.',
  default: ''
};

function hasFlag(flag) {
  return argv.includes(flag) || argv.includes(`--${flag}`);
}



function shouldDecorateSkillMarkdown(relativePath) {
  return relativePath === 'SKILL.md';
}

function buildToolSpecificSkillMarkdown(rawText, toolFamily) {
  const preamble = SKILL_TOOL_PREAMBLES[toolFamily] || SKILL_TOOL_PREAMBLES.default;
  if (!preamble) return rawText;
  if (rawText.includes(preamble)) return rawText;
  return `${preamble}\n\n${rawText}`;
}

/**
 * Perform a quality audit on the skill content.
 */
function auditSkill(skillDir) {
  const skillMdPath = path.join(skillDir, 'SKILL.md');
  if (!fs.existsSync(skillMdPath)) return { score: 0, warnings: ['Missing SKILL.md'] };

  const content = fs.readFileSync(skillMdPath, 'utf8');
  let score = 100;
  const warnings = [];

  const requiredSections = [
    '## Core Concepts',
    '## Code Examples',
    '## Best Practices'
  ];

  for (const section of requiredSections) {
    if (!content.includes(section)) {
      score -= 20;
      warnings.push(`Missing section: ${section}`);
    }
  }

  if (content.length < 500) {
    score -= 10;
    warnings.push('Content is very short (< 500 chars)');
  }

  // Security check
  const dangerousPhrases = ['rm -rf /', 'sudo ', '.env', 'password', 'api_key'];
  for (const phrase of dangerousPhrases) {
    if (content.toLowerCase().includes(phrase)) {
      warnings.push(`Security check: Found sensitive phrase "${phrase}"`);
    }
  }

  return { score: Math.max(0, score), warnings };
}

/**
 * Generate client-native instruction files alongside the standard SKILL.md.
 */
function generateClientNativeFiles(targetSkillDir, toolFamily, skillContent) {
  const parentDir = path.dirname(targetSkillDir);
  const grandparentDir = path.dirname(parentDir);

  // Handle SOP-first generation for AI tools
  const sopPath = path.join(targetSkillDir, 'SOP.md');
  const hasSop = fs.existsSync(sopPath);
  const sopContent = hasSop ? fs.readFileSync(sopPath, 'utf8') : '';

  // Extract the core instruction content (strip YAML frontmatter for non-Claude clients)
  const coreContent = skillContent.replace(/^---\n[\s\S]*?\n---\n\n?/, '');
  const toolLine = SKILL_TOOL_PREAMBLES[toolFamily] || '';
  const header = toolLine ? `${toolLine}\n\n` : '';

  const finalInstructions = hasSop 
    ? `${header}# MANDATORY PROCEDURES\n\n${sopContent}\n\n# SKILL OVERVIEW\n\n${coreContent}`
    : header + coreContent;

  switch (toolFamily) {
    case 'cursor': {
      const rulesDir = path.join(grandparentDir, 'rules');
      fs.mkdirSync(rulesDir, { recursive: true });
      const ruleContent = [
        '---',
        'description: Synapse Expert — Persistent Memory, Code Search, and Knowledge Graph SOP',
        'globs:',
        '  - "**/*"',
        'alwaysApply: true',
        '---',
        '',
        finalInstructions
      ].join('\n');
      fs.writeFileSync(path.join(rulesDir, 'synapse.mdc'), ruleContent, 'utf8');
      break;
    }
    case 'windsurf': {
      const rulesDir = path.join(grandparentDir, 'rules');
      fs.mkdirSync(rulesDir, { recursive: true });
      const wsContent = [
        '---',
        'trigger: always_on',
        'description: Synapse Expert — Persistent Memory, Code Search, and Knowledge Graph SOP',
        '---',
        '',
        finalInstructions
      ].join('\n');
      fs.writeFileSync(path.join(rulesDir, 'synapse.md'), wsContent, 'utf8');
      break;
    }
    case 'opencode': {
      const agentsContent = [
        '---',
        'description: Synapse Expert — Persistent Memory, Code Search, and Knowledge Graph SOP',
        'keywords: [synapse, memory, knowledge, graph, search, code, file, project, nest, branch, recall, ingest, diary, triple, entity]',
        'globs: ["**/*"]',
        'match: any',
        '---',
        '',
        finalInstructions
      ].join('\n');
      const agentsMdPath = path.join(grandparentDir, 'AGENTS.md');
      fs.writeFileSync(agentsMdPath, agentsContent, 'utf8');
      break;
    }
    case 'copilot': {
      const instructionsPath = path.join(grandparentDir, 'copilot-instructions.md');
      fs.writeFileSync(instructionsPath, finalInstructions, 'utf8');
      break;
    }
    case 'cline': {
      const rulesDir = path.join(grandparentDir, 'rules');
      fs.mkdirSync(rulesDir, { recursive: true });
      const clineContent = [
        '---',
        'description: Synapse Expert — Persistent Memory, Code Search, and Knowledge Graph SOP',
        'tags: [mcp, memory, search, knowledge-graph]',
        '---',
        '',
        finalInstructions
      ].join('\n');
      fs.writeFileSync(path.join(rulesDir, 'synapse.md'), clineContent, 'utf8');
      break;
    }
    case 'continue': {
      const rulesDir = path.join(grandparentDir, 'rules');
      fs.mkdirSync(rulesDir, { recursive: true });
      const continueContent = [
        '---',
        'name: Synapse Expert',
        'description: Persistent Memory, Code Search, and Knowledge Graph SOP',
        'alwaysApply: true',
        '---',
        '',
        finalInstructions
      ].join('\n');
      fs.writeFileSync(path.join(rulesDir, 'synapse.md'), continueContent, 'utf8');
      break;
    }
    default:
      break;
  }
}

function copyOrLinkDir(source, destination, { link, toolFamily = 'default', relativePath = '' }) {
  if (link && !relativePath) {
    // Only symlink the root directory
    if (fs.existsSync(destination)) {
      const stats = fs.lstatSync(destination);
      if (stats.isSymbolicLink()) fs.unlinkSync(destination);
      else fs.rmSync(destination, { recursive: true, force: true });
    }
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.symlinkSync(path.resolve(source), destination, 'dir');
    return;
  }

  const stats = fs.statSync(source);
  if (stats.isDirectory()) {
    fs.mkdirSync(destination, { recursive: true });
    for (const entry of fs.readdirSync(source)) {
      const childSource = path.join(source, entry);
      const childDestination = path.join(destination, entry);
      const childRelative = relativePath ? path.join(relativePath, entry) : entry;
      copyOrLinkDir(childSource, childDestination, { link, toolFamily, relativePath: childRelative });
    }
    return;
  }

  fs.mkdirSync(path.dirname(destination), { recursive: true });
  if (shouldDecorateSkillMarkdown(relativePath)) {
    const raw = fs.readFileSync(source, 'utf8');
    fs.writeFileSync(destination, buildToolSpecificSkillMarkdown(raw, toolFamily), 'utf8');
    return;
  }
  fs.copyFileSync(source, destination);
}



export function listBundledSkillDirs(metaUrl = import.meta.url) {
  const scriptDir = path.dirname(fileURLToPath(metaUrl));
  const packageRoot = path.resolve(scriptDir, '..', '..');
  const skillsRoot = path.join(packageRoot, 'skills');
  try {
    return fs.readdirSync(skillsRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(skillsRoot, entry.name))
      .filter((skillDir) => fs.existsSync(path.join(skillDir, 'SKILL.md')))
      .sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

export function getKnownToolSkillDirs(homeDir = os.homedir()) {
  return [
    path.join(homeDir, '.agents', 'skills'),
    path.join(homeDir, '.codex', 'skills'),
    path.join(homeDir, '.copilot', 'skills'),
    path.join(homeDir, '.claude', 'skills'),
    path.join(homeDir, '.cursor', 'skills'),
    path.join(homeDir, '.codeium', 'windsurf', 'skills'),
    path.join(homeDir, '.opencode', 'skills'),
    path.join(homeDir, '.config', 'opencode', 'skills'),
    path.join(homeDir, '.gemini', 'skills'),
    path.join(homeDir, '.gemini', 'antigravity', 'skills'),
    path.join(homeDir, '.cline', 'skills'),
    path.join(homeDir, '.continue', 'skills'),
    path.join(homeDir, '.kiro', 'skills')
  ];
}

export function getKnownProjectSkillDirs(cwd = process.cwd()) {
  return [
    path.join(cwd, '.github', 'skills'),
    path.join(cwd, '.claude', 'skills'),
    path.join(cwd, '.windsurf', 'skills'),
    path.join(cwd, '.opencode', 'skills')
  ];
}

export function detectSkillToolFamily(targetSkillDir) {
  const normalized = String(targetSkillDir || '').replace(/\\/g, '/');
  if (normalized.includes('/.codex/')) return 'codex';
  if (normalized.includes('/.copilot/') || normalized.includes('/.github/')) return 'copilot';
  if (normalized.includes('/.claude/')) return 'claude';
  if (normalized.includes('/.cursor/')) return 'cursor';
  if (normalized.includes('/.windsurf/') || normalized.includes('/.codeium/windsurf/')) return 'windsurf';
  if (normalized.includes('/.opencode/') || normalized.includes('/.config/opencode/')) return 'opencode';
  if (normalized.includes('/.gemini/antigravity/')) return 'antigravity';
  if (normalized.includes('/.gemini/')) return 'gemini';
  if (normalized.includes('/.cline/')) return 'cline';
  if (normalized.includes('/.continue/')) return 'continue';
  if (normalized.includes('/.kiro/')) return 'kiro';
  if (normalized.includes('/.agents/')) return 'agents';
  return 'default';
}

function installOrUpdateSkill(sourceSkillDir, targetSkillDir, { force, link } = {}) {
  const toolFamily = detectSkillToolFamily(targetSkillDir);

  if (fs.existsSync(targetSkillDir) && !force && !link) {
    return { changed: false, targetSkillDir };
  }

  if (fs.existsSync(targetSkillDir)) {
    fs.rmSync(targetSkillDir, { recursive: true, force: true });
  }

  copyOrLinkDir(sourceSkillDir, targetSkillDir, { link, toolFamily });

  // Generate client-native instruction files
  try {
    const skillContent = fs.readFileSync(path.join(targetSkillDir, 'SKILL.md'), 'utf8');
    generateClientNativeFiles(targetSkillDir, toolFamily, skillContent);
  } catch {
    // Non-fatal
  }

  return { changed: true, targetSkillDir };
}

export function main() {
  const force = hasFlag('--force') || hasFlag('-f');
  const link = hasFlag('--link') || hasFlag('-l');
  const quiet = hasFlag('--quiet') || hasFlag('-q');
  const project = hasFlag('--project') || hasFlag('-p');
  
  if (!quiet) {
    console.log(`\n${C.bold}${C.blue}Synapse Skill Installer${C.reset}`);
    console.log(`${C.dim}────────────────────────────────────────────────────────${C.reset}\n`);
  }

  const sourceSkillDirs = listBundledSkillDirs();
  if (sourceSkillDirs.length === 0) {
    if (!quiet) console.error(`${C.red}✖ No bundled skills found${C.reset}`);
    process.exitCode = 1;
    return;
  }

  const userTargets = getKnownToolSkillDirs(os.homedir()).filter(d => fs.existsSync(path.dirname(d)));
  const projectTargets = project ? getKnownProjectSkillDirs(process.cwd()) : [];
  const allTargets = [...userTargets, ...projectTargets];



  for (const sourceSkillDir of sourceSkillDirs) {
    const skillName = path.basename(sourceSkillDir);
    const audit = auditSkill(sourceSkillDir);
    
    if (!quiet) {
      const scoreColor = audit.score >= 90 ? C.green : (audit.score >= 70 ? C.yellow : C.red);
      console.log(`${C.bold}● ${skillName}${C.reset}  ${C.dim}[Score: ${C.reset}${scoreColor}${audit.score}${C.reset}${C.dim}/100]${C.reset}`);
      for (const warning of audit.warnings) {
        console.log(`  ${C.yellow}⚠ ${warning}${C.reset}`);
      }
    }

    for (const targetDir of allTargets) {
      const dest = path.join(targetDir, skillName);
      const result = installOrUpdateSkill(sourceSkillDir, dest, { quiet, force, link });
      if (result.changed) {
        if (!quiet) {
          const mode = link ? 'linked' : 'copied';
          const family = detectSkillToolFamily(dest);
          console.log(`  ${C.green}✓${C.reset} ${C.dim}${mode} to ${C.reset}${family}${C.dim} (${dest})${C.reset}`);
        }
      }
    }
    console.log('');
  }

  // Claude Code hooks (special case)
  try {
    const __dir = path.dirname(fileURLToPath(import.meta.url));
    const hooksInstaller = path.resolve(__dir, '..', 'hooks', 'install-hooks.cjs');
    if (fs.existsSync(hooksInstaller)) {
      spawnSync(process.execPath, [hooksInstaller], { stdio: 'ignore' });
      if (!quiet) console.log(`${C.green}✓ Installed Claude Code auto-memory hooks${C.reset}\n`);
    }
  } catch { /* ignore */ }

  // Install @huggingface/transformers for embedding support (not bundled to avoid
  // onnxruntime TAR_ENTRY_ERRORS during npm git-dep auto-bundling).
  // IMPORTANT: Skip during git-dep preparation (temp dir) — only install at final location.
  try {
    const __dir2 = path.dirname(fileURLToPath(import.meta.url));
    const pkgRoot = path.resolve(__dir2, '..', '..');
    const isGitDepPrep = pkgRoot.includes(path.join('.npm', '_cacache', 'tmp'));
    if (!isGitDepPrep) {
      const hfPath = path.join(pkgRoot, 'node_modules', '@huggingface', 'transformers');
      if (!fs.existsSync(hfPath)) {
        if (!quiet) process.stdout.write(`${C.dim}Installing ML dependencies for semantic search...${C.reset}`);
        const isWindows = process.platform === 'win32';
        const npmBin = isWindows ? 'npm.cmd' : 'npm';
        const result = spawnSync(npmBin, ['install', '--no-save', '--no-audit', '--no-fund', '@huggingface/transformers@^4.0.1'], {
          cwd: pkgRoot,
          stdio: 'pipe',
          timeout: 120_000,
          shell: isWindows,
          env: { ...process.env, npm_config_loglevel: 'error' },
        });
        if (result.status === 0) {
          if (!quiet) console.log(` ${C.green}✓${C.reset}`);
        } else {
          if (!quiet) console.log(` ${C.yellow}⚠ skipped (install manually: npm install @huggingface/transformers)${C.reset}`);
        }
      }
    }
  } catch { /* best-effort — embeddings will be disabled if this fails */ }

  if (!quiet) {
    console.log(`${C.bold}${C.green}Installation Complete!${C.reset}`);
    console.log(`${C.dim}Restart your AI tools to load the updated skills.${C.reset}\n`);
  }
}

const isDirectExecution = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isDirectExecution) main();
