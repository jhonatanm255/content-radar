import { TrackedVideo } from '../../domain/entities';
import { ITrackedVideoRepository } from '../../application/repositories';
import { supabase } from '../supabase/client';
import {
  mapTrackedVideoRow,
  mapTrackedVideoToRow,
  TrackedVideoRow,
} from '../supabase/mappers';

function isMissingOptionalColumn(error: { message?: string } | null): boolean {
  const message = error?.message ?? '';
  return (
    message.includes("'dislike_count'") ||
    message.includes("'content_sentiment'") ||
    message.includes("'engagement_type'") ||
    message.includes("'analysis_report'") ||
    message.includes("'strategic_report'") ||
    message.includes("'analysis_engine'")
  );
}

function withoutOptionalColumns(row: Record<string, unknown>): Record<string, unknown> {
  const {
    dislike_count: _d,
    content_sentiment: _cs,
    engagement_type: _et,
    topic: _t,
    key_phrase: _kp,
    is_resonance: _ir,
    analysis_report: _ar,
    strategic_report: _sr,
    analysis_engine: _ae,
    ...rest
  } = row;
  return rest;
}

export class SupabaseTrackedVideoRepository implements ITrackedVideoRepository {
  async getTrackedVideos(channelId: string): Promise<TrackedVideo[]> {
    const { data, error } = await supabase
      .from('tracked_videos')
      .select('*')
      .eq('channel_id', channelId)
      .order('published_at', { ascending: false });

    if (error) {
      console.error('Error al obtener videos rastreados:', error.message);
      return [];
    }

    return (data as TrackedVideoRow[]).map(mapTrackedVideoRow);
  }

  async addTrackedVideo(
    video: Omit<TrackedVideo, 'id'> & { id?: string }
  ): Promise<TrackedVideo> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const row = mapTrackedVideoToRow(video, user.id);
    delete row.id;

    let { data, error } = await supabase
      .from('tracked_videos')
      .insert(row)
      .select()
      .single();

    if (error && isMissingOptionalColumn(error)) {
      ({ data, error } = await supabase
        .from('tracked_videos')
        .insert(withoutOptionalColumns(row))
        .select()
        .single());
    }

    if (error) throw new Error(error.message);
    return mapTrackedVideoRow(data as TrackedVideoRow);
  }

  async updateTrackedVideo(video: TrackedVideo): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const payload = {
      title: video.title,
      thumbnail_url: video.thumbnailUrl,
      published_at: video.publishedAt,
      view_count: video.viewCount,
      like_count: video.likeCount,
      dislike_count: video.dislikeCount ?? null,
      comment_count: video.commentCount,
      comments_analyzed_at: video.commentsAnalyzedAt ?? null,
      comments_fetched_at: video.commentsAnalyzedAt ?? null,
      last_metrics_sync_at: video.lastMetricsSyncAt ?? null,
      analysis_status: video.analysisStatus,
      analysis_engine: video.analysisEngine ?? null,
      analysis_report: video.analysisReport ?? null,
      strategic_report: video.strategicReport ?? null,
    };

    let { error } = await supabase
      .from('tracked_videos')
      .update(payload)
      .eq('id', video.id)
      .eq('user_id', user.id);

    if (error && isMissingOptionalColumn(error)) {
      ({ error } = await supabase
        .from('tracked_videos')
        .update(withoutOptionalColumns(payload))
        .eq('id', video.id)
        .eq('user_id', user.id));
    }

    if (error) throw new Error(error.message);
  }

  async upsertTrackedVideos(
    channelId: string,
    videos: Omit<TrackedVideo, 'id' | 'channelId'>[]
  ): Promise<TrackedVideo[]> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const rows = videos.map((video) => {
      const row = mapTrackedVideoToRow({ ...video, channelId }, user.id);
      delete row.id;
      return row;
    });

    let { data, error } = await supabase
      .from('tracked_videos')
      .upsert(rows, { onConflict: 'user_id,youtube_video_id' })
      .select();

    if (error && isMissingOptionalColumn(error)) {
      const rowsWithoutOptional = rows.map(withoutOptionalColumns);
      ({ data, error } = await supabase
        .from('tracked_videos')
        .upsert(rowsWithoutOptional, { onConflict: 'user_id,youtube_video_id' })
        .select());
    }

    if (error) throw new Error(error.message);
    return (data as TrackedVideoRow[]).map(mapTrackedVideoRow);
  }

  async getAnalyzedVideoCount(): Promise<number> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return 0;

    const { count, error } = await supabase
      .from('tracked_videos')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('analysis_status', 'done');

    if (error) {
      console.error('Error al contar videos analizados:', error.message);
      return 0;
    }

    return count ?? 0;
  }
}

