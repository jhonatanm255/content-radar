import React, { useState } from 'react';
import { useAppStore } from '../store/appStore';
import { Bookmark, HelpCircle, ArrowUpRight, Check } from 'lucide-react';
import { Opportunity } from '../../domain/entities';

export const Opportunities: React.FC = () => {
  const { opportunities, saveIdea, ideas } = useAppStore();
  const [activeFilter, setActiveFilter] = useState<'todos' | 'no_cubiertas' | 'tendencia' | 'bajo_competencia' | 'guardadas'>('todos');

  // Comprobar si una oportunidad ya está guardada
  const isSaved = (topic: string) => {
    return ideas.some(i => i.topic === topic);
  };

  const handleSave = (opp: Opportunity) => {
    if (isSaved(opp.title)) return;
    saveIdea(opp.title, opp.opportunityScore, opp.format);
  };

  // Filtrar oportunidades
  const filteredOpp = opportunities.filter(opp => {
    if (activeFilter === 'todos') return true;
    if (activeFilter === 'no_cubiertas') return opp.competition === 'Muy Baja' || opp.competition === 'Baja';
    if (activeFilter === 'tendencia') return opp.opportunityScore >= 80;
    if (activeFilter === 'bajo_competencia') return opp.competition === 'Muy Baja';
    if (activeFilter === 'guardadas') return isSaved(opp.title);
    return true;
  });

  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Oportunidades
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Ideas de contenido con alto potencial para tu canal de YouTube
        </p>
      </div>

      {/* Tabs / Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4 mb-6">
        <div className="flex flex-wrap gap-1">
          {(['todos', 'no_cubiertas', 'tendencia', 'bajo_competencia', 'guardadas'] as const).map((filter) => {
            const labels = {
              todos: 'Todos',
              no_cubiertas: 'No cubiertas',
              tendencia: 'En tendencia',
              bajo_competencia: 'Bajo competencia',
              guardadas: 'Guardadas'
            };
            const isActive = activeFilter === filter;
            return (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  isActive 
                    ? 'bg-violet-600 text-white' 
                    : 'text-slate-650 dark:text-slate-400 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800/80 shadow-sm'
                }`}
              >
                {labels[filter]}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Ordenar por:</span>
          <select className="px-2 py-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-300 text-xs font-bold outline-none cursor-pointer">
            <option>Potencial (Alto a Bajo)</option>
            <option>Búsquedas (Mayor a Menor)</option>
            <option>Competencia (Baja a Alta)</option>
          </select>
        </div>
      </div>

      {/* Cards Deck */}
      <div className="grid grid-cols-1 gap-4 max-w-4xl">
        {filteredOpp.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-slate-900/60 border border-dashed border-slate-250 dark:border-slate-800 rounded-xl">
            <p className="text-slate-500 dark:text-slate-450 text-sm">No se encontraron oportunidades en este filtro.</p>
          </div>
        ) : (
          filteredOpp.map((opp) => {
            const saved = isSaved(opp.title);
            return (
              <div 
                key={opp.id} 
                className="p-5 rounded-xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-violet-500/50 dark:hover:border-violet-500/50 transition-all duration-200"
              >
                
                {/* Left side: Score + Metadata */}
                <div className="flex items-start gap-4 flex-1">
                  
                  {/* Score circle */}
                  <div className="w-14 h-14 rounded-full bg-emerald-500/10 dark:bg-emerald-500/5 border border-emerald-500/25 flex flex-col items-center justify-center text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                    <span className="text-xl font-black leading-none">{opp.opportunityScore}</span>
                    <span className="text-[7px] font-bold uppercase mt-0.5 tracking-wider">Potencial</span>
                  </div>

                  {/* Title and details */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
                      {opp.title}
                    </h3>
                    
                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        opp.demand === 'Alta' 
                          ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' 
                          : 'bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400'
                      }`}>
                        {opp.demand} demanda
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                        {opp.competition} competencia
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-violet-100 dark:bg-violet-500/10 text-violet-750 dark:text-violet-400">
                        En tendencia
                      </span>
                    </div>

                    {/* Justification bullets */}
                    <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-500 dark:text-slate-400 pl-1">
                      {opp.justification.map((j, i) => (
                        <span key={i} className="block">• {j}</span>
                      ))}
                    </ul>
                  </div>

                </div>

                {/* Right side: Sparkline + Action Button */}
                <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-6 border-t md:border-t-0 border-slate-100 dark:border-slate-800/50 pt-4 md:pt-0">
                  
                  {/* Search volume */}
                  <div className="text-left md:text-right">
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">Volumen de búsquedas</p>
                    <p className="text-sm font-extrabold text-slate-700 dark:text-slate-305 mt-0.5">
                      {(opp.searchVolume * 35).toLocaleString()} / mes
                    </p>
                  </div>

                  {/* Sparkline SVG */}
                  <div className="w-20 h-8 hidden sm:block">
                    <svg className="w-full h-full" viewBox="0 0 100 30" preserveAspectRatio="none">
                      <path 
                        d="M0,25 Q25,20 50,15 T75,8 T100,2" 
                        fill="none" 
                        stroke="#8b5cf6" 
                        strokeWidth="2.2" 
                        strokeLinecap="round" 
                      />
                    </svg>
                  </div>

                  {/* Bookmark Toggle */}
                  <button 
                    onClick={() => handleSave(opp)}
                    disabled={saved}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                      saved
                        ? 'bg-emerald-500 border-emerald-500 text-white cursor-default'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-violet-500 dark:hover:border-violet-500 hover:text-violet-600 dark:hover:text-violet-400'
                    }`}
                  >
                    {saved ? (
                      <>
                        <Check size={12} />
                        <span>Guardada</span>
                      </>
                    ) : (
                      <>
                        <Bookmark size={12} />
                        <span>Guardar Idea</span>
                      </>
                    )}
                  </button>

                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
