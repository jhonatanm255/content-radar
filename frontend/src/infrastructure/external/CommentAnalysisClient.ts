import { Comment } from '../../domain/entities';
import { getApiBaseUrl } from '../utils/apiBaseUrl';
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
  dedup_stats?: Record<string, number>;
}

interface AnalysisJobCreateResponse {
  job_id: string;
  status: string;
  message: string;
}

interface AnalysisJobStatusResponse {
  job_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  message: string;
  result?: CommentAnalysisResponse;
  error?: string;
}

const ASYNC_ANALYSIS_THRESHOLD = 50;
const JOB_POLL_INTERVAL_MS = 2000;
const JOB_TIMEOUT_MS = 20 * 60 * 1000;

export type AnalysisProgressCallback = (message: string, progress: number) => void;

export class CommentAnalysisClient {
  private baseUrl: string;

  constructor(baseUrl: string = getApiBaseUrl()) {
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
    options: {
      includeStrategic?: boolean;
      videoContext?: string;
      onProgress?: AnalysisProgressCallback;
      signal?: AbortSignal;
    } = {}
  ): Promise<CommentAnalysisResponse> {
    if (comments.length === 0) {
      return { results: [], engine: 'none', count: 0 };
    }

    if (comments.length >= ASYNC_ANALYSIS_THRESHOLD) {
      return this.analyzeBatchAsync(comments, videoTitle, videoId, channelName, options);
    }

    return this.analyzeBatchSync(comments, videoTitle, videoId, channelName, options);
  }

  private buildAnalyzePayload(
    comments: CommentAnalysisInput[],
    videoTitle?: string,
    videoId?: string,
    channelName?: string,
    options: { includeStrategic?: boolean; videoContext?: string } = {}
  ): Record<string, unknown> {
    const bodyPayload: Record<string, unknown> = {
      comments,
      video_title: videoTitle,
      include_strategic: options.includeStrategic ?? true,
    };
    if (videoId) bodyPayload.video_id = videoId;
    if (channelName) bodyPayload.channel_name = channelName;
    if (options.videoContext) bodyPayload.video_context = options.videoContext;
    return bodyPayload;
  }

  private normalizeAnalysisResponse(payload: CommentAnalysisResponse): CommentAnalysisResponse {
    return {
      ...payload,
      analysisReport: payload.analysisReport ?? payload.analysis_report,
      strategicReport: payload.strategicReport ?? payload.strategic_report,
    };
  }

  private async analyzeBatchSync(
    comments: CommentAnalysisInput[],
    videoTitle?: string,
    videoId?: string,
    channelName?: string,
    options: { includeStrategic?: boolean; videoContext?: string; signal?: AbortSignal } = {}
  ): Promise<CommentAnalysisResponse> {
    const auth = await this.getAuthHeader();
    const response = await fetch(`${this.baseUrl}/analyze/comments`, {
      method: 'POST',
      headers: {
        Authorization: auth,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(this.buildAnalyzePayload(comments, videoTitle, videoId, channelName, options)),
      signal: options.signal,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      const detail = (error as { detail?: string })?.detail ?? '';
      if (response.status === 409 && detail.includes('/analyze/comments/jobs')) {
        return this.analyzeBatchAsync(comments, videoTitle, videoId, channelName, options);
      }
      throw new Error(detail || `Error del backend NLP (${response.status})`);
    }

    const payload = (await response.json()) as CommentAnalysisResponse;
    return this.normalizeAnalysisResponse(payload);
  }

  private async analyzeBatchAsync(
    comments: CommentAnalysisInput[],
    videoTitle?: string,
    videoId?: string,
    channelName?: string,
    options: {
      includeStrategic?: boolean;
      videoContext?: string;
      onProgress?: AnalysisProgressCallback;
      signal?: AbortSignal;
    } = {}
  ): Promise<CommentAnalysisResponse> {
    const auth = await this.getAuthHeader();
    options.onProgress?.('Iniciando análisis en segundo plano…', 0.02);

    const createResponse = await fetch(`${this.baseUrl}/analyze/comments/jobs`, {
      method: 'POST',
      headers: {
        Authorization: auth,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(this.buildAnalyzePayload(comments, videoTitle, videoId, channelName, options)),
    });

    if (!createResponse.ok) {
      const error = await createResponse.json().catch(() => ({}));
      throw new Error(
        (error as { detail?: string })?.detail ??
          `No se pudo iniciar el análisis asíncrono (${createResponse.status})`
      );
    }

    const created = (await createResponse.json()) as AnalysisJobCreateResponse;
    const startedAt = Date.now();

    while (Date.now() - startedAt < JOB_TIMEOUT_MS) {
      if (options.signal?.aborted) {
        await this.cancelJob(created.job_id, auth);
        throw new DOMException('Análisis cancelado', 'AbortError');
      }

      await new Promise((resolve) => setTimeout(resolve, JOB_POLL_INTERVAL_MS));
      
      if (options.signal?.aborted) {
        await this.cancelJob(created.job_id, auth);
        throw new DOMException('Análisis cancelado', 'AbortError');
      }

      const statusResponse = await fetch(`${this.baseUrl}/analyze/comments/jobs/${created.job_id}`, {
        headers: { Authorization: auth },
        signal: options.signal,
      });

      if (!statusResponse.ok) {
        const error = await statusResponse.json().catch(() => ({}));
        throw new Error(
          (error as { detail?: string })?.detail ??
            `Error consultando job de análisis (${statusResponse.status})`
        );
      }

      const status = (await statusResponse.json()) as AnalysisJobStatusResponse;
      if (status.message) {
        options.onProgress?.(status.message, Math.max(0.05, status.progress));
      }

      if (status.status === 'completed' && status.result) {
        options.onProgress?.('Análisis completado', 1);
        return this.normalizeAnalysisResponse(status.result);
      }
      if (status.status === 'failed' || status.status === 'cancelled') {
        throw new Error(status.error ?? (status.status === 'cancelled' ? 'Análisis cancelado en el servidor.' : 'El análisis falló en el backend.'));
      }
    }

    throw new Error('Tiempo de espera agotado esperando el análisis de comentarios.');
  }

  private async cancelJob(jobId: string, auth: string): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/analyze/comments/jobs/${jobId}`, {
        method: 'DELETE',
        headers: { Authorization: auth },
      });
    } catch (error) {
      console.warn('Error intentando cancelar el job:', error);
    }
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
