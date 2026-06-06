import { Channel, ChannelSnapshot, TrackedVideo, Video, Comment, Opportunity, SavedIdea, Alert } from '../domain/entities';

export interface IChannelRepository {
  getChannels(): Promise<Channel[]>;
  getChannelById(id: string): Promise<Channel | null>;
  getOwnChannel(): Promise<Channel | null>;
  addChannel(channel: Omit<Channel, 'id'> & { id?: string }): Promise<Channel>;
  updateChannel(channel: Channel): Promise<void>;
  deleteChannel(id: string): Promise<void>;
}

export interface IChannelSnapshotRepository {
  getSnapshots(channelId: string, limit?: number): Promise<ChannelSnapshot[]>;
  upsertSnapshot(snapshot: Omit<ChannelSnapshot, 'id'> & { id?: string }): Promise<ChannelSnapshot>;
}

export interface ITrackedVideoRepository {
  getTrackedVideos(channelId: string): Promise<TrackedVideo[]>;
  addTrackedVideo(video: Omit<TrackedVideo, 'id'> & { id?: string }): Promise<TrackedVideo>;
  updateTrackedVideo(video: TrackedVideo): Promise<void>;
}

export interface IVideoRepository {
  getVideosByChannel(channelId: string): Promise<Video[]>;
  addVideos(videos: Video[]): Promise<void>;
}

export interface ICommentRepository {
  getCommentsByVideo(videoId: string): Promise<Comment[]>;
  getCommentsByChannel(channelId: string): Promise<Comment[]>;
  addComments(comments: Comment[]): Promise<void>;
  getCommentStats(channelId: string): Promise<{
    totalComments: number;
    uniqueUsers: number;
    commentsPerDay: number;
    averageEngagement: number;
  }>;
  getFaqs(channelId: string): Promise<{ text: string; count: number }[]>;
}

export interface IOpportunityRepository {
  getOpportunities(channelId: string): Promise<Opportunity[]>;
  addOpportunities(opportunities: Opportunity[]): Promise<void>;
}

export interface IIdeaRepository {
  getIdeas(): Promise<SavedIdea[]>;
  saveIdea(idea: SavedIdea): Promise<void>;
  updateIdeaStatus(id: string, status: SavedIdea['status']): Promise<void>;
  deleteIdea(id: string): Promise<void>;
}

export interface IAlertRepository {
  getAlerts(): Promise<Alert[]>;
  saveAlert(alert: Alert): Promise<void>;
  toggleAlertStatus(id: string): Promise<void>;
  deleteAlert(id: string): Promise<void>;
}
