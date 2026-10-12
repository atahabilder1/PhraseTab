/**
 * Zip `dist/` into `release/phrasetab-<version>.zip` for the Chrome Web Store.
 *
 * The zip holds the contents of `dist/` at its root (manifest.json at the top
 * level), which is what the Web Store expects. Run with `npm run package`,
 * which builds and verifies first.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const RELEASE = join(ROOT, 'release');

const manifest = JSON.parse(readFileSync(join(DIST, 'manifest.json'), 'utf8'));
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));

if (manifest.version !== pkg.version) {
  console.error(
    `Version mismatch: manifest.json is ${manifest.version}, package.json is ${pkg.version}.`,
  );
  process.exit(1);
}

mkdirSync(RELEASE, { recursive: true });
const target = join(RELEASE, `phrasetab-${manifest.version}.zip`);
if (existsSync(target)) rmSync(target);

// -X drops macOS extra attributes; the exclusions keep Finder litter out.
execFileSync('zip', ['-r', '-X', '-q', target, '.', '-x', '*.DS_Store', '-x', '*.map'], {
  cwd: DIST,
  stdio: 'inherit',
});

console.log(`✓ ${target.replace(`${ROOT}/`, '')}`);
