export function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
  const trimmed = raw.trim().replace(/\/$/, '');
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}
