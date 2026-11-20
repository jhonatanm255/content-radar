import React, { useState } from 'react';
import {
  Sparkles,
  Clock,
  Scissors,
  Loader2,
  CheckCircle2,
  Sliders,
  RotateCcw,
  Download,
  Trash2
} from 'lucide-react';
import { ReframeModal } from './ReframeModal';

export interface ClipItem {
  id: string;
  title: string;
  hook_sentence: string;
  summary: string;
  start_time: number;
  end_time: number;
  virality_score: number;
  virality_reason: string;
  status: string;
  output_video_url?: string;
  crop_x_percent?: number;
}

interface ClipCardProps {
  clip: ClipItem;
  originalVideoUrl?: string;
  onRefresh: () => void;
}

export const ClipCard: React.FC<ClipCardProps> = ({ clip, originalVideoUrl, onRefresh }) => {
  const [exporting, setExporting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isReframeOpen, setIsReframeOpen] = useState(false);

  const apiUrl = import.meta.env.VITE_CLIP_API_URL || 'http://localhost:8001';

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const duration = Math.round(clip.end_time - clip.start_time);

  // Recortar y guardar video modificado en Cloudflare R2
  const handleExportWithFraming = async (
    clipId: string,
    cropXPercent: number = 50,
    startTime?: number,
    endTime?: number
  ) => {
    setExporting(true);
    try {
      const res = await fetch(`${apiUrl}/api/v1/clips/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clip_id: clipId,
          aspect_ratio: '9:16',
          crop_x_percent: cropXPercent,
          start_time: startTime,
          end_time: endTime,
        }),
      });
      if (res.ok) {
        setIsReframeOpen(false);
        onRefresh();
      } else {
        throw new Error('Error en la petición de recorte');
      }
    } catch (e) {
      console.error(e);
      alert('Error al ordenar el guardado y recorte del clip.');
    } finally {
      setExporting(false);
    }
  };

  // Guardar solo borrador de tiempos en base de datos
  const handleSaveTimes = async (clipId: string, startTime: number, endTime: number) => {
    try {
      const res = await fetch(`${apiUrl}/api/v1/clips/${clipId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_time: startTime,
          end_time: endTime,
        }),
      });
      if (res.ok) {
        onRefresh();
      } else {
        throw new Error('Error al guardar los nuevos tiempos del clip');
      }
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  // Descarga forzada directa al equipo/disco del usuario (sin abrir en nueva pestaña)
  const handleDownloadClip = async () => {
    setDownloading(true);
    const downloadUrl = `${apiUrl}/api/v1/clips/${clip.id}/download`;
    try {
      const response = await fetch(downloadUrl);
      if (!response.ok) throw new Error('Error al descargar el archivo desde el servidor');
      
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;

      const cleanTitle = clip.title.replace(/[^a-zA-Z0-9_\-]/g, '_').substring(0, 50) || `clip_${clip.id.substring(0, 8)}`;
      link.download = `${cleanTitle}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (e) {
      console.warn('Fallback a descarga directa por navegación:', e);
      window.location.href = downloadUrl;
    } finally {
      setDownloading(false);
    }
  };

  // Eliminar clip individual tanto de la base de datos como de Cloudflare R2
  const handleDeleteClip = async () => {
    const confirmDelete = window.confirm(
      `¿Deseas eliminar este clip?\n\n"${clip.title}"\n\nEsta acción borrará el clip de la lista y liberará almacenamiento en Cloudflare R2.`
    );
    if (!confirmDelete) return;

    setDeleting(true);
    try {
      const res = await fetch(`${apiUrl}/api/v1/clips/${clip.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        onRefresh();
      } else {
        alert('Error al eliminar el clip del servidor');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión al eliminar el clip');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 hover:border-slate-700/80 transition-all flex flex-col justify-between backdrop-blur-md relative overflow-hidden group">
        <div>
          {/* Header con Virality Score, Timing & Botón Eliminar */}
          <div className="flex items-center justify-between mb-3.5">
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              Score: {clip.virality_score}/100
            </span>
            
            <div className="flex items-center gap-1.5">
              <span className="flex items-center gap-1 text-slate-400 text-xs font-mono bg-slate-950/60 px-2 py-0.5 rounded-lg border border-slate-800/60">
                <Clock className="w-3 h-3 text-slate-500" />
                {formatSeconds(clip.start_time)} - {formatSeconds(clip.end_time)} ({duration}s)
              </span>

              {/* Botón de Eliminación Individual para liberar almacenamiento R2 */}
              <button
                type="button"
                onClick={handleDeleteClip}
                disabled={deleting}
                title="Eliminar este clip y liberar espacio en Cloudflare R2"
                className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
              >
                {deleting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          <h4 className="text-white font-semibold text-sm line-clamp-2 leading-snug group-hover:text-cyan-300 transition-colors">
            {clip.title}
          </h4>
          
          {clip.hook_sentence && (
            <div className="mt-3 text-xs text-cyan-200/90 bg-cyan-950/20 p-2.5 rounded-xl border border-cyan-800/30 italic">
              "{clip.hook_sentence}"
            </div>
          )}

          <p className="mt-2.5 text-xs text-slate-400 line-clamp-2 leading-relaxed">
            {clip.virality_reason || clip.summary}
          </p>
        </div>

        {/* Acciones de Previsualización, Encuadre y Recorte */}
        <div className="mt-5 pt-3.5 border-t border-slate-800/80 flex flex-col gap-2">
          {clip.status === 'failed' && (
            <div className="flex items-center gap-1.5 text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-lg">
              <span>El guardado falló. Puedes abrir el encuadre y reintentar.</span>
            </div>
          )}

          {/* Botón Principal de Edición, Encuadre & Timeline */}
          <button
            type="button"
            onClick={() => setIsReframeOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500/15 via-blue-500/15 to-indigo-500/15 hover:from-cyan-500/25 hover:via-blue-500/25 hover:to-indigo-500/25 border border-cyan-500/30 text-cyan-300 font-semibold text-xs transition-all hover:scale-[1.01] shadow-sm"
          >
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span>Ajustar Tiempos (Timeline) & Encuadre 9:16</span>
          </button>

          {/* Estado de Exportación / Descarga */}
          {clip.output_video_url ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                <span className="flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-3 h-3" />
                  Guardado en Cloudflare R2
                </span>
                <span className="text-emerald-400/70 text-[10px]">Listo para descargar</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadClip}
                  disabled={downloading}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-emerald-500/20 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                >
                  {downloading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Descargando a tu equipo...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>Descargar Clip (.mp4)</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setIsReframeOpen(true)}
                  title="Ajustar encuadre o tiempos y guardar nueva versión"
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700/60"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => handleExportWithFraming(clip.id, 50, clip.start_time, clip.end_time)}
              disabled={exporting || clip.status === 'rendering'}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-xs transition-colors border disabled:opacity-50 ${
                clip.status === 'failed'
                  ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/30'
                  : 'bg-slate-800 hover:bg-slate-700/80 text-white border-slate-700/80'
              }`}
            >
              {exporting || clip.status === 'rendering' ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                  <span>Guardando y procesando en R2...</span>
                </>
              ) : clip.status === 'failed' ? (
                <>
                  <Scissors className="w-3.5 h-3.5 text-rose-400" />
                  <span>Reintentar Guardar en R2</span>
                </>
              ) : (
                <>
                  <Scissors className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Guardar y Recortar Rápido (IA)</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Modal de Previsualización, Timeline y Encuadre Interactivo Estilo NexusClips */}
      <ReframeModal
        isOpen={isReframeOpen}
        onClose={() => setIsReframeOpen(false)}
        clip={clip}
        originalVideoUrl={originalVideoUrl}
        onExport={handleExportWithFraming}
        onSaveTimes={handleSaveTimes}
        isExporting={exporting}
      />
    </>
  );
};
