import { Comment } from '../../domain/entities';
import { supabase } from '../supabase/client';

export interface CommentAnalysisInput {
  id: string;
  text: string;
}

export interface CommentAnalysisResult {
  id: string;
  sentiment: Comment['sentiment'];
  sentiment_confidence: number;
  category: Comment['category'];
  content_sentiment?: Comment['sentiment'];
  engagement_type?: string;
  is_resonance?: boolean;
  topic?: string;
  key_phrase?: string;
}

export interface CommentAnalysisResponse {
  results: CommentAnalysisResult[];
  engine: string;
  count: number;
  alerts?: string[];
  short_requests?: { id: string; short_request: string }[];
  analysis_report?: string;
  analysisReport?: string;
  strategic_report?: Record<string, unknown>;
  strategicReport?: Record<string, unknown>;
}

export class CommentAnalysisClient {
  private baseUrl: string;

  constructor(baseUrl: string = import.meta.env.VITE_API_URL ?? 'http://localhost:8000') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  private async getAuthHeader(): Promise<string> {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error('Debes iniciar sesión para analizar comentarios.');
    return `Bearer ${token}`;
  }

  async getEngineStatus(): Promise<{ sentiment_engine: string; ready: boolean }> {
    const response = await fetch(`${this.baseUrl}/nlp/status`);
    if (!response.ok) {
      throw new Error('Backend NLP no disponible');
    }
    return response.json();
  }

  async analyzeBatch(
    comments: CommentAnalysisInput[],
    videoTitle?: string,
    videoId?: string,
    channelName?: string,
    options: { includeStrategic?: boolean; videoContext?: string } = {}
  ): Promise<CommentAnalysisResponse> {
    if (comments.length === 0) {
      return { results: [], engine: 'none', count: 0 };
    }

    const auth = await this.getAuthHeader();
    const bodyPayload: Record<string, unknown> = {
      comments,
      video_title: videoTitle,
      include_strategic: options.includeStrategic ?? true,
    };
    if (videoId) bodyPayload.video_id = videoId;
    if (channelName) bodyPayload.channel_name = channelName;
    if (options.videoContext) bodyPayload.video_context = options.videoContext;

    const response = await fetch(`${this.baseUrl}/analyze/comments`, {
      method: 'POST',
      headers: {
        Authorization: auth,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bodyPayload),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        (error as { detail?: string })?.detail ?? `Error del backend NLP (${response.status})`
      );
    }

    const payload = await response.json();
    return {
      ...payload,
      analysisReport: payload.analysisReport ?? payload.analysis_report,
      strategicReport: payload.strategicReport ?? payload.strategic_report,
    } as CommentAnalysisResponse;
  }

  async generateStrategicReport(
    comments: CommentAnalysisInput[],
    analysisResults: CommentAnalysisResult[],
    videoTitle?: string,
    videoId?: string,
    channelName?: string,
    videoContext?: string
  ): Promise<Pick<CommentAnalysisResponse, 'analysisReport' | 'strategicReport'>> {
    if (comments.length === 0) return {};

    const auth = await this.getAuthHeader();
    const response = await fetch(`${this.baseUrl}/analyze/strategic-report`, {
      method: 'POST',
      headers: {
        Authorization: auth,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        comments,
        analysis_results: analysisResults,
        video_title: videoTitle,
        video_id: videoId,
        channel_name: channelName,
        video_context: videoContext,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        (error as { detail?: string })?.detail ?? `Error del reporte estratégico (${response.status})`
      );
    }

    const payload = await response.json();
    return {
      analysisReport: payload.analysisReport ?? payload.analysis_report,
      strategicReport: payload.strategicReport ?? payload.strategic_report,
    };
  }

  async getVideoContext(
    videoId: string,
    videoTitle?: string
  ): Promise<{ transcript?: string | null; summary?: string | null; full_context: string } | null> {
    const auth = await this.getAuthHeader();
    const params = new URLSearchParams();
    if (videoTitle) params.set('video_title', videoTitle);
    const query = params.toString();
    const response = await fetch(
      `${this.baseUrl}/analyze/video-summary/${videoId}${query ? `?${query}` : ''}`,
      {
        headers: { Authorization: auth },
      }
    );

    if (!response.ok) return null;
    return response.json();
  }
}

export const commentAnalysisClient = new CommentAnalysisClient();
