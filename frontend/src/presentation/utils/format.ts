export function formatCompactNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
  return n.toLocaleString('es-ES');
}

export function formatEngagementCount(value: number | null | undefined): string {
  if (value == null) return '—';
  return formatCompactNumber(value);
}
