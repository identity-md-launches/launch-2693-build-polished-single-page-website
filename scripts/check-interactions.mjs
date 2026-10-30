// Interaction checks against the built export, served at a /preview/ subpath by this script.
// Usage: node scripts/check-interactions.mjs [distDir] [shotsDir]
// Playwright is not a project dependency; point PLAYWRIGHT_MODULE at its index.mjs if it is installed elsewhere.
const { chromium, webkit } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const dist = path.resolve(process.argv[2] ?? 'dist');
const shots = process.argv[3] ?? 'test/scratch/shots';
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (!url.pathname.startsWith('/preview/')) { res.writeHead(404); return res.end(); }
  let file = path.join(dist, decodeURIComponent(url.pathname.slice('/preview/'.length)) || 'index.html');
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!file.startsWith(dist) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': types[path.extname(file)] ?? 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/preview/`;

const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' :: ' + detail : ''}`); };
const RPC = /publicnode\.com|tenderly\.co/;

async function run(engine, label) {
  let browser;
  try { browser = await engine.launch(); } catch (e) { check(`${label}: launch`, false, String(e).split('\n')[0]); return; }
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errors = [], failed = [], rpcCalls = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('requestfailed', (r) => failed.push(r.url()));
  page.on('request', (r) => { if (RPC.test(r.url())) rpcCalls.push(r.postData() ?? ''); });

  // 1. Load and read live data.
  await page.goto(base);
  await page.waitForFunction(() => /\d/.test(document.querySelector('.wheel__height')?.textContent ?? ''), null, { timeout: 30000 });
  const height = await page.textContent('.wheel__height');
  const pct = await page.getAttribute('[role=progressbar]', 'aria-valuenow');
  const stats = await page.$$eval('.stat', (els) => els.map((e) => e.innerText.replace(/\n+/g, ' | ')));
  check(`${label}: live data renders`, /^\d{1,3}(,\d{3})*$/.test(height), `height ${height}, progress ${pct}%, stats ${JSON.stringify(stats)}`);
  check(`${label}: status reads live`, (await page.textContent('.status')).includes('Live on Sepolia') || (await page.textContent('.status')).includes('Settlement paused'), await page.textContent('.status'));
  const local = await page.$$eval('link[rel=icon], script[src], link[rel=stylesheet]', (els) => els.map((e) => e.getAttribute('src') ?? e.getAttribute('href')));
  check(`${label}: asset URLs are relative`, local.every((u) => u.startsWith('./')), local.join(' '));

  // 2. First screen at 390: wheel, block height, progress bar and Refresh button in the first 844px.
  const boxes = await page.evaluate(() => ['.wheel', '[role=progressbar]', '.btn--primary'].map((s) => document.querySelector(s).getBoundingClientRect().bottom));
  check(`${label}: product and action on first screen at 390`, boxes.every((b) => b <= 844), `bottoms ${boxes.map(Math.round).join(', ')}`);

  // 3. Refresh now triggers a new read and updates "Updated" text.
  const before = rpcCalls.length;
  await page.click('.btn--primary');
  await page.waitForFunction(() => document.querySelector('.btn--primary').textContent === 'Refresh now', null, { timeout: 20000 });
  check(`${label}: Refresh now reads again`, rpcCalls.length > before, `${rpcCalls.length - before} RPC requests`);

  // 4. Auto-refresh within 15-20 s.
  const beforeAuto = rpcCalls.length;
  await page.waitForTimeout(17500);
  check(`${label}: auto-refresh after 15 s`, rpcCalls.length > beforeAuto, `${rpcCalls.length - beforeAuto} RPC requests in 17.5 s`);

  // 5. Keyboard: Tab reaches Refresh now with a visible focus outline; Enter activates it.
  await page.goto(base);
  await page.waitForFunction(() => /\d/.test(document.querySelector('.wheel__height')?.textContent ?? ''), null, { timeout: 30000 });
  await page.waitForTimeout(500);
  await page.keyboard.press('Tab');
  const focused = await page.evaluate(() => ({ text: document.activeElement?.textContent, outline: getComputedStyle(document.activeElement).outlineStyle + ' ' + getComputedStyle(document.activeElement).outlineWidth }));
  check(`${label}: first Tab stop at 390 is Refresh now with outline`, focused.text?.includes('Refresh') && focused.outline.startsWith('solid'), JSON.stringify(focused));
  const beforeKey = rpcCalls.length;
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2500);
  check(`${label}: Enter on Refresh now reads again`, rpcCalls.length > beforeKey);

  // 6. Overlay view.
  await page.goto(base + '#overlay');
  await page.waitForSelector('text=Exit overlay');
  check(`${label}: overlay hides How it works and footer`, (await page.$('.how')) === null && (await page.$('.foot')) === null);
  await page.click('text=Exit overlay');
  await page.waitForSelector('.how');
  check(`${label}: Exit overlay restores the dashboard`, (await page.$('.how')) !== null);
  await page.screenshot({ path: `${shots}/${label}-390.png` });

  // 7. Paused state: flip the paused word in the state() response.
  await page.route(RPC, async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    const req = JSON.parse(route.request().postData() ?? '{}');
    if (req.method === 'eth_call' && req.params?.[0]?.data?.startsWith('0xc19d93fb') && typeof body.result === 'string') {
      body.result = body.result.slice(0, -1) + '1';
    }
    await route.fulfill({ response, json: body });
  });
  await page.click('.btn--primary');
  await page.waitForSelector('text=Settlement paused', { timeout: 20000 });
  check(`${label}: paused state shows text cue`, (await page.textContent('.stat__value--paused')) === 'Paused');
  await page.screenshot({ path: `${shots}/${label}-paused.png` });
  await page.unroute(RPC);

  // 8. RPC failure: keep last values, show an alert, recover on Refresh now.
  await page.route(RPC, (route) => route.abort());
  await page.click('.btn--primary');
  await page.waitForSelector('[role=alert]', { timeout: 40000 });
  const alertText = await page.textContent('[role=alert]');
  const heightAfter = await page.textContent('.wheel__height');
  check(`${label}: RPC failure shows recoverable error and keeps last values`, alertText.includes('Unable to reach') && /\d/.test(heightAfter), alertText);
  await page.screenshot({ path: `${shots}/${label}-error.png` });
  await page.unroute(RPC);
  await page.click('.btn--primary');
  await page.waitForSelector('[role=alert]', { state: 'detached', timeout: 40000 });
  check(`${label}: error clears after a successful Refresh now`, true);

  // 9. Reflow at 320 and 1440.
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(300);
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    check(`${label}: no horizontal scroll at ${width}`, sw <= width, `scrollWidth ${sw}`);
    await page.screenshot({ path: `${shots}/${label}-${width}.png`, fullPage: true });
  }

  // 10. Reduced motion removes the wheel and bar transitions.
  const rm = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const p2 = await rm.newPage();
  await p2.goto(base);
  const dur = await p2.evaluate(() => [getComputedStyle(document.querySelector('.wheel')).transitionDuration, getComputedStyle(document.querySelector('.btn')).transitionDuration]);
  check(`${label}: reduced motion disables transitions`, dur.every((d) => d === '0s'), dur.join(' '));
  await rm.close();

  const unexpected = errors.filter((e) => !/Failed to load resource|net::ERR_FAILED|ERR_FAILED|SqueekCore read failed|Load failed|NetworkError|fetch/i.test(e));
  check(`${label}: no console errors outside the forced RPC failure`, unexpected.length === 0, unexpected.slice(0, 3).join(' | '));
  const failedLocal = failed.filter((u) => u.startsWith(base));
  check(`${label}: no failed local resources`, failedLocal.length === 0, failedLocal.join(' '));
  await browser.close();
}

fs.mkdirSync(shots, { recursive: true });
await run(chromium, 'chromium');
await run(webkit, 'webkit');
server.close();
const failedCount = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failedCount}/${results.length} passed`);
process.exit(failedCount ? 1 : 0);
