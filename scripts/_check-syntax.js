const fs = require('fs');
const path = require('path');
const css = fs.readFileSync(path.join(__dirname, '../public/css/radio.css'), 'utf8');
const open = (css.match(/\{/g) || []).length;
const close = (css.match(/\}/g) || []).length;
console.log('css braces', open, close, open === close ? 'ok' : 'MISMATCH');
try {
  require('vm').runInNewContext(fs.readFileSync(path.join(__dirname, '../public/js/main.js'), 'utf8'), Object.create(null), { filename: 'main.js', timeout: 1 });
} catch (e) {
  // timeout or DOM refs expected; syntax errors show differently
  if (e instanceof SyntaxError) {
    console.log('JS SyntaxError', e.message);
    process.exit(1);
  }
  console.log('js parse ok (runtime:', e.name, ')');
}
const { spawnSync } = require('child_process');
const r = spawnSync(process.execPath, ['--check', path.join(__dirname, '../public/js/main.js')], { encoding: 'utf8' });
console.log('node --check', r.status === 0 ? 'ok' : r.stderr);
