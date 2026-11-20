import React from 'react';
import { Film, ExternalLink } from 'lucide-react';

export const Navbar: React.FC = () => {
  return (
    <header className="border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-base tracking-tight">ClipRadar</span>
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                AI Studio
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Opus-style Video Clipper Module</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <a
            href="https://contentradar.tech"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-400 transition-colors"
          >
            <span>Volver a Content Radar</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <div className="h-4 w-px bg-slate-800" />
          <span className="text-xs text-slate-500 font-mono">v1.0.0 Microservice</span>
        </div>
      </div>
    </header>
  );
};
