import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';

export const Trends: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'desarrollo' | 'devops' | 'infraestructura' | 'ia'>('desarrollo');

  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Tendencias
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Descubre temas en tendencia antes que los demás competidores
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 pb-3 mb-6 gap-1 overflow-x-auto">
        {(['desarrollo', 'devops', 'infraestructura', 'ia'] as const).map((tab) => {
          const labels = {
            desarrollo: 'Todas',
            devops: 'DevOps',
            infraestructura: 'Infraestructura',
            ia: 'Inteligencia Artificial'
          };
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap capitalize ${
                isActive 
                  ? 'bg-violet-600 text-white' 
                  : 'text-slate-650 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              {labels[tab]}
            </button>
          );
        })}
      </div>

      {/* Grid: Chart left, Emerging trends right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        
        {/* Trend graph */}
        <div className="lg:col-span-8 p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5 mb-4">
              Interés a lo largo del tiempo
              <button className="text-slate-400 hover:text-slate-600">
                <HelpCircle size={14} />
              </button>
            </h2>

            {/* SVG Line chart */}
            <div className="h-44 w-full relative">
              <svg className="w-full h-full" viewBox="0 0 500 100" preserveAspectRatio="none">
                {/* Docker (Blue) */}
                <path d="M0,80 L100,75 L200,68 L300,55 L400,60 L500,45" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
                {/* Kubernetes (Green) */}
                <path d="M0,90 L100,85 L200,75 L300,72 L400,65 L500,50" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
                {/* Coolify (Violet) */}
                <path d="M0,95 L100,82 L200,60 L300,45 L400,30 L500,10" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" />
                {/* AI Agents (Red) */}
                <path d="M0,100 L100,90 L200,75 L300,40 L400,15 L500,2" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <div className="flex justify-between text-[8px] text-slate-400 mt-2">
                <span>4 Jun</span>
                <span>5 Jun</span>
                <span>6 Jun</span>
                <span>7 Jun</span>
                <span>8 Jun</span>
                <span>9 Jun</span>
                <span>10 Jun</span>
              </div>
            </div>
          </div>

          <div className="flex gap-4 border-t border-slate-100 dark:border-slate-800 pt-3 mt-4 text-[10px] text-slate-405 font-bold flex-wrap">
            <span className="flex items-center gap-1"><span className="w-2.5 h-1 bg-blue-500 rounded" /> Docker</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-1 bg-emerald-500 rounded" /> Kubernetes</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-1 bg-violet-500 rounded" /> Coolify</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-1 bg-red-500 rounded" /> AI Agents</span>
          </div>
        </div>

        {/* Emerging Trends */}
        <div className="lg:col-span-4 p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Tendencias emergentes</h2>
          
          <div className="space-y-3.5 flex-1 flex flex-col justify-center">
            {[
              { name: 'AI Agents', growth: 250 },
              { name: 'Dev Containers', growth: 212 },
              { name: 'Coolify', growth: 180 },
              { name: 'Kubernetes 1.30', growth: 120 },
              { name: 'Cloudflare Tunnel', growth: 95 }
            ].map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-violet-100 dark:bg-violet-950 text-violet-600 dark:text-violet-400 font-bold flex items-center justify-center text-[10px]">{idx + 1}</span>
                  <span className="text-slate-700 dark:text-slate-300 font-semibold">{item.name}</span>
                </div>
                <span className="font-extrabold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded text-[10px]">+{item.growth}%</span>
              </div>
            ))}
          </div>

          <button className="w-full text-center text-xs text-violet-600 dark:text-violet-400 font-bold hover:underline mt-4">
            Ver todas las tendencias →
          </button>
        </div>

      </div>

      {/* Exploration of Tags */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Tag Cloud */}
        <div className="lg:col-span-7 p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Exploración de temas</h2>
          <div className="flex flex-wrap gap-2">
            {[
              { text: 'docker compose', weight: 'text-sm bg-violet-600 text-white font-bold' },
              { text: 'kubernetes', weight: 'text-sm bg-violet-650 text-white font-bold' },
              { text: 'coolify', weight: 'text-sm bg-violet-700 text-white font-bold' },
              { text: 'nginx proxy manager', weight: 'text-xs bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-400' },
              { text: 'vps', weight: 'text-xs bg-slate-100 dark:bg-slate-850 text-slate-600 dark:text-slate-400' },
              { text: 'dokploy', weight: 'text-xs bg-slate-100 dark:bg-slate-850 text-slate-600 dark:text-slate-400' },
              { text: 'next.js 15', weight: 'text-xs bg-slate-100 dark:bg-slate-850 text-slate-600 dark:text-slate-400' },
              { text: 'postgresql', weight: 'text-xs bg-slate-100 dark:bg-slate-850 text-slate-600 dark:text-slate-400' },
              { text: 'supabase', weight: 'text-xs bg-slate-100 dark:bg-slate-850 text-slate-600 dark:text-slate-400' },
              { text: 'portainer', weight: 'text-xs bg-slate-100 dark:bg-slate-850 text-slate-600 dark:text-slate-400' },
              { text: 'ia local', weight: 'text-xs bg-slate-100 dark:bg-slate-850 text-slate-600 dark:text-slate-400' },
              { text: 'terraform', weight: 'text-xs bg-slate-100 dark:bg-slate-850 text-slate-600 dark:text-slate-400' },
              { text: 'linux', weight: 'text-xs bg-slate-100 dark:bg-slate-850 text-slate-600 dark:text-slate-400' },
              { text: 'devops', weight: 'text-xs bg-slate-100 dark:bg-slate-850 text-slate-600 dark:text-slate-400' }
            ].map((tag, idx) => (
              <span key={idx} className={`px-2.5 py-1 rounded-lg cursor-pointer hover:opacity-85 transition-opacity ${tag.weight}`}>
                {tag.text}
              </span>
            ))}
          </div>
        </div>

        {/* Opportunity suggestions */}
        <div className="lg:col-span-5 p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Oportunidades basadas en tendencias</h2>
          <div className="space-y-3">
            {[
              { title: 'Tutorial de AI Agents con Docker', label: 'Alta' },
              { title: 'Coolify + PostgreSQL', label: 'Alta' },
              { title: 'Kubernetes en producción', label: 'Media' }
            ].map((item, index) => (
              <div key={index} className="flex items-center justify-between text-xs py-2 border-b border-slate-100 dark:border-slate-800/50">
                <span className="text-slate-700 dark:text-slate-350 font-semibold truncate pr-2">{item.title}</span>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                  item.label === 'Alta' ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600' : 'bg-amber-100 dark:bg-amber-500/10 text-amber-600'
                }`}>{item.label}</span>
              </div>
            ))}
          </div>
          <button className="w-full text-center text-xs text-violet-600 dark:text-violet-400 font-bold hover:underline mt-4">
            Ver todas las sugerencias →
          </button>
        </div>

      </div>

    </div>
  );
};
