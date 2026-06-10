import React, { useCallback, useEffect, useState } from 'react';
import { BarChart3, Globe, Loader2, Monitor, RefreshCw, Smartphone, Users } from 'lucide-react';
import { ChannelDemographics } from '../../domain/demographics';
import { youtubeAnalyticsClient } from '../../infrastructure/external/YoutubeAnalyticsClient';
import { getActiveOwnChannel, useAppStore } from '../store/appStore';

const GENDER_COLORS: Record<string, string> = {
  female: '#ec4899',
  male: '#3b82f6',
  user_specified: '#8b5cf6',
};

function ProgressBar({ label, percentage, color }: { label: string; percentage: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-600 dark:text-slate-300 font-medium truncate pr-2">{label}</span>
        <span className="font-bold text-slate-800 dark:text-white flex-shrink-0">{percentage}%</span>
      </div>
      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(percentage, 100)}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export const ChannelDemographicsPanel: React.FC = () => {
  const { setTab, channels, selectedChannelId } = useAppStore();
  const linkedChannel = getActiveOwnChannel(channels, selectedChannelId);
  const [data, setData] = useState<ChannelDemographics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const loadDemographics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const status = await youtubeAnalyticsClient.getStatus();
      setIsConnected(status.connected);
      if (!status.connected) {
        setData(null);
        return;
      }
      const demographics = await youtubeAnalyticsClient.getDemographics();
      setData(demographics);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar demografía';
      setError(message);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDemographics();
  }, [loadDemographics]);

  if (isLoading) {
    return (
      <div className="p-5 rounded-xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/80 shadow-sm flex items-center justify-center gap-2 py-12">
        <Loader2 size={20} className="animate-spin text-violet-500" />
        <span className="text-sm text-slate-500">Cargando demografía de audiencia…</span>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="p-6 rounded-xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/80 shadow-sm text-center">
        <Users size={36} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
        <h3 className="text-base font-bold text-slate-800 dark:text-white mb-2">
          Demografía de tu audiencia
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 max-w-md mx-auto">
          Conecta tu cuenta de Google/YouTube en Ajustes para ver edad, género, países y
          dispositivos de tus espectadores (últimos 28 días).
        </p>
        <button
          onClick={() => setTab('settings')}
          className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold transition-colors"
        >
          Conectar en Ajustes
        </button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50">
        <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        <button
          onClick={loadDemographics}
          className="mt-3 text-xs font-bold text-red-600 dark:text-red-400 hover:underline"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!data) return null;

  const channelMismatch =
    Boolean(
      data.youtube_channel_id &&
        linkedChannel?.youtubeChannelId &&
        data.youtube_channel_id !== linkedChannel.youtubeChannelId
    );

  const hasAnySection =
    data.age_groups.length > 0 ||
    data.genders.length > 0 ||
    data.countries.length > 0 ||
    data.devices.length > 0;

  return (
    <div className="p-5 rounded-xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/80 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Users size={18} className="text-violet-500" />
            Demografía de audiencia
          </h2>
          <p className="text-[11px] text-slate-400 mt-1">
            {data.start_date} → {data.end_date} · YouTube Analytics
            {data.total_views != null && data.total_views > 0 && (
              <span> · {data.total_views.toLocaleString('es-ES')} vistas</span>
            )}
          </p>
          {data.youtube_channel_title && (
            <p className="text-[11px] text-slate-500 mt-0.5">
              Canal de la cuenta conectada: <strong>{data.youtube_channel_title}</strong>
              {data.google_email ? ` (${data.google_email})` : ''}
            </p>
          )}
        </div>
        <button
          onClick={loadDemographics}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <RefreshCw size={14} />
          Actualizar
        </button>
      </div>

      {channelMismatch && (
        <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 text-xs text-amber-800 dark:text-amber-300">
          La cuenta Google conectada es del canal <strong>{data.youtube_channel_title}</strong>, pero en
          la app estás viendo <strong>{linkedChannel?.name}</strong>. Los datos de demografía son del canal
          de la cuenta conectada, no del canal vinculado por URL.
        </div>
      )}

      {data.message && (
        <div
          className={`mb-4 p-3 rounded-lg text-xs border ${
            hasAnySection
              ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200/60 dark:border-blue-800/40 text-blue-800 dark:text-blue-300'
              : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
          }`}
        >
          {data.message}
        </div>
      )}

      {!hasAnySection && (
        <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
          <p className="mb-2">No hay datos demográficos disponibles todavía.</p>
          <p className="text-xs max-w-lg mx-auto">
            YouTube solo muestra esta información cuando el canal tiene suficientes vistas y la cuenta
            conectada es la <strong>dueña</strong> del canal. Revisa en YouTube Studio → Analytics si ves
            datos allí.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Edad */}
        <div>
          <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <BarChart3 size={14} />
            Edad
          </h3>
          <div className="space-y-2.5">
            {data.age_groups.length > 0 ? (
              data.age_groups.map((item) => (
                <ProgressBar
                  key={item.key}
                  label={item.label}
                  percentage={item.percentage}
                  color="#8b5cf6"
                />
              ))
            ) : (
              <p className="text-xs text-slate-400">Sin datos suficientes.</p>
            )}
          </div>
        </div>

        {/* Género */}
        <div>
          <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Users size={14} />
            Género
          </h3>
          <div className="space-y-2.5">
            {data.genders.length > 0 ? (
              data.genders.map((item) => (
                <ProgressBar
                  key={item.key}
                  label={item.label}
                  percentage={item.percentage}
                  color={GENDER_COLORS[item.key] ?? '#6b7280'}
                />
              ))
            ) : (
              <p className="text-xs text-slate-400">Sin datos (umbral de privacidad de YouTube).</p>
            )}
          </div>
        </div>

        {/* Países */}
        <div>
          <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Globe size={14} />
            Top países
          </h3>
          <div className="space-y-2">
            {data.countries.length > 0 ? (
              data.countries.map((country) => (
              <div
                key={country.code}
                className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 dark:border-slate-800/50 last:border-0"
              >
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {country.name}
                </span>
                <span className="text-slate-500">
                  {country.percentage}% · {country.views.toLocaleString('es-ES')} vistas
                </span>
              </div>
              ))
            ) : (
              <p className="text-xs text-slate-400">Sin datos de países en este período.</p>
            )}
          </div>
        </div>

        {/* Dispositivos */}
        <div>
          <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Monitor size={14} />
            Dispositivos
          </h3>
          <div className="space-y-2.5">
            {data.devices.length > 0 ? (
              data.devices.map((device) => (
              <ProgressBar
                key={device.type}
                label={device.label}
                percentage={device.percentage}
                color={device.type === 'MOBILE' ? '#10b981' : '#3b82f6'}
              />
              ))
            ) : (
              <p className="text-xs text-slate-400">Sin datos de dispositivos en este período.</p>
            )}
          </div>
          {data.devices.some((d) => d.type === 'MOBILE') && (
            <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
              <Smartphone size={10} />
              Datos de dispositivos de YouTube Analytics
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
