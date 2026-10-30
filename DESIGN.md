# DESIGN.md: Squeekchain Live Dashboard

## Overview

A dark, warm, data-first dashboard for viewers and community members following the hamster-powered
Squeekchain, also used as a stream overlay. One visual idea carries it: a hamster wheel whose amber
rim fills with progress inside the current Squeek block. Everything else is quiet: warm near-black
surfaces, one amber accent, plain sentence-case labels and tabular numbers. Hamster theming lives in
the wheel, the rungs and the wording ("wheel passes"), never in cartoon art.

Hierarchy, top to bottom: header (logo and title), status line with the one filled action
(Refresh now), the wheel with the block height, block progress, four stat cards, then How it works
and a footer with the contract address. The overlay view (`#overlay`) keeps only the header and the
live section.

All tokens and styles are in `src/styles.css`; components are in `src/App.tsx` and
`src/components/`.

## Colors

Notation is `oklch()`. Primitives (hue-named) are declared first in `:root` and used only by the
semantic tokens below; components reference semantic tokens only. All values are inside sRGB.

| Token | Value (primitive) | Use |
| --- | --- | --- |
| `--color-bg` | `oklch(0.155 0.012 60)` (`--neutral-950`) | Page background |
| `--color-surface` | `oklch(0.2 0.014 60)` (`--neutral-900`) | Stat cards, wheel centre disc, error notice |
| `--color-track` | `oklch(0.245 0.016 60)` (`--neutral-850`) | Unfilled wheel rim and progress bar track |
| `--color-border` | `oklch(0.36 0.018 60)` (`--neutral-700`) | Card borders, quiet button border, section rule |
| `--color-text` | `oklch(0.965 0.008 80)` (`--neutral-50`) | Primary text, values |
| `--color-text-secondary` | `oklch(0.78 0.018 70)` (`--neutral-300`) | Labels, notes, body copy in How it works, rungs |
| `--color-accent` | `oklch(0.83 0.145 75)` (`--amber-400`) | Filled progress end, primary button, percentage, links, step numbers |
| `--color-accent-deep` | `oklch(0.7 0.165 55)` (`--amber-600`) | Start of the progress gradients, primary button hover |
| `--color-on-accent` | `oklch(0.22 0.04 60)` (`--amber-950`) | Text on the primary button |
| `--color-focus` | `--amber-400` | `:focus-visible` outline |
| `--color-status-live` | `oklch(0.8 0.15 150)` (`--green-400`) | Live dot, "Running" |
| `--color-status-alert` | `oklch(0.74 0.155 25)` (`--red-400`) | Paused and error dot, "Paused", error notice edge |

Contrast ratios computed from these token values (WCAG formula, oklch converted to sRGB): text on bg
17.7, text on surface 16.4, secondary on bg 9.8, secondary on surface 9.0, accent on bg 11.4,
on-accent on accent 10.1, on-accent on accent-deep 6.2, live on surface 10.3, alert on surface 7.4.
The taste probe reported all measured text passing 4.5:1 but did not measure boxes it classed as
over gradients; see `artifacts/validation.md`.

Status colour is always paired with text ("Live on Sepolia", "Settlement paused", "Running",
"Paused", "Contract is not paused").

## Typography

- Family: `--font-sans` = Inter Variable (`@fontsource-variable/inter`, woff2, weight axis 100 to 900,
  imported in `src/main.tsx`), then system sans fallbacks. `--font-mono` = `ui-monospace` stack, used
  only for `code` and the contract address.
- Weights in use: 400 (body), 600 (titles, labels on buttons, status), 700 (values, block height,
  percentage, section title).
- Scale, six sizes:

| Token | Size | Role |
| --- | --- | --- |
| `--fs-caption` | 13px | Stat notes, footer |
| `--fs-body` | 15px | Body, labels, buttons, status line, wheel label |
| `--fs-lead` | 17px | Site title (h1), progress title (h2), step titles (h3), How it works lead |
| `--fs-stat` | 24px | Stat values, "How it works" (h2) |
| `--fs-title` | 32px | Block progress percentage |
| `--fs-display` | `clamp(2.5rem, 1.5rem + 4vw, 4rem)`: 40px at 390, 64px at 1440 | Block height in the wheel |

- Line height 1.5 for body; 1 to 1.3 for values and headings. Letter-spacing only on display numbers
  (`-0.03em` block height, `-0.02em` percentage).
- Every changing number uses `.num` (`font-variant-numeric: tabular-nums`).
- `text-wrap: balance` on the title and wheel caption, `pretty` on notes and paragraphs. The How it
  works lead is capped at `62ch`.

## Layout

- Page: max width `--page-max` (72rem), inline padding `--gutter` (`clamp(1rem, 0.5rem + 2vw, 2rem)`).
- Spacing steps: `--space-1` 4px, `-2` 8px, `-3` 12px, `-4` 16px, `-6` 24px, `-8` 32px, `-12` 48px.
  Inside a group 4 to 12px, between groups 24 to 48px.
- Breakpoints (from content):
  - below 22.5rem (360px): stat cards in one column;
  - from 40rem (640px): "View contract" shows in the header, and the timing text joins the status line
    instead of wrapping under it;
  - from 56rem (896px): the live grid becomes two columns, wheel (`minmax(0, 28rem)`) beside the panel,
    vertically centred, 48px gap.
- Mobile order: status line and Refresh now, wheel (max 22rem), block progress, stat cards (2x2),
  How it works (one column), footer. The wheel, progress bar and Refresh now all sit inside the first
  390x844 screen.
- The wheel clips its own box (`overflow: clip`, round) so the rotating rung ring never widens the
  page. The contract address wraps with `overflow-wrap: anywhere` and is never truncated.

## Elevation & Depth

Flat. Depth comes from tonal layers only: `--color-bg` page, `--color-surface` cards and the wheel's
centre disc, `--color-track` for unfilled tracks. No shadows anywhere. Borders are structural (stat
cards, quiet button, the rule above How it works) and never combined with a shadow. No cards inside
cards.

## Shapes

- `--radius-control` 10px: buttons, error notice.
- `--radius-card` 14px: stat cards.
- Fully round (`999px` / `50%`): progress bar and fill, wheel, wheel centre disc, status dot.

## Components

**Button** (`.btn` in `src/styles.css`). Min height 44px, 16px inline padding, weight 600, no wrap.
- `.btn--primary`: the one filled action per view (Refresh now, `src/App.tsx`). Accent fill,
  on-accent text, min width 8.5rem so "Reading…" and "Refresh now" keep one width. While a read runs it
  sets `aria-disabled="true"` and ignores clicks, keeping focus.
- `.btn--quiet`: bordered, transparent; links styled as buttons (View contract, Exit overlay).
- Hover (only with `hover: hover`): primary goes to `--color-accent-deep`, quiet gets `--color-surface`.
  Press: `scale: 0.96` over 150ms `--ease-out`, only without reduced motion.

**Status line** (`.statusbar`, `.status--live|paused|error|pending`). Dot plus text, then "Updated …"
and "Next read in …s" (or "Reading SqueekCore…"), then the primary button.

**Error notice** (`.notice`, `role="alert"`). Surface background with an alert-coloured inline-start
edge. Says what failed, that the shown values are the last successful read, and how it recovers.

**Wheel** (`src/components/Wheel.tsx`, `.wheel*`). Props `fraction` (0 to 1), `height`, `caption`.
`--p` is a registered `@property` number: the rim is a `conic-gradient` filled to `--p` turns and
masked to a ring 8% thick, the 24-rung SVG ring rotates by `--p` turns (the first rung is accent), and
`--p` transitions over 900ms without reduced motion. Only the centre text is exposed to assistive
technology.

**Progress bar** (`src/components/ProgressBar.tsx`, `.bar`). `role="progressbar"`, labelled by the
"Block N progress" heading, with `aria-valuenow` and `aria-valuetext`. 24px tall; the fill is
`scaleX(var(--p))` with the accent gradient.

**Stat card** (`.stat` inside `dl.stats`). `dt` label (secondary), `dd.stat__value` (24px, 700),
`dd.stat__note` (13px). Value modifiers `--running` and `--paused` add status colour next to the word.

**Overlay view**: `#overlay` in the URL sets `html.is-overlay` (hook `useOverlay` in `src/App.tsx`)
and removes How it works and the footer.

Loading shows "…" in values and "Connecting to Sepolia"; the hidden `role="status"` region announces
only block height and pause changes.

## Do's and Don'ts

- Do take colours from the semantic tokens; add a role token instead of borrowing one by value.
- Do keep one filled `.btn--primary` per view; everything else is `.btn--quiet` or a link.
- Do use `.num` on any value that updates, and sizes from the six `--fs-*` tokens only.
- Do pair every status colour with words.
- Don't add shadows, gradient text, kicker labels or all-caps labels; the system is flat and sentence
  case.
- Don't truncate addresses or numbers; let them wrap.
- Don't add endless animation; motion is tied to data changes and sits behind
  `prefers-reduced-motion: no-preference`.

Recipe for another page or panel: start inside `main` (max width and gutter come with it), title the
section with an `h2` at `--fs-stat`, put figures in a `dl.stats` of `.stat` cards, use
`--color-text-secondary` for explanations, and if it has one main action, give it `.btn--primary`.
