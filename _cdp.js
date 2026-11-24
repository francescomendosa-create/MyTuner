const ws = new WebSocket('ws://127.0.0.1:9222/devtools/page/5863F6F433B83BA7EA44593B4C3EEB5B');
let n = 0;
function send(method, params) {
  n += 1;
  ws.send(JSON.stringify({ id: n, method, params }));
  return n;
}
ws.addEventListener('open', () => {
  const expr = `(() => {
    const a = document.querySelector('#player') || document.querySelector('audio');
    const src = a.currentSrc || a.src;
    a.pause();
    a.removeAttribute('src');
    a.load();
    a.src = src;
    const p = a.play();
    if (p && p.catch) p.catch(() => {});
    return src;
  })()`;
  send('Runtime.evaluate', { returnByValue: true, expression: expr });
});
ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id === 1) {
    console.log(msg.result && msg.result.result ? JSON.stringify(msg.result.result.value) : ev.data);
    setTimeout(poll, 3000);
    return;
  }
  const v = msg.result && msg.result.result && msg.result.result.value;
  console.log(JSON.stringify(v));
  if (n >= 6) { ws.close(); process.exit(0); }
  setTimeout(poll, 2500);
});
function poll() {
  const expr = `(() => {
    const a = document.querySelector('#player') || document.querySelector('audio');
    return { rs:a.readyState, ns:a.networkState, t:+a.currentTime.toFixed(2), buf:a.buffered.length?+a.buffered.end(0).toFixed(2):0, paused:a.paused, err:a.error?a.error.code:null };
  })()`;
  send('Runtime.evaluate', { returnByValue: true, expression: expr });
}
setTimeout(() => process.exit(1), 20000);
