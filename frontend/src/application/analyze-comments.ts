import { TrackedVideo } from '../domain/entities';
import {
  CommentAnalysisSummary,
  StrategicReport,
  buildCommentAnalysisSummary,
  parseStrategicReport,
  pickStrategicReportFromVideos,
} from '../domain/commentAnalysis';
import { analyzeCommentSentiment, categorizeComment } from '../domain/services';
import { EngagementType } from '../domain/entities';
import {
  IChannelRepository,
  ITrackedVideoRepository,
  ICommentRepository,
} from './repositories';
import { YoutubeApiClient, YoutubeVideoData, YoutubeCommentData } from '../infrastructure/external/YoutubeApiClient';
import {
  CommentAnalysisClient,
  CommentAnalysisResult,
  commentAnalysisClient,
} from '../infrastructure/external/CommentAnalysisClient';

export const LATEST_VIDEOS_LIMIT = 10;
export const CHANNEL_VIDEOS_LIMIT = 30;
/** Límite por video al analizar los últimos N (evita timeouts con muchos videos) */
export const MAX_COMMENTS_BULK_PER_VIDEO = 300;
/** Límite al analizar video(s) seleccionado(s) — intenta traer todos los comentarios */
export const MAX_COMMENTS_SELECTED_CAP = 10_000;
export const NLP_BATCH_SIZE = 500;
export const ANALYSIS_STALE_HOURS = 24;

/** @deprecated Usar getCommentFetchLimit */
export const MAX_COMMENTS_PER_VIDEO = MAX_COMMENTS_BULK_PER_VIDEO;

export function getCommentFetchLimit(
  video: Pick<YoutubeVideoData, 'commentCount'>,
  options: AnalyzeCommentsOptions
): number {
  if (video.commentCount <= 0) return 0;
  const isSelected = Boolean(options.youtubeVideoIds?.length);
  const cap = isSelected ? MAX_COMMENTS_SELECTED_CAP : MAX_COMMENTS_BULK_PER_VIDEO;
  return Math.min(video.commentCount, cap);
}

export type AnalyzeProgressCallback = (step: string, progress: number) => void;

export interface AnalyzeCommentsOptions {
  /** IDs de YouTube (ej. dQw4w9WgXcQ). Si se envían, solo se analizan esos videos. */
  youtubeVideoIds?: string[];
  /** Cuántos videos recientes analizar cuando no hay selección. Default: 10 */
  limit?: number;
  /** Re-analizar aunque el video no esté stale */
  force?: boolean;
  /** Señal de cancelación */
  abortSignal?: AbortSignal;
}

interface ClassifiedComment extends YoutubeCommentData {
  sentiment: ReturnType<typeof analyzeCommentSentiment>;
  category: ReturnType<typeof categorizeComment>;
  contentSentiment?: ReturnType<typeof analyzeCommentSentiment>;
  engagementType?: EngagementType;
  topic?: string;
  keyPhrase?: string;
  isResonance?: boolean;
}

interface ClassifyCommentsResult {
  comments: ClassifiedComment[];
  engine: string;
  analysisReport?: string;
  strategicReport?: StrategicReport;
}

function mapBackendResult(result: CommentAnalysisResult): Pick<
  ClassifiedComment,
  'sentiment' | 'category' | 'contentSentiment' | 'engagementType' | 'topic' | 'keyPhrase' | 'isResonance'
> {
  const engagement = result.engagement_type as EngagementType | undefined;
  return {
    sentiment: result.sentiment,
    category: result.category,
    contentSentiment: result.content_sentiment ?? result.sentiment,
    engagementType: engagement,
    topic: result.topic,
    keyPhrase: result.key_phrase,
    isResonance: result.is_resonance ?? engagement === 'resonance',
  };
}

async function classifyComments(
  ytComments: YoutubeCommentData[],
  analysisClient: CommentAnalysisClient,
  videoTitle?: string,
  videoId?: string,
  channelName?: string,
  onProgress?: AnalyzeProgressCallback,
  abortSignal?: AbortSignal
): Promise<ClassifyCommentsResult> {
  if (ytComments.length === 0) {
    return { comments: [], engine: 'none' };
  }

  try {
    const byId = new Map<string, CommentAnalysisResult>();
    let engine = 'none';
    let analysisReport: string | undefined;
    let strategicReport: StrategicReport | undefined;
    let videoContext: string | undefined;

    if (videoId) {
      try {
        const context = await analysisClient.getVideoContext(videoId, videoTitle);
        videoContext = context?.full_context || undefined;
      } catch (error) {
        console.warn('[AnalyzeComments] No se pudo obtener contexto del video.', error);
      }
    }

    for (let i = 0; i < ytComments.length; i += NLP_BATCH_SIZE) {
      const chunk = ytComments.slice(i, i + NLP_BATCH_SIZE);
      const isLastChunk = i + NLP_BATCH_SIZE >= ytComments.length;
      const chunkWeight = chunk.length / ytComments.length;

      const response = await analysisClient.analyzeBatch(
        chunk.map((comment) => ({
          id: comment.youtubeCommentId,
          text: comment.text,
        })),
        videoTitle,
        videoId,
        channelName,
        {
          includeStrategic: isLastChunk,
          videoContext,
          onProgress: (message, progress) => {
            const overall = (i / ytComments.length + progress * chunkWeight) * 100;
            onProgress?.(message, Math.min(99, Math.round(overall)));
          },
          signal: abortSignal,
        }
      );
      engine = response.engine;
      analysisReport = response.analysisReport ?? response.analysis_report ?? analysisReport;
      const rawStrategic = response.strategicReport ?? response.strategic_report;
      if (rawStrategic) {
        strategicReport = parseStrategicReport(rawStrategic) ?? strategicReport;
      }
      response.results.forEach((result) => byId.set(result.id, result));
    }

    return {
      engine,
      analysisReport,
      strategicReport,
      comments: ytComments.map((comment) => {
        const result = byId.get(comment.youtubeCommentId);
        const mapped = result
          ? mapBackendResult(result)
          : {
              sentiment: analyzeCommentSentiment(comment.text),
              category: categorizeComment(comment.text),
            };

        return {
          ...comment,
          ...mapped,
        };
      }),
    };
  } catch (error) {
    console.warn('[AnalyzeComments] Backend NLP no disponible, usando heurísticas locales.', error);
    return {
      engine: 'heuristic-local',
      comments: ytComments.map((comment) => ({
        ...comment,
        sentiment: analyzeCommentSentiment(comment.text),
        category: categorizeComment(comment.text),
      })),
    };
  }
}

function hasSavedAnalysis(video: TrackedVideo): boolean {
  return video.analysisStatus === 'done' && Boolean(video.commentsAnalyzedAt);
}

export class AnalyzeChannelCommentsUseCase {
  constructor(
    private channelRepo: IChannelRepository,
    private trackedVideoRepo: ITrackedVideoRepository,
    private commentRepo: ICommentRepository,
    private youtubeClient: YoutubeApiClient,
    private analysisClient: CommentAnalysisClient = commentAnalysisClient
  ) {}

  async loadSummary(
    channelId: string,
    filterTrackedVideoIds?: string[],
    analysisEngine?: string,
    analysisReport?: string,
    strategicReport?: StrategicReport
  ): Promise<CommentAnalysisSummary> {
    const trackedVideos = await this.trackedVideoRepo.getTrackedVideos(channelId);

    const filteredVideos = filterTrackedVideoIds
      ? trackedVideos.filter((v) => filterTrackedVideoIds.includes(v.id))
      : trackedVideos;

    const filteredVideoIds = filteredVideos.map((v) => v.id);
    const filteredVideoIdSet = new Set(filteredVideoIds);
    const filteredComments = (await this.commentRepo.getCommentsByVideos(filteredVideoIds))
      .filter((c) => filteredVideoIdSet.has(c.videoId));

    const sortedFilteredVideos = [...filteredVideos].sort((a, b) => {
      const da = a.commentsAnalyzedAt ? new Date(a.commentsAnalyzedAt).getTime() : 0;
      const db = b.commentsAnalyzedAt ? new Date(b.commentsAnalyzedAt).getTime() : 0;
      return db - da;
    });

    const resolvedStrategic =
      strategicReport ?? pickStrategicReportFromVideos(sortedFilteredVideos);
    const resolvedReport =
      analysisReport ??
      sortedFilteredVideos.find((v) => v.analysisReport)?.analysisReport;
    const resolvedEngine =
      analysisEngine ??
      sortedFilteredVideos.find((v) => v.analysisEngine)?.analysisEngine ??
      (resolvedStrategic as any)?.analysisEngine;

    return buildCommentAnalysisSummary(
      filteredComments,
      filteredVideos,
      resolvedEngine,
      resolvedReport,
      resolvedStrategic
    );
  }

  async syncVideoCatalog(channelId: string, limit = CHANNEL_VIDEOS_LIMIT): Promise<TrackedVideo[]> {
    const channel = await this.channelRepo.getChannelById(channelId);
    if (!channel?.youtubeChannelId || channel.youtubeChannelId.startsWith('pending_')) {
      throw new Error('El canal no tiene un ID de YouTube válido.');
    }

    if (!this.youtubeClient.isConfigured()) {
      throw new Error('Configura VITE_YOUTUBE_API_KEY en tu archivo .env.');
    }

    const latestVideos = await this.youtubeClient.fetchLatestVideos(
      channel.youtubeChannelId,
      limit
    );

    if (latestVideos.length === 0) return [];

    const existingVideos = await this.trackedVideoRepo.getTrackedVideos(channelId);
    const existingByYoutubeId = new Map(
      existingVideos.map((video) => [video.youtubeVideoId, video])
    );

    return this.trackedVideoRepo.upsertTrackedVideos(
      channelId,
      latestVideos.map((video) => {
        const existing = existingByYoutubeId.get(video.youtubeVideoId);
        return {
          youtubeVideoId: video.youtubeVideoId,
          title: video.title,
          thumbnailUrl: video.thumbnailUrl,
          publishedAt: video.publishedAt,
          viewCount: video.viewCount,
          likeCount: video.likeCount,
          commentCount: video.commentCount,
          analysisStatus: existing?.analysisStatus ?? 'pending',
          commentsAnalyzedAt: existing?.commentsAnalyzedAt,
          lastMetricsSyncAt: existing?.lastMetricsSyncAt,
          analysisReport: existing?.analysisReport,
          strategicReport: existing?.strategicReport,
        };
      })
    );
  }

  async execute(
    channelId: string,
    onProgress?: AnalyzeProgressCallback,
    options: AnalyzeCommentsOptions = {}
  ): Promise<CommentAnalysisSummary> {
    const channel = await this.channelRepo.getChannelById(channelId);
    if (!channel) throw new Error('Canal no encontrado');

    const youtubeChannelId = channel.youtubeChannelId;
    if (!youtubeChannelId || youtubeChannelId.startsWith('pending_')) {
      throw new Error('El canal no tiene un ID de YouTube válido. Sincroniza el canal primero.');
    }

    if (!this.youtubeClient.isConfigured()) {
      throw new Error('Configura VITE_YOUTUBE_API_KEY en tu archivo .env para analizar comentarios.');
    }

    const force = options.force ?? Boolean(options.youtubeVideoIds?.length);
    let videosToProcess: YoutubeVideoData[];

    if (options.youtubeVideoIds?.length) {
      onProgress?.('Obteniendo videos seleccionados...', 5);
      videosToProcess = await this.youtubeClient.fetchVideosByIds(options.youtubeVideoIds);
      if (videosToProcess.length === 0) {
        throw new Error('No se encontraron los videos seleccionados en YouTube.');
      }
    } else {
      const limit = options.limit ?? LATEST_VIDEOS_LIMIT;
      onProgress?.(`Obteniendo últimos ${limit} videos del canal...`, 5);
      videosToProcess = await this.youtubeClient.fetchLatestVideos(youtubeChannelId, limit);
    }

    if (videosToProcess.length === 0) {
      throw new Error('No se encontraron videos en el canal.');
    }

    onProgress?.('Guardando videos rastreados...', 15);

    const existingVideos = await this.trackedVideoRepo.getTrackedVideos(channelId);
    const existingByYoutubeId = new Map(
      existingVideos.map((video) => [video.youtubeVideoId, video])
    );

    const trackedVideos = await this.trackedVideoRepo.upsertTrackedVideos(
      channelId,
      videosToProcess.map((video) => {
        const existing = existingByYoutubeId.get(video.youtubeVideoId);
        return {
          youtubeVideoId: video.youtubeVideoId,
          title: video.title,
          thumbnailUrl: video.thumbnailUrl,
          publishedAt: video.publishedAt,
          viewCount: video.viewCount,
          likeCount: video.likeCount,
          commentCount: video.commentCount,
          analysisStatus: existing?.analysisStatus ?? 'pending',
          commentsAnalyzedAt: existing?.commentsAnalyzedAt,
          lastMetricsSyncAt: existing?.lastMetricsSyncAt,
          analysisReport: existing?.analysisReport,
          strategicReport: existing?.strategicReport,
        };
      })
    );

    const videoMap = new Map(trackedVideos.map((v) => [v.youtubeVideoId, v]));
    const totalVideos = videosToProcess.length;
    let lastAnalysisEngine: string | undefined;
    let lastAnalysisReport: string | undefined;
    let lastStrategicReport: StrategicReport | undefined;

    for (let i = 0; i < videosToProcess.length; i++) {
      const ytVideo = videosToProcess[i];
      const tracked = videoMap.get(ytVideo.youtubeVideoId);
      if (!tracked) continue;

      const baseProgress = 20 + Math.round((i / totalVideos) * 70);
      onProgress?.(
        `Analizando comentarios (${i + 1}/${totalVideos}): ${ytVideo.title.slice(0, 50)}…`,
        baseProgress
      );

      if (options.abortSignal?.aborted) {
        throw new DOMException('Análisis cancelado por el usuario', 'AbortError');
      }

      if (!force && hasSavedAnalysis(tracked)) {
        continue;
      }

      await this.trackedVideoRepo.updateTrackedVideo({
        ...tracked,
        analysisStatus: 'analyzing',
      });

      const commentLimit = getCommentFetchLimit(ytVideo, options);
      let ytComments: Awaited<ReturnType<YoutubeApiClient['fetchVideoComments']>> = [];
      if (commentLimit > 0) {
        onProgress?.(
          `Descargando comentarios de «${ytVideo.title.slice(0, 40)}…» (0/${commentLimit})`,
          baseProgress
        );
        ytComments = await this.youtubeClient.fetchVideoComments(
          ytVideo.youtubeVideoId,
          commentLimit,
          (fetched, target) => {
            onProgress?.(
              `Descargando comentarios (${fetched}/${target}): ${ytVideo.title.slice(0, 35)}…`,
              baseProgress
            );
          }
        );
      }

      const { comments: analyzedComments, engine, analysisReport, strategicReport } =
        await classifyComments(
          ytComments,
          this.analysisClient,
          ytVideo.title,
          ytVideo.youtubeVideoId,
          channel.name,
          (step, chunkProgress) => {
            const scaled = baseProgress + Math.round(chunkProgress * 0.25);
            onProgress?.(step, Math.min(95, scaled));
          },
          options.abortSignal
        );
      lastAnalysisEngine = engine;
      if (analysisReport) lastAnalysisReport = analysisReport;
      if (strategicReport) lastStrategicReport = strategicReport;

      await this.commentRepo.replaceCommentsForVideo(tracked.id, analyzedComments);

      const now = new Date().toISOString();
      const enrichedStrategicReport = strategicReport 
        ? { ...strategicReport, analysisEngine: engine } 
        : { analysisEngine: engine };

      await this.trackedVideoRepo.updateTrackedVideo({
        ...tracked,
        viewCount: ytVideo.viewCount,
        likeCount: ytVideo.likeCount,
        commentCount: ytVideo.commentCount,
        commentsAnalyzedAt: now,
        lastMetricsSyncAt: now,
        analysisStatus: 'done',
        analysisEngine: engine,
        analysisReport,
        strategicReport: enrichedStrategicReport as Record<string, unknown>,
      });
    }

    onProgress?.('Generando resumen e insights...', 95);

    const analyzedIds = videosToProcess
      .map((v) => videoMap.get(v.youtubeVideoId)?.id)
      .filter(Boolean) as string[];

    const summary = await this.loadSummary(
      channelId,
      analyzedIds,
      lastAnalysisEngine,
      lastAnalysisReport,
      lastStrategicReport
    );
    onProgress?.('¡Análisis completado!', 100);
    return summary;
  }

  needsRefresh(channelId: string): Promise<boolean> {
    return this.trackedVideoRepo.getTrackedVideos(channelId).then((videos) => {
      if (videos.length === 0) return true;
      return videos.some((video) => !hasSavedAnalysis(video));
    });
  }

  async clearAnalysis(channelId: string, youtubeVideoId: string): Promise<CommentAnalysisSummary> {
    const videos = await this.trackedVideoRepo.getTrackedVideos(channelId);
    const video = videos.find((v) => v.youtubeVideoId === youtubeVideoId);
    if (!video) throw new Error('Video no encontrado en el catálogo');

    // Remove comments
    await this.commentRepo.replaceCommentsForVideo(video.id, []);

    // Update video to pending
    await this.trackedVideoRepo.updateTrackedVideo({
      ...video,
      analysisStatus: 'pending',
      commentsAnalyzedAt: undefined,
      analysisEngine: undefined,
      analysisReport: undefined,
      strategicReport: undefined,
    });

    // Reload summary without the cleared video
    const remainingAnalyzedVideos = videos
      .filter((v) => v.analysisStatus === 'done' && v.id !== video.id)
      .map((v) => v.id);

    return this.loadSummary(channelId, remainingAnalyzedVideos);
  }
}
