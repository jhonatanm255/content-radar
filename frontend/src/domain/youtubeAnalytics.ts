import { Channel } from './entities';

/** Canal vinculado en la app coincide con el conectado vía YouTube Analytics OAuth. */
export function isAnalyticsChannelMatch(
  channel: Pick<Channel, 'youtubeChannelId'> | undefined,
  oauthChannelId: string | undefined | null
): boolean {
  if (!channel?.youtubeChannelId || !oauthChannelId) return false;
  if (channel.youtubeChannelId.startsWith('pending_')) return false;
  return channel.youtubeChannelId === oauthChannelId;
}
