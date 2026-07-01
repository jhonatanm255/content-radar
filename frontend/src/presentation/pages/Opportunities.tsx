import React, { useState } from 'react';
import { useAppStore } from '../store/appStore';
import { Bookmark, Check } from 'lucide-react';
import { Opportunity } from '../../domain/entities';
import { MiniTrendSparkline } from '../components/charts/MiniTrendSparkline';

export const Opportunities: React.FC = () => {
  const { opportunities, saveIdea, ideas } = useAppStore();
  const [activeFilter, setActiveFilter] = useState<'todos' | 'no_cubiertas' | 'tendencia' | 'bajo_competencia' | 'guardadas'>('todos');

  const isSaved = (topic: string) => ideas.some((i) => i.topic === topic);

  const handleSave = (opp: Opportunity) => {
    if (isSaved(opp.title)) return;
    saveIdea(opp.title, opp.opportunityScore, opp.format);
  };

  const filteredOpp = opportunities.filter((opp) => {
    if (activeFilter === 'todos') return true;
    if (activeFilter === 'no_cubiertas') return opp.competition === 'Muy Baja' || opp.competition === 'Baja';
    if (activeFilter === 'tendencia') return opp.opportunityScore >= 80;
    if (activeFilter === 'bajo_competencia') return opp.competition === 'Muy Baja';
    if (activeFilter === 'guardadas') return isSaved(opp.title);
    return true;
  });

  return (
    <div className="cr-page">
      <div className="mb-2">
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Oportunidades
        </h1>
        <p className="text-slate-500 dark:text-cr-muted text-sm mt-1">
          Ideas de contenido con alto potencial para tu canal de YouTube
        </p>
      </div>

      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-cr-border-dark pb-4">
        <div className="flex flex-wrap gap-2">
          {(['todos', 'no_cubiertas', 'tendencia', 'bajo_competencia', 'guardadas'] as const).map((filter) => {
            const labels = {
              todos: 'Todos',
              no_cubiertas: 'No cubiertas',
              tendencia: 'En tendencia',
              bajo_competencia: 'Bajo competencia',
              guardadas: 'Guardadas',
            };
            const isActive = activeFilter === filter;
            return (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`cr-tab ${isActive ? 'cr-tab-active' : 'cr-tab-inactive'}`}
              >
                {labels[filter]}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 dark:text-cr-muted font-medium">Ordenar por:</span>
          <select className="cr-btn-secondary py-2 cursor-pointer outline-none">
            <option>Potencial (Alto a Bajo)</option>
            <option>Búsquedas (Mayor a Menor)</option>
            <option>Competencia (Baja a Alta)</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 max-w-4xl">
        {filteredOpp.length === 0 ? (
          <div className="cr-card cr-card-pad text-center border-dashed">
            <p className="text-slate-500 dark:text-cr-muted text-sm">
              No se encontraron oportunidades en este filtro.
            </p>
          </div>
        ) : (
          filteredOpp.map((opp) => {
            const saved = isSaved(opp.title);
            return (
              <div
                key={opp.id}
                className="cr-card cr-card-pad flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-indigo-500/30 dark:hover:border-cr-accent/40 transition-all duration-200"
              >
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-14 h-14 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col items-center justify-center text-cr-success flex-shrink-0">
                    <span className="text-xl font-black leading-none tabular-nums">{opp.opportunityScore}</span>
                    <span className="text-[7px] font-bold uppercase mt-0.5 tracking-wider">Score</span>
                  </div>

                  <div className="space-y-2.5 min-w-0">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white hover:text-cr-accent transition-colors">
                      {opp.title}
                    </h3>

                    <div className="flex flex-wrap gap-2">
                      <span className={opp.demand === 'Alta' ? 'cr-badge-success' : 'cr-badge-warning'}>
                        {opp.demand} demanda
                      </span>
                      <span className="cr-badge-success">{opp.competition} competencia</span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-violet-500/10 text-cr-accent">
                        En tendencia
                      </span>
                    </div>

                    <ul className="space-y-0.5 text-[11px] text-slate-500 dark:text-cr-muted pl-1">
                      {opp.justification.map((j, i) => (
                        <span key={i} className="block">• {j}</span>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-5 border-t md:border-t-0 border-slate-100 dark:border-cr-border-dark pt-4 md:pt-0">
                  <div className="text-left md:text-right">
                    <p className="text-[10px] text-slate-400 dark:text-cr-muted uppercase tracking-wider">
                      Volumen de búsquedas
                    </p>
                    <p className="text-sm font-extrabold text-slate-700 dark:text-white mt-0.5 tabular-nums">
                      {(opp.searchVolume * 35).toLocaleString()} / mes
                    </p>
                  </div>

                  <MiniTrendSparkline variant="up" color="#6366f1" />

                  <button
                    onClick={() => handleSave(opp)}
                    disabled={saved}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
                      saved
                        ? 'bg-cr-success border-cr-success text-white cursor-default'
                        : 'cr-btn-secondary'
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
