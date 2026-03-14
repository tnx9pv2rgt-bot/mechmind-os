const WebSocket = require('ws');

const PAGES = [
  '/auth',
  '/dashboard',
  '/dashboard/bookings',
  '/dashboard/customers',
  '/dashboard/vehicles',
  '/dashboard/settings',
  '/dashboard/analytics',
  '/dashboard/inspections',
  '/dashboard/inspections/new',
  '/dashboard/invoices',
  '/dashboard/obd',
  '/dashboard/parts',
  '/dashboard/subscription',
  '/dashboard/billing',
  '/dashboard/locations',
  '/dashboard/warranty',
  '/dashboard/maintenance',
  '/portal/login',
  '/portal/register',
  '/portal/reset-password',
  '/demo',
];

async function main() {
  const res = await fetch('http://localhost:9222/json');
  const tabs = await res.json();
  let tab = tabs.find(t => t.url.includes('localhost:3000'));
  if (!tab) tab = tabs[0];
  if (!tab) { console.error('No tabs found'); process.exit(1); }

  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(r => ws.on('open', r));

  let reqId = 0;
  const pending = new Map();
  const errors = [];
  let currentPage = '';

  const send = (method, params = {}) => {
    return new Promise((resolve) => {
      const id = ++reqId;
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => { if (pending.has(id)) { pending.delete(id); resolve(null); } }, 5000);
    });
  };

  ws.on('message', (raw) => {
    const msg = JSON.parse(raw.toString());

    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg.result || null);
      pending.delete(msg.id);
    }

    if (msg.method === 'Runtime.exceptionThrown') {
      const ex = msg.params.exceptionDetails;
      const text = ex.exception ? ex.exception.description : ex.text;
      if (text && !text.includes('Tenant identifier')) {
        errors.push({ page: currentPage, type: 'EXCEPTION', text: text.substring(0, 300) });
      }
    }

    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      const text = msg.params.args.map(a => a.value || a.description || '').join(' ');
      if (!text.includes('Tenant identifier') && !text.includes('400 (Bad Request)') && !text.includes('Failed to load resource')) {
        errors.push({ page: currentPage, type: 'CONSOLE_ERROR', text: text.substring(0, 300) });
      }
    }
  });

  await send('Runtime.enable');
  await send('Log.enable');
  await send('Page.enable');
  await send('DOM.enable');

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const navigate = async (path) => {
    currentPage = path;
    await send('Page.navigate', { url: `http://localhost:3000${path}` });
    await sleep(3000); // wait for page load + hydration
  };

  const evalJS = async (expression) => {
    const result = await send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    return result;
  };

  const clickAll = async (selector, description) => {
    const result = await evalJS(`
      (function() {
        const els = document.querySelectorAll('${selector}');
        const results = [];
        els.forEach((el, i) => {
          if (i < 5) { // max 5 clicks per selector
            try {
              el.click();
              results.push('clicked: ' + (el.textContent || '').substring(0, 50).trim());
            } catch(e) {
              results.push('error: ' + e.message);
            }
          }
        });
        return JSON.stringify(results);
      })()
    `);
    if (result && result.result && result.result.value) {
      const clicks = JSON.parse(result.result.value);
      if (clicks.length > 0) {
        console.log(`    [CLICK] ${description}: ${clicks.length} elements`);
      }
    }
  };

  const checkDarkMode = async () => {
    const result = await evalJS(`
      (function() {
        const issues = [];
        // Check for elements with white/light backgrounds that didn't get dark mode
        const allEls = document.querySelectorAll('*');
        let whiteBgCount = 0;
        let darkClassCount = 0;
        for (const el of allEls) {
          const cs = getComputedStyle(el);
          const bg = cs.backgroundColor;
          // Check if dark mode is active
          if (document.documentElement.classList.contains('dark')) {
            // In dark mode, check for pure white backgrounds
            if (bg === 'rgb(255, 255, 255)' && el.offsetWidth > 10 && el.offsetHeight > 10) {
              const tag = el.tagName.toLowerCase();
              const cls = el.className.toString().substring(0, 80);
              if (!cls.includes('dark:') && tag !== 'img' && tag !== 'svg') {
                whiteBgCount++;
                if (whiteBgCount <= 3) {
                  issues.push(tag + '.' + cls.split(' ').slice(0,2).join('.'));
                }
              }
            }
          }
        }
        if (whiteBgCount > 0) {
          issues.unshift('Found ' + whiteBgCount + ' white-bg elements in dark mode');
        }
        const isDark = document.documentElement.classList.contains('dark');
        return JSON.stringify({ isDark, issues });
      })()
    `);
    if (result && result.result && result.result.value) {
      const data = JSON.parse(result.result.value);
      if (data.issues.length > 0) {
        console.log(`    [DARK] Issues: ${data.issues.join(', ')}`);
        errors.push({ page: currentPage, type: 'DARK_MODE', text: data.issues.join(', ') });
      } else {
        console.log(`    [DARK] OK (dark=${data.isDark})`);
      }
    }
  };

  console.log('=== AUTO-TEST OPERA: ' + PAGES.length + ' pages ===\n');

  // First ensure dark mode
  await navigate('/dashboard');
  await evalJS(`
    localStorage.setItem('theme', 'dark');
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
    document.documentElement.style.colorScheme = 'dark';
  `);
  await sleep(500);

  for (const page of PAGES) {
    console.log(`[PAGE] ${page}`);
    await navigate(page);

    // Check for JS errors (already collected via listeners)

    // Check dark mode
    await checkDarkMode();

    // Click interactive elements
    await clickAll('button:not([disabled])', 'buttons');
    await sleep(500);

    // Click tabs
    await clickAll('[role="tab"]', 'tabs');
    await sleep(500);

    // Check for new errors after clicks
    await sleep(1000);

    console.log('');
  }

  // Summary
  console.log('\n========================================');
  console.log('=== TEST COMPLETE ===');
  console.log('========================================\n');
  console.log(`Pages tested: ${PAGES.length}`);
  console.log(`Total issues: ${errors.length}`);

  if (errors.length > 0) {
    console.log('\n--- ISSUES FOUND ---\n');
    const grouped = {};
    for (const e of errors) {
      if (!grouped[e.page]) grouped[e.page] = [];
      grouped[e.page].push(e);
    }
    for (const [page, errs] of Object.entries(grouped)) {
      console.log(`${page}:`);
      for (const e of errs) {
        console.log(`  [${e.type}] ${e.text}`);
      }
    }
  } else {
    console.log('\nNo issues found! All pages clean in dark mode.');
  }

  ws.close();
  process.exit(0);
}

main().catch(e => { console.error('Failed:', e.message); process.exit(1); });
