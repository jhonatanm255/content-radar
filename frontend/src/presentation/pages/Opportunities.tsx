import React, { useState } from 'react';
import { useAppStore } from '../store/appStore';
import { Bookmark, Check, Sparkles, TrendingUp, Layers, ChevronDown } from 'lucide-react';
import { Opportunity } from '../../domain/entities';
import { MiniTrendSparkline } from '../components/charts/MiniTrendSparkline';

export const Opportunities: React.FC = () => {
  const { opportunities, saveIdea, ideas } = useAppStore();
  const [activeFilter, setActiveFilter] = useState<'todos' | 'no_cubiertas' | 'tendencia' | 'bajo_competencia' | 'guardadas'>('todos');
  const [sortBy, setSortBy] = useState<'score' | 'volume' | 'competition'>('score');

  const isSaved = (topic: string) => ideas.some((i) => i.topic === topic);

  const handleSave = (opp: Opportunity) => {
    if (isSaved(opp.title)) return;
    saveIdea(opp.title, opp.opportunityScore, opp.format);
  };

  const filteredOpp = opportunities
    .filter((opp) => {
      if (activeFilter === 'todos') return true;
      if (activeFilter === 'no_cubiertas') return opp.competition === 'Muy Baja' || opp.competition === 'Baja';
      if (activeFilter === 'tendencia') return opp.opportunityScore >= 80;
      if (activeFilter === 'bajo_competencia') return opp.competition === 'Muy Baja';
      if (activeFilter === 'guardadas') return isSaved(opp.title);
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'volume') return b.searchVolume - a.searchVolume;
      if (sortBy === 'competition') {
        const compOrder: Record<string, number> = { 'Muy Baja': 0, 'Baja': 1, 'Media': 2, 'Alta': 3 };
        return (compOrder[a.competition] ?? 2) - (compOrder[b.competition] ?? 2);
      }
      return b.opportunityScore - a.opportunityScore;
    });

  return (
    <div className="cr-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Sparkles size={14} />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Generador de Contenido
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Oportunidades de Contenido
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Descubre qué temas y formatos tienen mayor potencial en tu nicho según el análisis de comentarios.
          </p>
        </div>
      </div>

      {/* Filter and Sort Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex flex-wrap items-center gap-1.5">
          {(['todos', 'no_cubiertas', 'tendencia', 'bajo_competencia', 'guardadas'] as const).map((filter) => {
            const labels = {
              todos: 'Todos',
              no_cubiertas: 'No cubiertas',
              tendencia: 'En tendencia',
              bajo_competencia: 'Baja competencia',
              guardadas: 'Guardadas',
            };
            const isActive = activeFilter === filter;
            return (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.04]'
                }`}
              >
                {labels[filter]}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-slate-400 font-medium">Ordenar:</span>
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="appearance-none bg-white dark:bg-[#121624] border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl pl-3 pr-8 py-2 focus:outline-none shadow-sm cursor-pointer"
            >
              <option value="score">Score de Potencial</option>
              <option value="volume">Volumen de Búsquedas</option>
              <option value="competition">Menor Competencia</option>
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Opportunities Grid / List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredOpp.length === 0 ? (
          <div className="rounded-2xl bg-white dark:bg-[#121624] border border-dashed border-slate-200 dark:border-slate-800 p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3">
              <Layers size={22} />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
              No se encontraron oportunidades
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Intenta cambiar el filtro seleccionado para explorar otros temas de contenido detectados.
            </p>
          </div>
        ) : (
          filteredOpp.map((opp) => {
            const saved = isSaved(opp.title);
            return (
              <div
                key={opp.id}
                className="rounded-2xl bg-white dark:bg-[#121624] border border-slate-200/70 dark:border-slate-800/80 p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)] dark:shadow-none hover:border-blue-500/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 group"
              >
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  {/* Score Pill */}
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900/40 flex flex-col items-center justify-center text-emerald-600 dark:text-emerald-400 flex-shrink-0 shadow-sm">
                    <span className="text-xl font-black leading-none tabular-nums">
                      {opp.opportunityScore}
                    </span>
                    <span className="text-[8px] font-bold uppercase mt-1 tracking-wider opacity-80">
                      Score
                    </span>
                  </div>

                  {/* Info and Tags */}
                  <div className="space-y-2.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                        {opp.title}
                      </h3>
                      {opp.format && (
                        <span className="text-[10px] font-semibold text-slate-400 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800">
                          {opp.format}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className={opp.demand === 'Alta' ? 'cr-badge-success' : 'cr-badge-warning'}>
                        {opp.demand} demanda
                      </span>
                      <span className="cr-badge-success">
                        {opp.competition} competencia
                      </span>
                      <span className="cr-badge-info flex items-center gap-1">
                        <TrendingUp size={10} /> En tendencia
                      </span>
                    </div>

                    {opp.justification && opp.justification.length > 0 && (
                      <ul className="space-y-1 text-xs text-slate-500 dark:text-slate-400 pt-1">
                        {opp.justification.map((j, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-blue-500 mt-1">•</span>
                            <span>{j}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Right Metrics & Action */}
                <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-4 border-t md:border-t-0 border-slate-100 dark:border-slate-800/80 pt-4 md:pt-0 flex-shrink-0">
                  <div className="text-left md:text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Volumen de búsquedas
                    </p>
                    <p className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5 tabular-nums">
                      {(opp.searchVolume * 35).toLocaleString('es-ES')} / mes
                    </p>
                  </div>

                  <div className="w-16 h-6">
                    <MiniTrendSparkline variant="up" color="#10B981" />
                  </div>

                  <button
                    onClick={() => handleSave(opp)}
                    disabled={saved}
                    className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                      saved
                        ? 'bg-emerald-500 text-white cursor-default'
                        : 'bg-white dark:bg-[#121624] border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-blue-500/50 hover:bg-slate-50 dark:hover:bg-white/[0.04]'
                    }`}
                  >
                    {saved ? (
                      <>
                        <Check size={13} />
                        <span>Guardada</span>
                      </>
                    ) : (
                      <>
                        <Bookmark size={13} />
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
