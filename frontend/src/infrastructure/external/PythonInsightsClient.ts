/**
 * Cliente para el servicio de procesamiento en Python (FastAPI).
 * Envía comentarios y videos para análisis contextual con Gemini.
 */

import { getApiBaseUrl } from '../utils/apiBaseUrl';

export interface CommentAnalysisResult {
  id: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  sentiment_confidence: number;
  category: string;
  content_sentiment: 'positive' | 'neutral' | 'negative';
  engagement_type: 'resonance' | 'support' | 'criticism' | 'question' | 'suggestion' | 'problem' | 'neutral';
  is_resonance: boolean;
  // Campos opcionales si Gemini está disponible
  sentiment_gemini?: 'positive' | 'neutral' | 'negative';
  engagement_type_gemini?: string;
  topic_gemini?: string;
  relevance_gemini?: 'high' | 'medium' | 'low';
  intent_gemini?: string;
  key_phrase?: string;
}

export interface VideoContextResponse {
  transcript?: string | null;
  summary?: string | null;
  full_context: string;
}

export interface CommentAnalysisResponse {
  results: CommentAnalysisResult[];
  engine: string;
  count: number;
  alerts?: string[];
  short_requests?: { id: string; short_request: string }[];
  analysis_report?: string;
}

export class PythonInsightsClient {
  private baseUrl: string;
  private authToken?: string;

  constructor(baseUrl: string = getApiBaseUrl(), authToken?: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.authToken = authToken;
  }

  setAuthToken(token: string) {
    this.authToken = token;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }
    return headers;
  }

  /**
   * Analiza comentarios con contexto del video (nuevo).
   * Si se proporciona video_id, extrae automáticamente la transcripción y resumen.
   */
  async analyzeComments(
    comments: { id: string; text: string }[],
    options?: {
      videoTitle?: string;
      videoContext?: string;
      videoId?: string;
    }
  ): Promise<CommentAnalysisResponse> {
    console.log(`[PythonInsights] Analyzing ${comments.length} comments with context...`);
    
    const requestBody = {
      comments,
      video_title: options?.videoTitle,
      video_context: options?.videoContext,
      video_id: options?.videoId,
    };

    try {
      const response = await fetch(`${this.baseUrl}/analyze/comments`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`[PythonInsights] Analysis complete. Engine: ${data.engine}`);
      return data;
    } catch (error) {
      console.error('[PythonInsights] Error analyzing comments:', error);
      throw error;
    }
  }

  /**
   * Obtiene el contexto completo de un video (transcripción + resumen).
   */
  async getVideoContext(videoId: string, videoTitle?: string): Promise<VideoContextResponse> {
    console.log(`[PythonInsights] Extracting context for video ${videoId}...`);

    try {
      const response = await fetch(`${this.baseUrl}/analyze/video-context`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          video_id: videoId,
          video_title: videoTitle,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[PythonInsights] Context extracted successfully');
      return data;
    } catch (error) {
      console.error('[PythonInsights] Error extracting video context:', error);
      throw error;
    }
  }

  /**
   * Obtiene solo el resumen de un video.
   */
  async getVideoSummary(videoId: string, videoTitle?: string): Promise<VideoContextResponse> {
    console.log(`[PythonInsights] Getting summary for video ${videoId}...`);

    try {
      const url = new URL(`${this.baseUrl}/analyze/video-summary/${videoId}`);
      if (videoTitle) {
        url.searchParams.append('video_title', videoTitle);
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[PythonInsights] Summary retrieved successfully');
      return data;
    } catch (error) {
      console.error('[PythonInsights] Error getting video summary:', error);
      throw error;
    }
  }

  /**
   * Método legacy para compatibilidad.
   */
  async analyzeCommentsSentiment(comments: { id: string; text: string }[]): Promise<{ id: string; sentiment: 'positive' | 'neutral' | 'negative' }[]> {
    console.log(`[PythonInsights] Analyzing sentiment for ${comments.length} comments (legacy)`);
    
    try {
      const response = await this.analyzeComments(comments);
      return response.results.map(r => ({
        id: r.id,
        sentiment: r.sentiment,
      }));
    } catch (error) {
      console.error('[PythonInsights] Error in legacy sentiment analysis:', error);
      return comments.map(c => ({
        id: c.id,
        sentiment: 'neutral' as const,
      }));
    }
  }

  /**
   * Extrae tópicos (legacy - mock).
   */
  async extractTopics(comments: string[]): Promise<{ topic: string; count: number; growth: number }[]> {
    console.log(`[PythonInsights] Extracting topics from ${comments.length} texts (legacy)`);
    return [];
  }
}
