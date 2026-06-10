import React, { useCallback, useEffect, useState } from 'react';
import { useAppStore, getActiveOwnChannel, getOwnChannels } from '../store/appStore';
import { useAuthStore } from '../store/authStore';
import { Shield, Database, LogOut, User, Youtube, Loader2, Unlink, CheckCircle2 } from 'lucide-react';
import { YoutubeOAuthStatus } from '../../domain/demographics';
import { youtubeAnalyticsClient } from '../../infrastructure/external/YoutubeAnalyticsClient';

export const Settings: React.FC = () => {
  const { channels, syncChannel, isSyncing, syncError, youtubeApiConfigured, channelSnapshots, selectedChannelId } =
    useAppStore();
  const { user, signOut } = useAuthStore();
  const ownChannels = getOwnChannels(channels);
  const ownChannel = getActiveOwnChannel(channels, selectedChannelId);

  const [youtubeStatus, setYoutubeStatus] = useState<YoutubeOAuthStatus | null>(null);
  const [isLoadingYoutube, setIsLoadingYoutube] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [youtubeMessage, setYoutubeMessage] = useState<string | null>(null);

  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ||
    user?.email?.split('@')[0] ||
    'Usuario';

  const loadYoutubeStatus = useCallback(async () => {
    setIsLoadingYoutube(true);
    try {
      const status = await youtubeAnalyticsClient.getStatus();
      setYoutubeStatus(status);
    } catch {
      setYoutubeStatus({ connected: false });
    } finally {
      setIsLoadingYoutube(false);
    }
  }, []);

  useEffect(() => {
    loadYoutubeStatus();
  }, [loadYoutubeStatus]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('youtube_connected') === '1') {
      setYoutubeMessage('¡Cuenta de YouTube conectada correctamente!');
      loadYoutubeStatus();
      window.history.replaceState({}, '', window.location.pathname);
    }
    const error = params.get('youtube_error');
    if (error) {
      setYoutubeMessage(`Error al conectar: ${error}`);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [loadYoutubeStatus]);

  const handleConnectYoutube = async () => {
    setIsConnecting(true);
    setYoutubeMessage(null);
    try {
      const url = await youtubeAnalyticsClient.getAuthUrl();
      window.location.href = url;
    } catch (err) {
      setYoutubeMessage(err instanceof Error ? err.message : 'No se pudo iniciar la conexión');
      setIsConnecting(false);
    }
  };

  const handleDisconnectYoutube = async () => {
    setIsDisconnecting(true);
    setYoutubeMessage(null);
    try {
      await youtubeAnalyticsClient.disconnect();
      setYoutubeStatus({ connected: false });
      setYoutubeMessage('Cuenta de YouTube desconectada.');
    } catch (err) {
      setYoutubeMessage(err instanceof Error ? err.message : 'Error al desconectar');
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <div className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Ajustes
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Administra la configuración del sistema de Creator Radar
        </p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Account panel */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-850 dark:text-white flex items-center gap-2">
            <User size={16} className="text-violet-500" />
            <span>Cuenta de usuario</span>
          </h3>
          <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-105 dark:border-slate-850 rounded-lg space-y-1">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{displayName}</p>
            <p className="text-[10px] text-slate-400">{user?.email}</p>
            <p className="text-[10px] text-slate-400">ID: {user?.id}</p>
          </div>
          <button
            onClick={() => signOut()}
            className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-700 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 font-semibold text-xs transition-colors flex items-center gap-1.5"
          >
            <LogOut size={14} />
            <span>Cerrar sesión</span>
          </button>
        </div>

        {/* YouTube Analytics OAuth */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-850 dark:text-white flex items-center gap-2">
            <Youtube size={16} className="text-red-500" />
            <span>YouTube Analytics — Demografía</span>
          </h3>
          <p className="text-xs text-slate-550 dark:text-slate-400">
            Conecta la cuenta de Google del <strong>dueño del canal</strong> para acceder a edad,
            género, países y dispositivos de tu audiencia. Requiere el backend Python en ejecución.
          </p>

          {youtubeMessage && (
            <div
              className={`p-3 rounded-lg text-xs ${
                youtubeMessage.includes('Error') || youtubeMessage.includes('error')
                  ? 'bg-red-500/10 border border-red-500/25 text-red-400'
                  : 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {youtubeMessage}
            </div>
          )}

          {isLoadingYoutube ? (
            <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
              <Loader2 size={14} className="animate-spin" />
              Verificando conexión…
            </div>
          ) : youtubeStatus?.connected ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-lg">
                <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Conectado como {youtubeStatus.google_email ?? 'cuenta Google'}
                  </p>
                  {youtubeStatus.connected_at && (
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Desde {new Date(youtubeStatus.connected_at).toLocaleString('es-ES')}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={handleDisconnectYoutube}
                disabled={isDisconnecting}
                className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-700 dark:text-slate-300 hover:text-red-600 font-semibold text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDisconnecting ? <Loader2 size={14} className="animate-spin" /> : <Unlink size={14} />}
                Desconectar cuenta
              </button>
            </div>
          ) : (
            <button
              onClick={handleConnectYoutube}
              disabled={isConnecting}
              className="px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold text-xs transition-colors flex items-center gap-2 shadow-sm"
            >
              {isConnecting ? <Loader2 size={14} className="animate-spin" /> : <Youtube size={14} />}
              Conectar con Google / YouTube
            </button>
          )}

          <p className="text-[10px] text-slate-400">
            API backend: {import.meta.env.VITE_API_URL ?? 'http://localhost:8000'}
          </p>
        </div>

        {/* Sync panel */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-850 dark:text-white flex items-center gap-2">
            <Database size={16} className="text-violet-500" />
            <span>Sincronización y Datos Globales</span>
          </h3>
          <p className="text-xs text-slate-550 dark:text-slate-400">
            Cada sincronización guarda un snapshot del día con suscriptores, vistas y videos publicados.
            Con el tiempo esto alimenta los gráficos de crecimiento del canal.
          </p>

          <div className="flex items-center gap-2 text-[10px]">
            <span
              className={`w-2 h-2 rounded-full ${youtubeApiConfigured ? 'bg-emerald-500' : 'bg-amber-500'}`}
            />
            <span className="text-slate-500">
              YouTube API: {youtubeApiConfigured ? 'Configurada' : 'No configurada — agrega VITE_YOUTUBE_API_KEY'}
            </span>
          </div>

          {syncError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/25 text-red-400 text-xs">
              {syncError}
            </div>
          )}

          {ownChannels.length === 0 && (
            <p className="text-xs text-slate-500">
              Ve al Dashboard y pulsa &quot;Agregar mi canal&quot; para vincular tu canal de YouTube.
            </p>
          )}

          {ownChannel && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 bg-slate-50 dark:bg-slate-950 border border-slate-105 dark:border-slate-850 rounded-lg">
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {ownChannel.name} · {ownChannel.handle}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Última sync: {new Date(ownChannel.lastSyncAt).toLocaleString('es-ES')}
                </p>
                <p className="text-[10px] text-slate-400">
                  Snapshots guardados: {channelSnapshots.length}
                </p>
              </div>
              <button
                onClick={() => syncChannel(ownChannel.id)}
                disabled={isSyncing || !youtubeApiConfigured}
                className="px-4 py-2 rounded-lg bg-violet-650 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold text-xs shadow-sm flex items-center gap-1.5 transition-colors"
              >
                <span>Sincronizar métricas hoy</span>
              </button>
            </div>
          )}
        </div>

        {/* Supabase keys panel */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-850 dark:text-white flex items-center gap-2">
            <Shield size={16} className="text-violet-500" />
            <span>Credenciales de API de YouTube & Supabase</span>
          </h3>
          <p className="text-xs text-slate-500">
            Desacoplado por defecto. Los adaptadores en producción consumen estas claves de entorno locales.
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-[9px] font-bold text-slate-450 uppercase mb-1">
                YouTube API Key
              </label>
              <input
                type="password"
                value={youtubeApiConfigured ? '••••••••••••••••••••••••••••••••••••' : 'No configurada'}
                disabled
                className="w-full px-3 py-2 rounded-lg text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-400"
              />
            </div>
            <div>
              <label className="block text-[9px] font-bold text-slate-450 uppercase mb-1">
                Supabase URL
              </label>
              <input
                type="text"
                value={import.meta.env.VITE_SUPABASE_URL || 'No configurada'}
                disabled
                className="w-full px-3 py-2 rounded-lg text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-400"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
