const WebSocket = require('ws');

const PAGES = [
  '/auth',
  '/auth/forgot-password',
  '/auth/mfa/setup',
  '/auth/mfa/verify',
  '/auth/magic-link/verify',
  '/dashboard',
  '/dashboard/bookings',
  '/dashboard/bookings/new',
  '/dashboard/customers',
  '/dashboard/customers/new',
  '/dashboard/customers/new/landing',
  '/dashboard/customers/new/step1',
  '/dashboard/customers/new/step2',
  '/dashboard/customers/new/step3',
  '/dashboard/customers/new/step4',
  '/dashboard/vehicles',
  '/dashboard/vehicles/new',
  '/dashboard/settings',
  '/dashboard/analytics',
  '/dashboard/inspections',
  '/dashboard/inspections/new',
  '/dashboard/invoices',
  '/dashboard/invoices/financial',
  '/dashboard/invoices/quotes',
  '/dashboard/obd',
  '/dashboard/parts',
  '/dashboard/subscription',
  '/dashboard/billing',
  '/dashboard/locations',
  '/dashboard/warranty',
  '/dashboard/warranty/claims',
  '/dashboard/maintenance',
  '/dashboard/admin/subscriptions',
  '/portal/login',
  '/portal/register',
  '/portal/reset-password',
  '/portal/dashboard',
  '/portal/bookings',
  '/portal/bookings/new',
  '/portal/inspections',
  '/portal/maintenance',
  '/portal/documents',
  '/portal/warranty',
  '/portal/settings',
  '/billing/success',
  '/billing/cancel',
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
  const allIssues = [];
  let currentPage = '';

  const send = (method, params = {}) => {
    return new Promise((resolve) => {
      const id = ++reqId;
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => { if (pending.has(id)) { pending.delete(id); resolve(null); } }, 8000);
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
      if (text && !text.includes('Tenant identifier') && !text.includes('NEXT_REDIRECT')) {
        allIssues.push({ page: currentPage, type: 'JS_EXCEPTION', text: text.substring(0, 300) });
      }
    }
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      const text = msg.params.args.map(a => a.value || a.description || '').join(' ');
      if (!text.includes('Tenant identifier') && !text.includes('400 (Bad Request)') && !text.includes('Failed to load resource') && !text.includes('404')) {
        allIssues.push({ page: currentPage, type: 'CONSOLE_ERROR', text: text.substring(0, 300) });
      }
    }
  });

  await send('Runtime.enable');
  await send('Log.enable');
  await send('Page.enable');
  await send('DOM.enable');
  await send('Network.clearBrowserCache');

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const evalJS = async (expression) => {
    const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    return result;
  };

  // Set dark mode first
  await send('Page.navigate', { url: 'http://localhost:3000/dashboard' });
  await sleep(2000);
  await evalJS(`
    localStorage.setItem('theme', 'dark');
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
    document.documentElement.style.colorScheme = 'dark';
  `);
  await sleep(500);

  console.log('=== FULL DARK MODE AUDIT: ' + PAGES.length + ' pages ===\n');

  for (const page of PAGES) {
    currentPage = page;
    process.stdout.write(`[${PAGES.indexOf(page)+1}/${PAGES.length}] ${page} `);

    await send('Page.navigate', { url: `http://localhost:3000${page}` });
    await sleep(2500);

    // Re-enforce dark mode (some pages may reset it)
    await evalJS(`
      if (!document.documentElement.classList.contains('dark')) {
        localStorage.setItem('theme', 'dark');
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
        document.documentElement.style.colorScheme = 'dark';
      }
    `);
    await sleep(300);

    // Deep style audit
    const result = await evalJS(`
      (function() {
        const issues = [];
        const isDark = document.documentElement.classList.contains('dark');
        if (!isDark) { issues.push('NOT_IN_DARK_MODE'); return JSON.stringify({ isDark, issues }); }

        const IGNORE_TAGS = new Set(['IMG','SVG','VIDEO','CANVAS','IFRAME','PATH','CIRCLE','RECT','LINE','POLYGON','G','DEFS','CLIPPATH','STOP','USE','SYMBOL']);
        const allEls = document.querySelectorAll('*');

        let whiteBgEls = [];
        let darkTextOnDarkBg = [];
        let lowContrastEls = [];
        let lightBorderEls = [];

        for (const el of allEls) {
          if (IGNORE_TAGS.has(el.tagName)) continue;
          if (el.offsetWidth < 5 || el.offsetHeight < 5) continue;
          // Skip the toggle knob
          if (el.className && el.className.toString && el.className.toString().includes('h-[20px]')) continue;

          const cs = getComputedStyle(el);
          const bg = cs.backgroundColor;
          const color = cs.color;
          const borderColor = cs.borderColor;

          // Parse rgb values
          const parseBg = bg.match(/rgb\\((\\d+),\\s*(\\d+),\\s*(\\d+)/);
          const parseColor = color.match(/rgb\\((\\d+),\\s*(\\d+),\\s*(\\d+)/);

          if (parseBg) {
            const [r, g, b] = [+parseBg[1], +parseBg[2], +parseBg[3]];
            const brightness = (r * 299 + g * 587 + b * 114) / 1000;

            // White or very light background (brightness > 240)
            if (brightness > 240 && el.offsetWidth > 20 && el.offsetHeight > 15) {
              const tag = el.tagName.toLowerCase();
              const cls = (el.className.toString() || '').substring(0, 60);
              // Skip buttons on colored gradient backgrounds
              const parent = el.parentElement;
              const parentBg = parent ? getComputedStyle(parent).backgroundColor : '';
              const parentParsed = parentBg.match(/rgb\\((\\d+),\\s*(\\d+),\\s*(\\d+)/);
              const parentDark = parentParsed && ((+parentParsed[1] * 299 + +parentParsed[2] * 587 + +parentParsed[3] * 114) / 1000 < 128);

              if (!parentDark) {
                whiteBgEls.push(tag + (cls ? '.' + cls.split(' ')[0] : ''));
              }
            }
          }

          // Dark text on dark background (hard to read)
          if (parseBg && parseColor) {
            const bgBright = (+parseBg[1] * 299 + +parseBg[2] * 587 + +parseBg[3] * 114) / 1000;
            const txtBright = (+parseColor[1] * 299 + +parseColor[2] * 587 + +parseColor[3] * 114) / 1000;

            // Both dark = invisible text
            if (bgBright < 60 && txtBright < 60 && el.textContent.trim().length > 0 && el.children.length === 0) {
              const tag = el.tagName.toLowerCase();
              const text = el.textContent.trim().substring(0, 30);
              darkTextOnDarkBg.push(tag + ': "' + text + '" (bg:' + Math.round(bgBright) + ' txt:' + Math.round(txtBright) + ')');
            }

            // Low contrast (both in similar range)
            if (Math.abs(bgBright - txtBright) < 30 && el.textContent.trim().length > 0 && el.children.length === 0 && bgBright < 200) {
              const tag = el.tagName.toLowerCase();
              const text = el.textContent.trim().substring(0, 30);
              lowContrastEls.push(tag + ': "' + text + '" (bg:' + Math.round(bgBright) + ' txt:' + Math.round(txtBright) + ')');
            }
          }

          // Light/white borders that stand out
          const parseBorder = borderColor.match(/rgb\\((\\d+),\\s*(\\d+),\\s*(\\d+)/);
          if (parseBorder) {
            const bBright = (+parseBorder[1] * 299 + +parseBorder[2] * 587 + +parseBorder[3] * 114) / 1000;
            if (bBright > 200 && el.offsetWidth > 50 && cs.borderWidth && parseFloat(cs.borderWidth) >= 1) {
              const tag = el.tagName.toLowerCase();
              const cls = (el.className.toString() || '').substring(0, 60);
              lightBorderEls.push(tag + (cls ? '.' + cls.split(' ')[0] : '') + ' border-bright:' + Math.round(bBright));
            }
          }
        }

        if (whiteBgEls.length > 0) issues.push('WHITE_BG(' + whiteBgEls.length + '): ' + whiteBgEls.slice(0, 3).join(', '));
        if (darkTextOnDarkBg.length > 0) issues.push('INVISIBLE_TEXT(' + darkTextOnDarkBg.length + '): ' + darkTextOnDarkBg.slice(0, 3).join(', '));
        if (lowContrastEls.length > 0) issues.push('LOW_CONTRAST(' + lowContrastEls.length + '): ' + lowContrastEls.slice(0, 3).join(', '));
        if (lightBorderEls.length > 5) issues.push('LIGHT_BORDERS(' + lightBorderEls.length + '): ' + lightBorderEls.slice(0, 3).join(', '));

        return JSON.stringify({ isDark, issues });
      })()
    `);

    if (result && result.result && result.result.value) {
      const data = JSON.parse(result.result.value);
      if (data.issues.length > 0) {
        console.log('ISSUES:');
        for (const issue of data.issues) {
          console.log('    ' + issue);
          allIssues.push({ page, type: 'STYLE', text: issue });
        }
      } else {
        console.log('OK');
      }
    } else {
      console.log('(no data)');
    }

    // Click tabs if any
    await evalJS(`(function(){document.querySelectorAll('[role="tab"]').forEach((t,i)=>{if(i<3)try{t.click()}catch(e){}});return 'ok'})()`);
    await sleep(500);
  }

  // Summary
  console.log('\n========================================');
  console.log('=== FULL AUDIT COMPLETE ===');
  console.log('========================================\n');
  console.log('Pages tested: ' + PAGES.length);

  const styleIssues = allIssues.filter(i => i.type === 'STYLE');
  const jsIssues = allIssues.filter(i => i.type !== 'STYLE');
  console.log('Style issues: ' + styleIssues.length);
  console.log('JS errors: ' + jsIssues.length);

  if (allIssues.length > 0) {
    console.log('\n--- ALL ISSUES ---\n');
    const grouped = {};
    for (const e of allIssues) {
      if (!grouped[e.page]) grouped[e.page] = [];
      grouped[e.page].push(e);
    }
    for (const [pg, errs] of Object.entries(grouped)) {
      console.log(pg + ':');
      for (const e of errs) {
        console.log('  [' + e.type + '] ' + e.text);
      }
    }
  } else {
    console.log('\nPERFECT - No issues found on any page!');
  }

  ws.close();
  process.exit(0);
}

main().catch(e => { console.error('Failed:', e.message); process.exit(1); });
