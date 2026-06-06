/**
 * Normaliza la entrada del usuario a un handle de YouTube sin @.
 * Acepta: @midudev, midudev, youtube.com/@midudev, youtube.com/channel/UC...
 */
export function parseYoutubeInput(input: string): { type: 'handle' | 'channelId'; value: string } {
  const trimmed = input.trim();

  // URL con /channel/UC...
  const channelIdMatch = trimmed.match(
    /(?:youtube\.com\/channel\/)([a-zA-Z0-9_-]{10,})/
  );
  if (channelIdMatch) {
    return { type: 'channelId', value: channelIdMatch[1] };
  }

  // Channel ID crudo (empieza con UC y tiene ~24 caracteres)
  if (/^UC[a-zA-Z0-9_-]{22,}$/.test(trimmed)) {
    return { type: 'channelId', value: trimmed };
  }

  // URL con /@handle
  const handleMatch = trimmed.match(/(?:youtube\.com\/@)([a-zA-Z0-9._-]+)/);
  if (handleMatch) {
    return { type: 'handle', value: handleMatch[1] };
  }

  const clean = trimmed.replace(/^@/, '').replace(/\s+/g, '');
  return { type: 'handle', value: clean };
}

export function formatHandle(handle: string): string {
  return handle.startsWith('@') ? handle : `@${handle}`;
}

export function todayDateString(): string {
  return new Date().toISOString().split('T')[0];
}
