#!/usr/bin/env node
/**
 * zip.mjs — zabalí balík aura-suite.
 *
 *   node apps/build/aura-suite/zip.mjs
 *
 * Vytvorí:
 *   aura-suite/_zip/<appka>.zip     index.html + screens/ + README.md jednej appky
 *   aura-suite/_zip/aura-suite.zip  celý balík vrátane rozcestníka
 *
 * ZIPy sú v .gitignore — generujú sa z obsahu repa, netreba ich verziovať dvakrát.
 */
import { existsSync, mkdirSync, readdirSync, statSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const SUITE = resolve(__dir, '../../aura-suite');
const ZIP = join(SUITE, '_zip');
if (!existsSync(SUITE)) { console.error('Chýba ' + SUITE); process.exit(2); }
if (existsSync(ZIP)) rmSync(ZIP, { recursive: true, force: true });
mkdirSync(ZIP, { recursive: true });

const apps = readdirSync(SUITE).filter(d => !d.startsWith('_') && statSync(join(SUITE, d)).isDirectory());
const mb = p => (statSync(p).size / 1048576).toFixed(1) + ' MB';

for (const a of apps){
  const out = join(ZIP, `${a}.zip`);
  execFileSync('zip', ['-rq', out, a, '-x', '*.DS_Store'], { cwd: SUITE });
  console.log(`  ✓ ${a}.zip  ${mb(out)}`);
}
const all = join(ZIP, 'aura-suite.zip');
execFileSync('zip', ['-rq', all, ...apps, 'index.html', 'README.md', '-x', '*.DS_Store'], { cwd: SUITE });
console.log(`  ✓ aura-suite.zip  ${mb(all)}  (${apps.length} appiek + rozcestník)`);
console.log('\nZIPy: ' + ZIP);
