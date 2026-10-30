# Squeekchain naming follow-up validation

Checked on 2026-10-30. This is a worker-side report, not independent certification.

## Scope and outcome

The working public URL is **https://squeekdashboard.online/**. The existing dashboard and its
features were retained. Only page URL metadata, delivery documentation and validation scripts
changed; application components, styles, contract reads, polling, assets, dependencies and build
configuration are unchanged. No second project or wallet connection was created.

The existing project is `squeekchain-live-dashboard-d8ab.identitymd.eth`, from the project handoff.
Its gateway `https://squeekchain-live-dashboard-d8ab.identitymd.eth.limo/` failed with curl exit 35,
“tlsv1 alert internal error.” `https://identitymd.eth.limo/` returned the gateway page titled
“ENS Domain Not Configured | eth.limo.” These are observations, not a diagnosis of the ENS record.
No ENS transaction, naming retry, DNS change or hosting publication was performed.

The requested fallback was already working. At 17:19 UTC the read-only HTTPS checker returned
HTTP 200 from `https://squeekdashboard.online/`, with curl certificate verification enabled and no
HTTP downgrade. All 12 exported runtime files (JS, CSS, fonts, favicon and share image) matched the
deployed bytes by SHA-256. Subsequent Chromium checks exercised live Sepolia reads on that domain.
Observed values included Squeek height 13,095, progress 60.41%, round 1,973, difficulty 11,266,
Running, and total work 148,986. These are observations at validation time, not seeded site data.

`index.html:9` now names the working domain in a canonical link; `index.html:12` supplies `og:url`.
The generated `dist/index.html` contains the same metadata. The live page did not yet have a
canonical link; the new metadata awaits normal publication of this export. Canonical metadata
does not modify the network's external Visit field. The handoff for that field is the verified
HTTPS URL above, on this same project. No management connector for that field was available;
its value and any post-review update remain unverified.

## Build and file integrity

The first `npm run build` at the repository root exited 127 (`tsc: Permission denied`); invoking
the expected project compiler module directly reported it absent. To preserve the protected
dependency paths, an exact copy of `src/`, `public/`, `index.html`, `package.json`,
`package-lock.json`, `tsconfig.json` and `vite.config.ts` was placed in `test/scratch/build/`.

Commands in that copy:

```sh
npm ci --cache ../npm-cache --no-audit --no-fund
npm run build
npm run typecheck
```

All passed. `npm ci` installed 37 packages from the unchanged lockfile. `npm run build` ran
`tsc --noEmit` and Vite 8.3.5, transforming 1,283 modules. The build reported one transitive
dependency warning: `node:worker_threads` was externalized for browser compatibility. Application
interaction checks found no unexpected console errors. No dependency was changed to suppress it.

Every copied input was byte-compared with the final repository input before copying the resulting
export to `dist/`. The export contains 13 files totaling 652,089 bytes. JS is 343.93 kB
(105.24 kB gzip), its dynamic chunk is 4.46 kB, and CSS is 10.41 kB. Runtime files are identical
to the previous export; only `dist/index.html` changes. Source, the original lockfile and the full
static export remain in the submission. Scratch dependencies, cache, test outputs and screenshots
are excluded from submission. No ignore file was changed.

Final integrity checks passed: `git diff --check`; no differences in `src/`, `public/`, protected
configuration, dependency manifests or lockfile; all existing export assets and the lockfile are
tracked; the two new files are not ignored. The candidate bundle has 34 files under 1 MiB against
the 8 MiB limit, with no dependency cache, npm archive or submodule. The final rebuild after the
probe passed and its complete output was byte-compared with `dist/`.

## Interactions and responsive checks

The existing interaction script now accepts a public `--url` and an explicit browser selection.
It closes its preview and browser on completion or failure. All validation requests are read-only;
paused/error responses are modified only inside the validation browser context.

```sh
PLAYWRIGHT_MODULE=/opt/imd-tools/playwright-mcp/node_modules/playwright/index.mjs PLAYWRIGHT_BROWSERS_PATH=/opt/imd-tools/ms-playwright node scripts/check-interactions.mjs dist test/scratch/interactions-local --browser=chromium
PLAYWRIGHT_MODULE=/opt/imd-tools/playwright-mcp/node_modules/playwright/index.mjs PLAYWRIGHT_BROWSERS_PATH=/opt/imd-tools/ms-playwright node scripts/check-interactions.mjs dist test/scratch/interactions-public --url=https://squeekdashboard.online/ --browser=chromium
node scripts/check-site-url.mjs
```

Both Chromium interaction runs passed **18/18**, exit 0. The HTTPS check also passed, exit 0.
Coverage: live values and status; relative application assets; product and Refresh now inside the
first 390×844 screen; manual refresh; auto-refresh (new reads within 17.5 seconds); Tab focus with
a solid 2px outline and Enter activation; overlay entry and exit; forced paused status; RPC failure
retaining last values and explaining retry; recovery; no horizontal scroll at 320 and 1440;
reduced-motion transitions at 0s; no unexpected application console errors or failed local files.
The wheel, progress bar and button had bottom coordinates 523, 626 and 116 CSS pixels at 390 wide.

The public host injects a Cloudflare Insights script. The first public run flagged that script in
the relative-asset check (17/18 application checks); it is absent from both source and fetched
export bytes. The checker now reports this exact hosting provider separately and still requires
all application assets to be relative; the corrected public run passed 18/18. No other external
runtime script is exempted. Beacon behavior/privacy and hosting configuration were not audited.

Default runs also attempted WebKit, which could not launch because its executable was unavailable.
The initial all-engine runs therefore exited 1; the explicit Chromium runs above exited 0. Safari
coverage is unperformed, not counted as passing. The browser connector was attempted and returned
“Transport closed”; rendered evidence came from the installed Playwright Chromium instead.

Screenshots created and inspected: `test/scratch/taste/shots/390.png`,
`test/scratch/interactions-public/chromium-1440.png`,
`test/scratch/interactions-public/chromium-error.png`, and `test/scratch/overlay-390.png`.
Additional full-page, paused and narrow-width screenshots were generated by the scripts.
Scratch files are disposable validation evidence, not delivered runtime dependencies.

## Better Interface review

Applied the pinned Better Interface workflow, core principles of all six domains and design
documentation method while preserving the existing product. The visual idea remains a warm dark
dashboard carried by a wheel whose amber rim fills with block progress.

| Domain | Coverage and evidence | Limitations |
| --- | --- | --- |
| Accessibility | Checked native action/link semantics, progressbar name/value, text status cues, alert/retry, keyboard refresh, visible 2px focus, 44px primary target and reduced motion. | No native screen-reader session, forced-colors run, native 200% zoom or physical touch device. |
| Layout | Checked DOM order, 320/390/1440 reflow, first screen, desktop composition, overlay exit and address wrapping. Probe found no overflow, overlap or clipping. | No RTL/pseudo-localization or maximum contract-width integer stress test; only current live values and exercised states. |
| Writing | Reviewed Refresh now, Exit overlay, View contract, loading, paused, last-read and recovery copy against actual actions; retained existing plain dashboard terminology. | No content rewrite or independent audit of the existing explanatory protocol copy. |
| Typography | Checked source scale, tabular numbers and actual render. Six sizes per width, two families, weights 400/600/700. Inter Variable loaded from the local Latin woff2. | No physical-device/font-rendering comparison. |
| Colors | Checked source role tokens and representative computed foreground/background pairs, listed below; statuses also have words. | Probe skipped 83 text boxes classified over media/gradients; additional measurements cover solid backgrounds, not every composite state. |
| UI | Checked the single filled primary action, loading label, error persistence/retry, progress-linked wheel, overlay, flat cards and reduced-motion behavior. | No slow-motion recording, touch hardware or Safari rendering. |

Computed colors were converted through Chromium canvas to 8-bit sRGB and evaluated with the WCAG
relative luminance formula. Measured text pairs: body/page 17.68:1, wheel height/surface 16.34:1,
wheel label/surface 9.04:1, stat label/surface 9.04:1, primary button text/fill 10.08:1,
progress percentage/page 11.35:1, Running/surface 10.20:1. Additional token pairs: focus/page
11.35:1, primary-hover text/fill 6.17:1 and alert/surface 7.30:1. All exceed the applicable text
contrast floor for these measured pairs. These figures do not establish every focus adjacency.

Pinned probe, run from the repository root before the final production rebuild:

```sh
IMD_PLAYWRIGHT=/opt/imd-tools/playwright-mcp/node_modules/playwright/index.mjs PLAYWRIGHT_BROWSERS_PATH=/opt/imd-tools/ms-playwright node .imd/reads/skills/design-critic/scripts/taste.mjs --out test/scratch/taste
```

**16/16 passed**, exit 0: render, layout, targets, contrast (with exclusions above), casing,
tracking, eyebrows, type sizes, type faces, glyphs, slogans, repetition, copy budget, chrome,
motion and share metadata. The 390 screenshot visibly shows the title, live status, primary action,
wheel and progress bar on the first screen. There is no marketing hero displacing the dashboard.
Title, favicon, description, `og:title` and `og:image` are present, with real local image bytes.

## Findings and disposition

| Finding | Location/evidence | Disposition |
| --- | --- | --- |
| Public naming: project ENS gateway fails; root gateway reports unconfigured name. | URLs and curl results above. | Use the requester's working HTTPS fallback. Recorded in README and canonical/share URL metadata; external Visit-field update is a network handoff. ENS itself was not repaired. |
| Sharing metadata did not identify the selected public URL. | `index.html:9`, `index.html:12`. | Added canonical and `og:url`, rebuilt `dist/index.html`, checked both against the fallback. |
| Validation only supported a local preview and could not target the requested public URL. | `scripts/check-interactions.mjs` (`publicURL` / `selectedBrowser`). | Added URL/browser options and explicit hosting-script reporting; final local/public Chromium runs passed. |
| Earlier validation documentation described prior-run coverage, with an absent artifacts link. | `README.md` validation; `DESIGN.md` contrast section. | Replaced with this follow-up's actual outcomes, measured representative pairs, and this tracked root report. |

No product design defect was reproduced that required altering the preserved dashboard. The
repository deliverable and working-fallback checks are complete. External Visit-field state,
post-review publication and ENS repair remain unverified; Safari and the accessibility subchecks
listed above remain unperformed.
