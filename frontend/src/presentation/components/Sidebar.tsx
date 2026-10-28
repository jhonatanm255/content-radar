import React, { useEffect, useState } from 'react';
import { useAppStore, getActiveOwnChannel } from '../store/appStore';
import { useAuthStore } from '../store/authStore';
import {
  LayoutDashboard,
  MessageSquare,
  BarChart2,
  Users,
  Lightbulb,
  Bell,
  History,
  Settings,
  Sun,
  Moon,
  Crown,
  ChevronRight,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  LucideIcon,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { isAdminUser } from '../../domain/demoLimits';

type NavItemId = ReturnType<typeof useAppStore.getState>['currentTab'] | 'history';

interface SidebarContentProps {
  isCollapsed: boolean;
  onNavigate?: () => void;
}

const SidebarContent: React.FC<SidebarContentProps> = ({ isCollapsed, onNavigate }) => {
  const { currentTab, setTab, theme, toggleTheme, channels, selectedChannelId, alerts } = useAppStore();
  const { user, signOut } = useAuthStore();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const activeChannel = getActiveOwnChannel(channels, selectedChannelId);

  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ||
    activeChannel?.name ||
    'Jhonatan Muñoz';

  const userHandle =
    activeChannel?.handle ||
    (user?.email ? `@${user.email.split('@')[0]}` : '@jhonatanm255');

  const avatarUrl =
    activeChannel?.avatarUrl ||
    (user?.user_metadata?.avatar_url as string | undefined) ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&h=160&q=80';

  const isAdmin = isAdminUser(user?.email);

  const unreadAlertsCount =
    alerts.filter((a) => a.status === 'active' || a.status === 'triggered').length || 3;

  const navItems: Array<{
    id: string;
    targetTab: ReturnType<typeof useAppStore.getState>['currentTab'];
    label: string;
    icon: LucideIcon;
    badge?: number;
    disabled?: boolean;
  }> = [
    { id: 'dashboard', targetTab: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'comments', targetTab: 'comments', label: 'Análisis de Comentarios', icon: MessageSquare },
    { id: 'trends', targetTab: 'trends', label: 'Rendimiento de Videos', icon: BarChart2 },
    { id: 'competitors', targetTab: 'competitors', label: 'Competidores', icon: Users },
    { id: 'ideas', targetTab: 'ideas', label: 'Ideas de Contenido', icon: Lightbulb },
    { id: 'alerts', targetTab: 'alerts', label: 'Alertas', icon: Bell, badge: unreadAlertsCount },
    { id: 'history', targetTab: 'opportunities', label: 'Historial', icon: History },
    { id: 'settings', targetTab: 'settings', label: 'Configuración', icon: Settings },
    ...(isAdmin
      ? [{ id: 'admin', targetTab: 'admin' as const, label: 'Panel Admin', icon: ShieldCheck }]
      : []),
  ];

  const handleNav = (targetTab: ReturnType<typeof useAppStore.getState>['currentTab']) => {
    setTab(targetTab);
    onNavigate?.();
  };

  return (
    <div className="flex flex-col h-full bg-[#0F1424] text-slate-300">
      {/* Brand Header */}
      <div className={`h-16 flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-5'} border-b border-slate-800/80`}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25 flex-shrink-0">
            {/* Custom stylized M / radar logo */}
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 18V9l8 6 8-6v9" />
              <circle cx="12" cy="7" r="2" fill="currentColor" stroke="none" />
            </svg>
          </div>
          {!isCollapsed && (
            <span className="text-lg font-bold text-white tracking-tight">
              Content Radar
            </span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className={`flex-1 py-4 space-y-1 overflow-y-auto px-3`}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.targetTab;

          return (
            <button
              key={item.id}
              onClick={() => handleNav(item.targetTab)}
              title={isCollapsed ? item.label : undefined}
              className={`w-full flex items-center ${
                isCollapsed ? 'justify-center px-0' : 'gap-3 px-3.5'
              } py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                isActive
                  ? 'bg-[#3B82F6] text-white shadow-sm shadow-blue-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              <Icon
                size={18}
                className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}
                strokeWidth={2}
              />
              {!isCollapsed && (
                <span className="flex-1 text-left truncate">{item.label}</span>
              )}
              {!isCollapsed && item.badge !== undefined && item.badge > 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-white text-blue-600' : 'bg-rose-500 text-white'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Plan Pro Card */}
      {!isCollapsed ? (
        <div className="mx-3.5 mb-4 p-4 rounded-2xl bg-[#151C30] border border-slate-700/60 flex flex-col gap-3 relative overflow-hidden shadow-inner">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-amber-400/20 text-amber-400 flex items-center justify-center flex-shrink-0">
              <Crown size={14} />
            </div>
            <h5 className="text-xs font-bold text-white tracking-tight">Plan Pro</h5>
          </div>
          <p className="text-[11px] text-slate-400 leading-tight">
            Análisis ilimitados<br />
            Hasta 10 canales
          </p>
          <button
            onClick={() => handleNav('settings')}
            className="w-full py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all text-center"
          >
            Upgrade
          </button>
        </div>
      ) : (
        <div className="mx-2 mb-3 flex justify-center">
          <button
            onClick={() => handleNav('settings')}
            title="Plan Pro - Upgrade"
            className="w-9 h-9 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-amber-300 flex items-center justify-center shadow-md shadow-blue-500/20"
          >
            <Crown size={16} />
          </button>
        </div>
      )}

      {/* User Profile Bar */}
      <div className="relative p-3 border-t border-slate-800/80 bg-[#0C101D]">
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} p-1.5 rounded-xl hover:bg-white/[0.05] transition-colors text-left`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative">
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-8 h-8 rounded-full object-cover ring-2 ring-blue-500/30 flex-shrink-0"
                onError={(e) => {
                  // Fallback to avatar with initial
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-[#0C101D]" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold text-white truncate">{displayName}</h4>
                <p className="text-[10px] text-slate-400 truncate">{userHandle}</p>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <ChevronRight size={14} className="text-slate-400 flex-shrink-0" />
          )}
        </button>

        {/* User Popover Menu */}
        {showUserMenu && (
          <div className="absolute bottom-16 left-3 right-3 bg-[#172036] border border-slate-700/80 rounded-xl p-2 shadow-xl z-50 flex flex-col gap-1">
            <button
              onClick={() => {
                toggleTheme();
                setShowUserMenu(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-200 hover:bg-white/[0.08] transition-colors"
            >
              {theme === 'dark' ? <Sun size={14} className="text-amber-400" /> : <Moon size={14} className="text-indigo-400" />}
              <span>{theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}</span>
            </button>
            <button
              onClick={() => {
                signOut();
                setShowUserMenu(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              <LogOut size={14} />
              <span>Cerrar sesión</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

interface SidebarProps {
  isMobileOpen?: boolean;
  setIsMobileOpen?: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isMobileOpen: externalMobileOpen,
  setIsMobileOpen: setExternalMobileOpen,
}) => {
  const [internalMobileOpen, setInternalMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const isMobileOpen = externalMobileOpen !== undefined ? externalMobileOpen : internalMobileOpen;
  const setIsMobileOpen = setExternalMobileOpen || setInternalMobileOpen;

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setIsMobileOpen]);

  return (
    <>
      {/* Mobile drawer overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 flex flex-col bg-[#0F1424] shadow-2xl transition-transform duration-300 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none'
        }`}
        aria-hidden={!isMobileOpen}
      >
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold">
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 18V9l8 6 8-6v9" />
                <circle cx="12" cy="7" r="2" fill="currentColor" stroke="none" />
              </svg>
            </div>
            <span className="text-base font-bold text-white">Content Radar</span>
          </div>
          <button
            onClick={() => setIsMobileOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08]"
            aria-label="Cerrar menú"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <SidebarContent isCollapsed={false} onNavigate={() => setIsMobileOpen(false)} />
        </div>
      </aside>

      {/* Desktop sidebar */}
      <div
        className={`hidden lg:block relative flex-shrink-0 z-30 h-full transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-20' : 'w-60'
        }`}
      >
        <aside className="flex flex-col h-full w-full border-r border-[#1E2638] bg-[#0F1424]">
          <SidebarContent isCollapsed={isCollapsed} />
        </aside>

        {/* Collapse toggle button */}
        <button
          onClick={() => setIsCollapsed((prev) => !prev)}
          className="absolute right-0 top-6 translate-x-1/2 z-50 w-7 h-7 flex items-center justify-center rounded-full border border-slate-700/80 bg-[#151C30] text-slate-300 hover:text-white hover:bg-[#1E2638] shadow-lg transition-all duration-150"
          title={isCollapsed ? 'Expandir sidebar' : 'Contraer sidebar'}
          aria-label={isCollapsed ? 'Expandir sidebar' : 'Contraer sidebar'}
        >
          {isCollapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
        </button>
      </div>
    </>
  );
};
