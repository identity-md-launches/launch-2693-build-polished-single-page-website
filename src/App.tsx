import { useEffect, useState } from 'react';
import { ProgressBar } from './components/ProgressBar';
import { Wheel } from './components/Wheel';
import { formatAgo, formatDateTime, formatInt, formatPercent } from './format';
import {
  EXPLORER_URL,
  passesToNextBlock,
  progressFraction,
  REFRESH_MS,
  SQUEEK_CORE,
} from './squeek';
import { useNow, useSqueek } from './useSqueek';

/** `#overlay` shows only the live panel, for a stream browser source. */
function useOverlay(): boolean {
  const read = () => window.location.hash === '#overlay';
  const [overlay, setOverlay] = useState(read);
  useEffect(() => {
    const onHash = () => setOverlay(read());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle('is-overlay', overlay);
  }, [overlay]);
  return overlay;
}

export function App() {
  const overlay = useOverlay();
  const { data, error, loading, updatedAt, nextAt, refresh } = useSqueek();
  const now = useNow();

  const fraction = data ? progressFraction(data) : 0;
  const pct = data ? formatPercent(fraction) : '0.00';
  const nextBlock = data ? formatInt(data.blockHeight + 1n) : '…';
  const height = data ? formatInt(data.blockHeight) : '…';

  let tone: 'live' | 'paused' | 'error' | 'pending' = 'pending';
  let statusText = 'Connecting to Sepolia';
  if (error) {
    tone = 'error';
    statusText = data ? 'Showing last read' : 'Not connected';
  } else if (data?.paused) {
    tone = 'paused';
    statusText = 'Settlement paused';
  } else if (data) {
    tone = 'live';
    statusText = 'Live on Sepolia';
  }

  let timingText = 'Reading SqueekCore…';
  if (!loading && nextAt !== undefined) {
    // `now` ticks once per second, so clamp to the period to avoid showing 16s right after a read.
    const seconds = Math.min(REFRESH_MS / 1000, Math.max(0, Math.ceil((nextAt - now) / 1000)));
    timingText = `Next read in ${seconds}s`;
  } else if (!loading) {
    timingText = 'Auto-refresh resumes when this tab is visible';
  }

  // Announce only meaningful changes, not every 15-second read. Errors use the alert below.
  const announcement = data
    ? `Squeek block height ${height}.${data.paused ? ' Settlement paused.' : ''}`
    : '';

  return (
    <>
      <header className="top">
        <div className="top__brand">
          <img className="top__logo" src="./favicon.svg" alt="" width="32" height="32" />
          <h1 className="top__title">Squeekchain Live Dashboard</h1>
        </div>
        {overlay ? (
          <a className="btn btn--quiet" href="#">
            Exit overlay
          </a>
        ) : (
          <a className="btn btn--quiet top__link--wide" href={EXPLORER_URL} target="_blank" rel="noreferrer">
            View contract
          </a>
        )}
      </header>

      <main id="main">
        <section className="live" aria-label="Live Squeekchain state">
          <div className="statusbar">
            <p className={`status status--${tone}`}>
              <span className="status__dot" aria-hidden="true" />
              {statusText}
            </p>
            <p className="statusbar__timing num">
              {updatedAt !== undefined && <span>Updated {formatAgo(updatedAt, now)}</span>}
              <span>{timingText}</span>
            </p>
            <button
              type="button"
              className="btn btn--primary"
              onClick={loading ? undefined : refresh}
              aria-disabled={loading}
            >
              {loading ? 'Reading…' : 'Refresh now'}
            </button>
          </div>

          {error && (
            <p className="notice" role="alert">
              {error} {data ? 'The values below are from the last successful read. ' : ''}
              Retrying every {REFRESH_MS / 1000} seconds, or use Refresh now.
            </p>
          )}

          <div className="live__grid">
            <Wheel
              fraction={fraction}
              height={height}
              caption={data ? `${pct}% into block ${nextBlock}` : 'Reading the ledger'}
            />

            <div className="live__panel">
              <div className="progress">
                <div className="progress__head">
                  <h2 id="progress-label" className="progress__title">
                    Block {nextBlock} progress
                  </h2>
                  <p className="progress__pct num">{pct}%</p>
                </div>
                <ProgressBar
                  fraction={fraction}
                  labelledBy="progress-label"
                  valueText={data ? `${pct} percent of block ${nextBlock}` : 'Loading'}
                />
                <p className="progress__note num">
                  {data
                    ? `${formatInt(data.blockProgress)} of 1,000,000,000 block units. About ${formatInt(
                        passesToNextBlock(data),
                      )} wheel passes to go at today's difficulty.`
                    : 'Block units earned toward the next Squeek block.'}
                </p>
              </div>

              <dl className="stats">
                <div className="stat">
                  <dt>Settled through round</dt>
                  <dd className="stat__value num">{data ? formatInt(data.settledThroughRound) : '…'}</dd>
                  <dd className="stat__note">
                    {data ? (
                      <time dateTime={new Date(data.settledRoundEnd * 1000).toISOString()}>
                        Ended {formatAgo(data.settledRoundEnd * 1000, now)}
                      </time>
                    ) : (
                      'Last round with final work'
                    )}
                  </dd>
                </div>
                <div className="stat">
                  <dt>Difficulty</dt>
                  <dd className="stat__value num">{data ? formatInt(data.workPerThousandBlocks) : '…'}</dd>
                  <dd className="stat__note">Work per 1,000 blocks</dd>
                </div>
                <div className="stat">
                  <dt>Settlement</dt>
                  <dd className={`stat__value stat__value--${data?.paused ? 'paused' : 'running'}`}>
                    {data ? (data.paused ? 'Paused' : 'Running') : '…'}
                  </dd>
                  <dd className="stat__note">{data?.paused ? 'Guardian has paused new rounds' : 'Contract is not paused'}</dd>
                </div>
                <div className="stat">
                  <dt>Total work</dt>
                  <dd className="stat__value num">{data ? formatInt(data.cumulativeWork) : '…'}</dd>
                  <dd className="stat__note">Wheel passes settled</dd>
                </div>
              </dl>
            </div>
          </div>

          <p className="sr-only" role="status">
            {announcement}
          </p>
        </section>

        {!overlay && (
          <section className="how" aria-labelledby="how-title">
            <h2 id="how-title" className="how__title">
              How it works
            </h2>
            <p className="how__lead">
              This page reads settled work from the hamster-powered Squeekchain. A sensor on the wheel
              counts the work, and SqueekCore on Sepolia turns it into Squeek blocks.
            </p>
            <ol className="how__steps">
              <li>
                <h3>The wheel counts work</h3>
                <p>Each accepted magnet passage on the wheel is one work unit, shown here as one wheel pass.</p>
              </li>
              <li>
                <h3>Work settles in 10-minute rounds</h3>
                <p>
                  A signing reporter submits finished rounds to SqueekCore. The settled round is the last one
                  whose work is final, so this page trails the wheel by design.
                </p>
              </li>
              <li>
                <h3>Difficulty prices each block</h3>
                <p>
                  Difficulty is the work 1,000 Squeek blocks cost. After each busy round it moves 1/30 of the
                  way toward paying 40 blocks per round. Every billion block units completes one block.
                </p>
              </li>
              <li>
                <h3>Put it on stream</h3>
                <p>
                  The <a href="#overlay">overlay view</a> shows only the live panel. Add this page's address
                  ending in <code>#overlay</code> as a browser source in OBS or Streamlabs.
                </p>
              </li>
              <li>
                <h3>This page only reads</h3>
                <p>
                  It calls <code>state()</code> through a public Sepolia RPC every {REFRESH_MS / 1000} seconds
                  while the tab is open. No wallet and no transactions. When settlement is paused, the numbers
                  hold at their last settled values.
                </p>
              </li>
            </ol>
          </section>
        )}
      </main>

      {!overlay && (
        <footer className="foot">
          <p>
            SqueekCore proxy on Sepolia:{' '}
            <a className="foot__addr" href={EXPLORER_URL} target="_blank" rel="noreferrer">
              {SQUEEK_CORE}
            </a>
          </p>
          <p className="num">
            {data && updatedAt !== undefined
              ? `Read at Sepolia block ${formatInt(data.readAtBlock)} on ${formatDateTime(updatedAt)}.`
              : 'Waiting for the first read.'}{' '}
            Read through publicnode.com, with Tenderly as fallback.
          </p>
        </footer>
      )}
    </>
  );
}
