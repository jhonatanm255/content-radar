import { parseYoutubeInput } from '../utils/youtube';
import { normalizeYoutubeImageUrl } from '../utils/images';

export interface YoutubeChannelData {
  youtubeChannelId: string;
  name: string;
  handle: string;
  avatarUrl: string;
  subscriberCount: number;
  totalViews: number;
  videoCount: number;
}

export interface YoutubeVideoData {
  youtubeVideoId: string;
  title: string;
  thumbnailUrl: string;
  publishedAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
}

export interface YoutubeCommentData {
  youtubeCommentId: string;
  text: string;
  authorName: string;
  authorAvatar: string;
  publishedAt: string;
  likeCount: number;
}

interface YoutubeChannelItem {
  id: string;
  snippet: {
    title: string;
    customUrl?: string;
    thumbnails?: {
      high?: { url: string };
      medium?: { url: string };
      default?: { url: string };
    };
  };
  statistics: {
    subscriberCount?: string;
    viewCount?: string;
    videoCount?: string;
    hiddenSubscriberCount?: boolean;
  };
}

export class YoutubeApiClient {
  private apiKey: string;
  private baseUrl = 'https://www.googleapis.com/youtube/v3';

  constructor(apiKey: string = import.meta.env.VITE_YOUTUBE_API_KEY ?? '') {
    this.apiKey = apiKey;
  }

  isConfigured(): boolean {
    return this.apiKey.length > 0;
  }

  async fetchChannel(input: string): Promise<YoutubeChannelData | null> {
    if (!this.isConfigured()) {
      throw new Error('VITE_YOUTUBE_API_KEY no está configurada en el archivo .env');
    }

    const parsed = parseYoutubeInput(input);

    const params = new URLSearchParams({
      part: 'snippet,statistics',
      key: this.apiKey,
    });

    if (parsed.type === 'channelId') {
      params.set('id', parsed.value);
    } else {
      params.set('forHandle', parsed.value);
    }

    const response = await fetch(`${this.baseUrl}/channels?${params}`);
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        (error as { error?: { message?: string } })?.error?.message ??
          `Error de YouTube API (${response.status})`
      );
    }

    const data = await response.json() as { items?: YoutubeChannelItem[] };
    const item = data.items?.[0];
    if (!item) return null;

    return this.mapChannelItem(item, parsed.type === 'handle' ? parsed.value : undefined);
  }

  async fetchLatestVideos(youtubeChannelId: string, limit = 10): Promise<YoutubeVideoData[]> {
    if (!this.isConfigured()) {
      throw new Error('VITE_YOUTUBE_API_KEY no está configurada en el archivo .env');
    }

    const uploadsPlaylistId = await this.fetchUploadsPlaylistId(youtubeChannelId);
    if (!uploadsPlaylistId) return [];

    const playlistParams = new URLSearchParams({
      part: 'snippet,contentDetails',
      playlistId: uploadsPlaylistId,
      maxResults: String(Math.min(limit, 50)),
      key: this.apiKey,
    });

    const playlistResponse = await fetch(
      `${this.baseUrl}/playlistItems?${playlistParams}`
    );
    if (!playlistResponse.ok) {
      const error = await playlistResponse.json().catch(() => ({}));
      throw new Error(
        (error as { error?: { message?: string } })?.error?.message ??
          `Error al obtener videos (${playlistResponse.status})`
      );
    }

    const playlistData = await playlistResponse.json() as {
      items?: Array<{
        snippet: {
          title: string;
          publishedAt: string;
          thumbnails?: {
            high?: { url: string };
            medium?: { url: string };
            default?: { url: string };
          };
          resourceId?: { videoId?: string };
        };
        contentDetails?: { videoId?: string };
      }>;
    };

    const videoIds = (playlistData.items ?? [])
      .map((item) => item.contentDetails?.videoId ?? item.snippet.resourceId?.videoId)
      .filter(Boolean) as string[];

    if (videoIds.length === 0) return [];

    return this.fetchVideosByIds(videoIds.slice(0, limit));
  }

  async fetchVideosByIds(videoIds: string[]): Promise<YoutubeVideoData[]> {
    if (videoIds.length === 0) return [];
    if (!this.isConfigured()) {
      throw new Error('VITE_YOUTUBE_API_KEY no está configurada en el archivo .env');
    }
    return this.fetchVideoDetails(videoIds);
  }

  async fetchVideoComments(
    youtubeVideoId: string,
    maxComments = 100,
    onProgress?: (fetched: number, target: number) => void
  ): Promise<YoutubeCommentData[]> {
    if (!this.isConfigured()) {
      throw new Error('VITE_YOUTUBE_API_KEY no está configurada en el archivo .env');
    }

    const comments: YoutubeCommentData[] = [];
    let pageToken: string | undefined;

    while (comments.length < maxComments) {
      const params = new URLSearchParams({
        part: 'snippet',
        videoId: youtubeVideoId,
        maxResults: String(Math.min(100, maxComments - comments.length)),
        order: 'relevance',
        textFormat: 'plainText',
        key: this.apiKey,
      });
      if (pageToken) params.set('pageToken', pageToken);

      const response = await fetch(`${this.baseUrl}/commentThreads?${params}`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        const message =
          (error as { error?: { message?: string } })?.error?.message ?? '';
        if (response.status === 403 && message.toLowerCase().includes('disabled')) {
          return comments;
        }
        throw new Error(message || `Error al obtener comentarios (${response.status})`);
      }

      const data = await response.json() as {
        items?: Array<{
          id: string;
          snippet: {
            topLevelComment: {
              id: string;
              snippet: {
                textDisplay: string;
                authorDisplayName: string;
                authorProfileImageUrl?: string;
                publishedAt: string;
                likeCount?: number;
              };
            };
          };
        }>;
        nextPageToken?: string;
      };

      for (const item of data.items ?? []) {
        const top = item.snippet.topLevelComment;
        const snippet = top.snippet;
        comments.push({
          youtubeCommentId: top.id,
          text: snippet.textDisplay,
          authorName: snippet.authorDisplayName,
          authorAvatar: normalizeYoutubeImageUrl(snippet.authorProfileImageUrl),
          publishedAt: snippet.publishedAt,
          likeCount: snippet.likeCount ?? 0,
        });
      }

      onProgress?.(comments.length, maxComments);

      pageToken = data.nextPageToken;
      if (!pageToken || (data.items ?? []).length === 0) break;
    }

    return comments.slice(0, maxComments);
  }

  private async fetchUploadsPlaylistId(youtubeChannelId: string): Promise<string | null> {
    const params = new URLSearchParams({
      part: 'contentDetails',
      id: youtubeChannelId,
      key: this.apiKey,
    });

    const response = await fetch(`${this.baseUrl}/channels?${params}`);
    if (!response.ok) return null;

    const data = await response.json() as {
      items?: Array<{ contentDetails?: { relatedPlaylists?: { uploads?: string } } }>;
    };

    return data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads ?? null;
  }

  private async fetchVideoDetails(videoIds: string[]): Promise<YoutubeVideoData[]> {
    const params = new URLSearchParams({
      part: 'snippet,statistics',
      id: videoIds.join(','),
      key: this.apiKey,
    });

    const response = await fetch(`${this.baseUrl}/videos?${params}`);
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        (error as { error?: { message?: string } })?.error?.message ??
          `Error al obtener detalles de videos (${response.status})`
      );
    }

    const data = await response.json() as {
      items?: Array<{
        id: string;
        snippet: {
          title: string;
          publishedAt: string;
          thumbnails?: {
            high?: { url: string };
            medium?: { url: string };
            default?: { url: string };
          };
        };
        statistics: {
          viewCount?: string;
          likeCount?: string;
          commentCount?: string;
        };
      }>;
    };

    const orderMap = new Map(videoIds.map((id, index) => [id, index]));

    return (data.items ?? [])
      .map((item) => ({
        youtubeVideoId: item.id,
        title: item.snippet.title,
        thumbnailUrl: normalizeYoutubeImageUrl(
          item.snippet.thumbnails?.high?.url ??
            item.snippet.thumbnails?.medium?.url ??
            item.snippet.thumbnails?.default?.url ??
            ''
        ),
        publishedAt: item.snippet.publishedAt,
        viewCount: Number(item.statistics.viewCount ?? 0),
        likeCount: Number(item.statistics.likeCount ?? 0),
        commentCount: Number(item.statistics.commentCount ?? 0),
      }))
      .sort(
        (a, b) =>
          (orderMap.get(a.youtubeVideoId) ?? 0) - (orderMap.get(b.youtubeVideoId) ?? 0)
      );
  }

  private mapChannelItem(item: YoutubeChannelItem, fallbackHandle?: string): YoutubeChannelData {
    const customUrl = item.snippet.customUrl?.replace('@', '') ?? fallbackHandle ?? '';
    const avatar = normalizeYoutubeImageUrl(
      item.snippet.thumbnails?.high?.url ??
        item.snippet.thumbnails?.medium?.url ??
        item.snippet.thumbnails?.default?.url ??
        ''
    );

    return {
      youtubeChannelId: item.id,
      name: item.snippet.title,
      handle: customUrl ? `@${customUrl}` : `@${item.id}`,
      avatarUrl: avatar,
      subscriberCount: Number(item.statistics.subscriberCount ?? 0),
      totalViews: Number(item.statistics.viewCount ?? 0),
      videoCount: Number(item.statistics.videoCount ?? 0),
    };
  }
}
