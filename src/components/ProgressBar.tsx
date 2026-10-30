import type { CSSProperties } from 'react';

interface ProgressBarProps {
  /** 0 to 1. */
  fraction: number;
  labelledBy: string;
  valueText: string;
}

export function ProgressBar({ fraction, labelledBy, valueText }: ProgressBarProps) {
  const style = { '--p': fraction } as CSSProperties;
  return (
    <div
      className="bar"
      role="progressbar"
      aria-labelledby={labelledBy}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.floor(fraction * 10_000) / 100}
      aria-valuetext={valueText}
      style={style}
    >
      <div className="bar__fill" />
    </div>
  );
}
