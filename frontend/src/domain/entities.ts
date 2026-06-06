export interface Channel {
  id: string;
  youtubeChannelId?: string;
  name: string;
  handle: string;
  avatarUrl: string;
  subscriberCount: number;
  totalViews?: number;
  videoCount?: number;
  views30d: number;
  videos30d: number;
  engagementRate: number; // percentage (e.g. 5.7)
  isCompetitor: boolean;
  lastSyncAt: string;
}

export interface ChannelSnapshot {
  id: string;
  channelId: string;
  snapshotDate: string; // YYYY-MM-DD
  subscriberCount: number;
  totalViews: number;
  videoCount: number;
  views30d: number;
  engagementRate: number;
}

export interface TrackedVideo {
  id: string;
  channelId: string;
  youtubeVideoId: string;
  title: string;
  thumbnailUrl: string;
  publishedAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  commentsAnalyzedAt?: string;
  lastMetricsSyncAt?: string;
  analysisStatus: 'pending' | 'analyzing' | 'done' | 'stale';
}

export interface Video {
  id: string;
  channelId: string;
  title: string;
  publishedAt: string;
  viewCount: number;
  commentCount: number;
  likeCount: number;
  sentimentPositive: number; // percentage
  sentimentNeutral: number;  // percentage
  sentimentNegative: number; // percentage
}

export type CommentCategory = 'pregunta' | 'sugerencia' | 'problema' | 'elogio' | 'otro';
export type SentimentType = 'positive' | 'neutral' | 'negative';

export interface Comment {
  id: string;
  videoId: string;
  authorName: string;
  authorAvatar: string;
  text: string;
  publishedAt: string;
  sentiment: SentimentType;
  category: CommentCategory;
}

export interface Topic {
  id: string;
  name: string;
  mentionCount: number;
  percentage: number; // percentage of total comments (e.g. 25)
  sentimentRatio: { positive: number; neutral: number; negative: number };
  volumeGrowthRate: number; // percentage (e.g. 34)
}

export interface Opportunity {
  id: string;
  topicId: string;
  title: string;
  format: 'Video Tutorial' | 'Comparativa' | 'Guía' | 'Caso de Éxito';
  opportunityScore: number; // 0 - 100
  demand: 'Alta' | 'Media' | 'Baja';
  competition: 'Muy Baja' | 'Baja' | 'Media' | 'Alta';
  searchVolume: number; // e.g. 14800
  trend: number[]; // relative search volume trend over past 5 intervals
  justification: string[];
  tags: string[];
}

export type SavedIdeaStatus = 'todo' | 'in_progress' | 'published' | 'discarded';

export interface SavedIdea {
  id: string;
  topic: string;
  opportunityScore: number;
  status: SavedIdeaStatus;
  savedAt: string;
  channelId: string;
  notes?: string;
  format?: string;
}

export type AlertType = 'trend' | 'competitor' | 'performance' | 'topic';
export type AlertStatus = 'active' | 'paused' | 'triggered';

export interface Alert {
  id: string;
  name: string;
  type: AlertType;
  condition: string;
  status: AlertStatus;
  lastActivity: string;
  channelId: string;
}
