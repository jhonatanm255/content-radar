import { TrackedVideo } from '../../domain/entities';
import { ITrackedVideoRepository } from '../../application/repositories';
import { supabase } from '../supabase/client';
import {
  mapTrackedVideoRow,
  mapTrackedVideoToRow,
  TrackedVideoRow,
} from '../supabase/mappers';

function isMissingDislikeColumn(error: { message?: string } | null): boolean {
  return !!error?.message?.includes("'dislike_count'");
}

function withoutDislikeCount(row: Record<string, unknown>): Record<string, unknown> {
  const { dislike_count: _omit, ...rest } = row;
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

    if (error && isMissingDislikeColumn(error)) {
      ({ data, error } = await supabase
        .from('tracked_videos')
        .insert(withoutDislikeCount(row))
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
    };

    let { error } = await supabase
      .from('tracked_videos')
      .update(payload)
      .eq('id', video.id)
      .eq('user_id', user.id);

    if (error && isMissingDislikeColumn(error)) {
      ({ error } = await supabase
        .from('tracked_videos')
        .update(withoutDislikeCount(payload))
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

    if (error && isMissingDislikeColumn(error)) {
      const rowsWithoutDislikes = rows.map(withoutDislikeCount);
      ({ data, error } = await supabase
        .from('tracked_videos')
        .upsert(rowsWithoutDislikes, { onConflict: 'user_id,youtube_video_id' })
        .select());
    }

    if (error) throw new Error(error.message);
    return (data as TrackedVideoRow[]).map(mapTrackedVideoRow);
  }
}
