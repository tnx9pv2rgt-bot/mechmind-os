const WebSocket = require('ws');

async function main() {
  const res = await fetch('http://localhost:9222/json');
  const tabs = await res.json();
  let tab = tabs.find(t => t.url.includes('localhost:3000'));
  if (!tab) tab = tabs[0];
  if (!tab) { console.error('No tabs found'); process.exit(1); }

  console.log('CONNECTED to:', tab.url);
  console.log('Monitoring errors... (will run until stopped)');
  console.log('---');

  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(r => ws.on('open', r));

  let id = 0;
  const send = (method, params = {}) => ws.send(JSON.stringify({ id: ++id, method, params }));

  send('Runtime.enable');
  send('Log.enable');
  send('Network.enable');

  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());

    if (msg.method === 'Runtime.consoleAPICalled') {
      const type = msg.params.type;
      if (type === 'error' || type === 'warning') {
        const text = msg.params.args.map(a => a.value || a.description || '').join(' ');
        const ts = new Date().toLocaleTimeString('it-IT');
        console.log('[' + ts + '] [' + type.toUpperCase() + '] ' + text.substring(0, 800));
      }
    }

    if (msg.method === 'Runtime.exceptionThrown') {
      const ex = msg.params.exceptionDetails;
      const text = ex.exception ? ex.exception.description : ex.text;
      const ts = new Date().toLocaleTimeString('it-IT');
      console.log('[' + ts + '] [EXCEPTION] ' + (text || 'unknown').substring(0, 800));
    }

    if (msg.method === 'Log.entryAdded') {
      const entry = msg.params.entry;
      if (entry.level === 'error' || entry.level === 'warning') {
        const ts = new Date().toLocaleTimeString('it-IT');
        console.log('[' + ts + '] [' + entry.level.toUpperCase() + '] ' + (entry.text || '').substring(0, 800));
      }
    }

    if (msg.method === 'Network.requestWillBeSent') {
      const url = msg.params.request.url;
      if (msg.params.type === 'Document' && url.includes('localhost:3000')) {
        console.log('[NAV] -> ' + url);
      }
    }
  });

  setInterval(() => send('Runtime.evaluate', { expression: '1' }), 30000);
}

main().catch(e => console.error('Failed:', e.message));
