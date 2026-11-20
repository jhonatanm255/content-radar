import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  RotateCcw,
  Scissors,
  Sliders,
  Smartphone,
  User,
  Users,
  Clock,
  Sparkles,
  Save,
  Check,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { ClipItem } from './ClipCard';

interface ReframeModalProps {
  isOpen: boolean;
  onClose: () => void;
  clip: ClipItem;
  originalVideoUrl?: string;
  onExport: (clipId: string, cropXPercent: number, startTime?: number, endTime?: number) => Promise<void>;
  onSaveTimes?: (clipId: string, startTime: number, endTime: number) => Promise<void>;
  isExporting?: boolean;
}

export const ReframeModal: React.FC<ReframeModalProps> = ({
  isOpen,
  onClose,
  clip,
  originalVideoUrl,
  onExport,
  onSaveTimes,
  isExporting = false,
}) => {
  // Estado de encuadre horizontal 9:16
  const [cropXPercent, setCropXPercent] = useState<number>(clip.crop_x_percent ?? 50);
  
  // Estado de reproducción y vista
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(clip.start_time);
  const [viewMode, setViewMode] = useState<'split' | 'guide' | 'mobile'>('split');
  const [isDraggingGuide, setIsDraggingGuide] = useState<boolean>(false);

  // Estado de línea de tiempo y recorte (Timeline Trimmer)
  const [startTime, setStartTime] = useState<number>(clip.start_time);
  const [endTime, setEndTime] = useState<number>(clip.end_time);
  const [totalDuration, setTotalDuration] = useState<number>(0);
  const [timelineZoom, setTimelineZoom] = useState<'clip' | 'full'>('clip');
  const [isLooping, setIsLooping] = useState<boolean>(true);
  const [draggingHandle, setDraggingHandle] = useState<'start' | 'end' | null>(null);
  const [isSavingTimes, setIsSavingTimes] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mobileVideoRef = useRef<HTMLVideoElement>(null);
  const guideContainerRef = useRef<HTMLDivElement>(null);
  const timelineTrackRef = useRef<HTMLDivElement>(null);

  // Sincronizar estado al abrir el modal con el clip seleccionado
  useEffect(() => {
    if (isOpen) {
      setStartTime(clip.start_time);
      setEndTime(clip.end_time);
      setCropXPercent(clip.crop_x_percent ?? 50);
      setCurrentTime(clip.start_time);
      setIsLooping(true);
      setSavedSuccess(false);

      if (videoRef.current) {
        videoRef.current.currentTime = clip.start_time;
        videoRef.current.play().catch(() => setIsPlaying(false));
        setIsPlaying(true);
      }
    }
  }, [isOpen, clip.id, clip.start_time, clip.end_time, clip.crop_x_percent]);

  // Manejo de metadatos del video para obtener la duración total real
  const handleLoadedMetadata = () => {
    if (videoRef.current && videoRef.current.duration) {
      setTotalDuration(videoRef.current.duration);
    }
  };

  // Mantener reproducción y sincronicidad
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const t = videoRef.current.currentTime;
    setCurrentTime(t);

    // Si el bucle está activo, respetar el fragmento [startTime, endTime]
    if (isLooping) {
      if (t >= endTime || t < startTime) {
        videoRef.current.currentTime = startTime;
        if (isPlaying) videoRef.current.play().catch(() => {});
      }
    }

    // Sincronizar video móvil si existe
    if (mobileVideoRef.current && Math.abs(mobileVideoRef.current.currentTime - t) > 0.3) {
      mobileVideoRef.current.currentTime = t;
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      if (mobileVideoRef.current) mobileVideoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      if (mobileVideoRef.current) mobileVideoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const next = !isMuted;
    videoRef.current.muted = next;
    if (mobileVideoRef.current) mobileVideoRef.current.muted = true;
    setIsMuted(next);
  };

  const restartLoop = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = startTime;
    videoRef.current.play().catch(() => {});
    setIsPlaying(true);
  };

  // Arrastre del marco de encuadre horizontal
  const handleGuideDrag = (e: React.MouseEvent | React.TouchEvent) => {
    if (!guideContainerRef.current) return;
    const rect = guideContainerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const xPos = clientX - rect.left;
    const percent = Math.max(0, Math.min(100, (xPos / rect.width) * 100));
    setCropXPercent(Math.round(percent));
  };

  // Formateador de tiempo
  const formatSeconds = (sec: number, includeTenths = false) => {
    if (isNaN(sec) || sec < 0) sec = 0;
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    const wholeSecs = Math.floor(secs);
    const tenths = Math.floor((secs - wholeSecs) * 10);
    const minsStr = mins < 10 ? `0${mins}` : `${mins}`;
    const secsStr = wholeSecs < 10 ? `0${wholeSecs}` : `${wholeSecs}`;
    if (includeTenths) {
      return `${minsStr}:${secsStr}.${tenths}`;
    }
    return `${minsStr}:${secsStr}`;
  };

  // Ventana visual de la línea de tiempo (Zoom clip vs Video completo)
  const effectiveTotal = Math.max(totalDuration, endTime + 10, 60);
  const viewMin = timelineZoom === 'clip' ? Math.max(0, startTime - 30) : 0;
  const viewMax = timelineZoom === 'clip' ? Math.min(effectiveTotal, endTime + 30) : effectiveTotal;
  const viewSpan = Math.max(viewMax - viewMin, 5);

  const getPercentFromTime = (time: number) => {
    return Math.max(0, Math.min(100, ((time - viewMin) / viewSpan) * 100));
  };

  const getTimeFromPercent = useCallback((percent: number) => {
    return viewMin + (percent / 100) * viewSpan;
  }, [viewMin, viewSpan]);

  // Manejador de arrastre para handles de la línea de tiempo
  useEffect(() => {
    if (!draggingHandle) return;

    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      if (!timelineTrackRef.current) return;
      const rect = timelineTrackRef.current.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const xPos = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const percent = (xPos / rect.width) * 100;
      const newTime = Math.round(getTimeFromPercent(percent) * 10) / 10;

      if (draggingHandle === 'start') {
        const clamped = Math.max(0, Math.min(endTime - 1, newTime));
        setStartTime(clamped);
        if (videoRef.current) videoRef.current.currentTime = clamped;
      } else if (draggingHandle === 'end') {
        const clamped = Math.max(startTime + 1, Math.min(effectiveTotal, newTime));
        setEndTime(clamped);
        if (videoRef.current) videoRef.current.currentTime = clamped;
      }
    };

    const handleMouseUp = () => {
      setDraggingHandle(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleMouseMove);
    window.addEventListener('touchend', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [draggingHandle, endTime, startTime, effectiveTotal, getTimeFromPercent]);

  // Clic en la barra para mover el playhead
  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (draggingHandle || !timelineTrackRef.current) return;
    const rect = timelineTrackRef.current.getBoundingClientRect();
    const xPos = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const percent = (xPos / rect.width) * 100;
    const targetTime = Math.round(getTimeFromPercent(percent) * 10) / 10;
    if (videoRef.current) {
      videoRef.current.currentTime = targetTime;
    }
    setCurrentTime(targetTime);
  };

  // Ajustes finos de Inicio y Fin
  const nudgeStart = (delta: number) => {
    const next = Math.max(0, Math.min(endTime - 1, Math.round((startTime + delta) * 10) / 10));
    setStartTime(next);
    if (videoRef.current) videoRef.current.currentTime = next;
  };

  const nudgeEnd = (delta: number) => {
    const next = Math.max(startTime + 1, Math.min(effectiveTotal, Math.round((endTime + delta) * 10) / 10));
    setEndTime(next);
    if (videoRef.current) videoRef.current.currentTime = next;
  };

  const setStartToCurrent = () => {
    const t = Math.round(currentTime * 10) / 10;
    if (t < endTime) {
      setStartTime(t);
    }
  };

  const setEndToCurrent = () => {
    const t = Math.round(currentTime * 10) / 10;
    if (t > startTime) {
      setEndTime(t);
    }
  };

  const previewStart = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = startTime;
    videoRef.current.play().catch(() => {});
    setIsPlaying(true);
  };

  const previewEnd = () => {
    if (!videoRef.current) return;
    const checkPoint = Math.max(startTime, endTime - 3.5);
    videoRef.current.currentTime = checkPoint;
    videoRef.current.play().catch(() => {});
    setIsPlaying(true);
  };

  const resetToAISuggestion = () => {
    setStartTime(clip.start_time);
    setEndTime(clip.end_time);
    if (videoRef.current) videoRef.current.currentTime = clip.start_time;
  };

  const handleSaveTimesOnly = async () => {
    if (!onSaveTimes) return;
    setIsSavingTimes(true);
    try {
      await onSaveTimes(clip.id, startTime, endTime);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (e) {
      console.error(e);
      alert('Error guardando los tiempos');
    } finally {
      setIsSavingTimes(false);
    }
  };

  const currentDuration = Math.max(0, endTime - startTime);
  const originalDuration = Math.max(0, clip.end_time - clip.start_time);
  const durationDiff = Math.round((currentDuration - originalDuration) * 10) / 10;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl max-h-[96vh] bg-[#0B0F19] border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* ==================================================================== */}
        {/* Cabecera del Editor */}
        {/* ==================================================================== */}
        <div className="px-5 sm:px-6 py-3.5 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/60 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/10">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Editor de Clip: Encuadre 9:16 & Timeline
                </h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                  Estilo NexusClips
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate max-w-sm sm:max-w-md">
                {clip.title}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Selector de Modos de Vista */}
            <div className="hidden sm:flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setViewMode('split')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  viewMode === 'split'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Vista Dual
              </button>
              <button
                type="button"
                onClick={() => setViewMode('guide')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  viewMode === 'guide'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                16:9 Guía
              </button>
              <button
                type="button"
                onClick={() => setViewMode('mobile')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  viewMode === 'mobile'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Móvil 9:16
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* Cuerpo del Editor (Scrollable) */}
        {/* ==================================================================== */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          
          {/* Zona Superior: Reproductores y Encuadre */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
            
            {/* Lado A: Vista Panorámica 16:9 con Guía de Recorte Deslizable */}
            {(viewMode === 'split' || viewMode === 'guide') && (
              <div className={`${viewMode === 'split' ? 'lg:col-span-8' : 'lg:col-span-12'} flex flex-col items-center`}>
                <div className="w-full relative rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-xl aspect-video flex items-center justify-center">
                  
                  {/* Video Original en Reproducción */}
                  {originalVideoUrl ? (
                    <video
                      ref={videoRef}
                      src={originalVideoUrl}
                      onLoadedMetadata={handleLoadedMetadata}
                      onTimeUpdate={handleTimeUpdate}
                      muted={isMuted}
                      playsInline
                      className="w-full h-full object-contain pointer-events-none"
                    />
                  ) : (
                    <div className="text-center p-8 text-slate-500 text-xs">
                      Video original no disponible para previsualización directa.
                    </div>
                  )}

                  {/* Capa de Encuadre Interactivo 9:16 (Overlay NexusClips) */}
                  <div
                    ref={guideContainerRef}
                    onMouseDown={(e) => { setIsDraggingGuide(true); handleGuideDrag(e); }}
                    onMouseMove={(e) => { if (isDraggingGuide) handleGuideDrag(e); }}
                    onMouseUp={() => setIsDraggingGuide(false)}
                    onTouchMove={handleGuideDrag}
                    className="absolute inset-0 cursor-ew-resize select-none overflow-hidden"
                  >
                    {/* Marco 9:16 Vertical Iluminado */}
                    <div
                      style={{
                        width: '31.64%',
                        left: `${(cropXPercent / 100) * (100 - 31.64)}%`,
                      }}
                      className="absolute top-0 bottom-0 border-2 border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.4)] transition-all duration-75 pointer-events-none flex flex-col justify-between"
                    >
                      {/* Grid de Regla de Tercios */}
                      <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-20">
                        <div className="border-r border-cyan-300 border-dashed" />
                        <div className="border-r border-cyan-300 border-dashed" />
                        <div />
                        <div className="border-t border-cyan-300 border-dashed col-span-3" />
                        <div className="border-t border-cyan-300 border-dashed col-span-3" />
                      </div>

                      {/* Header de la caja */}
                      <div className="bg-cyan-500/95 text-slate-950 font-extrabold text-[10px] uppercase tracking-wider px-2 py-0.5 self-center rounded-b-md shadow-sm">
                        Encuadre 9:16 ({cropXPercent}%)
                      </div>

                      {/* Agarrador inferior */}
                      <div className="bg-cyan-500/95 text-slate-950 font-bold text-[9px] px-2 py-0.5 self-center rounded-t-md flex items-center gap-1 shadow-sm">
                        <span>Arrastra la toma</span>
                      </div>
                    </div>

                    {/* Sombra oscura Izquierda */}
                    <div
                      style={{
                        width: `${(cropXPercent / 100) * (100 - 31.64)}%`,
                      }}
                      className="absolute top-0 bottom-0 left-0 bg-black/60 backdrop-blur-[1px] pointer-events-none transition-all duration-75"
                    />

                    {/* Sombra oscura Derecha */}
                    <div
                      style={{
                        left: `${((cropXPercent / 100) * (100 - 31.64)) + 31.64}%`,
                        right: 0,
                      }}
                      className="absolute top-0 bottom-0 bg-black/60 backdrop-blur-[1px] pointer-events-none transition-all duration-75"
                    />
                  </div>

                  {/* Controles Flotantes sobre el video */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-auto bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={togglePlay}
                        className="p-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-colors shadow-sm"
                      >
                        {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={restartLoop}
                        title="Reiniciar bucle desde el inicio"
                        className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={toggleMute}
                        className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                      >
                        {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {/* Tiempo en Vivo y Bucle */}
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setIsLooping(!isLooping)}
                        className={`text-[10px] px-2 py-0.5 rounded-md font-medium border transition-colors ${
                          isLooping
                            ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                        }`}
                        title={isLooping ? 'Repitiendo fragmento en bucle' : 'Reproducción libre para escuchar antes y después'}
                      >
                        {isLooping ? '🔁 Bucle Activo' : '▶️ Reproducción Libre'}
                      </button>

                      <div className="flex items-center gap-1.5 text-xs font-mono text-slate-300">
                        <span className="text-cyan-400 font-bold">{formatSeconds(currentTime, true)}</span>
                        <span className="text-slate-600">/</span>
                        <span className="text-slate-400">{formatSeconds(effectiveTotal)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 mt-2 text-center">
                  💡 Haz clic y arrastra sobre el video para mover el encuadre vertical hacia el rostro o punto de interés.
                </p>
              </div>
            )}

            {/* Lado B: Simulador Vertical 9:16 en Vivo (Teléfono Móvil) */}
            {(viewMode === 'split' || viewMode === 'mobile') && (
              <div className={`${viewMode === 'split' ? 'lg:col-span-4' : 'lg:col-span-12'} flex flex-col items-center justify-center`}>
                <div className="relative w-48 sm:w-52 aspect-[9/16] rounded-3xl overflow-hidden bg-black border-4 border-slate-800 shadow-2xl ring-1 ring-cyan-500/20 flex items-center justify-center group">
                  
                  {/* Speaker Video Recortado en Tiempo Real mediante object-position */}
                  {originalVideoUrl ? (
                    <video
                      ref={mobileVideoRef}
                      src={originalVideoUrl}
                      muted
                      playsInline
                      style={{
                        objectPosition: `${cropXPercent}% center`,
                      }}
                      className="w-full h-full object-cover transition-[object-position] duration-75"
                    />
                  ) : (
                    <div className="text-slate-600 text-xs">Sin video</div>
                  )}

                  {/* Overlay Mockup Teléfono (TikTok/Reels UI) */}
                  <div className="absolute inset-0 pointer-events-none p-3 flex flex-col justify-between">
                    <div className="flex justify-between items-center text-[9px] font-bold text-white/70">
                      <span>9:16 PREVIEW</span>
                      <span className="bg-red-500 w-1.5 h-1.5 rounded-full animate-ping" />
                    </div>

                    <div className="space-y-1">
                      <div className="bg-slate-950/80 backdrop-blur-sm p-1.5 rounded-lg border border-white/10">
                        <p className="text-[9px] text-white font-bold line-clamp-1">
                          {clip.title}
                        </p>
                        {clip.hook_sentence && (
                          <p className="text-[8px] text-cyan-300 italic line-clamp-1">
                            "{clip.hook_sentence}"
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <span className="text-[11px] font-medium text-cyan-400 mt-2 flex items-center gap-1">
                  <Smartphone className="w-3 h-3" />
                  Previsualización Final para TikTok / Shorts
                </span>
              </div>
            )}
          </div>

          {/* ==================================================================== */}
          {/* SECCIÓN 1: TIMELINE & EDITOR DE DURACIÓN (AJUSTE DE INICIO Y FINAL) */}
          {/* ==================================================================== */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-lg">
            
            {/* Header del Trimmer */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                <h4 className="text-xs sm:text-sm font-bold text-white tracking-tight">
                  Línea de Tiempo & Recorte de Duración
                </h4>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-mono">
                  {currentDuration.toFixed(1)}s de video
                </span>
              </div>

              {/* Controles de Vista de la Timeline */}
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-slate-950/80 p-0.5 rounded-lg border border-slate-800 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setTimelineZoom('clip')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
                      timelineZoom === 'clip'
                        ? 'bg-cyan-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Muestra una ventana detallada alrededor del clip para ajuste al milímetro"
                  >
                    <ZoomIn className="w-3 h-3" />
                    <span>Zoom Clip (±30s)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimelineZoom('full')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
                      timelineZoom === 'full'
                        ? 'bg-cyan-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Muestra todo el video original de principio a fin"
                  >
                    <ZoomOut className="w-3 h-3" />
                    <span>Video Completo</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={resetToAISuggestion}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-colors"
                  title="Volver a los tiempos originales sugeridos por la IA"
                >
                  Restablecer a IA
                </button>
              </div>
            </div>

            {/* Pista Visual Interactiva de la Timeline */}
            <div className="space-y-1.5">
              <div
                ref={timelineTrackRef}
                onClick={handleTrackClick}
                className="relative h-12 w-full bg-slate-950 rounded-xl border border-slate-800 overflow-hidden cursor-pointer select-none group"
              >
                {/* Marcas de tiempo de fondo (Grid sutil) */}
                <div className="absolute inset-0 flex justify-between px-3 pointer-events-none opacity-20 text-[9px] font-mono text-slate-400 items-center">
                  <span>|</span>
                  <span>|</span>
                  <span>|</span>
                  <span>|</span>
                  <span>|</span>
                  <span>|</span>
                </div>

                {/* Zona Seleccionada del Clip [startTime, endTime] */}
                <div
                  style={{
                    left: `${getPercentFromTime(startTime)}%`,
                    width: `${Math.max(0.5, getPercentFromTime(endTime) - getPercentFromTime(startTime))}%`,
                  }}
                  className="absolute top-0 bottom-0 bg-gradient-to-r from-cyan-500/25 via-blue-500/20 to-indigo-500/25 border-y-2 border-cyan-400/80 backdrop-blur-[1px] pointer-events-none transition-all duration-75"
                >
                  <div className="w-full h-full flex items-center justify-center opacity-70">
                    <span className="text-[10px] font-bold text-cyan-300 font-mono tracking-wider drop-shadow">
                      {currentDuration.toFixed(1)}s
                    </span>
                  </div>
                </div>

                {/* Handle Izquierdo (IN - Inicio) */}
                <div
                  style={{
                    left: `${getPercentFromTime(startTime)}%`,
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setDraggingHandle('start');
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    setDraggingHandle('start');
                  }}
                  className="absolute top-0 bottom-0 w-4 -ml-2 bg-gradient-to-b from-cyan-400 to-cyan-600 rounded-l cursor-ew-resize flex items-center justify-center shadow-lg hover:brightness-125 z-20 group/handle transition-transform hover:scale-105 active:scale-95"
                  title="Arrastra para ajustar el inicio"
                >
                  <div className="w-0.5 h-5 bg-slate-950 rounded-full" />
                  
                  {/* Tooltip de tiempo IN */}
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-cyan-950 border border-cyan-500/50 text-cyan-300 text-[9px] font-mono px-1.5 py-0.5 rounded shadow pointer-events-none whitespace-nowrap">
                    IN: {formatSeconds(startTime, true)}
                  </div>
                </div>

                {/* Handle Derecho (OUT - Final) */}
                <div
                  style={{
                    left: `${getPercentFromTime(endTime)}%`,
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setDraggingHandle('end');
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    setDraggingHandle('end');
                  }}
                  className="absolute top-0 bottom-0 w-4 -mr-2 -translate-x-full bg-gradient-to-b from-indigo-400 to-indigo-600 rounded-r cursor-ew-resize flex items-center justify-center shadow-lg hover:brightness-125 z-20 group/handle transition-transform hover:scale-105 active:scale-95"
                  title="Arrastra para ajustar el final"
                >
                  <div className="w-0.5 h-5 bg-slate-950 rounded-full" />

                  {/* Tooltip de tiempo OUT */}
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-indigo-950 border border-indigo-500/50 text-indigo-300 text-[9px] font-mono px-1.5 py-0.5 rounded shadow pointer-events-none whitespace-nowrap">
                    OUT: {formatSeconds(endTime, true)}
                  </div>
                </div>

                {/* Playhead (Cabeza de reproducción actual) */}
                <div
                  style={{
                    left: `${getPercentFromTime(currentTime)}%`,
                  }}
                  className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-30 pointer-events-none shadow-[0_0_8px_rgba(244,63,94,0.8)]"
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500 -ml-1 -mt-0.5 shadow-sm" />
                </div>
              </div>

              {/* Rótulos de Tiempo Extremos de la Línea */}
              <div className="flex justify-between text-[10px] font-mono text-slate-500 px-1">
                <span>{formatSeconds(viewMin)}</span>
                <span className="text-cyan-400 font-semibold">
                  Cabezal actual: {formatSeconds(currentTime, true)}
                </span>
                <span>{formatSeconds(viewMax)}</span>
              </div>
            </div>

            {/* Paneles de Control de Precisión: Inicio vs Final */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              
              {/* Bloque IN (Inicio) */}
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    <span className="text-xs font-semibold text-white">Punto de Inicio (IN)</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono text-xs font-bold border border-cyan-500/30">
                    {formatSeconds(startTime, true)}
                  </span>
                </div>

                {/* Botón Principal para Fijar Inicio */}
                <button
                  type="button"
                  onClick={setStartToCurrent}
                  className="w-full py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
                >
                  <span>🎯 Fijar Inicio Aquí ({formatSeconds(currentTime, true)})</span>
                </button>

                {/* Botones de Micro-Ajuste de Inicio */}
                <div className="flex items-center justify-between gap-1 pt-1">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => nudgeStart(-5)}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-mono transition-colors"
                      title="Restar 5 segundos al inicio"
                    >
                      -5s
                    </button>
                    <button
                      type="button"
                      onClick={() => nudgeStart(-1)}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-mono transition-colors"
                      title="Restar 1 segundo al inicio"
                    >
                      -1s
                    </button>
                    <button
                      type="button"
                      onClick={() => nudgeStart(-0.5)}
                      className="px-1.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-mono transition-colors"
                      title="Restar 0.5 segundos al inicio"
                    >
                      -0.5s
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={previewStart}
                    className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1"
                  >
                    <Play className="w-2.5 h-2.5" /> Escuchar
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => nudgeStart(0.5)}
                      className="px-1.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-mono transition-colors"
                      title="Sumar 0.5 segundos al inicio"
                    >
                      +0.5s
                    </button>
                    <button
                      type="button"
                      onClick={() => nudgeStart(1)}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-mono transition-colors"
                      title="Sumar 1 segundo al inicio"
                    >
                      +1s
                    </button>
                    <button
                      type="button"
                      onClick={() => nudgeStart(5)}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-mono transition-colors"
                      title="Sumar 5 segundos al inicio"
                    >
                      +5s
                    </button>
                  </div>
                </div>
              </div>

              {/* Bloque OUT (Final) */}
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                    <span className="text-xs font-semibold text-white">Punto de Final (OUT)</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono text-xs font-bold border border-indigo-500/30">
                    {formatSeconds(endTime, true)}
                  </span>
                </div>

                {/* Botón Principal para Fijar Final */}
                <button
                  type="button"
                  onClick={setEndToCurrent}
                  className="w-full py-1.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
                >
                  <span>🎯 Fijar Final Aquí ({formatSeconds(currentTime, true)})</span>
                </button>

                {/* Botones de Micro-Ajuste de Final */}
                <div className="flex items-center justify-between gap-1 pt-1">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => nudgeEnd(-5)}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-mono transition-colors"
                      title="Restar 5 segundos al final"
                    >
                      -5s
                    </button>
                    <button
                      type="button"
                      onClick={() => nudgeEnd(-1)}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-mono transition-colors"
                      title="Restar 1 segundo al final"
                    >
                      -1s
                    </button>
                    <button
                      type="button"
                      onClick={() => nudgeEnd(-0.5)}
                      className="px-1.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-mono transition-colors"
                      title="Restar 0.5 segundos al final"
                    >
                      -0.5s
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={previewEnd}
                    className="text-[10px] text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    <Play className="w-2.5 h-2.5" /> Escuchar
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => nudgeEnd(0.5)}
                      className="px-1.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-mono transition-colors"
                      title="Sumar 0.5 segundos al final (alargar clip)"
                    >
                      +0.5s
                    </button>
                    <button
                      type="button"
                      onClick={() => nudgeEnd(1)}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-mono transition-colors"
                      title="Sumar 1 segundo al final (alargar clip)"
                    >
                      +1s
                    </button>
                    <button
                      type="button"
                      onClick={() => nudgeEnd(5)}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-mono transition-colors"
                      title="Sumar 5 segundos al final (alargar clip)"
                    >
                      +5s
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Resumen del Corte y Feedback de Duración */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/60 text-xs">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-slate-300">
                  Duración final: <strong className="text-white font-mono">{currentDuration.toFixed(1)}s</strong>
                </span>
                {durationDiff !== 0 && (
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    durationDiff > 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                  }`}>
                    {durationDiff > 0 ? `+${durationDiff}s más largo` : `${durationDiff}s más corto`}
                  </span>
                )}
              </div>

              {/* Sugerencia Viral de Duración */}
              <div className="text-[11px]">
                {currentDuration <= 60 ? (
                  <span className="text-emerald-400 font-medium">⚡ Duración óptima para Reels, TikTok y Shorts (&lt; 60s)</span>
                ) : currentDuration <= 90 ? (
                  <span className="text-cyan-400 font-medium">👍 Buen rango para Reels y TikTok extendido (&lt; 90s)</span>
                ) : (
                  <span className="text-amber-400 font-medium">⚠️ Clip largo (&gt; 90s). Recomendado para contenido profundo.</span>
                )}
              </div>
            </div>

          </div>

          {/* ==================================================================== */}
          {/* SECCIÓN 2: ENCUADRE HORIZONTAL (PRESETS Y SLIDER) */}
          {/* ==================================================================== */}
          <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                Posición Horizontal del Encuadre Vertical:
              </span>

              {/* Botones de Presets Rápidos */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCropXPercent(15)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                    cropXPercent <= 30
                      ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-sm shadow-cyan-500/10'
                      : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white'
                  }`}
                >
                  <User className="w-3 h-3" />
                  <span>Izquierda (15%)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCropXPercent(50)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                    cropXPercent > 30 && cropXPercent < 70
                      ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-sm shadow-cyan-500/10'
                      : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white'
                  }`}
                >
                  <Users className="w-3 h-3" />
                  <span>Centro (50%)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCropXPercent(85)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                    cropXPercent >= 70
                      ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-sm shadow-cyan-500/10'
                      : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white'
                  }`}
                >
                  <User className="w-3 h-3" />
                  <span>Derecha (85%)</span>
                </button>
              </div>
            </div>

            {/* Slider de Precisión */}
            <div className="flex items-center gap-4 pt-1">
              <span className="text-[11px] font-mono text-slate-400">0% (Izq)</span>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={cropXPercent}
                onChange={(e) => setCropXPercent(Number(e.target.value))}
                className="flex-1 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none"
              />
              <span className="text-[11px] font-mono text-slate-400">100% (Der)</span>
              <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 font-mono text-xs font-bold border border-cyan-500/30">
                {cropXPercent}%
              </span>
            </div>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* Footer con Acciones */}
        {/* ==================================================================== */}
        <div className="px-5 sm:px-6 py-4 border-t border-slate-800/80 bg-slate-900/60 backdrop-blur-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span>
              Fragmento: <strong className="text-white font-mono">{formatSeconds(startTime, true)}</strong> a <strong className="text-white font-mono">{formatSeconds(endTime, true)}</strong>
            </span>
            <span className="text-slate-600">|</span>
            <span>
              Duración: <strong className="text-cyan-300 font-mono">{currentDuration.toFixed(1)}s</strong>
            </span>
            <span className="text-slate-600">|</span>
            <span>Encuadre: <strong className="text-slate-200 font-mono">{cropXPercent}%</strong></span>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Botón opcional: Guardar borrador de tiempos sin renderizar */}
            {onSaveTimes && (
              <button
                type="button"
                onClick={handleSaveTimesOnly}
                disabled={isSavingTimes || isExporting}
                title="Guarda los tiempos de inicio y fin en la base de datos sin renderizar el video aún"
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700/80 transition-colors disabled:opacity-50"
              >
                {savedSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300">¡Borrador guardado!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSavingTimes ? 'Guardando...' : 'Guardar Borrador'}</span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              disabled={isExporting}
              className="px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              Cancelar
            </button>

            {/* Botón Principal: Guardar Cambios y Generar Clip en R2 */}
            <button
              type="button"
              disabled={isExporting}
              onClick={() => onExport(clip.id, cropXPercent, startTime, endTime)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:via-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              <Scissors className="w-4 h-4" />
              <span>{isExporting ? 'Guardando y procesando en R2...' : 'Guardar Cambios y Generar Clip en R2'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
