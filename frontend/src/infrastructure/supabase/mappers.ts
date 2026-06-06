import { Channel, ChannelSnapshot } from '../../domain/entities';
import { normalizeYoutubeImageUrl } from '../utils/images';

export interface ChannelRow {
  id: string;
  user_id: string;
  youtube_channel_id: string;
  name: string;
  handle: string;
  avatar_url: string | null;
  subscriber_count: number;
  total_views: number;
  video_count: number;
  views_30d: number;
  videos_30d: number;
  engagement_rate: number;
  is_competitor: boolean;
  last_sync_at: string;
}

export interface ChannelSnapshotRow {
  id: string;
  channel_id: string;
  snapshot_date: string;
  subscriber_count: number;
  total_views: number;
  video_count: number;
  views_30d: number;
  engagement_rate: number;
}

export function mapChannelRow(row: ChannelRow): Channel {
  return {
    id: row.id,
    youtubeChannelId: row.youtube_channel_id,
    name: row.name,
    handle: row.handle,
    avatarUrl: normalizeYoutubeImageUrl(row.avatar_url),
    subscriberCount: Number(row.subscriber_count),
    totalViews: Number(row.total_views),
    videoCount: Number(row.video_count),
    views30d: Number(row.views_30d),
    videos30d: Number(row.videos_30d),
    engagementRate: Number(row.engagement_rate),
    isCompetitor: row.is_competitor,
    lastSyncAt: row.last_sync_at,
  };
}

export function mapChannelToRow(channel: Channel, userId: string): Record<string, unknown> {
  return {
    id: channel.id || undefined,
    user_id: userId,
    youtube_channel_id: channel.youtubeChannelId,
    name: channel.name,
    handle: channel.handle,
    avatar_url: channel.avatarUrl,
    subscriber_count: channel.subscriberCount,
    total_views: channel.totalViews ?? 0,
    video_count: channel.videoCount ?? 0,
    views_30d: channel.views30d,
    videos_30d: channel.videos30d,
    engagement_rate: channel.engagementRate,
    is_competitor: channel.isCompetitor,
    last_sync_at: channel.lastSyncAt,
  };
}

export function mapSnapshotRow(row: ChannelSnapshotRow): ChannelSnapshot {
  return {
    id: row.id,
    channelId: row.channel_id,
    snapshotDate: row.snapshot_date,
    subscriberCount: Number(row.subscriber_count),
    totalViews: Number(row.total_views),
    videoCount: Number(row.video_count),
    views30d: Number(row.views_30d),
    engagementRate: Number(row.engagement_rate),
  };
}
