import React, { useEffect, useState } from 'react';
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
  LogOut,
  Menu,
  X,
} from 'lucide-react';

type NavItemId = ReturnType<typeof useAppStore.getState>['currentTab'];

interface SidebarContentProps {
  isCollapsed: boolean;
  onNavigate?: () => void;
}

const SidebarContent: React.FC<SidebarContentProps> = ({ isCollapsed, onNavigate }) => {
  const { currentTab, setTab, theme, toggleTheme, channels, selectedChannelId } = useAppStore();
  const { user, signOut } = useAuthStore();

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

  const handleNav = (id: NavItemId) => {
    setTab(id);
    onNavigate?.();
  };

  return (
    <>
      {/* User Profile Info */}
      <div
        className={`${isCollapsed ? 'p-4 justify-center' : 'p-5'} flex items-center gap-3 border-b border-slate-100 dark:border-slate-800/50`}
      >
        <ChannelAvatar
          src={activeChannel?.avatarUrl}
          name={activeChannel?.name ?? displayName}
          size="md"
          className="border-2 border-violet-500/30 flex-shrink-0"
        />
        <div className={`${isCollapsed ? 'hidden' : 'block'} flex-1 min-w-0`}>
          <div className="flex items-center gap-1.5">
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
              {activeChannel?.name ?? displayName}
            </h4>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 uppercase tracking-wider flex-shrink-0">
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
              onClick={() => handleNav(item.id)}
              title={isCollapsed ? item.label : undefined}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-3'} py-3 lg:py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-violet-50 dark:bg-violet-950/45 text-violet-600 dark:text-violet-400'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Icon
                size={18}
                className={
                  isActive ? 'text-violet-600 dark:text-violet-400' : 'text-slate-400 dark:text-slate-500'
                }
              />
              <span className={isCollapsed ? 'hidden' : 'block truncate'}>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Promo Card Bottom */}
      <div
        className={`${isCollapsed ? 'mx-3 p-2 items-center' : 'mx-4 p-4'} mb-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800/50 flex flex-col gap-3 relative overflow-hidden`}
      >
        <div className="absolute -right-4 -bottom-4 opacity-10 dark:opacity-5 text-violet-500">
          <Gift size={80} />
        </div>
        <div className={`flex items-start gap-2.5 ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="p-1.5 rounded-lg bg-violet-100 dark:bg-violet-950 text-violet-600 dark:text-violet-400 flex items-center justify-center">
            <Gift size={16} />
          </div>
          <div className={isCollapsed ? 'hidden' : 'block'}>
            <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">Invita a un amigo</h5>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              y obtén 1 mes gratis
            </p>
          </div>
        </div>
        <button
          className={`${isCollapsed ? 'hidden' : 'block'} w-full py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs transition-colors shadow-sm`}
        >
          Invitar ahora
        </button>
      </div>

      {/* Theme Selector / Bottom Settings */}
      <div
        className={`${isCollapsed ? 'justify-center p-3' : 'justify-between p-4'} border-t border-slate-200 dark:border-slate-800 flex items-center gap-2`}
      >
        <span className={`${isCollapsed ? 'hidden' : 'block'} text-xs text-slate-400 dark:text-slate-500`}>
          v2.0.0
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => signOut()}
            className="p-2.5 lg:p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
          >
            <LogOut size={18} />
          </button>
          <button
            onClick={toggleTheme}
            className="p-2.5 lg:p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
            title={theme === 'dark' ? 'Activar Modo Claro' : 'Activar Modo Oscuro'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>
    </>
  );
};

const BrandLogo: React.FC<{ showTitle?: boolean; compact?: boolean }> = ({
  showTitle = true,
  compact = false,
}) => (
  <div className={`flex items-center gap-3 min-w-0 ${compact ? '' : ''}`}>
    <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center text-white shadow-md shadow-violet-500/20 flex-shrink-0">
      <Radio size={20} className="animate-pulse" />
    </div>
    {showTitle && (
      <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-violet-600 to-indigo-500 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent whitespace-nowrap">
        Creator Radar
      </span>
    )}
  </div>
);

export const Sidebar: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileOpen]);

  return (
    <>
      {/* Mobile top bar */}
      <header className="lg:hidden flex-shrink-0 h-14 px-4 flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 backdrop-blur-md z-30">
        <button
          onClick={() => setIsMobileOpen(true)}
          className="w-10 h-10 flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Abrir menú"
        >
          <Menu size={22} />
        </button>
        <BrandLogo />
        <div className="w-10" aria-hidden="true" />
      </header>

      {/* Mobile drawer overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-[min(18rem,88vw)] flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-2xl transition-transform duration-300 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none'
        }`}
        aria-hidden={!isMobileOpen}
      >
        <div className="h-14 px-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
          <BrandLogo />
          <button
            onClick={() => setIsMobileOpen(false)}
            className="w-10 h-10 flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Cerrar menú"
          >
            <X size={22} />
          </button>
        </div>
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <SidebarContent isCollapsed={false} onNavigate={() => setIsMobileOpen(false)} />
        </div>
      </aside>

      {/* Desktop sidebar */}
      <div
        className={`hidden lg:block relative flex-shrink-0 z-30 h-full transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        <aside className="flex flex-col h-full w-full border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 backdrop-blur-md">
          {/* Brand Header — full app name */}
          <div
            className={`${
              isCollapsed ? 'px-4 justify-center' : 'px-6'
            } h-[81px] flex items-center gap-3 border-b border-slate-200 dark:border-slate-800`}
          >
            <div className={`flex items-center gap-3 min-w-0 ${isCollapsed ? 'justify-center' : ''}`}>
              <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center text-white shadow-md shadow-violet-500/20 flex-shrink-0">
                <Radio size={20} className="animate-pulse" />
              </div>
              <span
                className={`${
                  isCollapsed ? 'hidden' : 'block'
                } text-xl font-bold bg-gradient-to-r from-violet-600 to-indigo-500 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent whitespace-nowrap`}
              >
                Creator Radar
              </span>
            </div>
          </div>

          <SidebarContent isCollapsed={isCollapsed} />
        </aside>

        {/* Collapse toggle — centered on the sidebar/main border */}
        <button
          onClick={() => setIsCollapsed((value) => !value)}
          className="absolute right-0 top-7 translate-x-1/2 z-50 w-7 h-7 flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200 shadow-md transition-colors"
          title={isCollapsed ? 'Expandir sidebar' : 'Contraer sidebar'}
          aria-label={isCollapsed ? 'Expandir sidebar' : 'Contraer sidebar'}
        >
          {isCollapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
        </button>
      </div>
    </>
  );
};
