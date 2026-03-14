const WebSocket = require('ws');

async function main() {
  const res = await fetch('http://localhost:9222/json');
  const tabs = await res.json();

  let tab = tabs.find(t => t.url.includes('localhost:3000'));
  if (!tab) {
    tab = tabs[0];
    if (!tab) { console.error('No tabs'); return; }
  }

  console.log('Connecting to tab:', tab.url);
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(r => ws.on('open', r));

  let id = 0;
  const send = (method, params = {}) => {
    ws.send(JSON.stringify({ id: ++id, method, params }));
  };

  // Clear cache and disable caching
  send('Network.enable');
  send('Network.clearBrowserCache');
  send('Network.setCacheDisabled', { cacheDisabled: true });

  // Clear storage (cookies, localStorage, sessionStorage, indexedDB, cacheStorage)
  send('Storage.clearDataForOrigin', {
    origin: 'http://localhost:3000',
    storageTypes: 'cookies,local_storage,session_storage,indexeddb,cache_storage,service_workers'
  });

  // Wait for cache clear
  await new Promise(r => setTimeout(r, 500));

  // Enable console capture
  send('Runtime.enable');
  send('Log.enable');
  send('Page.enable');

  // Navigate to blank first to kill old JS context
  send('Page.navigate', { url: 'about:blank' });
  await new Promise(r => setTimeout(r, 1000));

  // Navigate fresh to auth
  send('Page.navigate', { url: 'http://localhost:3000/auth' });

  const logs = [];
  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    if (msg.method === 'Runtime.consoleAPICalled') {
      const text = msg.params.args.map(a => a.value || a.description || '').join(' ');
      logs.push({ type: msg.params.type, text });
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      const ex = msg.params.exceptionDetails;
      const text = ex.exception ? ex.exception.description : ex.text;
      logs.push({ type: 'EXCEPTION', text: text || 'unknown' });
    }
    if (msg.method === 'Log.entryAdded') {
      logs.push({ type: msg.params.entry.level, text: msg.params.entry.text });
    }
  });

  // Wait for page to fully load
  await new Promise(r => setTimeout(r, 12000));

  console.log('\n=== OPERA CONSOLE (CACHE DISABLED) ===\n');
  for (const log of logs) {
    const icon = ['error', 'EXCEPTION'].includes(log.type) ? 'ERROR' : log.type === 'warning' ? 'WARN' : 'INFO';
    console.log('[' + icon + '] ' + log.text.substring(0, 500));
  }
  const errors = logs.filter(l => ['error', 'EXCEPTION'].includes(l.type));
  const warnings = logs.filter(l => l.type === 'warning');
  console.log('\n=== SUMMARY ===');
  console.log('Errors: ' + errors.length);
  console.log('Warnings: ' + warnings.length);
  console.log('Total: ' + logs.length);

  ws.close();
}

main().catch(e => console.error('Failed:', e.message));
