// How long something has been running, for the phone's now-playing bar:
// "13m 06s" under an hour, then "1h 04m" (seconds stop mattering by then).
export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}h ${pad(m)}m` : `${m}m ${pad(s)}s`;
}
