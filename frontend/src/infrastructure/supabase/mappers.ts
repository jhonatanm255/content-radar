import { Channel, ChannelSnapshot, TrackedVideo, Comment } from '../../domain/entities';
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

export interface TrackedVideoRow {
  id: string;
  channel_id: string;
  user_id: string;
  youtube_video_id: string;
  title: string;
  thumbnail_url: string | null;
  published_at: string | null;
  view_count: number;
  like_count: number;
  dislike_count: number | null;
  comment_count: number;
  comments_analyzed_at: string | null;
  comments_fetched_at: string | null;
  last_metrics_sync_at: string | null;
  analysis_status: string;
  analysis_report?: string | null;
  strategic_report?: Record<string, unknown> | null;
}

export interface CommentRow {
  id: string;
  tracked_video_id: string;
  user_id: string;
  youtube_comment_id: string;
  author_name: string;
  author_avatar: string | null;
  text: string;
  published_at: string | null;
  sentiment: string;
  category: string;
  like_count: number;
  content_sentiment?: string | null;
  engagement_type?: string | null;
  topic?: string | null;
  key_phrase?: string | null;
  is_resonance?: boolean | null;
}

export function mapTrackedVideoRow(row: TrackedVideoRow): TrackedVideo {
  return {
    id: row.id,
    channelId: row.channel_id,
    youtubeVideoId: row.youtube_video_id,
    title: row.title,
    thumbnailUrl: normalizeYoutubeImageUrl(row.thumbnail_url),
    publishedAt: row.published_at ?? new Date().toISOString(),
    viewCount: Number(row.view_count),
    likeCount: Number(row.like_count),
    dislikeCount:
      'dislike_count' in row && row.dislike_count != null ? Number(row.dislike_count) : null,
    commentCount: Number(row.comment_count),
    commentsAnalyzedAt: row.comments_analyzed_at ?? undefined,
    lastMetricsSyncAt: row.last_metrics_sync_at ?? undefined,
    analysisStatus: (row.analysis_status as TrackedVideo['analysisStatus']) ?? 'pending',
    analysisReport: row.analysis_report ?? undefined,
    strategicReport: row.strategic_report ?? undefined,
  };
}

export function mapTrackedVideoToRow(
  video: Omit<TrackedVideo, 'id'> & { id?: string },
  userId: string
): Record<string, unknown> {
  const row: Record<string, unknown> = {
    channel_id: video.channelId,
    user_id: userId,
    youtube_video_id: video.youtubeVideoId,
    title: video.title,
    thumbnail_url: video.thumbnailUrl,
    published_at: video.publishedAt,
    view_count: video.viewCount,
    like_count: video.likeCount,
    dislike_count: video.dislikeCount ?? null,
    comment_count: video.commentCount,
    comments_analyzed_at: video.commentsAnalyzedAt ?? null,
    comments_fetched_at: video.commentsAnalyzedAt ?? null,
    last_metrics_sync_at: video.lastMetricsSyncAt ?? null,
    analysis_status: video.analysisStatus,
    analysis_report: video.analysisReport ?? null,
    strategic_report: video.strategicReport ?? null,
  };

  if (video.id) {
    row.id = video.id;
  }

  return row;
}

export function mapCommentRow(row: CommentRow): Comment {
  return {
    id: row.id,
    videoId: row.tracked_video_id,
    authorName: row.author_name,
    authorAvatar: normalizeYoutubeImageUrl(row.author_avatar),
    text: row.text,
    publishedAt: row.published_at ?? new Date().toISOString(),
    sentiment: row.sentiment as Comment['sentiment'],
    category: row.category as Comment['category'],
    contentSentiment: (row.content_sentiment as Comment['contentSentiment']) ?? undefined,
    engagementType: (row.engagement_type as Comment['engagementType']) ?? undefined,
    topic: row.topic ?? undefined,
    keyPhrase: row.key_phrase ?? undefined,
    isResonance: row.is_resonance ?? undefined,
  };
}

export function mapCommentToRow(
  comment: {
    authorName: string;
    authorAvatar: string;
    text: string;
    publishedAt: string;
    sentiment: Comment['sentiment'];
    category: Comment['category'];
    youtubeCommentId: string;
    contentSentiment?: Comment['contentSentiment'];
    engagementType?: Comment['engagementType'];
    topic?: string;
    keyPhrase?: string;
    isResonance?: boolean;
    id?: string;
  },
  trackedVideoId: string,
  userId: string
): Record<string, unknown> {
  const row: Record<string, unknown> = {
    tracked_video_id: trackedVideoId,
    user_id: userId,
    youtube_comment_id: comment.youtubeCommentId,
    author_name: comment.authorName,
    author_avatar: comment.authorAvatar,
    text: comment.text,
    published_at: comment.publishedAt,
    sentiment: comment.sentiment,
    category: comment.category,
    like_count: 0,
    content_sentiment: comment.contentSentiment ?? null,
    engagement_type: comment.engagementType ?? null,
    topic: comment.topic ?? null,
    key_phrase: comment.keyPhrase ?? null,
    is_resonance: comment.isResonance ?? false,
  };

  if (comment.id) {
    row.id = comment.id;
  }

  return row;
}
