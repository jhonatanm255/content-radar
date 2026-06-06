import { ChannelSnapshot } from '../../domain/entities';
import { IChannelSnapshotRepository } from '../../application/repositories';
import { supabase } from '../supabase/client';
import { mapSnapshotRow, ChannelSnapshotRow } from '../supabase/mappers';

export class SupabaseSnapshotRepository implements IChannelSnapshotRepository {
  async getSnapshots(channelId: string, limit = 30): Promise<ChannelSnapshot[]> {
    const { data, error } = await supabase
      .from('channel_snapshots')
      .select('*')
      .eq('channel_id', channelId)
      .order('snapshot_date', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Error al obtener snapshots:', error.message);
      return [];
    }

    return (data as ChannelSnapshotRow[]).map(mapSnapshotRow);
  }

  async upsertSnapshot(
    snapshot: Omit<ChannelSnapshot, 'id'> & { id?: string }
  ): Promise<ChannelSnapshot> {
    const { data, error } = await supabase
      .from('channel_snapshots')
      .upsert(
        {
          channel_id: snapshot.channelId,
          snapshot_date: snapshot.snapshotDate,
          subscriber_count: snapshot.subscriberCount,
          total_views: snapshot.totalViews,
          video_count: snapshot.videoCount,
          views_30d: snapshot.views30d,
          engagement_rate: snapshot.engagementRate,
        },
        { onConflict: 'channel_id,snapshot_date' }
      )
      .select()
      .single();

    if (error) throw new Error(error.message);
    return mapSnapshotRow(data as ChannelSnapshotRow);
  }
}
