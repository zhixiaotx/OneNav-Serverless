import React, { useState, useRef, useEffect } from 'react';
import {
  BookmarkPlus,
  Cloud,
  CloudCheck,
  CloudOff,
  FolderKanban,
  Lock,
  Moon,
  Monitor,
  RefreshCw,
  Rocket,
  Sun,
  Unlock,
  SlidersHorizontal,
  LayoutGrid,
  List,
  Grid2x2,
  Palette,
  Settings as SettingsIcon,
  ChevronDown,
  Check,
  Menu,
} from 'lucide-react';
import { AppSettings, CardLayout, SyncConfig, ThemeMode } from '../types';

interface NavbarProps {
  settings: AppSettings;
  syncConfig: SyncConfig;
  isUnlocked: boolean;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onOpenAddBookmark: () => void;
  onOpenCategories: () => void;
  onOpenSyncSettings: (defaultTab?: string) => void;
  onOpenUnlockModal: () => void;
  onOpenWallpaperModal: () => void;
  onLockPrivate: () => void;
  onTriggerSync: () => void;
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  settings,
  syncConfig,
  isUnlocked,
  onUpdateSettings,
  onOpenAddBookmark,
  onOpenCategories,
  onOpenSyncSettings,
  onOpenUnlockModal,
  onOpenWallpaperModal,
  onLockPrivate,
  onTriggerSync,
  onToggleSidebar,
}) => {
  const [isDarkState, setIsDarkState] = useState(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return settings.themeMode === 'dark';
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkDark = () => {
      setIsDarkState(document.documentElement.classList.contains('dark'));
    };
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [settings.themeMode]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleTheme = () => {
    const isCurrentlyDark = document.documentElement.classList.contains('dark');
    const nextMode: ThemeMode = isCurrentlyDark ? 'light' : 'dark';
    onUpdateSettings({ themeMode: nextMode });
  };

  const cycleLayout = () => {
    const layouts: CardLayout[] = ['cards', 'compact', 'minimal'];
    const nextIdx = (layouts.indexOf(settings.cardLayout) + 1) % layouts.length;
    onUpdateSettings({ cardLayout: layouts[nextIdx] });
  };

  const getSyncBadge = () => {
    if (syncConfig.provider === 'none') return null;

    if (syncConfig.lastSyncStatus === 'syncing') {
      return (
        <button
          id="btn-sync-syncing"
          disabled
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/60 rounded-full animate-pulse backdrop-blur-md"
        >
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-500" />
          <span className="hidden sm:inline">同步中...</span>
        </button>
      );
    }

    if (syncConfig.lastSyncStatus === 'error') {
      return (
        <button
          id="btn-sync-error"
          onClick={() => onOpenSyncSettings('gist')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-red-700 dark:text-red-300 bg-red-50/80 dark:bg-red-950/40 border border-red-200/60 dark:border-red-800/60 rounded-full hover:bg-red-100/80 backdrop-blur-md transition-colors"
          title={syncConfig.lastSyncError || '同步遇到问题，点击查看'}
        >
          <CloudOff className="w-3.5 h-3.5 text-red-500" />
          <span className="hidden sm:inline">同步异常</span>
        </button>
      );
    }

    // Success or idle
    const getProviderName = () => {
      switch (syncConfig.provider) {
        case 'cloudflare_d1':
          return 'D1已同步';
        case 'cloudflare_kv':
          return 'KV已同步';
        case 'gist':
          return 'Gist已同步';
        case 'github_repo':
          return 'Repo已同步';
        case 'webdav':
          return 'WebDAV已同步';
        default:
          return '云同步就绪';
      }
    };

    return (
      <button
        id="btn-sync-status"
        onClick={onTriggerSync}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60 rounded-full hover:bg-emerald-100/90 dark:hover:bg-emerald-900/40 backdrop-blur-md transition-colors"
        title="云端同步已开启，点击立即刷新同步"
      >
        <CloudCheck className="w-3.5 h-3.5 text-emerald-500" />
        <span className="hidden sm:inline">{getProviderName()}</span>
      </button>
    );
  };

  return (
    <header
      id="app-navbar"
      className="sticky top-0 z-30 w-full backdrop-blur-2xl bg-white/70 dark:bg-slate-950/70 shadow-2xs transition-colors"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand Logo & Title */}
        <div className="flex items-center gap-2 sm:gap-3">
          {onToggleSidebar && (
            <button
              id="btn-toggle-mobile-sidebar"
              onClick={onToggleSidebar}
              className="md:hidden p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors shrink-0"
              title="展开/收起导航分类"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-sm shadow-blue-500/25 ring-1 ring-white/20 shrink-0">
            {settings.logoText ? settings.logoText.slice(0, 1).toUpperCase() : 'O'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base sm:text-lg text-slate-900 dark:text-slate-100 tracking-tight leading-none">
                {settings.title}
              </h1>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Sync Badge */}
          {getSyncBadge()}

          {/* Theme Quick Toggle */}
          <button
            id="btn-toggle-theme"
            onClick={toggleTheme}
            className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-transparent hover:bg-slate-200/50 dark:hover:bg-slate-800/50 border border-slate-300/60 dark:border-slate-700/60 rounded-full transition-colors"
            title={isDarkState ? '当前：暗黑模式 (点击切换为明亮模式)' : '当前：明亮模式 (点击切换为暗黑模式)'}
          >
            {isDarkState ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700 dark:text-slate-200" />}
          </button>

          {/* Unified Settings Dropdown Button */}
          <div className="relative" ref={dropdownRef}>
            <button
              id="btn-open-settings-dropdown"
              type="button"
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className={`flex items-center gap-1.5 p-2 sm:px-3 sm:py-2 text-xs font-medium rounded-full border transition-all ${
                isSettingsOpen
                  ? 'text-blue-600 dark:text-blue-400 border-blue-500 bg-transparent'
                  : 'text-slate-700 dark:text-slate-200 border-slate-300/60 dark:border-slate-700/60 bg-transparent hover:bg-slate-100/50 dark:hover:bg-slate-800/50'
              }`}
              title="系统综合设置菜单"
            >
              <SettingsIcon className={`w-4 h-4 ${isSettingsOpen ? 'animate-spin-slow' : ''}`} />
              <span className="hidden sm:inline font-semibold">设置</span>
              <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isSettingsOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Settings Menu Dropdown */}
            {isSettingsOpen && (
              <div
                id="settings-dropdown-menu"
                className="absolute right-0 top-full mt-2 w-64 rounded-3xl border shadow-2xl overflow-hidden z-50 backdrop-blur-2xl bg-white/95 dark:bg-slate-900/95 border-white/60 dark:border-white/10 p-2 animate-in fade-in slide-in-from-top-2 duration-150 space-y-1"
              >
                {/* 0. Add New Bookmark (Moved inside Settings dropdown) */}
                <button
                  id="btn-add-bookmark"
                  type="button"
                  onClick={() => {
                    onOpenAddBookmark();
                    setIsSettingsOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-2xl text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50/80 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors border border-blue-200/60 dark:border-blue-800/60"
                >
                  <div className="flex items-center gap-2.5">
                    <BookmarkPlus className="w-4 h-4 text-blue-500" />
                    <span>添加新书签</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-normal">快捷</span>
                </button>

                {/* 1. Category Management */}
                <button
                  id="btn-manage-categories"
                  type="button"
                  onClick={() => {
                    onOpenCategories();
                    setIsSettingsOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-2xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <FolderKanban className="w-4 h-4 text-blue-500" />
                    <span>分类与排序管理</span>
                  </div>
                </button>

                {/* 2. Card Layout Mode Switcher */}
                <button
                  id="btn-switch-layout"
                  type="button"
                  onClick={() => {
                    cycleLayout();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-2xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    {settings.cardLayout === 'cards' && <LayoutGrid className="w-4 h-4 text-indigo-500" />}
                    {settings.cardLayout === 'compact' && <List className="w-4 h-4 text-indigo-500" />}
                    {settings.cardLayout === 'minimal' && <Grid2x2 className="w-4 h-4 text-indigo-500" />}
                    <span>视图模式</span>
                  </div>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">
                    {settings.cardLayout === 'cards'
                      ? '标准卡片'
                      : settings.cardLayout === 'compact'
                      ? '紧凑列表'
                      : '极简图标'}
                  </span>
                </button>

                {/* 3. Wallpaper Settings */}
                <button
                  id="btn-open-wallpaper"
                  type="button"
                  onClick={() => {
                    onOpenWallpaperModal();
                    setIsSettingsOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-2xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Palette className="w-4 h-4 text-pink-500" />
                    <span>壁纸与沉浸外观</span>
                  </div>
                  {settings.wallpaper && settings.wallpaper.type !== 'none' && (
                    <span className="w-2 h-2 rounded-full bg-pink-500" />
                  )}
                </button>

                {/* 4. Password Lock / Unlock */}
                {settings.masterPasswordHash ? (
                  isUnlocked ? (
                    <button
                      id="btn-lock-private"
                      type="button"
                      onClick={() => {
                        onLockPrivate();
                        setIsSettingsOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-2xl text-xs font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <Unlock className="w-4 h-4 text-emerald-500" />
                        <span>重新锁定私密书签</span>
                      </div>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    </button>
                  ) : (
                    <button
                      id="btn-unlock-private"
                      type="button"
                      onClick={() => {
                        onOpenUnlockModal();
                        setIsSettingsOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-2xl text-xs font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                    >
                      <Lock className="w-4 h-4 text-amber-500" />
                      <span>解锁私密书签</span>
                    </button>
                  )
                ) : (
                  <button
                    id="btn-setup-password"
                    type="button"
                    onClick={() => {
                      onOpenUnlockModal();
                      setIsSettingsOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-2xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-colors"
                  >
                    <Lock className="w-4 h-4 text-slate-400" />
                    <span>设置访问主密码</span>
                  </button>
                )}

                <div className="my-1 border-t border-slate-200/60 dark:border-white/10" />

                {/* 5. Deploy & Sync Settings */}
                <button
                  id="btn-open-sync-settings"
                  type="button"
                  onClick={() => {
                    onOpenSyncSettings('deploy');
                    setIsSettingsOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-2xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Rocket className="w-4 h-4 text-indigo-500" />
                    <span>无服务器部署与云同步</span>
                  </div>
                </button>

                {/* 5.5. Bookmark & Category Management */}
                <button
                  id="btn-open-bookmarks-manage"
                  type="button"
                  onClick={() => {
                    onOpenSyncSettings('bookmarks_manage');
                    setIsSettingsOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-2xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <FolderKanban className="w-4 h-4 text-purple-500" />
                    <span>书签与分类批量管理</span>
                  </div>
                </button>

                {/* 6. General Site Settings */}
                <button
                  id="btn-open-general-settings"
                  type="button"
                  onClick={() => {
                    onOpenSyncSettings('general');
                    setIsSettingsOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-2xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <SlidersHorizontal className="w-4 h-4 text-teal-500" />
                    <span>站点名称 &amp; 备案信息</span>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

