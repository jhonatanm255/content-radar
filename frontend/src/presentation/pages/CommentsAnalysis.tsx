import React, { useState } from 'react';
import { useAppStore } from '../store/appStore';
import { MessageSquare, Users, MessageCircle, BarChart3, HelpCircle } from 'lucide-react';

export const CommentsAnalysis: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'resumen' | 'temas' | 'preguntas' | 'problemas' | 'sugerencias'>('resumen');

  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Análisis de Comentarios
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Descubre lo que tu audiencia pregunta y necesita en tus videos
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 pb-3 mb-6 overflow-x-auto gap-1">
        {(['resumen', 'temas', 'preguntas', 'problemas', 'sugerencias'] as const).map((tab) => {
          const labels = {
            resumen: 'Resumen',
            temas: 'Temas',
            preguntas: 'Preguntas',
            problemas: 'Problemas',
            sugerencias: 'Sugerencias'
          };
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all capitalize whitespace-nowrap ${
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

      {/* Resumen general cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        {[
          { label: 'Comentarios analizados', value: '24,532', icon: MessageSquare, color: 'text-violet-500 bg-violet-500/10' },
          { label: 'Usuarios únicos', value: '8,421', icon: Users, color: 'text-blue-500 bg-blue-500/10' },
          { label: 'Comentarios por día', value: '817', icon: MessageCircle, color: 'text-emerald-500 bg-emerald-500/10' },
          { label: 'Interacción promedio', value: '4.2', icon: BarChart3, color: 'text-amber-500 bg-amber-500/10' },
        ].map((card, index) => {
          const Icon = card.icon;
          return (
            <div key={index} className="p-5 rounded-xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/80 shadow-sm flex items-center gap-4">
              <div className={`p-3 rounded-lg ${card.color}`}>
                <Icon size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{card.label}</p>
                <p className="text-xl font-extrabold text-slate-800 dark:text-white mt-1">{card.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Split Ring charts & sentiment trend */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        
        {/* Temas más mencionados */}
        <div className="lg:col-span-6 p-5 rounded-xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/80 shadow-sm flex flex-col justify-between">
          <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Temas más mencionados</h2>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            
            {/* SVG Donut */}
            <div className="relative w-36 h-36 flex items-center justify-center flex-shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgba(148, 163, 184, 0.1)" strokeWidth="3.5" />
                {/* Deploy/VPS (25%) */}
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#8b5cf6" strokeWidth="3.5" 
                  strokeDasharray="25 75" strokeDashoffset="0" />
                {/* Docker (22%) */}
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#3b82f6" strokeWidth="3.5" 
                  strokeDasharray="22 78" strokeDashoffset="-25" />
                {/* Coolify (18%) */}
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#10b981" strokeWidth="3.5" 
                  strokeDasharray="18 82" strokeDashoffset="-47" />
                {/* Kubernetes (13%) */}
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f59e0b" strokeWidth="3.5" 
                  strokeDasharray="13 87" strokeDashoffset="-65" />
                {/* Errores/Problemas (12%) */}
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#ef4444" strokeWidth="3.5" 
                  strokeDasharray="12 88" strokeDashoffset="-78" />
                {/* Otros (10%) */}
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#6b7280" strokeWidth="3.5" 
                  strokeDasharray="10 90" strokeDashoffset="-90" />
              </svg>
              <div className="absolute text-center">
                <p className="text-lg font-black text-slate-800 dark:text-white leading-none">24,532</p>
                <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold mt-1">Total</p>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 w-full space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-violet-500" />
                  <span>Deploy/VPS</span>
                </div>
                <span className="font-bold text-slate-850 dark:text-slate-200">25%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-blue-500" />
                  <span>Docker</span>
                </div>
                <span className="font-bold text-slate-850 dark:text-slate-200">22%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-emerald-500" />
                  <span>Coolify</span>
                </div>
                <span className="font-bold text-slate-850 dark:text-slate-200">18%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-amber-500" />
                  <span>Kubernetes</span>
                </div>
                <span className="font-bold text-slate-850 dark:text-slate-200">13%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-red-500" />
                  <span>Errores / Problemas</span>
                </div>
                <span className="font-bold text-slate-850 dark:text-slate-200">12%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-gray-500" />
                  <span>Otros</span>
                </div>
                <span className="font-bold text-slate-850 dark:text-slate-200">10%</span>
              </div>
            </div>

          </div>
        </div>

        {/* Sentimiento general + tendencia */}
        <div className="lg:col-span-6 p-5 rounded-xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-800 dark:text-white">Sentimiento general</h2>
            <div className="flex gap-3 text-[10px] text-slate-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-500" /> Positivo</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-amber-500" /> Neutral</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-red-500" /> Negativo</span>
            </div>
          </div>

          <div className="flex-1 flex flex-col md:flex-row items-center gap-6">
            {/* Sentiment Ring */}
            <div className="relative w-28 h-28 flex items-center justify-center flex-shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgba(148, 163, 184, 0.1)" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#10b981" strokeWidth="3" strokeDasharray="61 39" strokeDashoffset="0" />
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f59e0b" strokeWidth="3" strokeDasharray="25 75" strokeDashoffset="-61" />
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#ef4444" strokeWidth="3" strokeDasharray="14 86" strokeDashoffset="-86" />
              </svg>
              <div className="absolute text-center">
                <p className="text-sm font-extrabold text-slate-800 dark:text-white leading-none">61%</p>
                <p className="text-[8px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5">positivo</p>
              </div>
            </div>

            {/* Sentiment over time chart */}
            <div className="flex-1 w-full h-28 relative">
              <p className="text-[10px] text-slate-400 font-bold mb-1.5">Tendencia de sentimiento</p>
              <svg className="w-full h-20 overflow-visible" viewBox="0 0 200 60" preserveAspectRatio="none">
                {/* Positive (green) */}
                <path d="M0,20 L40,15 L80,25 L120,10 L160,18 L200,8" fill="none" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" />
                {/* Neutral (amber) */}
                <path d="M0,35 L40,40 L80,32 L120,38 L160,30 L200,32" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
                {/* Negative (red) */}
                <path d="M0,50 L40,48 L80,55 L120,45 L160,52 L200,56" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <div className="flex justify-between text-[7px] text-slate-400 mt-1 px-1">
                <span>12 May</span>
                <span>20 May</span>
                <span>28 May</span>
                <span>5 Jun</span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Preguntas más frecuentes */}
      <div className="p-5 rounded-xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/80 shadow-sm">
        <h2 className="text-base font-bold text-slate-800 dark:text-white mb-4">Preguntas más frecuentes</h2>
        
        <div className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
          {[
            { q: '¿Cómo conectar Coolify con un dominio propio?', count: 324 },
            { q: '¿Cuál es la diferencia entre Coolify y Portainer?', count: 298 },
            { q: '¿Cómo solucionar el error 502 en Nginx Proxy Manager?', count: 276 },
            { q: '¿Qué VPS recomiendan para empezar?', count: 241 },
            { q: '¿Coolify sirve para proyectos en producción?', count: 198 }
          ].map((item, index) => (
            <div key={index} className="py-3 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/10 px-2 rounded-lg transition-colors">
              <span className="text-slate-700 dark:text-slate-300 font-semibold">{item.q}</span>
              <span className="font-extrabold text-slate-850 dark:text-white bg-slate-50 dark:bg-slate-850 border border-slate-200/50 dark:border-slate-850 px-2 py-0.5 rounded shadow-sm">
                {item.count}
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
