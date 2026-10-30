# Squeekchain Live Dashboard

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

The site is a static export in `dist/`. Publishing to a public URL (IPFS pinning and naming) happens
after this job, from the committed `dist/`; no deploy command was run here.

## Validation (run on 2026-10-30, on the final source)

| Command | Result |
| --- | --- |
| `npm run build` (runs `tsc --noEmit` then `vite build`) | Passed. JS 343.9 kB (105 kB gzip), CSS 10.4 kB. |
| `npx tsc --noEmit` | Passed, no errors. |
| `node .imd/reads/skills/design-critic/scripts/taste.mjs --out test/scratch/taste` | 16/16 checks passed at 320, 390 and 1440. |
| `node scripts/check-interactions.mjs dist <shots>` (Chromium) | 18/18 Chromium checks passed; WebKit could not launch on this host. |

The interaction script serves `dist/` at `/preview/` and checks, against the live Sepolia contract:
live values render; the wheel, progress bar and Refresh now are inside the first 390x844 screen;
Refresh now (click and Enter) triggers new RPC reads; auto-refresh fires within 17.5 s; the first Tab
stop shows a 2px focus outline; `#overlay` hides How it works and the footer and Exit overlay
restores them; a forced `paused = true` response shows "Settlement paused" and "Paused"; blocked
RPCs show the alert while keeping the last values, and Refresh now recovers; no horizontal scroll at
320 or 1440; reduced motion sets transitions to 0s; no console errors or failed local files.

Limitations: WebKit (Safari) was not exercised because the host lacks its system libraries. From
source: colours use `oklch()` (Safari 15.4+); the wheel ring uses `-webkit-mask` and `mask`; the
animated fill needs `@property` (Safari 16.4+) and otherwise snaps to the new value; the bar's
`in oklab` gradient has a plain gradient declared before it. No screen
reader session, native 200% zoom or physical device was tested. Details and the design review are in
`artifacts/validation.md`.
