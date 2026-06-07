import { TrackedVideo } from '../domain/entities';
import { CommentAnalysisSummary, buildCommentAnalysisSummary } from '../domain/commentAnalysis';
import { analyzeCommentSentiment, categorizeComment } from '../domain/services';
import {
  IChannelRepository,
  ITrackedVideoRepository,
  ICommentRepository,
} from './repositories';
import { YoutubeApiClient, YoutubeVideoData } from '../infrastructure/external/YoutubeApiClient';

export const LATEST_VIDEOS_LIMIT = 10;
export const CHANNEL_VIDEOS_LIMIT = 30;
export const MAX_COMMENTS_PER_VIDEO = 100;
export const ANALYSIS_STALE_HOURS = 24;

export type AnalyzeProgressCallback = (step: string, progress: number) => void;

export interface AnalyzeCommentsOptions {
  /** IDs de YouTube (ej. dQw4w9WgXcQ). Si se envían, solo se analizan esos videos. */
  youtubeVideoIds?: string[];
  /** Cuántos videos recientes analizar cuando no hay selección. Default: 10 */
  limit?: number;
  /** Re-analizar aunque el video no esté stale */
  force?: boolean;
}

function isAnalysisStale(video: TrackedVideo): boolean {
  if (!video.commentsAnalyzedAt) return true;
  const hoursSince =
    (Date.now() - new Date(video.commentsAnalyzedAt).getTime()) / (1000 * 60 * 60);
  return hoursSince >= ANALYSIS_STALE_HOURS;
}

export class AnalyzeChannelCommentsUseCase {
  constructor(
    private channelRepo: IChannelRepository,
    private trackedVideoRepo: ITrackedVideoRepository,
    private commentRepo: ICommentRepository,
    private youtubeClient: YoutubeApiClient
  ) {}

  async loadSummary(
    channelId: string,
    filterTrackedVideoIds?: string[]
  ): Promise<CommentAnalysisSummary> {
    const [trackedVideos, comments] = await Promise.all([
      this.trackedVideoRepo.getTrackedVideos(channelId),
      this.commentRepo.getCommentsByChannel(channelId),
    ]);

    const filteredVideos = filterTrackedVideoIds?.length
      ? trackedVideos.filter((v) => filterTrackedVideoIds.includes(v.id))
      : trackedVideos;

    const filteredVideoIds = new Set(filteredVideos.map((v) => v.id));
    const filteredComments = filterTrackedVideoIds?.length
      ? comments.filter((c) => filteredVideoIds.has(c.videoId))
      : comments;

    return buildCommentAnalysisSummary(filteredComments, filteredVideos);
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
        };
      })
    );

    const videoMap = new Map(trackedVideos.map((v) => [v.youtubeVideoId, v]));
    const totalVideos = videosToProcess.length;

    for (let i = 0; i < videosToProcess.length; i++) {
      const ytVideo = videosToProcess[i];
      const tracked = videoMap.get(ytVideo.youtubeVideoId);
      if (!tracked) continue;

      const baseProgress = 20 + Math.round((i / totalVideos) * 70);
      onProgress?.(
        `Analizando comentarios (${i + 1}/${totalVideos}): ${ytVideo.title.slice(0, 50)}…`,
        baseProgress
      );

      if (!force && !isAnalysisStale(tracked) && tracked.analysisStatus === 'done') {
        continue;
      }

      await this.trackedVideoRepo.updateTrackedVideo({
        ...tracked,
        analysisStatus: 'analyzing',
      });

      let ytComments: Awaited<ReturnType<YoutubeApiClient['fetchVideoComments']>> = [];
      if (ytVideo.commentCount > 0) {
        ytComments = await this.youtubeClient.fetchVideoComments(
          ytVideo.youtubeVideoId,
          MAX_COMMENTS_PER_VIDEO
        );
      }

      const analyzedComments = ytComments.map((comment) => ({
        youtubeCommentId: comment.youtubeCommentId,
        authorName: comment.authorName,
        authorAvatar: comment.authorAvatar,
        text: comment.text,
        publishedAt: comment.publishedAt,
        sentiment: analyzeCommentSentiment(comment.text),
        category: categorizeComment(comment.text),
        likeCount: comment.likeCount,
      }));

      await this.commentRepo.replaceCommentsForVideo(tracked.id, analyzedComments);

      const now = new Date().toISOString();
      await this.trackedVideoRepo.updateTrackedVideo({
        ...tracked,
        viewCount: ytVideo.viewCount,
        likeCount: ytVideo.likeCount,
        commentCount: ytVideo.commentCount,
        commentsAnalyzedAt: now,
        lastMetricsSyncAt: now,
        analysisStatus: 'done',
      });
    }

    onProgress?.('Generando resumen e insights...', 95);

    const analyzedIds = videosToProcess
      .map((v) => videoMap.get(v.youtubeVideoId)?.id)
      .filter(Boolean) as string[];

    const summary = await this.loadSummary(
      channelId,
      options.youtubeVideoIds?.length ? analyzedIds : undefined
    );
    onProgress?.('¡Análisis completado!', 100);
    return summary;
  }

  needsRefresh(channelId: string): Promise<boolean> {
    return this.trackedVideoRepo.getTrackedVideos(channelId).then((videos) => {
      if (videos.length === 0) return true;
      return videos.some(isAnalysisStale);
    });
  }
}
