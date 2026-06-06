import React from 'react';
import { useAppStore, getActiveOwnChannel, getOwnChannels } from '../store/appStore';
import { useAuthStore } from '../store/authStore';
import { Shield, Database, LogOut, User } from 'lucide-react';

export const Settings: React.FC = () => {
  const { channels, syncChannel, isSyncing, syncError, youtubeApiConfigured, channelSnapshots, selectedChannelId } = useAppStore();
  const { user, signOut } = useAuthStore();
  const ownChannels = getOwnChannels(channels);
  const ownChannel = getActiveOwnChannel(channels, selectedChannelId);

  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ||
    user?.email?.split('@')[0] ||
    'Usuario';

  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      
      {/* Header */}
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
            <p className="text-[10px] text-slate-400">
              ID: {user?.id}
            </p>
          </div>
          <button
            onClick={() => signOut()}
            className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-700 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 font-semibold text-xs transition-colors flex items-center gap-1.5"
          >
            <LogOut size={14} />
            <span>Cerrar sesión</span>
          </button>
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
            <span className={`w-2 h-2 rounded-full ${youtubeApiConfigured ? 'bg-emerald-500' : 'bg-amber-500'}`} />
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
              <label className="block text-[9px] font-bold text-slate-450 uppercase mb-1">YouTube API Key</label>
              <input 
                type="password" 
                value={youtubeApiConfigured ? '••••••••••••••••••••••••••••••••••••' : 'No configurada'} 
                disabled
                className="w-full px-3 py-2 rounded-lg text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-400"
              />
            </div>
            <div>
              <label className="block text-[9px] font-bold text-slate-450 uppercase mb-1">Supabase URL</label>
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
