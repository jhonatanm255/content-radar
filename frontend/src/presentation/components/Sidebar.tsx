import React, { useState } from 'react';
import { ChannelAvatar } from './ChannelAvatar';
import { useAppStore, getActiveOwnChannel } from '../store/appStore';
import { useAuthStore } from '../store/authStore';
import { 
  LayoutDashboard, 
  Lightbulb, 
  MessageSquare, 
  Radio, 
  TrendingUp, 
  Bookmark, 
  Bell, 
  Settings, 
  Sun, 
  Moon, 
  Gift, 
  PanelLeftClose,
  PanelLeftOpen,
  LogOut
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { currentTab, setTab, theme, toggleTheme, channels, selectedChannelId } = useAppStore();
  const { user, signOut } = useAuthStore();
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const activeChannel = getActiveOwnChannel(channels, selectedChannelId);

  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ||
    user?.email?.split('@')[0] ||
    'Usuario';

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'opportunities', label: 'Oportunidades', icon: Lightbulb },
    { id: 'comments', label: 'Análisis de Comentarios', icon: MessageSquare },
    { id: 'competitors', label: 'Radar de Competidores', icon: Radio },
    { id: 'trends', label: 'Tendencias', icon: TrendingUp },
    { id: 'ideas', label: 'Ideas Guardadas', icon: Bookmark },
    { id: 'alerts', label: 'Alertas', icon: Bell },
    { id: 'settings', label: 'Ajustes', icon: Settings },
  ] as const;

  return (
    <aside className={`${isCollapsed ? 'w-20' : 'w-64'} flex-shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 backdrop-blur-md flex flex-col h-full transition-all duration-300 ease-in-out`}>
      {/* Brand Header */}
      <div className={`${isCollapsed ? 'px-4 justify-center' : 'px-6 justify-between'} h-[81px] flex items-center gap-3 border-b border-slate-200 dark:border-slate-800`}>
        <div className={`flex items-center gap-3 min-w-0 ${isCollapsed ? 'justify-center' : ''}`}>
        <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center text-white shadow-md shadow-violet-500/20">
          <Radio size={20} className="animate-pulse" />
        </div>
        <span className={`${isCollapsed ? 'hidden' : 'block'} text-xl font-bold bg-gradient-to-r from-violet-600 to-indigo-500 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent truncate`}>
          Creator Radar
        </span>
        </div>
        <button
          onClick={() => setIsCollapsed((value) => !value)}
          className="hidden lg:flex w-9 h-9 items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
          title={isCollapsed ? 'Expandir sidebar' : 'Contraer sidebar'}
          aria-label={isCollapsed ? 'Expandir sidebar' : 'Contraer sidebar'}
        >
          {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      {/* User Profile Info */}
      <div className={`${isCollapsed ? 'p-4 justify-center' : 'p-5'} flex items-center gap-3 border-b border-slate-100 dark:border-slate-800/50`}>
        <ChannelAvatar
          src={activeChannel?.avatarUrl}
          name={activeChannel?.name ?? displayName}
          size="md"
          className="border-2 border-violet-500/30"
        />
        <div className={`${isCollapsed ? 'hidden' : 'block'} flex-1 min-w-0`}>
          <div className="flex items-center gap-1.5">
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
              {activeChannel?.name ?? displayName}
            </h4>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 uppercase tracking-wider">
              Pro
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {activeChannel ? activeChannel.handle : user?.email}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className={`${isCollapsed ? 'px-3' : 'px-4'} flex-1 py-4 space-y-1 overflow-y-auto`}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              title={isCollapsed ? item.label : undefined}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-3'} py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive 
                  ? 'bg-violet-50 dark:bg-violet-950/45 text-violet-600 dark:text-violet-400' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Icon size={18} className={isActive ? 'text-violet-600 dark:text-violet-400' : 'text-slate-400 dark:text-slate-500'} />
              <span className={isCollapsed ? 'hidden' : 'block truncate'}>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Promo Card Bottom */}
      <div className={`${isCollapsed ? 'mx-3 p-2 items-center' : 'mx-4 p-4'} mb-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800/50 flex flex-col gap-3 relative overflow-hidden`}>
        <div className="absolute -right-4 -bottom-4 opacity-10 dark:opacity-5 text-violet-500">
          <Gift size={80} />
        </div>
        <div className={`flex items-start gap-2.5 ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="p-1.5 rounded-lg bg-violet-100 dark:bg-violet-950 text-violet-600 dark:text-violet-400 flex items-center justify-center">
            <Gift size={16} />
          </div>
          <div className={isCollapsed ? 'hidden' : 'block'}>
            <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Invita a un amigo
            </h5>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              y obtén 1 mes gratis
            </p>
          </div>
        </div>
        <button className={`${isCollapsed ? 'hidden' : 'block'} w-full py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs transition-colors shadow-sm`}>
          Invitar ahora
        </button>
      </div>

      {/* Theme Selector / Bottom Settings */}
      <div className={`${isCollapsed ? 'justify-center p-3' : 'justify-between p-4'} border-t border-slate-200 dark:border-slate-800 flex items-center gap-2`}>
        <span className={`${isCollapsed ? 'hidden' : 'block'} text-xs text-slate-400 dark:text-slate-500`}>
          v2.0.0
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => signOut()}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
          >
            <LogOut size={18} />
          </button>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
            title={theme === 'dark' ? 'Activar Modo Claro' : 'Activar Modo Oscuro'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>
    </aside>
  );
};
