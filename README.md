# Squeekchain Live Dashboard

Visit: **[https://squeekdashboard.online/](https://squeekdashboard.online/)**

A single-page, read-only dashboard for the hamster-powered Squeekchain. It reads the SqueekCore proxy on
Sepolia (`0x74665dAecA35A2303e767E76a2FF1FB6F93e119f`) every 15 seconds and shows:

- Squeek block height (in the centre of the wheel visualizer)
- Progress inside the current block: a conic-gradient wheel, a large progress bar and the percentage
- Settled through round, with when that round ended
- Difficulty (`workPerThousandBlocks`)
- Paused status (status line and the Settlement card)
- Total settled work, and an estimate of wheel passes left to finish the current block

No wallet and no transactions. Data comes from `state()` and, once, `configuration()` on the proxy,
both read at the same Sepolia block through `https://ethereum-sepolia-rpc.publicnode.com`, with
`https://sepolia.gateway.tenderly.co` as a fallback (viem `fallback` transport).

The `#overlay` view (`index.html#overlay`) shows only the live panel, for an OBS or Streamlabs
browser source. "Exit overlay" in the header returns to the full page.

## Stack

Vite 8, React 19, TypeScript 5.9, viem 2 (only `readContract` and `getBlockNumber`), Inter Variable
from `@fontsource-variable/inter` bundled locally. No backend, no API keys.

```
index.html               title, description, favicon, Open Graph tags
public/favicon.svg       wheel mark, also used as the header logo
public/og-image.png      1200x630 share card
src/squeek.ts            contract address, RPC list, ABI, snapshot read, progress math
src/useSqueek.ts         15 s polling hook (pauses while the tab is hidden), 1 s clock
src/format.ts            number, percent and relative-time formatting
src/App.tsx              page layout, status, stats, How it works, overlay view
src/components/Wheel.tsx       conic-gradient wheel visualizer
src/components/ProgressBar.tsx progressbar with ARIA values
src/styles.css           tokens and all styles
scripts/check-interactions.mjs Playwright interaction checks against dist/
scripts/check-site-url.mjs     HTTPS and deployed asset identity checks
dist/                    committed static export (relative asset URLs)
```

## Install, preview, rebuild

```sh
npm ci                # install from package-lock.json
npm run dev           # local dev server
npm run build         # tsc --noEmit, then vite build into dist/
npm run preview       # serve the built dist/ locally
npm run typecheck     # tsc --noEmit only
```

`vite.config.ts` sets `base: './'`, so `dist/` works from any subpath (IPFS gateway, ENS name).
Commit `dist/` after rebuilding; the host serves the committed export and does not build.

To change the contract, RPCs or refresh period, edit the constants at the top of `src/squeek.ts`.

## Hosting

Use **https://squeekdashboard.online/** as this existing project's Visit URL. The fallback already
serves this dashboard over HTTPS; this follow-up verified it rather than creating another project.
The source and export declare it as the canonical URL and `og:url`. The overlay is available at
https://squeekdashboard.online/#overlay.

The previous name, `squeekchain-live-dashboard-d8ab.identitymd.eth`, remains the same project name.
Its HTTPS gateway failed a TLS connection during this follow-up; `https://identitymd.eth.limo/`
returned the gateway's “ENS Domain Not Configured” page. Do not redirect visitors to either as a
repair. The working custom domain is the requested fallback.

The site is a static export in `dist/`. The network publishes the committed export after review.
The project's external Visit field and ENS records are managed outside this repository; setting a
canonical tag does not modify them. Any Visit-field handoff should use the verified URL above on
the existing project. No DNS, ENS, TLS or hosting settings were changed by this follow-up.

Recheck HTTPS, every exported runtime asset's bytes, and the dashboard identity with:

```sh
node scripts/check-site-url.mjs
```

This uses `curl` with certificate verification enabled, follows only HTTPS redirects on the same
origin, and fails on missing or changed runtime assets. It checks the served page semantically
because the refreshed canonical metadata is published only after review. Browser interaction
checks are separate; see Validation below.

## Validation (2026-10-30 follow-up)

| Command | Result |
| --- | --- |
| `npm ci`, `npm run build`, `npm run typecheck` in an exact scratch copy | Passed. JS 343.93 kB (105.24 kB gzip), CSS 10.41 kB. Source, configuration and lockfile were byte-compared with the repository; the built export was copied back to `dist/`. |
| `node scripts/check-site-url.mjs` | Passed. HTTPS 200 with certificate verification; all 12 deployed assets match the export by SHA-256. |
| Pinned `taste.mjs --out test/scratch/taste` | 16/16 checks passed at 320, 390 and 1440; final 390 screenshot inspected. |
| `check-interactions.mjs dist test/scratch/interactions-local --browser=chromium` | 18/18 passed against the production export at `/preview/`. |
| Same script with `--url=https://squeekdashboard.online/ --browser=chromium` | 18/18 passed against the public HTTPS dashboard. |

The interaction script serves `dist/` at `/preview/` and checks, against the live Sepolia contract:
live values render; the wheel, progress bar and Refresh now are inside the first 390x844 screen;
Refresh now (click and Enter) triggers new RPC reads; auto-refresh fires within 17.5 s; the first Tab
stop shows a 2px focus outline; `#overlay` hides How it works and the footer and Exit overlay
restores them; a forced `paused = true` response shows "Settlement paused" and "Paused"; blocked
RPCs show the alert while keeping the last values, and Refresh now recovers; no horizontal scroll at
320 or 1440; reduced motion sets transitions to 0s; no console errors or failed local files.

The initial root build could not execute `tsc`; dependencies were installed only inside
`test/scratch/build/` to respect the task's protected dependency paths. The production build used
the unchanged package manifest, lockfile, TypeScript configuration and Vite configuration. It
reported a browser externalization warning for `node:worker_threads` in an existing transitive
dependency; the tested dashboard had no unexpected application console errors.

To repeat browser validation, make Playwright available separately and run:

```sh
node scripts/check-interactions.mjs dist test/scratch/shots --browser=chromium
node scripts/check-interactions.mjs dist test/scratch/public-shots --url=https://squeekdashboard.online/ --browser=chromium
```

Set `PLAYWRIGHT_MODULE` to Playwright's `index.mjs` when it is outside the project, and
`PLAYWRIGHT_BROWSERS_PATH` if needed. Omitting `--browser` attempts both Chromium and WebKit;
`--browser=webkit` requests Safari coverage explicitly. The public host injects a Cloudflare
Insights script, reported separately by the checker. It is absent from the committed source/export;
all dashboard asset URLs remain relative.

Limitations: WebKit was attempted but its executable was unavailable, so Safari was not verified.
The browser connector returned “Transport closed”; local Playwright supplied the rendered checks.
No native screen reader, native 200% zoom or physical device was tested. The new canonical metadata
awaits the network's normal publication; the public domain already works. This repository cannot
confirm or change the platform's external Visit field. Full results, six-domain coverage and naming
handoff limitations are in [VALIDATION.md](./VALIDATION.md).
