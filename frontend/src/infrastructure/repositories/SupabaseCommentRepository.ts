import { Comment } from '../../domain/entities';
import { ICommentRepository } from '../../application/repositories';
import { supabase } from '../supabase/client';
import { mapCommentRow, mapCommentToRow, CommentRow } from '../supabase/mappers';

export class SupabaseCommentRepository implements ICommentRepository {
  private async fetchAllComments(
    queryFn: (from: number, to: number) => PromiseLike<{ data: any[] | null; error: any }>
  ): Promise<CommentRow[]> {
    let allData: CommentRow[] = [];
    let from = 0;
    const pageSize = 1000;

    while (true) {
      const { data, error } = await queryFn(from, from + pageSize - 1);
      if (error) {
        console.error('Error paginando comentarios:', error.message);
        break;
      }
      if (!data || data.length === 0) {
        break;
      }
      allData = allData.concat(data);
      if (data.length < pageSize) {
        break;
      }
      from += pageSize;
    }
    return allData;
  }

  async getCommentsByVideo(videoId: string): Promise<Comment[]> {
    const data = await this.fetchAllComments((from, to) =>
      supabase
        .from('comments')
        .select('*')
        .eq('tracked_video_id', videoId)
        .order('published_at', { ascending: false })
        .range(from, to)
    );
    return data.map(mapCommentRow);
  }

  async getCommentsByVideos(videoIds: string[]): Promise<Comment[]> {
    if (videoIds.length === 0) return [];

    const data = await this.fetchAllComments((from, to) =>
      supabase
        .from('comments')
        .select('*')
        .in('tracked_video_id', videoIds)
        .order('published_at', { ascending: false })
        .range(from, to)
    );
    return data.map(mapCommentRow);
  }

  async getCommentsByChannel(channelId: string): Promise<Comment[]> {
    const { data: videos, error: videosError } = await supabase
      .from('tracked_videos')
      .select('id')
      .eq('channel_id', channelId);

    if (videosError || !videos?.length) return [];

    const videoIds = videos.map((v) => v.id);
    const data = await this.fetchAllComments((from, to) =>
      supabase
        .from('comments')
        .select('*')
        .in('tracked_video_id', videoIds)
        .order('published_at', { ascending: false })
        .range(from, to)
    );
    return data.map(mapCommentRow);
  }

  async addComments(comments: Comment[]): Promise<void> {
    if (comments.length === 0) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const rows = comments.map((comment) =>
      mapCommentToRow(
        {
          ...comment,
          youtubeCommentId: comment.id.startsWith('yt_') ? comment.id.slice(3) : comment.id,
        },
        comment.videoId,
        user.id
      )
    );

    const { error } = await supabase.from('comments').insert(rows);
    if (error) throw new Error(error.message);
  }

  async replaceCommentsForVideo(
    trackedVideoId: string,
    comments: Array<
      Omit<Comment, 'id' | 'videoId'> & { youtubeCommentId: string; likeCount?: number }
    >
  ): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { error: deleteError } = await supabase
      .from('comments')
      .delete()
      .eq('tracked_video_id', trackedVideoId)
      .eq('user_id', user.id);

    if (deleteError) throw new Error(deleteError.message);
    if (comments.length === 0) return;

    const rows = comments.map((comment) => ({
      ...mapCommentToRow(
        {
          authorName: comment.authorName,
          authorAvatar: comment.authorAvatar,
          text: comment.text,
          publishedAt: comment.publishedAt,
          sentiment: comment.sentiment,
          category: comment.category,
          youtubeCommentId: comment.youtubeCommentId,
          contentSentiment: comment.contentSentiment,
          engagementType: comment.engagementType,
          topic: comment.topic,
          keyPhrase: comment.keyPhrase,
          isResonance: comment.isResonance,
          parentId: comment.parentId,
          isReply: comment.isReply,
        },
        trackedVideoId,
        user.id
      ),
      like_count: comment.likeCount ?? 0,
    }));

    // Deduplicar por youtube_comment_id antes de enviar (previene errores intra-batch)
    const seen = new Set<string>();
    const uniqueRows = rows.filter((row) => {
      const key = (row as Record<string, unknown>).youtube_comment_id as string;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    let { error: insertError } = await supabase
      .from('comments')
      .upsert(uniqueRows, { onConflict: 'tracked_video_id,youtube_comment_id', ignoreDuplicates: false });

    if (
      insertError?.message?.includes("'content_sentiment'") ||
      insertError?.message?.includes("'parent_id'") ||
      insertError?.message?.includes("'is_reply'")
    ) {
      const fallbackRows = uniqueRows.map((row) => {
        const {
          content_sentiment: _cs,
          engagement_type: _et,
          topic: _t,
          key_phrase: _kp,
          is_resonance: _ir,
          parent_id: _pid,
          is_reply: _irpy,
          ...rest
        } = row as Record<string, unknown>;
        return rest;
      });
      ({ error: insertError } = await supabase
        .from('comments')
        .upsert(fallbackRows, { onConflict: 'tracked_video_id,youtube_comment_id', ignoreDuplicates: false }));
    }
    if (insertError) throw new Error(insertError.message);
  }

  async getCommentStats(channelId: string) {
    const comments = await this.getCommentsByChannel(channelId);
    const uniqueUsers = new Set(comments.map((c) => c.authorName.toLowerCase())).size;
    return {
      totalComments: comments.length,
      uniqueUsers,
      commentsPerDay: 0,
      averageEngagement: 0,
    };
  }

  async getFaqs(channelId: string) {
    const comments = await this.getCommentsByChannel(channelId);
    const questions = comments.filter((c) => c.category === 'pregunta');
    const groups = new Map<string, number>();

    questions.forEach((q) => {
      const key = q.text.toLowerCase().trim().slice(0, 80);
      groups.set(key, (groups.get(key) ?? 0) + 1);
    });

    return [...groups.entries()]
      .map(([text, count]) => ({ text, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }
}
