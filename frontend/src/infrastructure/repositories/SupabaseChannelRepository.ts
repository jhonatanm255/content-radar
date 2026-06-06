import { Channel } from '../../domain/entities';
import { IChannelRepository } from '../../application/repositories';
import { supabase } from '../supabase/client';
import { mapChannelRow, mapChannelToRow, ChannelRow } from '../supabase/mappers';

export class SupabaseChannelRepository implements IChannelRepository {
  async getChannels(): Promise<Channel[]> {
    const { data, error } = await supabase
      .from('channels')
      .select('*')
      .order('is_competitor', { ascending: true })
      .order('linked_at', { ascending: true });

    if (error) {
      console.error('Error al obtener canales:', error.message);
      return [];
    }

    return (data as ChannelRow[]).map(mapChannelRow);
  }

  async getChannelById(id: string): Promise<Channel | null> {
    const { data, error } = await supabase
      .from('channels')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) return null;
    return mapChannelRow(data as ChannelRow);
  }

  async getOwnChannel(): Promise<Channel | null> {
    const { data, error } = await supabase
      .from('channels')
      .select('*')
      .eq('is_competitor', false)
      .maybeSingle();

    if (error || !data) return null;
    return mapChannelRow(data as ChannelRow);
  }

  async addChannel(channel: Omit<Channel, 'id'> & { id?: string }): Promise<Channel> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const row = mapChannelToRow(channel as Channel, user.id);
    delete row.id;

    const { data, error } = await supabase
      .from('channels')
      .insert(row)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return mapChannelRow(data as ChannelRow);
  }

  async updateChannel(channel: Channel): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { error } = await supabase
      .from('channels')
      .update({
        name: channel.name,
        handle: channel.handle,
        avatar_url: channel.avatarUrl,
        subscriber_count: channel.subscriberCount,
        total_views: channel.totalViews ?? 0,
        video_count: channel.videoCount ?? 0,
        views_30d: channel.views30d,
        videos_30d: channel.videos30d,
        engagement_rate: channel.engagementRate,
        last_sync_at: channel.lastSyncAt,
      })
      .eq('id', channel.id)
      .eq('user_id', user.id);

    if (error) throw new Error(error.message);
  }

  async deleteChannel(id: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { error } = await supabase
      .from('channels')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw new Error(error.message);
  }
}
