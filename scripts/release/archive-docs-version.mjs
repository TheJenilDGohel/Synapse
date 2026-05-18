#!/usr/bin/env node

/**
 * Archive current docs state as a version snapshot.
 *
 * Usage:
 *   node scripts/release/archive-docs-version.mjs [version]
 *
 * If no version is provided, reads from package.json.
 *
 * Creates:
 *   - loci-docs/docs/versions/<version>/overview.md (snapshot summary)
 *   - loci-docs/docs/releases/<version>.md (release notes from CHANGELOG)
 *
 * Run this as part of every version bump workflow.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const DOCS_ROOT = path.join(ROOT, 'loci-docs', 'docs');

function getVersion() {
  const arg = process.argv[2];
  if (arg && !arg.startsWith('-')) return arg;
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  return pkg.version;
}

function extractChangelogSection(version) {
  const changelogPath = path.join(ROOT, 'CHANGELOG.md');
  if (!fs.existsSync(changelogPath)) return null;
  const content = fs.readFileSync(changelogPath, 'utf8');
  const pattern = new RegExp(`## \\[${version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\][\\s\\S]*?(?=\\n## \\[|$)`);
  const match = content.match(pattern);
  return match ? match[0] : null;
}

function countTools() {
  const toolFiles = ['core.js', 'memory-store.js', 'memory-workflow.js', 'retrieval.js', 'graph-tools.js'];
  let count = 0;
  for (const file of toolFiles) {
    const filePath = path.join(ROOT, 'src', 'mcp', 'tools', file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const matches = content.match(/registerJsonTool\(/g);
      if (matches) count += matches.length;
    }
  }
  return count || '?';
}

function main() {
  const version = getVersion();
  const today = new Date().toISOString().split('T')[0];
  const toolCount = countTools();

  console.log(`Archiving docs for version ${version}...`);

  // Create version archive directory
  const versionDir = path.join(DOCS_ROOT, 'versions', version);
  fs.mkdirSync(versionDir, { recursive: true });

  // Create version overview if it doesn't exist
  const overviewPath = path.join(versionDir, 'overview.md');
  if (!fs.existsSync(overviewPath)) {
    const changelogSection = extractChangelogSection(version);
    const summary = changelogSection
      ? changelogSection.split('\n').slice(0, 3).join(' ').replace(/^## \[.*?\].*?$/, '').trim()
      : `Version ${version} release.`;

    const overview = [
      `# ${version} Overview`,
      '',
      '<div className="docPanel docPanel--compact">',
      `  <p>${summary || `Version ${version} release.`}</p>`,
      '</div>',
      '',
      `## Tools`,
      '',
      `${toolCount} MCP tools.`,
      '',
      '## Requirements',
      '',
      '- **Node.js** 18+ (search and file tools), 22.13+ (memory and KG features)',
      '- **ripgrep** recommended for fast lexical search',
    ].join('\n');

    fs.writeFileSync(overviewPath, overview, 'utf8');
    console.log(`  Created: ${path.relative(ROOT, overviewPath)}`);
  } else {
    console.log(`  Exists: ${path.relative(ROOT, overviewPath)} (skipped)`);
  }

  // Create release notes if they don't exist
  const releasePath = path.join(DOCS_ROOT, 'releases', `${version}.md`);
  if (!fs.existsSync(releasePath)) {
    const changelogSection = extractChangelogSection(version);
    if (changelogSection) {
      const releaseNotes = [
        `# ${version}`,
        '',
        `**Released:** ${today}`,
        '',
        changelogSection.replace(/^## \[.*?\].*?\n/, ''),
        '',
        '### Upgrade',
        '',
        '```bash',
        `npm install -g loci@${version}`,
        '```',
      ].join('\n');

      fs.writeFileSync(releasePath, releaseNotes, 'utf8');
      console.log(`  Created: ${path.relative(ROOT, releasePath)}`);
    } else {
      console.log(`  Skipped release notes: no changelog section found for ${version}`);
    }
  } else {
    console.log(`  Exists: ${path.relative(ROOT, releasePath)} (skipped)`);
  }

  // Update current.md to reference latest version
  const currentPath = path.join(DOCS_ROOT, 'releases', 'current.md');
  if (fs.existsSync(currentPath)) {
    console.log(`  Note: Update ${path.relative(ROOT, currentPath)} manually to point to ${version}`);
  }

  console.log(`Done. Version ${version} archived.`);
}

main();
