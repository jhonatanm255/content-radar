import { create } from 'zustand';
import { Channel, ChannelSnapshot, Opportunity, SavedIdea, Alert, TrackedVideo } from '../../domain/entities';
import { CommentAnalysisSummary } from '../../domain/commentAnalysis';
import {
  buildChannelEngagementTotals,
  ChannelEngagementTotals,
} from '../../domain/channelEngagement';
import { isAnalyticsChannelMatch } from '../../domain/youtubeAnalytics';
import { youtubeAnalyticsClient } from '../../infrastructure/external/YoutubeAnalyticsClient';
import { InMemoryRepository } from '../../infrastructure/repositories/InMemoryRepository';
import { SupabaseChannelRepository } from '../../infrastructure/repositories/SupabaseChannelRepository';
import { SupabaseSnapshotRepository } from '../../infrastructure/repositories/SupabaseSnapshotRepository';
import { SupabaseTrackedVideoRepository } from '../../infrastructure/repositories/SupabaseTrackedVideoRepository';
import { SupabaseCommentRepository } from '../../infrastructure/repositories/SupabaseCommentRepository';
import { YoutubeApiClient } from '../../infrastructure/external/YoutubeApiClient';
import { LinkChannelUseCase, SyncChannelSnapshotUseCase } from '../../application/use-cases';
import { AnalyzeChannelCommentsUseCase, LATEST_VIDEOS_LIMIT } from '../../application/analyze-comments';

const memoryRepo = new InMemoryRepository();
const channelRepo = new SupabaseChannelRepository();
const snapshotRepo = new SupabaseSnapshotRepository();
const trackedVideoRepo = new SupabaseTrackedVideoRepository();
const commentRepo = new SupabaseCommentRepository();
const youtubeClient = new YoutubeApiClient();

const linkChannelUseCase = new LinkChannelUseCase(channelRepo, snapshotRepo, youtubeClient);
const syncSnapshotUseCase = new SyncChannelSnapshotUseCase(channelRepo, snapshotRepo, youtubeClient);
const analyzeCommentsUseCase = new AnalyzeChannelCommentsUseCase(
  channelRepo,
  trackedVideoRepo,
  commentRepo,
  youtubeClient
);

const SELECTED_CHANNEL_KEY = 'cr_selected_channel';

export function getOwnChannels(channels: Channel[]): Channel[] {
  return channels.filter((c) => !c.isCompetitor);
}

export function getCompetitorChannels(channels: Channel[]): Channel[] {
  return channels.filter((c) => c.isCompetitor);
}

/** Canal propio activo según selección o el primero de la lista */
export function getActiveOwnChannel(
  channels: Channel[],
  selectedChannelId: string
): Channel | undefined {
  const own = getOwnChannels(channels);
  if (selectedChannelId && own.some((c) => c.id === selectedChannelId)) {
    return own.find((c) => c.id === selectedChannelId);
  }
  return own[0];
}

/** @deprecated Usar getActiveOwnChannel */
export function getOwnChannel(channels: Channel[]): Channel | undefined {
  return getOwnChannels(channels)[0];
}

interface AppState {
  currentTab: 'dashboard' | 'opportunities' | 'comments' | 'competitors' | 'trends' | 'ideas' | 'alerts' | 'settings';
  theme: 'dark' | 'light';
  channels: Channel[];
  channelSnapshots: ChannelSnapshot[];
  selectedChannelId: string;
  opportunities: Opportunity[];
  ideas: SavedIdea[];
  alerts: Alert[];
  isSyncing: boolean;
  syncProgress: number;
  syncStep: string;
  syncError: string | null;
  youtubeApiConfigured: boolean;
  commentAnalysis: CommentAnalysisSummary | null;
  isAnalyzingComments: boolean;
  analyzeCommentsProgress: number;
  analyzeCommentsStep: string;
  analyzeCommentsError: string | null;
  channelVideos: TrackedVideo[];
  channelEngagement: ChannelEngagementTotals;
  isLoadingChannelVideos: boolean;
  selectedYoutubeVideoIds: string[];
  commentViewFilter: 'all' | string;
  analysisAbortController: AbortController | null;

  setTab: (tab: AppState['currentTab']) => void;
  setSelectedChannelId: (id: string) => void;
  toggleTheme: () => void;
  loadInitialData: () => Promise<void>;
  addOwnChannel: (youtubeInput: string) => Promise<void>;
  addCompetitorChannel: (youtubeInput: string) => Promise<void>;
  syncChannel: (channelId: string) => Promise<void>;
  removeChannel: (channelId: string) => Promise<void>;
  saveIdea: (topic: string, score: number, format?: string) => Promise<void>;
  updateIdeaStatus: (id: string, status: SavedIdea['status']) => Promise<void>;
  deleteIdea: (id: string) => Promise<void>;
  toggleAlert: (id: string) => Promise<void>;
  deleteAlert: (id: string) => Promise<void>;
  addAlert: (name: string, type: Alert['type'], condition: string) => Promise<void>;
  loadCommentAnalysis: () => Promise<void>;
  loadChannelVideos: () => Promise<void>;
  syncChannelEngagement: () => Promise<void>;
  toggleVideoSelection: (youtubeVideoId: string) => void;
  clearVideoSelection: () => void;
  setCommentViewFilter: (filter: 'all' | string) => void;
  analyzeComments: () => Promise<void>;
  cancelAnalysis: () => void;
  clearVideoAnalysis: (youtubeVideoId: string) => Promise<void>;
}

async function reloadChannelContext(
  selectedChannelId: string
): Promise<{ channels: Channel[]; channelSnapshots: ChannelSnapshot[]; selectedChannelId: string }> {
  const channels = await channelRepo.getChannels();
  const active = getActiveOwnChannel(channels, selectedChannelId);
  const resolvedId = active?.id ?? '';

  let channelSnapshots: ChannelSnapshot[] = [];
  if (resolvedId) {
    channelSnapshots = await snapshotRepo.getSnapshots(resolvedId, 30);
  }

  if (resolvedId) {
    localStorage.setItem(SELECTED_CHANNEL_KEY, resolvedId);
  }

  return { channels, channelSnapshots, selectedChannelId: resolvedId };
}

export const useAppStore = create<AppState>((set, get) => ({
  currentTab: 'dashboard',
  theme: (localStorage.getItem('cr_theme') as 'dark' | 'light') || 'dark',
  channels: [],
  channelSnapshots: [],
  selectedChannelId: localStorage.getItem(SELECTED_CHANNEL_KEY) ?? '',
  opportunities: [],
  ideas: [],
  alerts: [],
  isSyncing: false,
  syncProgress: 0,
  syncStep: '',
  syncError: null,
  youtubeApiConfigured: youtubeClient.isConfigured(),
  commentAnalysis: null,
  isAnalyzingComments: false,
  analyzeCommentsProgress: 0,
  analyzeCommentsStep: '',
  analyzeCommentsError: null,
  channelVideos: [],
  channelEngagement: { totalLikes: 0, totalDislikes: null, analyticsConnected: false },
  isLoadingChannelVideos: false,
  selectedYoutubeVideoIds: [],
  commentViewFilter: 'all',
  analysisAbortController: null,

  setTab: (tab) => set({ currentTab: tab }),

  setSelectedChannelId: async (id) => {
    localStorage.setItem(SELECTED_CHANNEL_KEY, id);
    const channelSnapshots = await snapshotRepo.getSnapshots(id, 30);
    set({
      selectedChannelId: id,
      channelSnapshots,
      commentAnalysis: null,
      channelVideos: [],
      selectedYoutubeVideoIds: [],
      commentViewFilter: 'all',
      analyzeCommentsError: null,
    });
  },

  toggleTheme: () => {
    const nextTheme = get().theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('cr_theme', nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    set({ theme: nextTheme });
  },

  loadInitialData: async () => {
    const currentTheme = get().theme;
    if (currentTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    const savedSelection = localStorage.getItem(SELECTED_CHANNEL_KEY) ?? '';
    const ctx = await reloadChannelContext(savedSelection);
    const active = getActiveOwnChannel(ctx.channels, ctx.selectedChannelId);

    const opportunities = await memoryRepo.getOpportunities(active?.id ?? '');
    const ideas = await memoryRepo.getIdeas();
    const alerts = await memoryRepo.getAlerts();

    set({
      ...ctx,
      opportunities,
      ideas,
      alerts,
      youtubeApiConfigured: youtubeClient.isConfigured(),
    });
  },

  addOwnChannel: async (youtubeInput) => {
    set({ isSyncing: true, syncProgress: 20, syncStep: 'Buscando canal en YouTube...', syncError: null });

    try {
      const channel = await linkChannelUseCase.execute(youtubeInput, { isCompetitor: false });

      set({ syncProgress: 80, syncStep: 'Guardando canal y primer snapshot...' });
      const ctx = await reloadChannelContext(channel.id);

      set({ syncProgress: 100, syncStep: '¡Canal agregado!' });
      await new Promise((r) => setTimeout(r, 350));

      set({
        ...ctx,
        isSyncing: false,
        syncProgress: 0,
        syncStep: '',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al agregar el canal';
      set({ isSyncing: false, syncProgress: 0, syncStep: '', syncError: message });
      throw error;
    }
  },

  addCompetitorChannel: async (youtubeInput) => {
    set({ isSyncing: true, syncProgress: 20, syncStep: 'Buscando competidor en YouTube...', syncError: null });

    try {
      await linkChannelUseCase.execute(youtubeInput, {
        isCompetitor: true,
        createSnapshot: true,
      });

      set({ syncProgress: 80, syncStep: 'Guardando competidor...' });
      const ctx = await reloadChannelContext(get().selectedChannelId);

      set({ syncProgress: 100, syncStep: '¡Competidor agregado!' });
      await new Promise((r) => setTimeout(r, 350));

      set({
        ...ctx,
        isSyncing: false,
        syncProgress: 0,
        syncStep: '',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al agregar competidor';
      set({ isSyncing: false, syncProgress: 0, syncStep: '', syncError: message });
      throw error;
    }
  },

  syncChannel: async (channelId) => {
    set({ isSyncing: true, syncProgress: 10, syncStep: 'Conectando con la API de YouTube...', syncError: null });

    try {
      set({ syncProgress: 40, syncStep: 'Obteniendo métricas actuales del canal...' });
      await syncSnapshotUseCase.execute(channelId);

      set({ syncProgress: 80, syncStep: 'Guardando snapshot histórico del día...' });
      const ctx = await reloadChannelContext(channelId);

      set({ syncProgress: 100, syncStep: '¡Sincronización completada!' });
      await new Promise((r) => setTimeout(r, 400));

      set({
        ...ctx,
        isSyncing: false,
        syncProgress: 0,
        syncStep: '',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al sincronizar';
      set({
        isSyncing: false,
        syncProgress: 0,
        syncStep: '',
        syncError: message,
      });
      throw error;
    }
  },

  removeChannel: async (channelId) => {
    const current = get().channels.find((c) => c.id === channelId);
    if (!current) return;

    await channelRepo.deleteChannel(channelId);

    const wasSelected = get().selectedChannelId === channelId;
    const nextSelection = wasSelected && !current.isCompetitor ? '' : get().selectedChannelId;
    const ctx = await reloadChannelContext(nextSelection);

    set({ ...ctx, syncError: null });
  },

  saveIdea: async (topic, score, format) => {
    const active = getActiveOwnChannel(get().channels, get().selectedChannelId);
    const newIdea: SavedIdea = {
      id: `idea_${Date.now()}`,
      topic,
      opportunityScore: score,
      status: 'todo',
      savedAt: new Date().toISOString().split('T')[0],
      channelId: active?.id ?? '',
      format: format || 'Video Tutorial',
    };
    await memoryRepo.saveIdea(newIdea);
    const ideas = await memoryRepo.getIdeas();
    set({ ideas });
  },

  updateIdeaStatus: async (id, status) => {
    await memoryRepo.updateIdeaStatus(id, status);
    const ideas = await memoryRepo.getIdeas();
    set({ ideas });
  },

  deleteIdea: async (id) => {
    await memoryRepo.deleteIdea(id);
    const ideas = await memoryRepo.getIdeas();
    set({ ideas });
  },

  toggleAlert: async (id) => {
    await memoryRepo.toggleAlertStatus(id);
    const alerts = await memoryRepo.getAlerts();
    set({ alerts });
  },

  deleteAlert: async (id) => {
    await memoryRepo.deleteAlert(id);
    const alerts = await memoryRepo.getAlerts();
    set({ alerts });
  },

  addAlert: async (name, type, condition) => {
    const active = getActiveOwnChannel(get().channels, get().selectedChannelId);
    const newAlert: Alert = {
      id: `alert_${Date.now()}`,
      name,
      type,
      condition,
      status: 'active',
      lastActivity: 'Ahora mismo',
      channelId: active?.id ?? '',
    };
    await memoryRepo.saveAlert(newAlert);
    const alerts = await memoryRepo.getAlerts();
    set({ alerts });
  },

  loadCommentAnalysis: async () => {
    const active = getActiveOwnChannel(get().channels, get().selectedChannelId);
    if (!active) {
      set({ commentAnalysis: null });
      return;
    }

    try {
      const filter =
        get().commentViewFilter === 'all'
          ? get().channelVideos
              .filter((video) => video.analysisStatus === 'done')
              .map((video) => video.id)
          : [get().commentViewFilter];
      const summary = await analyzeCommentsUseCase.loadSummary(active.id, filter);
      set({ commentAnalysis: summary, analyzeCommentsError: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al cargar análisis';
      set({ analyzeCommentsError: message });
    }
  },

  loadChannelVideos: async () => {
    const active = getActiveOwnChannel(get().channels, get().selectedChannelId);
    if (!active) return;

    set({ isLoadingChannelVideos: true });
    try {
      const videos = await analyzeCommentsUseCase.syncVideoCatalog(active.id);
      set({ channelVideos: videos, isLoadingChannelVideos: false });
      await get().syncChannelEngagement();
    } catch (error) {
      set({ isLoadingChannelVideos: false });
      console.error('Error al cargar videos:', error);
    }
  },

  syncChannelEngagement: async () => {
    const active = getActiveOwnChannel(get().channels, get().selectedChannelId);
    const videos = get().channelVideos;
    if (videos.length === 0) {
      set({
        channelEngagement: { totalLikes: 0, totalDislikes: null, analyticsConnected: false },
      });
      return;
    }

    let analyticsConnected = false;
    let merged = [...videos];

    try {
      const status = await youtubeAnalyticsClient.getStatus();
      const channelMatch = isAnalyticsChannelMatch(active, status.youtube_channel_id);
      analyticsConnected = status.connected && channelMatch;

      if (analyticsConnected) {
        const engagement = await youtubeAnalyticsClient.getVideoEngagement();
        const byVideoId = new Map(
          engagement.videos.map((item) => [item.youtube_video_id, item])
        );

        merged = await Promise.all(
          videos.map(async (video) => {
            const stats = byVideoId.get(video.youtubeVideoId);
            if (!stats) return video;

            const updated: TrackedVideo = {
              ...video,
              dislikeCount: stats.dislikes,
            };

            try {
              await trackedVideoRepo.updateTrackedVideo(updated);
            } catch (error) {
              console.warn('No se pudo guardar dislikes del video:', error);
            }

            return updated;
          })
        );
      }
    } catch (error) {
      console.warn('Engagement de YouTube Analytics no disponible:', error);
    }

    set({
      channelVideos: merged,
      channelEngagement: buildChannelEngagementTotals(merged, analyticsConnected),
    });
  },

  toggleVideoSelection: (youtubeVideoId) => {
    const current = get().selectedYoutubeVideoIds;
    const next = current.includes(youtubeVideoId) ? [] : [youtubeVideoId];
    set({ selectedYoutubeVideoIds: next });
  },

  clearVideoSelection: () => set({ selectedYoutubeVideoIds: [] }),

  setCommentViewFilter: async (filter) => {
    set({ commentViewFilter: filter });
    await get().loadCommentAnalysis();
  },

  analyzeComments: async () => {
    const active = getActiveOwnChannel(get().channels, get().selectedChannelId);
    if (!active) {
      set({ analyzeCommentsError: 'Vincula un canal propio para analizar comentarios.' });
      return;
    }

    const selected = get().selectedYoutubeVideoIds;
    if (selected.length === 0) {
      set({ analyzeCommentsError: 'Selecciona un video para analizar.' });
      return;
    }

    set({
      isAnalyzingComments: true,
      analyzeCommentsProgress: 0,
      analyzeCommentsStep: 'Iniciando análisis...',
      analyzeCommentsError: null,
      analysisAbortController: new AbortController(),
    });

    try {
      const summary = await analyzeCommentsUseCase.execute(
        active.id,
        (step, progress) => {
          set({ analyzeCommentsStep: step, analyzeCommentsProgress: progress });
        },
        { youtubeVideoIds: selected, force: false, abortSignal: get().analysisAbortController?.signal }
      );

      await get().loadChannelVideos();

      set({
        commentAnalysis: summary,
        isAnalyzingComments: false,
        analyzeCommentsProgress: 100,
        analyzeCommentsStep: '',
        commentViewFilter: selected.length === 1
          ? summary.trackedVideos.find((v) => v.youtubeVideoId === selected[0])?.id ?? 'all'
          : 'all',
        analysisAbortController: null,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        set({
          isAnalyzingComments: false,
          analyzeCommentsProgress: 0,
          analyzeCommentsStep: '',
          analyzeCommentsError: 'Análisis cancelado por el usuario.',
          analysisAbortController: null,
        });
        return;
      }
      
      const message = error instanceof Error ? error.message : 'Error al analizar comentarios';
      set({
        isAnalyzingComments: false,
        analyzeCommentsProgress: 0,
        analyzeCommentsStep: '',
        analyzeCommentsError: message,
        analysisAbortController: null,
      });
      throw error;
    }
  },
  
  cancelAnalysis: () => {
    const controller = get().analysisAbortController;
    if (controller) {
      controller.abort();
    }
  },

  clearVideoAnalysis: async (youtubeVideoId: string) => {
    const active = getActiveOwnChannel(get().channels, get().selectedChannelId);
    if (!active) return;

    try {
      const summary = await analyzeCommentsUseCase.clearAnalysis(active.id, youtubeVideoId);
      await get().loadChannelVideos();

      // If the currently filtered video was cleared, switch back to 'all'
      const currentFilter = get().commentViewFilter;
      const clearedVideo = get().channelVideos.find(v => v.youtubeVideoId === youtubeVideoId);
      const newFilter = (currentFilter === clearedVideo?.id) ? 'all' : currentFilter;

      set({
        commentAnalysis: summary,
        commentViewFilter: newFilter,
      });
    } catch (error) {
      console.error('Error al limpiar el análisis del video:', error);
    }
  },
}));
