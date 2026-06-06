/** Normaliza URLs de imágenes de YouTube (protocolo, https) */
export function normalizeYoutubeImageUrl(url: string | null | undefined): string {
  if (!url?.trim()) return '';
  let normalized = url.trim();
  if (normalized.startsWith('//')) {
    normalized = `https:${normalized}`;
  }
  if (normalized.startsWith('http://')) {
    normalized = normalized.replace('http://', 'https://');
  }
  return normalized;
}
