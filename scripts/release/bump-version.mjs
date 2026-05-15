import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../../');

/**
 * Bumps the version in package.json to the next CalVer (YYYY.MM.Patch).
 */
async function bumpCalVer() {
  const args = process.argv.slice(2);
  const isBeta = args.includes('--beta');
  
  const pkgPath = path.join(rootDir, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  const currentVersion = pkg.version;

  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');

  let nextVersion;
  // Match YYYY.MM.Patch or YYYY.MM.Patch-beta.X
  const match = currentVersion.match(/^(\d{4})\.(\d{2})\.(\d+)(?:-beta\.(\d+))?$/);

  if (match) {
    const [ , currYyyy, currMm, currPatch, currBeta] = match;
    
    if (currYyyy === String(yyyy) && currMm === mm) {
      if (isBeta) {
        if (currBeta !== undefined) {
          // Already on beta, increment beta count
          nextVersion = `${currYyyy}.${currMm}.${currPatch}-beta.${parseInt(currBeta, 10) + 1}`;
        } else {
          // Switching from stable to beta, increment patch and start beta at 0
          nextVersion = `${currYyyy}.${currMm}.${parseInt(currPatch, 10) + 1}-beta.0`;
        }
      } else {
        // Increment patch for stable
        nextVersion = `${currYyyy}.${currMm}.${parseInt(currPatch, 10) + 1}`;
      }
    } else {
      // New month or year
      if (isBeta) {
        nextVersion = `${yyyy}.${mm}.0-beta.0`;
      } else {
        nextVersion = `${yyyy}.${mm}.0`;
      }
    }
  } else {
    // Not in expected CalVer format, fallback to initial CalVer
    nextVersion = isBeta ? `${yyyy}.${mm}.0-beta.0` : `${yyyy}.${mm}.0`;
  }

  console.log(`Bumping version: ${currentVersion} -> ${nextVersion}`);
  
  pkg.version = nextVersion;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  
  console.log('Successfully bumped package.json version.');
}

bumpCalVer().catch(err => {
  console.error(err);
  process.exit(1);
});
