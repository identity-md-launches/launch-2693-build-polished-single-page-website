const integer = new Intl.NumberFormat('en-US');
const percent = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

export function formatInt(value: bigint | number): string {
  return integer.format(value);
}

/** 0.604188 -> "60.41". Floors so 99.999% never shows as 100.00. */
export function formatPercent(fraction: number): string {
  return percent.format(Math.floor(fraction * 10_000) / 100);
}

/** Relative time from `now` to `epochMs`, e.g. "3 days ago". */
export function formatAgo(epochMs: number, now: number): string {
  const seconds = Math.round((epochMs - now) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 60) return relative.format(seconds, 'second');
  if (abs < 3600) return relative.format(Math.round(seconds / 60), 'minute');
  if (abs < 86_400) return relative.format(Math.round(seconds / 3600), 'hour');
  return relative.format(Math.round(seconds / 86_400), 'day');
}

export function formatDateTime(epochMs: number): string {
  return new Date(epochMs).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
