import React, { useCallback, useEffect, useState } from 'react';
import { BarChart3, Globe, Loader2, Monitor, RefreshCw, Smartphone, Users, Tv, Tablet } from 'lucide-react';
import { ChannelDemographics, YoutubeOAuthStatus } from '../../domain/demographics';
import { isAnalyticsChannelMatch } from '../../domain/youtubeAnalytics';
import { youtubeAnalyticsClient } from '../../infrastructure/external/YoutubeAnalyticsClient';
import { getActiveOwnChannel, useAppStore } from '../store/appStore';

const GENDER_COLORS: Record<string, string> = {
  female: '#ec4899',
  male: '#3b82f6',
  user_specified: '#8b5cf6',
};

const DEVICE_COLORS: Record<string, string> = {
  MOBILE: '#10b981',
  TV: '#3b82f6',
  TABLET: '#6366f1',
  DESKTOP: '#3b82f6',
};

const getFlagEmoji = (countryCode: string): string => {
  if (!countryCode || countryCode.length !== 2) return '🏳️';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  try {
    return String.fromCodePoint(...codePoints);
  } catch {
    return '🏳️';
  }
};

const getDeviceIcon = (type: string) => {
  switch (type.toUpperCase()) {
    case 'MOBILE':
    case 'MÓVIL':
      return Smartphone;
    case 'TV':
      return Tv;
    case 'TABLET':
      return Tablet;
    case 'DESKTOP':
    case 'ESCRITORIO':
    default:
      return Monitor;
  }
};

function ProgressBar({ label, percentage, color }: { label: string; percentage: number; color: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs font-semibold text-slate-600 dark:text-cr-muted w-24 flex-shrink-0 truncate" title={label}>
        {label}
      </span>
      <div className="h-2 bg-slate-100 dark:bg-cr-border-dark/60 rounded-full flex-1 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(percentage, 100)}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-bold text-slate-800 dark:text-white w-12 text-right flex-shrink-0">
        {percentage}%
      </span>
    </div>
  );
}

export const ChannelDemographicsPanel: React.FC = () => {
  const { channels, selectedChannelId } = useAppStore();
  const linkedChannel = getActiveOwnChannel(channels, selectedChannelId);
  const [data, setData] = useState<ChannelDemographics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const loadDemographics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setData(null);

    if (!linkedChannel) {
      setIsConnected(false);
      setIsLoading(false);
      return;
    }

    try {
      const status = await youtubeAnalyticsClient.getStatus();
      const channelMatch = isAnalyticsChannelMatch(linkedChannel, status.youtube_channel_id);
      const connected = status.connected && channelMatch;
      setIsConnected(connected);

      if (!status.connected || !channelMatch) {
        if (status.connected && !channelMatch) {
          setError(
            'Cuenta de YouTube conectada, pero no coincide con el canal seleccionado. Revisa la cuenta en Ajustes.'
          );
        }
        return;
      }

      const demographics = await youtubeAnalyticsClient.getDemographics();

      if (!isAnalyticsChannelMatch(linkedChannel, demographics.youtube_channel_id)) {
        setIsConnected(false);
        setError(
          'Los datos demográficos pertenecen a otro canal. Conecta la cuenta de YouTube correcta o selecciona el canal correcto.'
        );
        return;
      }

      setData(demographics);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar demografía';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [linkedChannel?.id, linkedChannel?.youtubeChannelId]);

  useEffect(() => {
    loadDemographics();
  }, [loadDemographics]);

  if (!linkedChannel) return null;

  if (isLoading) {
    return (
      <div className="cr-card cr-card-pad flex items-center justify-center gap-2 py-12">
        <Loader2 size={20} className="animate-spin text-violet-500" />
        <span className="text-sm text-slate-500">Cargando demografía de audiencia…</span>
      </div>
    );
  }

  if (!isConnected && !error) {
    return (
      <div className="cr-card cr-card-pad text-center">
        <div className="flex flex-col items-center gap-3 py-10">
          <Users size={24} className="text-violet-500" />
          <p className="text-sm font-semibold text-slate-800 dark:text-white">Conecta tu canal de YouTube Analytics</p>
          <p className="text-xs text-slate-500 dark:text-cr-muted max-w-xs">
            El panel de demografía aparece cuando la cuenta de YouTube conectada coincide con el canal seleccionado y la cuenta está autorizada.
          </p>
          <button
            onClick={loadDemographics}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 dark:border-cr-border-dark text-xs font-bold text-slate-700 dark:text-cr-muted hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
          >
            <RefreshCw size={14} />
            Volver a intentar
          </button>
        </div>
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

  const hasAnySection =
    data.age_groups.length > 0 ||
    data.genders.length > 0 ||
    data.countries.length > 0 ||
    data.devices.length > 0;

  if (!hasAnySection) {
    return (
      <div className="cr-card cr-card-pad text-center">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b border-slate-100 dark:border-cr-border-dark/50 pb-4">
          <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Users size={18} className="text-violet-500" />
            Demografía de audiencia
          </h2>
          <button
            onClick={loadDemographics}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-cr-border-dark text-xs font-semibold text-slate-600 dark:text-cr-muted hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors"
          >
            <RefreshCw size={14} />
            Actualizar
          </button>
        </div>
        <div className="py-8 text-center text-sm text-slate-500 dark:text-cr-muted">
          <p className="mb-2">No hay datos demográficos disponibles todavía.</p>
          <p className="text-xs max-w-lg mx-auto">
            YouTube solo muestra esta información cuando el canal tiene suficientes vistas y la cuenta
            conectada es la <strong>dueña</strong> del canal.
          </p>
        </div>
      </div>
    );
  }

  const femaleData = data.genders.find(g => g.key === 'female');
  const maleData = data.genders.find(g => g.key === 'male');

  return (
    <div className="flex flex-col gap-3">
      {/* Title Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Users size={18} className="text-violet-500" />
            Demografía de audiencia
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {data.start_date} → {data.end_date} · YouTube Analytics
            {data.total_views != null && data.total_views > 0 && (
              <span> · {data.total_views.toLocaleString('es-ES')} vistas</span>
            )}
          </p>
        </div>
        <button
          onClick={loadDemographics}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-cr-border-dark text-xs font-semibold text-slate-600 dark:text-cr-muted hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors"
        >
          <RefreshCw size={14} />
          Actualizar
        </button>
      </div>

      {data.message && (
        <div className="p-3 rounded-lg text-xs border bg-blue-50 dark:bg-blue-950/20 border-blue-200/60 dark:border-blue-800/40 text-blue-800 dark:text-blue-300">
          {data.message}
        </div>
      )}

      {/* Main Grid: Left Column (Age, Genders, Devices) & Right Column (Top Countries) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-stretch">
        
        {/* Left Side: Age card on top, Gender/Devices card below */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          
          {/* Card Edad */}
          <div className="cr-card cr-card-pad flex flex-col justify-between flex-1">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-slate-500 dark:text-cr-muted uppercase tracking-wider flex items-center gap-1.5">
                <BarChart3 size={14} className="text-violet-500" />
                Edad
              </h3>
              <span className="text-[10px] text-slate-400 dark:text-cr-muted-fg font-medium">Datos en %</span>
            </div>
            <div className="space-y-3">
              {data.age_groups.length > 0 ? (
                data.age_groups.map((item) => (
                  <ProgressBar
                    key={item.key}
                    label={item.label}
                    percentage={item.percentage}
                    color="#6366f1"
                  />
                ))
              ) : (
                <p className="text-xs text-slate-400">Sin datos suficientes.</p>
              )}
            </div>
          </div>

          {/* Row below Edad: Genders (left) & Devices (right) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-stretch">
            
            {/* Gender Column: Mujeres and Hombres stacked vertically */}
            <div className="flex flex-col gap-3 justify-between">
              {/* Card Mujeres */}
              <div className="cr-card p-5 flex-1 relative overflow-hidden flex flex-col justify-between group min-h-[120px]">
                <div>
                  <div className="flex items-center mb-2">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-cr-muted uppercase tracking-wider">MUJERES</span>
                  </div>
                  <span className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight leading-none block">
                    {femaleData ? `${femaleData.percentage}%` : '0%'}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-pink-100 dark:bg-pink-950/20 rounded-full overflow-hidden mt-3">
                  <div className="h-full bg-pink-500 rounded-full" style={{ width: femaleData ? `${femaleData.percentage}%` : '0%' }} />
                </div>
                {/* Large semi-transparent female symbol on the right (thicker stroke, nudged up) */}
                <svg className="w-20 h-20 text-pink-500/15 dark:text-pink-500/25 absolute right-4 top-3 pointer-events-none transition-transform group-hover:scale-105 duration-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="9" r="6" />
                  <path d="M12 15v7M9 19h6" />
                </svg>
              </div>

              {/* Card Hombres */}
              <div className="cr-card p-5 flex-1 relative overflow-hidden flex flex-col justify-between group min-h-[120px]">
                <div>
                  <div className="flex items-center mb-2">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-cr-muted uppercase tracking-wider">HOMBRES</span>
                  </div>
                  <span className="text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight leading-none block">
                    {maleData ? `${maleData.percentage}%` : '0%'}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-blue-100 dark:bg-blue-950/20 rounded-full overflow-hidden mt-3">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: maleData ? `${maleData.percentage}%` : '0%' }} />
                </div>
                {/* Large semi-transparent male symbol on the right (thicker stroke, nudged up) */}
                <svg className="w-20 h-20 text-blue-500/15 dark:text-blue-500/25 absolute right-4 top-3 pointer-events-none transition-transform group-hover:scale-105 duration-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="15" r="6" />
                  <path d="M14 10l6-6M20 4h-6M20 4v6" />
                </svg>
              </div>
            </div>

            {/* Devices Card */}
            <div className="cr-card cr-card-pad flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-slate-500 dark:text-cr-muted uppercase tracking-wider flex items-center gap-1.5">
                  <Monitor size={14} className="text-violet-500" />
                  Dispositivos
                </h3>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {data.devices.length > 0 ? (
                  data.devices.map((device) => {
                    const DeviceIcon = getDeviceIcon(device.type);
                    const color = DEVICE_COLORS[device.type.toUpperCase()] ?? '#3b82f6';
                    return (
                      <div
                        key={device.type}
                        className="cr-card p-3 flex flex-col items-center justify-between min-h-[105px] bg-white dark:bg-cr-card-dark border border-slate-150 dark:border-cr-border-dark/60"
                      >
                        <div className="text-slate-400 dark:text-cr-muted-fg mb-1">
                          <DeviceIcon size={18} />
                        </div>
                        <span className="text-[9px] font-bold text-slate-400 dark:text-cr-muted uppercase tracking-wider mb-0.5">
                          {device.label}
                        </span>
                        <span className="text-sm font-extrabold text-slate-800 dark:text-white mb-2">
                          {device.percentage}%
                        </span>
                        {/* Horizontal progress bar with bottom padding/margin from the card */}
                        <div className="w-full h-1.5 bg-slate-100 dark:bg-cr-border-dark/50 rounded-full overflow-hidden mb-1">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${device.percentage}%`, backgroundColor: color }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-2 text-center text-xs text-slate-400 py-6">
                    Sin datos de dispositivos.
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>

        {/* Right Side: Card Top Países (occupies full height of layout, shows 10 countries) */}
        <div className="lg:col-span-1 cr-card cr-card-pad flex flex-col justify-between relative">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-slate-500 dark:text-cr-muted uppercase tracking-wider flex items-center gap-1.5">
                <Globe size={14} className="text-violet-500" />
                Top Países
              </h3>
              <span className="text-[10px] text-slate-400 dark:text-cr-muted-fg font-medium">Por views</span>
            </div>
            
            <div className="space-y-3">
              {data.countries.length > 0 ? (
                (() => {
                  const top = data.countries.slice(0, 10);
                  const placeholders = Math.max(0, 10 - top.length);
                  return (
                    <>
                      {top.map((country) => (
                        <div key={country.code} className="flex items-center justify-between gap-4">
                          {/* Flag and details */}
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xl flex-shrink-0" role="img" aria-label={country.name}>
                              {getFlagEmoji(country.code)}
                            </span>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate leading-tight">
                                {country.name}
                              </p>
                              <p className="text-[9px] text-slate-400 dark:text-cr-muted-fg leading-none">
                                {country.views.toLocaleString('es-ES')} vistas
                              </p>
                            </div>
                          </div>
                          {/* Progress bar and text percentage */}
                          <div className="flex items-center gap-2 flex-1 justify-end max-w-[100px]">
                            <div className="h-1 bg-slate-100 dark:bg-cr-border-dark rounded-full overflow-hidden flex-1">
                              <div
                                className="h-full rounded-full bg-indigo-500"
                                style={{ width: `${country.percentage}%` }}
                              />
                            </div>
                            <span className="text-[11px] font-bold text-slate-700 dark:text-cr-muted w-8 text-right">
                              {country.percentage}%
                            </span>
                          </div>
                        </div>
                      ))}

                      {/* Placeholder rows to keep the card visually balanced */}
                      {Array.from({ length: placeholders }).map((_, i) => (
                        <div key={`placeholder-${i}`} className="flex items-center justify-between gap-4 opacity-40">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xl flex-shrink-0">🏳️</span>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-400 truncate leading-tight">—</p>
                              <p className="text-[9px] text-slate-300 leading-none">— vistas</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-1 justify-end max-w-[100px]">
                            <div className="h-1 bg-slate-100 dark:bg-cr-border-dark rounded-full overflow-hidden flex-1">
                              <div className="h-full rounded-full bg-indigo-200" style={{ width: `0%` }} />
                            </div>
                            <span className="text-[11px] font-bold text-slate-400 w-8 text-right">—</span>
                          </div>
                        </div>
                      ))}
                    </>
                  );
                })()
              ) : (
                <p className="text-xs text-slate-400">Sin datos de países en este período.</p>
              )}
            </div>
          </div>

          {data.countries.length > 10 && (
            <div className="text-center mt-4 pt-2 border-t border-slate-100 dark:border-cr-border-dark/50">
              <button className="text-[11px] font-bold text-cr-accent dark:text-indigo-400 hover:underline">
                Ver más países
              </button>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
