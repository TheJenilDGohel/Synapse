import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../../');

/**
 * Synchronizes version strings across README, package.json, and docs.
 */
async function syncVersions() {
  const pkgPath = path.join(rootDir, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  const version = pkg.version;

  console.log(`Syncing version: ${version}`);

  // 1. Update src/core/runtime/version.ts
  const versionTsPath = path.join(rootDir, 'src/core/runtime/version.ts');
  if (fs.existsSync(versionTsPath)) {
    let content = fs.readFileSync(versionTsPath, 'utf-8');
    content = content.replace(/export const SERVER_VERSION: string = '.*?';/, `export const SERVER_VERSION: string = '${version}';`);
    fs.writeFileSync(versionTsPath, content);
    console.log(`- Updated ${versionTsPath}`);
  }

  // 2. Update README.md (MCP tools line)
  const readmePath = path.join(rootDir, 'README.md');
  if (fs.existsSync(readmePath)) {
    let content = fs.readFileSync(readmePath, 'utf-8');
    // Replace | MCP tools (vX.Y.Z) | with current version
    content = content.replace(/\| MCP tools \(v.*?\)\s*\|/, `| MCP tools (v${version}) |`);
    fs.writeFileSync(readmePath, content);
    console.log(`- Updated ${readmePath}`);
  }

  // 3. Update docs/pubspec.yaml
  const pubspecPath = path.join(rootDir, 'docs/pubspec.yaml');
  if (fs.existsSync(pubspecPath)) {
    let content = fs.readFileSync(pubspecPath, 'utf-8');
    content = content.replace(/^version: .*$/m, `version: ${version.replace('-beta.', '+beta')}`); // Dart versions use + for metadata
    fs.writeFileSync(pubspecPath, content);
    console.log(`- Updated ${pubspecPath}`);
  }
}

syncVersions().catch(err => {
  console.error(err);
  process.exit(1);
});
