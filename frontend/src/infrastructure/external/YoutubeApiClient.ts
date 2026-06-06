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
