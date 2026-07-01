import {
  ChannelDemographics,
  VideoEngagementSummary,
  YoutubeOAuthStatus,
} from '../../domain/demographics';
import { supabase } from '../supabase/client';

export class YoutubeAnalyticsClient {
  private baseUrl: string;

  constructor(baseUrl: string = import.meta.env.VITE_API_URL ?? 'http://localhost:8000') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  private async getAuthHeader(): Promise<string> {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error('Debes iniciar sesión para usar YouTube Analytics.');
    return `Bearer ${token}`;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const auth = await this.getAuthHeader();
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        Authorization: auth,
        ...(options.headers ?? {}),
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        (error as { detail?: string })?.detail ?? `Error del servidor (${response.status})`
      );
    }

    return response.json() as Promise<T>;
  }

  async getStatus(): Promise<YoutubeOAuthStatus> {
    return this.request<YoutubeOAuthStatus>('/auth/youtube/status');
  }

  async getAuthUrl(): Promise<string> {
    const data = await this.request<{ auth_url: string }>('/auth/youtube/start');
    return data.auth_url;
  }

  async disconnect(): Promise<void> {
    await this.request('/auth/youtube/disconnect', { method: 'DELETE' });
  }

  async getDemographics(startDate?: string, endDate?: string): Promise<ChannelDemographics> {
    const params = new URLSearchParams();
    if (startDate) params.set('start_date', startDate);
    if (endDate) params.set('end_date', endDate);
    const query = params.toString() ? `?${params}` : '';
    return this.request<ChannelDemographics>(`/analytics/demographics${query}`);
  }

  async getVideoEngagement(
    startDate?: string,
    endDate?: string
  ): Promise<VideoEngagementSummary> {
    const params = new URLSearchParams();
    if (startDate) params.set('start_date', startDate);
    if (endDate) params.set('end_date', endDate);
    const query = params.toString() ? `?${params}` : '';
    return this.request<VideoEngagementSummary>(`/analytics/video-engagement${query}`);
  }
}

export const youtubeAnalyticsClient = new YoutubeAnalyticsClient();
