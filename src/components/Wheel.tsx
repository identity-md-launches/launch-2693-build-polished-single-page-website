import type { CSSProperties } from 'react';

interface WheelProps {
  /** Progress inside the current block, 0 to 1. */
  fraction: number;
  height: string;
  caption: string;
}

const RUNGS = 24;

/**
 * The hamster wheel: a conic-gradient rim fills with block progress and the rung ring turns with it.
 * Only the centre text is exposed to assistive technology; the progress bar carries the value.
 */
export function Wheel({ fraction, height, caption }: WheelProps) {
  const style = { '--p': fraction } as CSSProperties;
  return (
    <figure className="wheel" style={style}>
      <div className="wheel__rim" aria-hidden="true" />
      <svg className="wheel__rungs" viewBox="0 0 200 200" aria-hidden="true" focusable="false">
        {Array.from({ length: RUNGS }, (_, i) => {
          const angle = (i / RUNGS) * Math.PI * 2;
          const x = 100 + Math.sin(angle) * 86;
          const y = 100 - Math.cos(angle) * 86;
          return <circle key={i} cx={x} cy={y} r={i === 0 ? 3.2 : 1.6} />;
        })}
      </svg>
      <figcaption className="wheel__center">
        <span className="wheel__label">Squeek block height</span>
        <strong className="wheel__height num">{height}</strong>
        <span className="wheel__caption num">{caption}</span>
      </figcaption>
    </figure>
  );
}
