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
    channelName?: string
  ): Promise<CommentAnalysisResponse> {
    if (comments.length === 0) {
      return { results: [], engine: 'none', count: 0 };
    }

    const auth = await this.getAuthHeader();
    const bodyPayload: Record<string, unknown> = { comments, video_title: videoTitle };
    if (videoId) bodyPayload.video_id = videoId;
    if (channelName) bodyPayload.channel_name = channelName;

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
}

export const commentAnalysisClient = new CommentAnalysisClient();
