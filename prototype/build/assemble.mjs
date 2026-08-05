import fs from 'fs';
import path from 'path';
const D = path.dirname(new URL(import.meta.url).pathname);
const R = f => { try { return fs.readFileSync(path.join(D, f), 'utf8'); } catch (e) { console.warn('CHÝBA:', f); return ''; } };

let html = R('base.html');
const parts = {
  '/*__FONTS__*/': R('fonts-inline.css'),
  '/*__SHELL_CSS__*/': R('shell.css'),
  '/*__ENGINE_JS__*/': R('engine.js'),
  '/*__SHELL_JS__*/': R('shell.js'),
  '/*__DATA_JS__*/': R('data.js'),
  '/*__S_PAMAT_JS__*/': R('s-pamat.js'),
  '/*__S_APPKY_JS__*/': R('s-appky.js'),
  '/*__S_PRACA_JS__*/': R('s-praca.js'),
  '/*__S_SYSTEM_JS__*/': R('s-system.js'),
  '/*__BOOT_JS__*/': R('boot.js'),
};
for (const [k, v] of Object.entries(parts)) {
  if (!html.includes(k)) { console.warn('marker nenájdený:', k); continue; }
  html = html.replace(k, () => v);
}
// obrazovky: Pamäť + Práca + Systém — poradie v DOM nemá vplyv na navigáciu
const screens = R('s-pamat.html') + '\n' + R('s-appky.html') + '\n' + R('s-praca.html') + '\n' + R('s-system.html');
html = html.replace('<!--__SCREENS__-->', () => screens);

const out = path.join(D, '..', 'auraai-app.html');
fs.writeFileSync(out, html, 'utf8');
const kb = (fs.statSync(out).size / 1024).toFixed(0);
const ids = [...html.matchAll(/<section class="view"[^>]*id="v-([a-z]+)"/g)].map(m => m[1]);
console.log('OK →', out, kb + ' KB');
console.log('obrazovky v DOM:', ids.join(', ') || 'ŽIADNE');
console.log('registrácie:', [...new Set([...html.matchAll(/(?:Aura|A|w\.Aura)\.screens\.([a-z]+)\s*=(?!=)/g)].map(m => m[1]))].join(', ') || 'ŽIADNE');
