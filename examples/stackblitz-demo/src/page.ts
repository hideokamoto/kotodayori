export function renderPage(eventTypes: string[], modes: string[]): string {
  const options = eventTypes.map((t) => `<option value="${t}">${t}</option>`).join('');
  const labels: Record<string, string> = {
    valid: 'Send signed event',
    tampered: 'Send tampered body',
    unsigned: 'Send without signature',
  };
  const buttons = modes
    .map((m) => `<button data-mode="${m}">${labels[m] ?? m}</button>`)
    .join('');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Kotodayori demo</title>
<style>
  :root { color-scheme: light dark; --bg: #fff; --fg: #1a1a1a; --muted: #666; --panel: #f4f4f5; --accent: #4f46e5; --ok: #15803d; --ng: #b91c1c; }
  @media (prefers-color-scheme: dark) { :root { --bg: #111113; --fg: #ececec; --muted: #9a9a9a; --panel: #1c1c20; --accent: #818cf8; --ok: #4ade80; --ng: #f87171; } }
  body { margin: 0; padding: 24px 16px; background: var(--bg); color: var(--fg); font: 15px/1.6 system-ui, sans-serif; }
  main { max-width: 760px; margin: 0 auto; }
  h1 { font-size: 1.4rem; margin: 0 0 4px; }
  p { color: var(--muted); margin: 0 0 16px; }
  .controls { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
  select, button { font: inherit; padding: 6px 10px; border-radius: 6px; border: 1px solid var(--muted); background: var(--panel); color: var(--fg); }
  button { cursor: pointer; }
  button[data-mode="valid"] { background: var(--accent); border-color: var(--accent); color: #fff; }
  h2 { font-size: 1rem; margin: 16px 0 6px; }
  pre { background: var(--panel); padding: 12px; border-radius: 6px; overflow-x: auto; margin: 0; font-size: 13px; white-space: pre-wrap; word-break: break-all; }
  .status.ok { color: var(--ok); } .status.ng { color: var(--ng); }
</style>
</head>
<body>
<main>
  <h1>Kotodayori webhook demo</h1>
  <p>This page plays the role of Stripe: it signs a fake event with a demo webhook secret and posts it to <code>/webhook</code>.
     No Stripe account or API key is needed. Edit <code>src/router.ts</code> to change the handlers.</p>
  <div class="controls">
    <select id="type">${options}</select>
    ${buttons}
  </div>
  <h2>Response from /webhook: <span id="status" class="status"></span></h2>
  <pre id="response">Pick an event and send it.</pre>
  <h2>Router activity (middleware and handlers)</h2>
  <pre id="activity"></pre>
  <h2>Request sent to /webhook</h2>
  <pre id="request"></pre>
</main>
<script>
  const $ = (id) => document.getElementById(id);
  document.querySelectorAll('button[data-mode]').forEach((button) => {
    button.addEventListener('click', async () => {
      const res = await fetch('/demo/send', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: $('type').value, mode: button.dataset.mode }),
      });
      const result = await res.json();
      if (!res.ok) { $('response').textContent = JSON.stringify(result, null, 2); return; }
      const status = result.response.status;
      $('status').textContent = status;
      $('status').className = 'status ' + (status === 200 ? 'ok' : 'ng');
      $('response').textContent = JSON.stringify(result.response.body, null, 2);
      $('activity').textContent = result.activity.length
        ? result.activity.join('\\n')
        : '(no handler ran)';
      $('request').textContent =
        Object.entries(result.request.headers).map(([k, v]) => k + ': ' + v).join('\\n') +
        '\\n\\n' + result.request.body;
    });
  });
</script>
</body>
</html>`;
}
