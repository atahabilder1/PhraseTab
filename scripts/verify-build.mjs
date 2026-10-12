/**
 * Check that `dist/` is a loadable, offline, minimal-permission extension.
 *
 * This exists because the guarantees WordTab makes are easy to break by
 * accident and impossible to see in a screenshot: a stray CDN font link, an
 * inline <script> that Manifest V3's CSP will refuse to run, a permission
 * added while debugging. Run with `npm run verify` (part of `npm run check`).
 */

import { readdir, readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, extname, join, relative } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');

/** Permissions WordTab is allowed to request. Adding one is a deliberate act. */
const ALLOWED_PERMISSIONS = ['storage'];

const failures = [];
const notes = [];

function check(condition, message) {
  if (!condition) failures.push(message);
}

async function walk(dir) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await walk(full)));
    else found.push(full);
  }
  return found;
}

async function main() {
  if (!existsSync(DIST)) {
    console.error('dist/ does not exist. Run `npm run build` first.');
    process.exitCode = 1;
    return;
  }

  const files = await walk(DIST);
  const rel = (path) => relative(DIST, path).split('\\').join('/');
  const names = new Set(files.map(rel));

  // --- Manifest ----------------------------------------------------------
  const manifestPath = join(DIST, 'manifest.json');
  check(existsSync(manifestPath), 'manifest.json is missing from dist/');
  if (!existsSync(manifestPath)) return report();

  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

  check(manifest.manifest_version === 3, 'manifest_version must be 3');
  check(Boolean(manifest.name), 'manifest is missing a name');
  check(
    /^\d+(\.\d+){0,3}$/.test(manifest.version ?? ''),
    'manifest version must be a dotted integer string',
  );
  check(
    Boolean(manifest.description) && manifest.description.length <= 132,
    'description must be present and at most 132 characters (Web Store limit)',
  );

  const permissions = manifest.permissions ?? [];
  for (const permission of permissions) {
    check(
      ALLOWED_PERMISSIONS.includes(permission),
      `unexpected permission "${permission}" — WordTab should only need: ${ALLOWED_PERMISSIONS.join(', ')}`,
    );
  }
  check(
    !manifest.host_permissions?.length,
    'host_permissions must stay empty: WordTab never reads page content',
  );
  check(
    !manifest.content_scripts,
    'content_scripts must stay absent: WordTab never runs on other sites',
  );

  const newTab = manifest.chrome_url_overrides?.newtab;
  check(Boolean(newTab), 'chrome_url_overrides.newtab is not set');

  // --- Referenced files exist -------------------------------------------
  const referenced = [
    newTab,
    manifest.options_page,
    ...Object.values(manifest.icons ?? {}),
  ].filter(Boolean);

  for (const path of referenced) {
    check(names.has(path), `manifest references "${path}", which is not in dist/`);
  }

  // --- HTML: CSP compliance and local-only references --------------------
  const htmlFiles = files.filter((file) => extname(file) === '.html');
  check(htmlFiles.length > 0, 'no HTML entry points were built');

  for (const file of htmlFiles) {
    const name = rel(file);
    // A review harness may be dropped into dist/ by hand; skip it.
    if (name.startsWith('_')) continue;

    const html = await readFile(file, 'utf8');

    // MV3's default extension_pages CSP is `script-src 'self'`: an inline
    // script is silently refused, which would break the theme pre-paint.
    const inlineScript = /<script(?![^>]*\ssrc=)[^>]*>[\s\S]*?<\/script>/i.exec(html);
    check(
      inlineScript === null,
      `${name} contains an inline <script>, which Manifest V3's CSP will block`,
    );

    check(
      !/\son\w+\s*=\s*["']/i.test(html),
      `${name} contains an inline event handler attribute, which the CSP will block`,
    );
  }

  // --- Nothing reaches the network --------------------------------------
  // A single remote font or script would break both the "works offline"
  // promise and the "no third party sees your new tabs" promise.
  // Match the forms that actually cause a request, rather than any URL-shaped
  // text: licence headers and comments legitimately name URLs.
  const HOST = String.raw`(?:https?:)?\/\/(?!localhost|127\.0\.0\.1)[a-z0-9.-]+\.[a-z]{2,}[^"'\s>)]*`;
  const FETCHING_PATTERNS = [
    new RegExp(String.raw`\b(?:src|href)\s*=\s*["']?(${HOST})`, 'gi'),
    new RegExp(String.raw`\burl\(\s*["']?(${HOST})`, 'gi'),
    new RegExp(String.raw`\b(?:from|import)\s*\(?\s*["'](${HOST})`, 'gi'),
    new RegExp(String.raw`\b(?:fetch|importScripts)\s*\(\s*["'](${HOST})`, 'gi'),
    new RegExp(String.raw`@import\s+(?:url\(\s*)?["']?(${HOST})`, 'gi'),
  ];
  const textExtensions = new Set(['.html', '.css', '.js', '.json']);

  for (const file of files) {
    const name = rel(file);
    if (name.startsWith('_') || !textExtensions.has(extname(file))) continue;

    const source = await readFile(file, 'utf8');
    for (const pattern of FETCHING_PATTERNS) {
      for (const match of source.matchAll(pattern)) {
        check(false, `${name} would fetch remote resource ${match[1]}`);
      }
    }
  }

  // --- Size --------------------------------------------------------------
  let total = 0;
  for (const file of files) {
    if (rel(file).startsWith('_')) continue;
    total += (await stat(file)).size;
  }
  notes.push(`packaged size: ${(total / 1024).toFixed(0)} KB across ${names.size} files`);

  const newTabBundle = files.find((file) => rel(file) === 'assets/newtab.js');
  if (newTabBundle) {
    notes.push(`newtab entry chunk: ${((await stat(newTabBundle)).size / 1024).toFixed(1)} KB`);
  }

  report();
}

function report() {
  for (const note of notes) console.log(`  ${note}`);
  if (failures.length === 0) {
    console.log('\n✓ dist/ is a valid, offline, minimal-permission MV3 extension');
    return;
  }
  console.error(`\n✗ ${failures.length} problem(s):`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
