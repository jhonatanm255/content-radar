import { TrackedVideo } from './entities';

export interface ChannelEngagementTotals {
  totalLikes: number;
  totalDislikes: number | null;
  analyticsConnected: boolean;
}

export function sumVideoLikes(videos: TrackedVideo[]): number {
  return videos.reduce((sum, video) => sum + (video.likeCount ?? 0), 0);
}

export function sumVideoDislikes(videos: TrackedVideo[]): number | null {
  const withDislikes = videos.filter((video) => video.dislikeCount != null);
  if (withDislikes.length === 0) return null;
  return withDislikes.reduce((sum, video) => sum + (video.dislikeCount ?? 0), 0);
}

export function buildChannelEngagementTotals(
  videos: TrackedVideo[],
  analyticsConnected: boolean
): ChannelEngagementTotals {
  return {
    totalLikes: sumVideoLikes(videos),
    totalDislikes: sumVideoDislikes(videos),
    analyticsConnected,
  };
}
