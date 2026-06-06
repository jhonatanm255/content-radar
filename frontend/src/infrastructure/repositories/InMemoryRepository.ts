import { Channel, Video, Comment, Opportunity, SavedIdea, Alert, Topic } from '../../domain/entities';
import { 
  IChannelRepository, 
  IVideoRepository, 
  ICommentRepository, 
  IOpportunityRepository, 
  IIdeaRepository, 
  IAlertRepository 
} from '../../application/repositories';

// Claves de LocalStorage
const CHANNELS_KEY = 'cr_channels';
const VIDEOS_KEY = 'cr_videos';
const COMMENTS_KEY = 'cr_comments';
const OPPORTUNITIES_KEY = 'cr_opportunities';
const IDEAS_KEY = 'cr_ideas';
const ALERTS_KEY = 'cr_alerts';

// Datos Iniciales de Mockup (Extraídos de las capturas de pantalla)
const INITIAL_CHANNELS: Channel[] = [
  {
    id: 'own_channel',
    name: 'Mi Canal',
    handle: '@JuanProgramador',
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
    subscriberCount: 8432,
    views30d: 12400,
    videos30d: 12,
    engagementRate: 6.8,
    isCompetitor: false,
    lastSyncAt: new Date().toISOString()
  },
  {
    id: 'comp_fireship',
    name: 'Fireship',
    handle: '@Fireship',
    avatarUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&q=80',
    subscriberCount: 2150000,
    views30d: 12400000,
    videos30d: 18,
    engagementRate: 7.2,
    isCompetitor: true,
    lastSyncAt: new Date().toISOString()
  },
  {
    id: 'comp_traversy',
    name: 'Traversy Media',
    handle: '@TraversyMedia',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    subscriberCount: 1040000,
    views30d: 6700000,
    videos30d: 15,
    engagementRate: 5.7,
    isCompetitor: true,
    lastSyncAt: new Date().toISOString()
  },
  {
    id: 'comp_theo',
    name: 'Theo - t3.gg',
    handle: '@TheoT3',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
    subscriberCount: 450000,
    views30d: 6100000,
    videos30d: 7,
    engagementRate: 6.1,
    isCompetitor: true,
    lastSyncAt: new Date().toISOString()
  },
  {
    id: 'comp_primeagen',
    name: 'ThePrimeagen',
    handle: '@ThePrimeagen',
    avatarUrl: 'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?auto=format&fit=crop&w=150&q=80',
    subscriberCount: 1120000,
    views30d: 4100000,
    videos30d: 5,
    engagementRate: 4.2,
    isCompetitor: true,
    lastSyncAt: new Date().toISOString()
  },
  {
    id: 'comp_webdevsimplified',
    name: 'Web Dev Simplified',
    handle: '@WebDevSimplified',
    avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80',
    subscriberCount: 1010000,
    views30d: 5500000,
    videos30d: 11,
    engagementRate: 7.3,
    isCompetitor: true,
    lastSyncAt: new Date().toISOString()
  },
  {
    id: 'comp_codigofacilito',
    name: 'Código Facilito',
    handle: '@CodigoFacilito',
    avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=150&q=80',
    subscriberCount: 782000,
    views30d: 2300000,
    videos30d: 8,
    engagementRate: 4.7,
    isCompetitor: true,
    lastSyncAt: new Date().toISOString()
  }
];

const INITIAL_OPPORTUNITIES: Opportunity[] = [
  {
    id: 'opp_coolify_tutorial',
    topicId: 'Coolify',
    title: 'Tutorial completo de Coolify',
    format: 'Video Tutorial',
    opportunityScore: 94,
    demand: 'Alta',
    competition: 'Baja',
    searchVolume: 423, // Matches comments request count
    trend: [30, 45, 60, 80, 94],
    justification: [
      'La audiencia ha realizado 423 preguntas específicas sobre Coolify.',
      'La competencia en canales hispanos es muy baja.',
      'Se detecta un incremento de +34% en el interés del tema.'
    ],
    tags: ['Coolify', 'VPS', 'Despliegue']
  },
  {
    id: 'opp_coolify_vs_dokploy',
    topicId: 'Coolify',
    title: 'Coolify vs Dokploy',
    format: 'Comparativa',
    opportunityScore: 89,
    demand: 'Alta',
    competition: 'Muy Baja',
    searchVolume: 312,
    trend: [25, 40, 55, 75, 89],
    justification: [
      'Menciones cruzadas en comentarios de personas pidiendo alternativas a Heroku/Vercel.',
      'Solo 1 competidor ha hablado de Dokploy en el último mes.'
    ],
    tags: ['Coolify', 'Dokploy', 'SaaS']
  },
  {
    id: 'opp_desplegar_coolify',
    topicId: 'VPS',
    title: 'Desplegar Coolify en VPS',
    format: 'Video Tutorial',
    opportunityScore: 85,
    demand: 'Media',
    competition: 'Baja',
    searchVolume: 268,
    trend: [35, 50, 60, 70, 85],
    justification: [
      'Se detecta una alta tasa de comentarios pidiendo recomendaciones de servidores baratos (Hetzner, DigitalOcean).',
      'Gran volumen de dudas sobre configuración DNS.'
    ],
    tags: ['VPS', 'Coolify', 'Hetzner']
  },
  {
    id: 'opp_errores_coolify',
    topicId: 'Coolify',
    title: 'Errores comunes en Coolify',
    format: 'Video Tutorial',
    opportunityScore: 78,
    demand: 'Media',
    competition: 'Baja',
    searchVolume: 198,
    trend: [40, 45, 55, 65, 78],
    justification: [
      '14% de los comentarios de tus videos de despliegue reportan errores de SSL o puertos.',
      'No hay videos específicos de competidores que aborden solución de problemas (troubleshooting).'
    ],
    tags: ['Coolify', 'SSL', 'Troubleshooting']
  },
  {
    id: 'opp_coolify_principiantes',
    topicId: 'Coolify',
    title: 'Coolify para principiantes',
    format: 'Guía',
    opportunityScore: 72,
    demand: 'Media',
    competition: 'Media',
    searchVolume: 154,
    trend: [50, 52, 58, 65, 72],
    justification: [
      'Comentarios expresan que Docker es complejo y buscan una herramienta simple.',
      'Buen ratio de retención estimado.'
    ],
    tags: ['Coolify', 'Docker', 'Vercel Alternative']
  }
];

const INITIAL_IDEAS: SavedIdea[] = [
  {
    id: 'idea_1',
    topic: 'Coolify vs otras plataformas',
    opportunityScore: 65,
    status: 'todo',
    savedAt: '2024-06-10T10:00:00Z',
    channelId: 'own_channel',
    format: 'Comparativa',
    notes: 'Analizar Coolify contra Dokploy, Caprover y Easypanel.'
  },
  {
    id: 'idea_2',
    topic: 'Traefik desde cero',
    opportunityScore: 78,
    status: 'in_progress',
    savedAt: '2024-06-09T10:00:00Z',
    channelId: 'own_channel',
    format: 'Video Tutorial',
    notes: 'Configurar Traefik como reverse proxy con HTTPS automático.'
  },
  {
    id: 'idea_3',
    topic: 'Kubernetes para desarrolladores',
    opportunityScore: 72,
    status: 'todo',
    savedAt: '2024-06-08T10:00:00Z',
    channelId: 'own_channel',
    format: 'Video Tutorial',
    notes: 'Conceptos clave: Pods, Services, Deployments, sin complicar la vida.'
  },
  {
    id: 'idea_4',
    topic: 'Docker Compose trucos',
    opportunityScore: 68,
    status: 'todo',
    savedAt: '2024-06-07T10:00:00Z',
    channelId: 'own_channel',
    format: 'Video Tutorial',
    notes: 'Variables de entorno, perfiles, depends_on avanzados.'
  },
  {
    id: 'idea_5',
    topic: 'PostgreSQL para principiantes',
    opportunityScore: 64,
    status: 'todo',
    savedAt: '2024-06-06T10:00:00Z',
    channelId: 'own_channel',
    format: 'Guía',
    notes: 'Estructurar base de datos relacional y queries básicos.'
  },
  {
    id: 'idea_6',
    topic: 'CI/CD con GitHub Actions',
    opportunityScore: 65,
    status: 'published', // Fits "Guardada / Publicada"
    savedAt: '2024-06-05T10:00:00Z',
    channelId: 'own_channel',
    format: 'Video Tutorial'
  },
  {
    id: 'idea_7',
    topic: 'Monorepos con Turborepo',
    opportunityScore: 61,
    status: 'published',
    savedAt: '2024-06-04T10:00:00Z',
    channelId: 'own_channel',
    format: 'Guía'
  }
];

const INITIAL_ALERTS: Alert[] = [
  {
    id: 'alert_1',
    name: 'Tendencia Coolify',
    type: 'trend',
    condition: 'Interés +50% en 24h',
    status: 'active',
    lastActivity: 'Hace 2 horas',
    channelId: 'own_channel'
  },
  {
    id: 'alert_2',
    name: 'Nuevo tema sin cubrir',
    type: 'topic',
    condition: 'Alta demanda y baja competencia',
    status: 'active',
    lastActivity: 'Hace 3 horas',
    channelId: 'own_channel'
  },
  {
    id: 'alert_3',
    name: 'Competidor publica video',
    type: 'competitor',
    condition: 'Cualquier video nuevo',
    status: 'active',
    lastActivity: 'Hace 5 horas',
    channelId: 'own_channel'
  },
  {
    id: 'alert_4',
    name: 'Crecimiento de suscriptores',
    type: 'performance',
    condition: '+10% en 7 días',
    status: 'active',
    lastActivity: 'Hace 1 día',
    channelId: 'own_channel'
  },
  {
    id: 'alert_5',
    name: 'Alto volumen de comentarios',
    type: 'performance',
    condition: '> 100 en un video',
    status: 'active',
    lastActivity: 'Hace 1 día',
    channelId: 'own_channel'
  },
  {
    id: 'alert_6',
    name: 'Bajo performance de video',
    type: 'performance',
    condition: 'CTR < 2% en 24h',
    status: 'paused',
    lastActivity: 'Hace 3 días',
    channelId: 'own_channel'
  }
];

export class InMemoryRepository implements 
  IChannelRepository, 
  IVideoRepository, 
  ICommentRepository, 
  IOpportunityRepository, 
  IIdeaRepository, 
  IAlertRepository 
{
  private loadData<T>(key: string, defaults: T[]): T[] {
    const val = localStorage.getItem(key);
    if (!val) {
      localStorage.setItem(key, JSON.stringify(defaults));
      return defaults;
    }
    return JSON.parse(val);
  }

  private saveData<T>(key: string, data: T[]): void {
    localStorage.setItem(key, JSON.stringify(data));
  }

  // --- Channel Repository ---
  async getChannels(): Promise<Channel[]> {
    return this.loadData(CHANNELS_KEY, INITIAL_CHANNELS);
  }

  async getChannelById(id: string): Promise<Channel | null> {
    const channels = await this.getChannels();
    return channels.find(c => c.id === id) || null;
  }

  async getOwnChannel(): Promise<Channel | null> {
    const channels = await this.getChannels();
    return channels.find((c) => !c.isCompetitor) ?? null;
  }

  async addChannel(channel: Omit<Channel, 'id'> & { id?: string }): Promise<Channel> {
    const channels = await this.getChannels();
    const newChannel: Channel = {
      ...channel,
      id: channel.id ?? `ch_${Date.now()}`,
    } as Channel;
    channels.push(newChannel);
    this.saveData(CHANNELS_KEY, channels);
    return newChannel;
  }

  async updateChannel(channel: Channel): Promise<void> {
    const channels = await this.getChannels();
    const idx = channels.findIndex(c => c.id === channel.id);
    if (idx !== -1) {
      channels[idx] = channel;
      this.saveData(CHANNELS_KEY, channels);
    }
  }

  async deleteChannel(id: string): Promise<void> {
    let channels = await this.getChannels();
    channels = channels.filter(c => c.id !== id);
    this.saveData(CHANNELS_KEY, channels);
  }

  // --- Video Repository ---
  async getVideosByChannel(channelId: string): Promise<Video[]> {
    // Generar dinámicamente si no existe
    const videos = this.loadData<Video>(VIDEOS_KEY, []);
    const filtered = videos.filter(v => v.channelId === channelId);
    if (filtered.length > 0) return filtered;

    // Crear mock de videos
    const mockVideos: Video[] = Array.from({ length: 15 }).map((_, i) => ({
      id: `vid_${channelId}_${i}`,
      channelId,
      title: i === 0 ? 'Cómo desplegar Coolify en tu propio servidor' : `Video número ${i + 1} sobre DevOps`,
      publishedAt: new Date(Date.now() - i * 3 * 24 * 60 * 60 * 1000).toISOString(),
      viewCount: Math.round(15000 / (i + 1)),
      commentCount: Math.round(250 / (i + 1)),
      likeCount: Math.round(900 / (i + 1)),
      sentimentPositive: 60 + (i % 3) * 10,
      sentimentNeutral: 25 - (i % 2) * 5,
      sentimentNegative: 15 - (i % 3) * 5
    }));

    const allVideos = [...videos, ...mockVideos];
    this.saveData(VIDEOS_KEY, allVideos);
    return mockVideos;
  }

  async addVideos(videos: Video[]): Promise<void> {
    const all = this.loadData<Video>(VIDEOS_KEY, []);
    this.saveData(VIDEOS_KEY, [...all, ...videos]);
  }

  // --- Comment Repository ---
  async getCommentsByVideo(videoId: string): Promise<Comment[]> {
    const comments = this.loadData<Comment>(COMMENTS_KEY, []);
    return comments.filter(c => c.videoId === videoId);
  }

  async getCommentsByChannel(channelId: string): Promise<Comment[]> {
    // Devolvemos una lista grande para alimentar los widgets
    const all = this.loadData<Comment>(COMMENTS_KEY, []);
    const channelComments = all.filter(c => c.videoId.startsWith(`vid_${channelId}`));
    if (channelComments.length > 0) return channelComments;

    // Crear un pool de 300 comentarios simulados con palabras clave para el análisis
    const commentsTexts = [
      '¿Cómo conectar Coolify con un dominio propio?',
      '¿Cuál es la diferencia entre Coolify y Portainer?',
      '¿Cómo solucionar el error 502 en Nginx Proxy Manager?',
      '¿Qué VPS recomiendan para empezar?',
      '¿Coolify sirve para proyectos en producción?',
      'Excelente video, me sirvió muchísimo para montar mi Docker Compose.',
      'Haz un tutorial de Coolify por favor!',
      'Tengo un error de puertos al iniciar el contenedor de postgres.',
      '¿Podrías explicar cómo usar Kubernetes con Node.js?',
      '¿Se puede hacer deploy de Next.js 15 en un VPS barato?',
      'Excelente explicación como siempre crack.',
      'Me da error de SSL al conectar mi dominio en Dokploy.',
      'El mejor canal de desarrollo en español, gracias!',
      '¿Se puede usar Hetzner para montar Coolify? ¿Es confiable?',
      'Tengo problemas de memoria RAM con Docker, se me traba el VPS.'
    ];

    const mockComments: Comment[] = Array.from({ length: 300 }).map((_, i) => {
      const text = commentsTexts[i % commentsTexts.length];
      let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
      if (text.includes('Excelente') || text.includes('gracias') || text.includes('mejor')) sentiment = 'positive';
      else if (text.includes('error') || text.includes('problemas') || text.includes('traba')) sentiment = 'negative';

      let category: Comment['category'] = 'otro';
      if (text.includes('¿')) category = 'pregunta';
      else if (text.includes('Haz') || text.includes('Podrías') || text.includes('tutorial')) category = 'sugerencia';
      else if (text.includes('error') || text.includes('problema')) category = 'problema';
      else if (text.includes('Excelente') || text.includes('gracias')) category = 'elogio';

      return {
        id: `comment_${channelId}_${i}`,
        videoId: `vid_${channelId}_${i % 15}`,
        authorName: `Usuario_${i}`,
        authorAvatar: `https://images.unsplash.com/photo-${1500000000000 + i * 100000}?auto=format&fit=crop&w=40&q=80`,
        text,
        publishedAt: new Date(Date.now() - (i % 30) * 12 * 60 * 60 * 1000).toISOString(),
        sentiment,
        category
      };
    });

    const newAll = [...all, ...mockComments];
    this.saveData(COMMENTS_KEY, newAll);
    return mockComments;
  }

  async addComments(comments: Comment[]): Promise<void> {
    const all = this.loadData<Comment>(COMMENTS_KEY, []);
    this.saveData(COMMENTS_KEY, [...all, ...comments]);
  }

  async getCommentStats(channelId: string) {
    // Si es nuestro canal, devolvemos las métricas exactas del mockup
    if (channelId === 'own_channel') {
      return {
        totalComments: 24532,
        uniqueUsers: 8421,
        commentsPerDay: 817,
        averageEngagement: 4.2
      };
    }
    return {
      totalComments: 5420,
      uniqueUsers: 2130,
      commentsPerDay: 180,
      averageEngagement: 3.8
    };
  }

  async getFaqs(channelId: string) {
    return [
      { text: '¿Cómo conectar Coolify con un dominio propio?', count: 324 },
      { text: '¿Cuál es la diferencia entre Coolify y Portainer?', count: 298 },
      { text: '¿Cómo solucionar el error 502 en Nginx Proxy Manager?', count: 276 },
      { text: '¿Qué VPS recomiendan para empezar?', count: 241 },
      { text: '¿Coolify sirve para proyectos en producción?', count: 198 }
    ];
  }

  // --- Opportunity Repository ---
  async getOpportunities(channelId: string): Promise<Opportunity[]> {
    return this.loadData(OPPORTUNITIES_KEY, INITIAL_OPPORTUNITIES);
  }

  async addOpportunities(opportunities: Opportunity[]): Promise<void> {
    const all = this.loadData<Opportunity>(OPPORTUNITIES_KEY, []);
    // Filtrar duplicados
    const ids = new Set(all.map(o => o.id));
    const toAdd = opportunities.filter(o => !ids.has(o.id));
    this.saveData(OPPORTUNITIES_KEY, [...all, ...toAdd]);
  }

  // --- Idea Repository ---
  async getIdeas(): Promise<SavedIdea[]> {
    return this.loadData(IDEAS_KEY, INITIAL_IDEAS);
  }

  async saveIdea(idea: SavedIdea): Promise<void> {
    const ideas = await this.getIdeas();
    ideas.unshift(idea); // Poner al inicio
    this.saveData(IDEAS_KEY, ideas);
  }

  async updateIdeaStatus(id: string, status: SavedIdea['status']): Promise<void> {
    const ideas = await this.getIdeas();
    const idx = ideas.findIndex(i => i.id === id);
    if (idx !== -1) {
      ideas[idx].status = status;
      this.saveData(IDEAS_KEY, ideas);
    }
  }

  async deleteIdea(id: string): Promise<void> {
    let ideas = await this.getIdeas();
    ideas = ideas.filter(i => i.id !== id);
    this.saveData(IDEAS_KEY, ideas);
  }

  // --- Alert Repository ---
  async getAlerts(): Promise<Alert[]> {
    return this.loadData(ALERTS_KEY, INITIAL_ALERTS);
  }

  async saveAlert(alert: Alert): Promise<void> {
    const alerts = await this.getAlerts();
    alerts.unshift(alert);
    this.saveData(ALERTS_KEY, alerts);
  }

  async toggleAlertStatus(id: string): Promise<void> {
    const alerts = await this.getAlerts();
    const idx = alerts.findIndex(a => a.id === id);
    if (idx !== -1) {
      alerts[idx].status = alerts[idx].status === 'active' ? 'paused' : 'active';
      this.saveData(ALERTS_KEY, alerts);
    }
  }

  async deleteAlert(id: string): Promise<void> {
    let alerts = await this.getAlerts();
    alerts = alerts.filter(a => a.id !== id);
    this.saveData(ALERTS_KEY, alerts);
  }
}
