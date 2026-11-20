import React, { useState } from 'react';
import {
  Radio,
  Scissors,
  Clapperboard,
  Sparkles,
  ExternalLink,
  Info,
  X,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

interface ProductRibbonProps {
  className?: string;
  onNavigateToContentRadar?: () => void;
}

export const ProductRibbon: React.FC<ProductRibbonProps> = ({
  className = '',
  onNavigateToContentRadar,
}) => {
  const [activeProduct, setActiveProduct] = useState<'content-radar' | 'clip-radar' | 'b-roll'>('content-radar');
  const [showBRollModal, setShowBRollModal] = useState(false);
  const [showClipRadarModal, setShowClipRadarModal] = useState(false);

  const clipRadarUrl = import.meta.env.VITE_CLIP_RADAR_URL || 'http://localhost:5174';

  const handleProductClick = (product: 'content-radar' | 'clip-radar' | 'b-roll') => {
    if (product === 'content-radar') {
      setActiveProduct('content-radar');
      onNavigateToContentRadar?.();
    } else if (product === 'clip-radar') {
      // Abre el microservicio independiente en una pestaña o muestra modal con link directo
      window.open(clipRadarUrl, '_blank', 'noopener,noreferrer');
    } else if (product === 'b-roll') {
      setShowBRollModal(true);
    }
  };

  return (
    <>
      {/* Cinta de Ecosistema de Productos */}
      <div className={`flex items-center gap-1.5 p-1 bg-slate-100/90 dark:bg-[#121624]/90 border border-slate-200/80 dark:border-slate-800 rounded-full shadow-inner ${className}`}>
        {/* 1. Content Radar */}
        <button
          onClick={() => handleProductClick('content-radar')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
            activeProduct === 'content-radar'
              ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-sm shadow-blue-500/10'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
          }`}
          title="Plataforma de Análisis de Contenido y Comentarios"
        >
          <div className="relative flex items-center justify-center">
            <Radio size={14} className={activeProduct === 'content-radar' ? 'text-blue-500 dark:text-white' : ''} />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500" />
          </div>
          <span className="tracking-tight">Content Radar</span>
        </button>

        {/* 2. Clip Radar */}
        <button
          onClick={() => handleProductClick('clip-radar')}
          className="group flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-300 hover:bg-cyan-500/10 transition-all duration-200"
          title="Recorte automático de videos largos con IA (Opus-style)"
        >
          <Scissors size={14} className="text-cyan-500 group-hover:rotate-12 transition-transform" />
          <span className="tracking-tight">Clip Radar</span>
          <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-500 dark:text-cyan-400 border border-cyan-500/30">
            <Sparkles size={10} />
            AI Clips
          </span>
          <ExternalLink size={11} className="opacity-40 group-hover:opacity-100 transition-opacity" />
        </button>

        {/* 3. B-Roll Studio */}
        <button
          onClick={() => handleProductClick('b-roll')}
          className="group flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-300 hover:bg-purple-500/10 transition-all duration-200"
          title="Generación y curaduría inteligente de material B-Roll"
        >
          <Clapperboard size={14} className="text-purple-500 group-hover:scale-110 transition-transform" />
          <span className="tracking-tight">B-Roll Studio</span>
          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300/60 dark:border-slate-700">
            Pronto
          </span>
        </button>
      </div>

      {/* Modal Informativo: B-Roll Studio (Próximamente) */}
      {showBRollModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl overflow-hidden">
            {/* Glow decorativo de fondo */}
            <div className="absolute -top-16 -right-16 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500">
                  <Clapperboard size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">B-Roll Studio</h3>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-500 border border-purple-500/20">
                      Próxima Feature
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Suite de Generación Cinemática para Creadores</p>
                </div>
              </div>
              <button
                onClick={() => setShowBRollModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="py-5 space-y-3.5 text-xs text-slate-600 dark:text-slate-300">
              <p className="leading-relaxed text-sm">
                Estamos construyendo <strong>B-Roll Studio</strong> como el tercer pilar del ecosistema Content Radar:
              </p>

              <div className="space-y-2.5 pt-1">
                <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/80">
                  <CheckCircle2 size={16} className="text-purple-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-white">Detección de Vacíos Visuales:</span>
                    <p className="text-slate-500 dark:text-slate-400 mt-0.5">Analiza el guion o audio para identificar los momentos que requieren apoyo visual.</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/80">
                  <CheckCircle2 size={16} className="text-purple-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-white">Sugerencia de Metraje Cinemático:</span>
                    <p className="text-slate-500 dark:text-slate-400 mt-0.5">Integración con bancos de video y prompts de video con IA para acompañar el ritmo del creador.</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/80">
                  <CheckCircle2 size={16} className="text-purple-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-white">Sincronización Automática:</span>
                    <p className="text-slate-500 dark:text-slate-400 mt-0.5">Alineación por código de tiempo con los clips recortados en Clip Radar.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Fase de planificación activa • Q1 2027
              </span>
              <button
                onClick={() => setShowBRollModal(false)}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-lg shadow-purple-500/20 transition-all"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
