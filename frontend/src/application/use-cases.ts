import { Channel, Video, Comment, Opportunity, SavedIdea, Alert } from '../domain/entities';
import { 
  IChannelRepository, 
  IChannelSnapshotRepository,
  IVideoRepository, 
  ICommentRepository, 
  IOpportunityRepository, 
  IIdeaRepository, 
  IAlertRepository 
} from './repositories';
import { calculateOpportunityScore } from '../domain/services';
import { YoutubeApiClient, YoutubeChannelData } from '../infrastructure/external/YoutubeApiClient';
import { todayDateString } from '../infrastructure/utils/youtube';

export class LinkChannelUseCase {
  constructor(
    private channelRepo: IChannelRepository,
    private snapshotRepo: IChannelSnapshotRepository,
    private youtubeClient: YoutubeApiClient
  ) {}

  async execute(
    youtubeInput: string,
    options: { isCompetitor?: boolean; createSnapshot?: boolean } = {}
  ): Promise<Channel> {
    const isCompetitor = options.isCompetitor ?? false;
    const createSnapshot = options.createSnapshot ?? !isCompetitor;

    let ytData: YoutubeChannelData;

    if (this.youtubeClient.isConfigured()) {
      const fetched = await this.youtubeClient.fetchChannel(youtubeInput);
      if (!fetched) {
        throw new Error(
          'No se encontró el canal en YouTube. Verifica el handle (ej. @jhonatanm255) o la URL.'
        );
      }
      ytData = fetched;
    } else {
      throw new Error(
        'YouTube API no configurada. Contacta al administrador de la plataforma.'
      );
    }

    const existingChannels = await this.channelRepo.getChannels();
    const duplicate = existingChannels.find(
      (c) => c.youtubeChannelId === ytData.youtubeChannelId
    );
    if (duplicate) {
      throw new Error(`"${duplicate.name}" ya está vinculado a tu cuenta.`);
    }

    const now = new Date().toISOString();
    const channel = await this.channelRepo.addChannel({
      youtubeChannelId: ytData.youtubeChannelId,
      name: ytData.name,
      handle: ytData.handle,
      avatarUrl: ytData.avatarUrl,
      subscriberCount: ytData.subscriberCount,
      totalViews: ytData.totalViews,
      videoCount: ytData.videoCount,
      views30d: 0,
      videos30d: ytData.videoCount,
      engagementRate: 0,
      isCompetitor,
      lastSyncAt: now,
    });

    if (createSnapshot) {
      await this.snapshotRepo.upsertSnapshot({
        channelId: channel.id,
        snapshotDate: todayDateString(),
        subscriberCount: channel.subscriberCount,
        totalViews: channel.totalViews ?? 0,
        videoCount: channel.videoCount ?? 0,
        views30d: 0,
        engagementRate: 0,
      });
    }

    return channel;
  }
}

export class SyncChannelSnapshotUseCase {
  constructor(
    private channelRepo: IChannelRepository,
    private snapshotRepo: IChannelSnapshotRepository,
    private youtubeClient: YoutubeApiClient
  ) {}

  async execute(channelId: string): Promise<Channel> {
    const channel = await this.channelRepo.getChannelById(channelId);
    if (!channel) throw new Error('Canal no encontrado');

    console.log('[SYNC] 📊 Datos ANTES del sync:', {
      name: channel.name,
      totalViews: channel.totalViews,
      subscriberCount: channel.subscriberCount,
      videoCount: channel.videoCount,
    });

    if (!this.youtubeClient.isConfigured()) {
      throw new Error('Configura VITE_YOUTUBE_API_KEY en tu archivo .env para sincronizar con YouTube.');
    }

    const input = channel.youtubeChannelId?.startsWith('pending_')
      ? channel.handle
      : (channel.youtubeChannelId ?? channel.handle);

    console.log('[SYNC] 🔍 Buscando en YouTube con input:', input);

    const ytData = await this.youtubeClient.fetchChannel(input);
    if (!ytData) throw new Error('No se pudo obtener datos actualizados del canal.');

    console.log('[SYNC] ✅ Datos recibidos de YouTube API:', {
      name: ytData.name,
      totalViews: ytData.totalViews,
      subscriberCount: ytData.subscriberCount,
      videoCount: ytData.videoCount,
    });

    const updated: Channel = {
      ...channel,
      youtubeChannelId: ytData.youtubeChannelId,
      name: ytData.name,
      handle: ytData.handle,
      avatarUrl: ytData.avatarUrl,
      subscriberCount: ytData.subscriberCount,
      totalViews: ytData.totalViews,
      videoCount: ytData.videoCount,
      videos30d: ytData.videoCount,
      lastSyncAt: new Date().toISOString(),
    };

    console.log('[SYNC] 💾 Guardando en DB:', {
      id: updated.id,
      totalViews: updated.totalViews,
      subscriberCount: updated.subscriberCount,
    });

    await this.channelRepo.updateChannel(updated);

    console.log('[SYNC] 📸 Creando snapshot del día:', todayDateString());

    await this.snapshotRepo.upsertSnapshot({
      channelId: updated.id,
      snapshotDate: todayDateString(),
      subscriberCount: updated.subscriberCount,
      totalViews: updated.totalViews ?? 0,
      videoCount: updated.videoCount ?? 0,
      views30d: updated.views30d,
      engagementRate: updated.engagementRate,
    });

    console.log('[SYNC] ✅ Sync completado exitosamente');

    return updated;
  }
}

export class SyncChannelMetricsUseCase {
  constructor(
    private channelRepo: IChannelRepository,
    private videoRepo: IVideoRepository,
    private commentRepo: ICommentRepository
  ) {}

  async execute(channelId: string): Promise<void> {
    const channel = await this.channelRepo.getChannelById(channelId);
    if (!channel) throw new Error('Canal no encontrado');

    // Aquí iría el flujo de sincronización real llamando al YoutubeApiClient.
    // Para desacoplar, actualizamos la fecha de sincronización del canal en el repositorio.
    channel.lastSyncAt = new Date().toISOString();
    await this.channelRepo.updateChannel(channel);
  }
}

export class GenerateOpportunitiesUseCase {
  constructor(
    private opportunityRepo: IOpportunityRepository,
    private commentRepo: ICommentRepository
  ) {}

  async execute(channelId: string): Promise<Opportunity[]> {
    const comments = await this.commentRepo.getCommentsByChannel(channelId);
    
    // Contamos menciones por tema
    const topicsMap = new Map<string, { count: number; textList: string[] }>();
    comments.forEach(c => {
      // Simulación de temas basados en palabras clave
      const text = c.text.toLowerCase();
      let topicMatched = '';
      if (text.includes('coolify')) topicMatched = 'Coolify';
      else if (text.includes('docker') || text.includes('compose')) topicMatched = 'Docker Compose';
      else if (text.includes('kubernetes') || text.includes('k8s')) topicMatched = 'Kubernetes';
      else if (text.includes('next') && text.includes('15')) topicMatched = 'Next.js 15';
      else if (text.includes('ia local') || text.includes('llama') || text.includes('ollama')) topicMatched = 'IA Local';
      else if (text.includes('vps') || text.includes('desplegar') || text.includes('servidor')) topicMatched = 'VPS';

      if (topicMatched) {
        const existing = topicsMap.get(topicMatched) || { count: 0, textList: [] };
        existing.count++;
        existing.textList.push(c.text);
        topicsMap.set(topicMatched, existing);
      }
    });

    const opportunities: Opportunity[] = [];
    topicsMap.forEach((data, topicName) => {
      // Determinamos demanda, competencia y tendencia para calcular el score usando la lógica pura del dominio
      let demand: 'Alta' | 'Media' | 'Baja' = 'Baja';
      if (data.count > 100) demand = 'Alta';
      else if (data.count > 30) demand = 'Media';

      // Simular competencia en base al tema
      let competition: 'Muy Baja' | 'Baja' | 'Media' | 'Alta' = 'Media';
      if (topicName === 'Coolify') competition = 'Muy Baja';
      else if (topicName === 'Docker Compose') competition = 'Baja';
      else if (topicName === 'Kubernetes') competition = 'Alta';
      else if (topicName === 'Next.js 15') competition = 'Media';
      else if (topicName === 'IA Local') competition = 'Baja';

      // Crecimiento simulado de tendencia
      const trendGrowth = topicName === 'Coolify' ? 68 : topicName === 'IA Local' ? 85 : 34;

      const opportunityScore = calculateOpportunityScore(demand, competition, trendGrowth);

      opportunities.push({
        id: `opp_${topicName.toLowerCase().replace(/\s+/g, '_')}`,
        topicId: topicName,
        title: topicName === 'Coolify' 
          ? 'Tutorial completo de Coolify desde cero' 
          : topicName === 'Docker Compose'
          ? 'Docker Compose trucos que no conocías'
          : topicName === 'Kubernetes'
          ? 'Kubernetes para desarrolladores: Guía práctica'
          : topicName === 'Next.js 15'
          ? 'Desplegando Next.js 15 en producción'
          : `Guía definitiva de ${topicName}`,
        format: topicName.includes('Tutorial') ? 'Video Tutorial' : 'Guía',
        opportunityScore,
        demand,
        competition,
        searchVolume: data.count * 120, // Simulación de volumen de búsqueda
        trend: [20, 30, 45, 60, trendGrowth],
        justification: [
          `La audiencia ha realizado ${data.count} preguntas específicas sobre ${topicName}.`,
          `La competencia en canales en español es ${competition}.`,
          `Se detecta un incremento constante en comentarios de tipo "pregunta".`
        ],
        tags: [topicName, 'Youtube', 'Desarrollo']
      });
    });

    await this.opportunityRepo.addOpportunities(opportunities);
    return opportunities;
  }
}
