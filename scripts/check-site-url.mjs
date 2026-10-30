// Read-only check of the existing site's HTTPS URL and the runtime bytes in dist/.
// Usage: node scripts/check-site-url.mjs [https://squeekdashboard.online/] [dist]
// Requires Node and curl; no hosting account, credentials or publishing API.
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);
const site = new URL(process.argv[2] ?? 'https://squeekdashboard.online/');
const dist = path.resolve(process.argv[3] ?? 'dist');
assert.equal(site.protocol, 'https:', 'The Visit URL must use HTTPS.');
assert.ok(!site.username && !site.password && !site.search && !site.hash, 'Use a public base URL without credentials, query or hash.');
assert.ok(site.pathname.endsWith('/'), 'The base URL must end with /.');
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');

async function get(url) {
  for (let redirects = 0; redirects <= 5; redirects++) {
    assert.equal(url.protocol, 'https:', 'An HTTP downgrade is not allowed.');
    assert.equal(url.origin, site.origin, 'A redirect must stay on the Visit URL origin.');
    const { stdout } = await run('curl', [
      '--silent', '--show-error', '--proto', '=https',
      '--connect-timeout', '10', '--max-time', '25', '--max-filesize', '4194304',
      '--write-out', '\n%{http_code}\n%{redirect_url}', url.href,
    ], { encoding: 'buffer', maxBuffer: 5 * 1024 * 1024 });
    const last = stdout.lastIndexOf(10);
    const separator = stdout.lastIndexOf(10, last - 1);
    const status = Number(stdout.subarray(separator + 1, last).toString());
    if ([301, 302, 303, 307, 308].includes(status)) {
      url = new URL(stdout.subarray(last + 1).toString(), url);
      continue;
    }
    assert.equal(status, 200, `${url.href} returned HTTP ${status}.`);
    return { bytes: stdout.subarray(0, separator), url: url.href, status };
  }
  throw new Error('Too many HTTPS redirects.');
}

async function files(directory, prefix = '') {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    assert.ok(!entry.isSymbolicLink(), 'The export must contain real files, not symlinks.');
    const relative = prefix + entry.name;
    if (entry.isDirectory()) result.push(...await files(path.join(directory, entry.name), relative + '/'));
    else if (entry.isFile()) result.push(relative);
  }
  return result.sort();
}

function relativeAssets(html) {
  const assets = [...html.matchAll(/<(?:script|link)\b[^>]*>/gi)]
    .filter(([tag]) => /\bsrc=|\brel=["'](?:stylesheet|icon)["']/i.test(tag))
    .map(([tag]) => tag.match(/\b(?:src|href)=["']([^"']+)["']/i)?.[1]);
  assert.ok(assets.length >= 3, 'Expected a script, stylesheet and favicon.');
  for (const asset of assets) {
    assert.ok(asset?.startsWith('./'), `Runtime asset must be relative: ${asset}`);
    assert.ok(new URL(asset, site).href.startsWith(site.href), 'An asset escaped the site base.');
  }
  return assets;
}

try {
  const local = await readFile(path.join(dist, 'index.html'), 'utf8');
  assert.ok(local.includes(`<link rel="canonical" href="${site.href}"`), 'The export canonical URL must match the Visit URL.');
  assert.ok(local.includes(`<meta property="og:url" content="${site.href}"`), 'The export og:url must match the Visit URL.');
  relativeAssets(local);
  const page = await get(site);
  const html = page.bytes.toString('utf8');
  assert.match(html, /<title>\s*Squeekchain Live Dashboard\s*<\/title>/i, 'The Visit URL must serve this dashboard.');
  assert.match(html, /<div\s+id=["']root["']\s*>\s*<\/div>/i, 'The dashboard mount is missing.');
  const assets = relativeAssets(html);
  const runtimeFiles = (await files(dist)).filter((file) => file !== 'index.html');
  assert.ok(runtimeFiles.length > 0, 'No exported runtime assets found.');
  for (const asset of assets) assert.ok(runtimeFiles.includes(asset.slice(2)), `The live page references an asset outside this export: ${asset}`);
  // A small batch bounds load; checking all files also covers fonts and lazy-loaded chunks.
  const verified = [];
  for (let i = 0; i < runtimeFiles.length; i += 4) {
    verified.push(...await Promise.all(runtimeFiles.slice(i, i + 4).map(async (file) => {
      const [expected, actual] = await Promise.all([
        readFile(path.join(dist, file)), get(new URL(file, site)),
      ]);
      assert.equal(hash(actual.bytes), hash(expected), `Deployed bytes differ for ${file}.`);
      return { path: file, bytes: actual.bytes.length, sha256: hash(actual.bytes) };
    })));
  }
  console.log(JSON.stringify({
    checkedAt: new Date().toISOString(), passed: true, visitUrl: page.url,
    httpsStatus: page.status, certificateVerification: 'curl default; no insecure override',
    exportedCanonical: site.href,
    servedCanonical: html.match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)?.[1] ?? null,
    assets: verified,
    limitation: 'The root HTML is checked semantically; newly built metadata awaits normal publication. This check does not change a project Visit field, ENS or DNS.',
  }, null, 2));
} catch (error) {
  console.error(`FAIL HTTPS site check: ${error.message}`);
  process.exitCode = 1;
}
