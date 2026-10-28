import React, { useCallback, useEffect, useState } from 'react';
import { useAppStore, getActiveOwnChannel, getOwnChannels } from '../store/appStore';
import { useAuthStore } from '../store/authStore';
import { Shield, Database, LogOut, User, Youtube, Loader2, Unlink, CheckCircle2, Settings as SettingsIcon, Key } from 'lucide-react';
import { YoutubeOAuthStatus } from '../../domain/demographics';
import { youtubeAnalyticsClient } from '../../infrastructure/external/YoutubeAnalyticsClient';
import { getApiBaseUrl } from '../../infrastructure/utils/apiBaseUrl';

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
    <div className="cr-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <SettingsIcon size={14} />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Preferencias
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Configuración del Sistema
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Administra tu cuenta de usuario, integraciones de YouTube API y sincronización.
          </p>
        </div>
      </div>

      <div className="max-w-3xl space-y-5">
        {/* Account panel */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#121624] border border-slate-200/70 dark:border-slate-800/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] dark:shadow-none space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 flex items-center justify-center">
              <User size={15} />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Cuenta de Usuario
            </h3>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-[#151C30] border border-slate-100 dark:border-slate-800/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">{displayName}</p>
              <p className="text-xs text-slate-400 mt-0.5">{user?.email}</p>
              <p className="text-[10px] text-slate-400 font-mono mt-1">ID: {user?.id}</p>
            </div>
            <button
              onClick={() => signOut()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200/80 dark:border-slate-700 font-semibold text-xs transition-colors self-start sm:self-auto shadow-sm"
            >
              <LogOut size={13} />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>

        {/* YouTube Analytics OAuth */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#121624] border border-slate-200/70 dark:border-slate-800/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] dark:shadow-none space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 flex items-center justify-center">
              <Youtube size={15} />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              YouTube Analytics — Demografía Oficial
            </h3>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Conecta la cuenta de Google del <strong>dueño del canal</strong> para acceder a métricas privadas como edad,
            género, países y retención de tu audiencia.
          </p>

          {youtubeMessage && (
            <div
              className={`p-3 rounded-xl text-xs ${
                youtubeMessage.toLowerCase().includes('error')
                  ? 'bg-rose-50 border border-rose-200 text-rose-600 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-400'
                  : 'bg-emerald-50 border border-emerald-200 text-emerald-600 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-400'
              }`}
            >
              {youtubeMessage}
            </div>
          )}

          {isLoadingYoutube ? (
            <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
              <Loader2 size={14} className="animate-spin text-blue-600" />
              Verificando estado de conexión…
            </div>
          ) : youtubeStatus?.connected ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2.5 p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl">
                <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    Conectado como {youtubeStatus.google_email ?? 'cuenta Google'}
                  </p>
                  {youtubeStatus.connected_at && (
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Vinculado desde {new Date(youtubeStatus.connected_at).toLocaleString('es-ES')}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={handleDisconnectYoutube}
                disabled={isDisconnecting}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200/80 dark:border-slate-700 font-semibold text-xs transition-colors disabled:opacity-50"
              >
                {isDisconnecting ? <Loader2 size={13} className="animate-spin" /> : <Unlink size={13} />}
                Desconectar cuenta de YouTube
              </button>
            </div>
          ) : (
            <button
              onClick={handleConnectYoutube}
              disabled={isConnecting}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-red-500/20 transition-all"
            >
              {isConnecting ? <Loader2 size={14} className="animate-spin" /> : <Youtube size={14} />}
              Conectar con Google / YouTube
            </button>
          )}

          <p className="text-[10px] text-slate-400 pt-1">
            API backend en ejecución: <code className="font-mono">{getApiBaseUrl()}</code>
          </p>
        </div>

        {/* Sync panel */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#121624] border border-slate-200/70 dark:border-slate-800/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] dark:shadow-none space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 flex items-center justify-center">
              <Database size={15} />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Sincronización de Datos y Snapshots
            </h3>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Cada sincronización guarda un snapshot diario con conteo de suscriptores, vistas y videos publicados para generar los gráficos históricos.
          </p>

          <div className="flex items-center gap-2 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${youtubeApiConfigured ? 'bg-emerald-500' : 'bg-amber-500'}`}
            />
            <span className="text-slate-600 dark:text-slate-400 font-medium">
              YouTube Data API v3: {youtubeApiConfigured ? 'Configurada correctamente' : 'No configurada'}
            </span>
          </div>

          {syncError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-400 text-xs">
              {syncError}
            </div>
          )}

          {ownChannel && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-[#151C30] border border-slate-100 dark:border-slate-800/80 rounded-xl">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  {ownChannel.name} ({ownChannel.handle})
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Última sincronización: {new Date(ownChannel.lastSyncAt).toLocaleString('es-ES')}
                </p>
                <p className="text-[11px] text-slate-400">
                  Snapshots guardados: {channelSnapshots.length}
                </p>
              </div>
              <button
                onClick={() => syncChannel(ownChannel.id)}
                disabled={isSyncing || !youtubeApiConfigured}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all self-start sm:self-auto"
              >
                Sincronizar métricas hoy
              </button>
            </div>
          )}
        </div>

        {/* Credentials preview */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#121624] border border-slate-200/70 dark:border-slate-800/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] dark:shadow-none space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 flex items-center justify-center">
              <Key size={15} />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Variables de Entorno y Conectores
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                YouTube API Key
              </label>
              <input
                type="password"
                value={youtubeApiConfigured ? '••••••••••••••••••••••••••••••••••••' : 'No configurada'}
                disabled
                className="cr-input text-slate-400 font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                Supabase URL
              </label>
              <input
                type="text"
                value={import.meta.env.VITE_SUPABASE_URL || 'No configurada'}
                disabled
                className="cr-input text-slate-400 font-mono"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
