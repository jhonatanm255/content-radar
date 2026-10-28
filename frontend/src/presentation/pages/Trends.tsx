import React, { useState } from 'react';
import { TrendingUp, HelpCircle, ArrowUpRight, Sparkles, Hash, Flame } from 'lucide-react';

export const Trends: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'desarrollo' | 'devops' | 'infraestructura' | 'ia'>('desarrollo');

  return (
    <div className="cr-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <TrendingUp size={14} />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Detector de Tendencias
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Tendencias de la Industria
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Descubre temas emergentes con aceleración de búsquedas antes que tus competidores.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100 dark:border-slate-800/80 pb-2 gap-1.5 overflow-x-auto">
        {(['desarrollo', 'devops', 'infraestructura', 'ia'] as const).map((tab) => {
          const labels = {
            desarrollo: 'Todas las categorías',
            devops: 'DevOps & CI/CD',
            infraestructura: 'Cloud & VPS',
            ia: 'Inteligencia Artificial',
          };
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.04]'
              }`}
            >
              {labels[tab]}
            </button>
          );
        })}
      </div>

      {/* Grid: Trend Line Chart & Emerging Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Trend graph (Col 8) */}
        <div className="lg:col-span-8 rounded-2xl bg-white dark:bg-[#121624] border border-slate-200/70 dark:border-slate-800/80 p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)] dark:shadow-none flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Interés a lo largo del tiempo</span>
                <span className="text-slate-400 cursor-help" title="Métrica calculada sobre el volumen relativo de búsquedas y menciones">
                  <HelpCircle size={14} />
                </span>
              </h2>
              <span className="text-xs text-slate-400 font-medium">Últimos 30 días</span>
            </div>

            {/* SVG Line chart with smooth curves */}
            <div className="h-52 w-full relative pt-2">
              <svg className="w-full h-full" viewBox="0 0 500 120" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="aiGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {/* AI Agents (Blue prominent) */}
                <path d="M0,110 Q120,95 240,65 T380,25 T500,5" fill="none" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" />
                {/* Coolify (Purple) */}
                <path d="M0,105 Q120,85 240,55 T380,35 T500,15" fill="none" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" />
                {/* Docker (Teal) */}
                <path d="M0,90 Q120,80 240,70 T380,60 T500,50" fill="none" stroke="#06B6D4" strokeWidth="2" strokeLinecap="round" />
                {/* Kubernetes (Green) */}
                <path d="M0,95 Q120,90 240,80 T380,72 T500,60" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <div className="flex justify-between text-[10px] text-slate-400 mt-2 font-medium">
                <span>12 Mayo</span>
                <span>18 Mayo</span>
                <span>24 Mayo</span>
                <span>30 Mayo</span>
                <span>5 Junio</span>
                <span>10 Junio</span>
              </div>
            </div>
          </div>

          <div className="flex gap-4 border-t border-slate-100 dark:border-slate-800/80 pt-3.5 mt-4 text-xs font-semibold flex-wrap">
            <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> AI Agents
            </span>
            <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Coolify
            </span>
            <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" /> Docker Compose
            </span>
            <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Kubernetes
            </span>
          </div>
        </div>

        {/* Emerging Trends (Col 4) */}
        <div className="lg:col-span-4 rounded-2xl bg-white dark:bg-[#121624] border border-slate-200/70 dark:border-slate-800/80 p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)] dark:shadow-none flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Flame size={16} className="text-rose-500" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Tendencias emergentes
              </h2>
            </div>

            <div className="space-y-3">
              {[
                { name: 'AI Agents Autónomos', growth: 250 },
                { name: 'Dev Containers & Docker', growth: 212 },
                { name: 'Coolify v4 & VPS', growth: 180 },
                { name: 'Next.js 15 App Router', growth: 145 },
                { name: 'Cloudflare Tunnels', growth: 95 },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 font-bold flex items-center justify-center text-[10px] flex-shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-slate-800 dark:text-slate-200 font-semibold truncate">
                      {item.name}
                    </span>
                  </div>
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900/40 px-2 py-0.5 rounded-full text-[10px] flex-shrink-0">
                    +{item.growth}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 mt-4 text-center">
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
              Actualizado hoy con datos de YouTube API
            </span>
          </div>
        </div>
      </div>

      {/* Exploration of Tags & Opportunity suggestions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Tag Cloud (Col 7) */}
        <div className="lg:col-span-7 rounded-2xl bg-white dark:bg-[#121624] border border-slate-200/70 dark:border-slate-800/80 p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)] dark:shadow-none">
          <div className="flex items-center gap-2 mb-4">
            <Hash size={16} className="text-slate-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Exploración de palabras clave
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { text: 'docker compose', highlight: true },
              { text: 'kubernetes', highlight: true },
              { text: 'coolify', highlight: true },
              { text: 'nginx proxy manager', highlight: false },
              { text: 'vps hosting', highlight: false },
              { text: 'dokploy', highlight: false },
              { text: 'next.js 15', highlight: false },
              { text: 'postgresql', highlight: false },
              { text: 'supabase auth', highlight: false },
              { text: 'portainer', highlight: false },
              { text: 'ia local & ollama', highlight: true },
              { text: 'terraform', highlight: false },
              { text: 'linux terminal', highlight: false },
              { text: 'devops pipeline', highlight: false },
            ].map((tag, idx) => (
              <span
                key={idx}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                  tag.highlight
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20 hover:bg-blue-700'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                #{tag.text}
              </span>
            ))}
          </div>
        </div>

        {/* Opportunity suggestions (Col 5) */}
        <div className="lg:col-span-5 rounded-2xl bg-white dark:bg-[#121624] border border-slate-200/70 dark:border-slate-800/80 p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)] dark:shadow-none flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={16} className="text-blue-500" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Ideas recomendadas por tendencia
              </h2>
            </div>
            <div className="space-y-3">
              {[
                { title: 'Tutorial de AI Agents con Docker paso a paso', label: 'Alta prioridad', tagColor: 'cr-badge-danger' },
                { title: 'Coolify + PostgreSQL: despliega en 5 minutos', label: 'Alta prioridad', tagColor: 'cr-badge-danger' },
                { title: 'Kubernetes en producción sin volverte loco', label: 'Media prioridad', tagColor: 'cr-badge-warning' },
              ].map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between gap-3 text-xs p-2.5 rounded-xl bg-slate-50/70 dark:bg-[#151C30] border border-slate-100 dark:border-slate-800"
                >
                  <span className="text-slate-800 dark:text-slate-200 font-semibold truncate pr-2">
                    {item.title}
                  </span>
                  <span className={`${item.tagColor} flex-shrink-0`}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => window.location.hash = '#opportunities'}
            className="w-full text-center text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline mt-4"
          >
            Explorar todas las oportunidades →
          </button>
        </div>
      </div>
    </div>
  );
};
