const fs = require('fs');
const path = require('path');
const t = process.env.TEMP || process.env.TMP || '.';
for (const f of ['live-index.html', 'live-index2.html']) {
  const p = path.join(t, f);
  if (!fs.existsSync(p)) {
    console.log('missing', f);
    continue;
  }
  const h = fs.readFileSync(p, 'utf8');
  console.log('====', f, 'bytes', h.length);
  console.log(h.slice(0, 500));
  console.log('title', (h.match(/<title>[^<]*/i) || [])[0]);
  console.log('has radio id', /id=["']radio["']/.test(h));
  console.log('has MyTuner', /MyTuner/i.test(h));
  console.log('has digitalAmPm', /digitalAmPm/.test(h));
}
