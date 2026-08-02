export function getApiBaseUrl(): string {
  // Fallback: servidor activo por defecto cuando VITE_API_URL no está definida en Vercel.
  // Opciones disponibles:
  //   Railway (producción):  'https://content-radar-production-d6ac.up.railway.app'
  //   TrueNAS (local/selfhost): 'https://<ip-o-dominio-truenas>'
  const raw = import.meta.env.VITE_API_URL ?? 'https://content-radar-production-d6ac.up.railway.app';
  const trimmed = raw.trim().replace(/\/$/, '');
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}
