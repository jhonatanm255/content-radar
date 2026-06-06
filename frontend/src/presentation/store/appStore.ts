import { create } from 'zustand';
import { Channel, ChannelSnapshot, Opportunity, SavedIdea, Alert } from '../../domain/entities';
import { InMemoryRepository } from '../../infrastructure/repositories/InMemoryRepository';
import { SupabaseChannelRepository } from '../../infrastructure/repositories/SupabaseChannelRepository';
import { SupabaseSnapshotRepository } from '../../infrastructure/repositories/SupabaseSnapshotRepository';
import { YoutubeApiClient } from '../../infrastructure/external/YoutubeApiClient';
import { LinkChannelUseCase, SyncChannelSnapshotUseCase } from '../../application/use-cases';

const memoryRepo = new InMemoryRepository();
const channelRepo = new SupabaseChannelRepository();
const snapshotRepo = new SupabaseSnapshotRepository();
const youtubeClient = new YoutubeApiClient();

const linkChannelUseCase = new LinkChannelUseCase(channelRepo, snapshotRepo, youtubeClient);
const syncSnapshotUseCase = new SyncChannelSnapshotUseCase(channelRepo, snapshotRepo, youtubeClient);

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

  setTab: (tab) => set({ currentTab: tab }),

  setSelectedChannelId: async (id) => {
    localStorage.setItem(SELECTED_CHANNEL_KEY, id);
    const channelSnapshots = await snapshotRepo.getSnapshots(id, 30);
    set({ selectedChannelId: id, channelSnapshots });
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
}));
