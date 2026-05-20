export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters)) {
    return '—';
  }
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(2)} km`;
}

export function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString();
}
