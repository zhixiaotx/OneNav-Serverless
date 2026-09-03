import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Bookmark,
  Category,
  AppSettings,
  SyncConfig,
  OneNavSyncPayload,
  APP_VERSION,
} from './types';
import {
  getStoredBookmarks,
  getStoredCategories,
  getStoredSettings,
  getStoredSyncConfig,
  isPrivateUnlockedSession,
  reorderBookmarksList,
  saveStoredBookmarks,
  saveStoredCategories,
  saveStoredSettings,
  saveStoredSyncConfig,
  setPrivateUnlockedSession,
} from './utils/storage';
import {
  pullRemoteData,
  pushRemoteData,
  mergeSyncData,
  SYNC_DATA_VERSION,
} from './services/syncService';
import { Navbar } from './components/Navbar';
import { SearchHeader } from './components/SearchHeader';
import { Sidebar } from './components/Sidebar';
import { BookmarkGrid } from './components/BookmarkGrid';
import { AddEditBookmarkModal } from './components/AddEditBookmarkModal';
import { CategoryModal } from './components/CategoryModal';
import { SyncSettingsModal } from './components/SyncSettingsModal';
import { UnlockModal } from './components/UnlockModal';
import { SyncErrorToast } from './components/SyncErrorToast';
import { WallpaperModal } from './components/WallpaperModal';
import { BING_TODAY_URL } from './services/wallpaperService';
import { Github, Globe, Heart, Sparkles, CloudCheck, Layers, ShieldCheck, SlidersHorizontal, ArrowUp } from 'lucide-react';

export default function App() {
  // Primary States
  const [categories, setCategories] = useState<Category[]>(getStoredCategories);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(getStoredBookmarks);
  const [settings, setSettings] = useState<AppSettings>(getStoredSettings);
  const [syncConfig, setSyncConfig] = useState<SyncConfig>(getStoredSyncConfig);
  const [isUnlocked, setIsUnlocked] = useState<boolean>(isPrivateUnlockedSession);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // Filter & Search States
  const [activeCategoryId, setActiveCategoryId] = useState<string>('all');
  const [activeEngineId, setActiveEngineId] = useState<string>('local');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Modal Dialog States
  const [isAddBookmarkOpen, setIsAddBookmarkOpen] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null);
  const [initialAddCategory, setInitialAddCategory] = useState<string | undefined>(undefined);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [syncModalDefaultTab, setSyncModalDefaultTab] = useState<string>('gist');
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
  const [isWallpaperOpen, setIsWallpaperOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Sync ref to prevent loop
  const isSyncingRef = useRef(false);
  const pushDebounceTimerRef = useRef<any>(null);

  // Dark mode effect with prefers-color-scheme system listener
  useEffect(() => {
    const applyTheme = () => {
      if (settings.themeMode === 'dark') {
        document.documentElement.classList.add('dark');
      } else if (settings.themeMode === 'light') {
        document.documentElement.classList.remove('dark');
      } else if (settings.themeMode === 'system') {
        const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (isSystemDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    };

    applyTheme();

    if (settings.themeMode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        if (e.matches) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      };

      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleChange);
      } else {
        mediaQuery.addListener(handleChange);
      }

      return () => {
        if (mediaQuery.removeEventListener) {
          mediaQuery.removeEventListener('change', handleChange);
        } else {
          mediaQuery.removeListener(handleChange);
        }
      };
    }
  }, [settings.themeMode]);

  // Dynamic Title and Meta Tags (SEO, Page Identity & Open Graph Social Sharing)
  useEffect(() => {
    const defaultTitle = settings.title
      ? `${settings.title}${settings.subtitle ? ' - ' + settings.subtitle : ''}`
      : 'OneNav Serverless - 无服务器轻量级书签导航与自动同步系统';
    const defaultDesc =
      settings.subtitle ||
      settings.title ||
      '免服务器的轻量级个人书签导航，支持GitHub Pages、Vercel、Cloudflare Pages与Netlify等无服务器环境部署并实现数据自动同步';

    const finalTitle = settings.metaTitle?.trim() || defaultTitle;
    const finalDesc = settings.metaDescription?.trim() || defaultDesc;
    const finalOgTitle = settings.ogTitle?.trim() || finalTitle;
    const finalOgDesc = settings.ogDescription?.trim() || finalDesc;
    const finalOgImage = settings.ogImage?.trim() || '';
    const finalOgUrl = settings.ogUrl?.trim() || (typeof window !== 'undefined' ? window.location.href : '');
    const finalOgSiteName = settings.ogSiteName?.trim() || settings.title || 'OneNav Serverless';
    const finalKeywords = settings.metaKeywords?.trim() || '';

    // 1. Update document <title>
    document.title = finalTitle;

    // Helper to update or create meta tag
    const setMetaTag = (attrName: 'name' | 'property', attrValue: string, content: string) => {
      let tag = document.querySelector(`meta[${attrName}="${attrValue}"]`);
      if (!content) {
        if (tag) tag.remove();
        return;
      }
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(attrName, attrValue);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };

    // 2. Standard Meta Tags
    setMetaTag('name', 'description', finalDesc);
    setMetaTag('name', 'keywords', finalKeywords);
    if (settings.developerName) {
      setMetaTag('name', 'author', settings.developerName);
    }

    // 3. Open Graph Meta Tags
    setMetaTag('property', 'og:title', finalOgTitle);
    setMetaTag('property', 'og:description', finalOgDesc);
    setMetaTag('property', 'og:type', settings.ogType || 'website');
    setMetaTag('property', 'og:site_name', finalOgSiteName);
    if (finalOgImage) {
      setMetaTag('property', 'og:image', finalOgImage);
      setMetaTag('name', 'twitter:image', finalOgImage);
    } else {
      setMetaTag('property', 'og:image', '');
      setMetaTag('name', 'twitter:image', '');
    }
    if (finalOgUrl) {
      setMetaTag('property', 'og:url', finalOgUrl);
    }

    // 4. Twitter Card Meta Tags
    setMetaTag('name', 'twitter:card', settings.twitterCard || 'summary_large_image');
    setMetaTag('name', 'twitter:title', finalOgTitle);
    setMetaTag('name', 'twitter:description', finalOgDesc);
  }, [
    settings.title,
    settings.subtitle,
    settings.metaTitle,
    settings.metaDescription,
    settings.metaKeywords,
    settings.ogTitle,
    settings.ogDescription,
    settings.ogImage,
    settings.ogUrl,
    settings.ogType,
    settings.ogSiteName,
    settings.twitterCard,
    settings.developerName,
  ]);

  // Persist Categories & Bookmarks
  const handleUpdateCategories = (newCategories: Category[], updatedBookmarks?: Bookmark[]) => {
    setCategories(newCategories);
    saveStoredCategories(newCategories);
    if (updatedBookmarks) {
      setBookmarks(updatedBookmarks);
      saveStoredBookmarks(updatedBookmarks);
    }
    triggerAutoPush(newCategories, updatedBookmarks || bookmarks);
  };

  const handleUpdateBookmarks = (newBookmarks: Bookmark[]) => {
    setBookmarks(newBookmarks);
    saveStoredBookmarks(newBookmarks);
    triggerAutoPush(categories, newBookmarks);
  };

  const handleUpdateSettings = (newSettings: Partial<AppSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    saveStoredSettings(updated);
  };

  const handleUpdateSyncConfig = (newConfig: SyncConfig) => {
    setSyncConfig(newConfig);
    saveStoredSyncConfig(newConfig);
  };

  // Trigger Debounced Auto Push to Remote
  const triggerAutoPush = (currentCats: Category[], currentBms: Bookmark[]) => {
    if (!syncConfig.autoSync || syncConfig.provider === 'none') return;
    if (syncConfig.provider === 'gist' && (!syncConfig.gist.token || !syncConfig.gist.gistId)) return;
    if (syncConfig.provider === 'cloudflare_kv' && (!syncConfig.cloudflareKv.accountId || !syncConfig.cloudflareKv.apiToken)) return;
    if (syncConfig.provider === 'cloudflare_d1' && (!syncConfig.cloudflareD1.accountId || !syncConfig.cloudflareD1.apiToken)) return;

    if (pushDebounceTimerRef.current) {
      clearTimeout(pushDebounceTimerRef.current);
    }

    pushDebounceTimerRef.current = setTimeout(async () => {
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;

      setSyncConfig((prev) => ({
        ...prev,
        lastSyncStatus: 'syncing',
      }));

      const payload: OneNavSyncPayload = {
        version: SYNC_DATA_VERSION,
        updatedAt: Date.now(),
        categories: currentCats,
        bookmarks: currentBms,
        settings,
      };

      const res = await pushRemoteData(syncConfig, payload);
      isSyncingRef.current = false;

      if (res.success) {
        const updatedConfig: SyncConfig = {
          ...syncConfig,
          lastSyncTime: Date.now(),
          lastSyncStatus: 'success',
          lastSyncError: null,
        };
        setSyncConfig(updatedConfig);
        saveStoredSyncConfig(updatedConfig);
      } else {
        const updatedConfig: SyncConfig = {
          ...syncConfig,
          lastSyncStatus: 'error',
          lastSyncError: res.message,
        };
        setSyncConfig(updatedConfig);
        saveStoredSyncConfig(updatedConfig);
      }
    }, 2000); // 2-second debounce
  };

  // Manual Trigger Sync / Refresh
  const handleManualTriggerSync = async () => {
    if (syncConfig.provider === 'none') {
      setSyncModalDefaultTab('gist');
      setIsSyncModalOpen(true);
      return;
    }

    isSyncingRef.current = true;
    setSyncConfig((prev) => ({
      ...prev,
      lastSyncStatus: 'syncing',
    }));

    const pullRes = await pullRemoteData(syncConfig);
    isSyncingRef.current = false;

    if (pullRes.success && pullRes.data) {
      const { categories: mergedCats, bookmarks: mergedBms } = mergeSyncData(
        categories,
        bookmarks,
        pullRes.data
      );

      setCategories(mergedCats);
      saveStoredCategories(mergedCats);
      setBookmarks(mergedBms);
      saveStoredBookmarks(mergedBms);

      const updatedConfig: SyncConfig = {
        ...syncConfig,
        lastSyncTime: Date.now(),
        lastSyncStatus: 'success',
        lastSyncError: null,
      };
      setSyncConfig(updatedConfig);
      saveStoredSyncConfig(updatedConfig);
    } else {
      const updatedConfig: SyncConfig = {
        ...syncConfig,
        lastSyncStatus: 'error',
        lastSyncError: pullRes.message,
      };
      setSyncConfig(updatedConfig);
      saveStoredSyncConfig(updatedConfig);
    }
  };

  // Background Periodic Auto Sync
  useEffect(() => {
    if (!syncConfig.autoSync || syncConfig.provider === 'none') return;
    if (syncConfig.provider === 'gist' && (!syncConfig.gist.token || !syncConfig.gist.gistId)) return;

    const intervalMs = (syncConfig.syncIntervalMinutes || 10) * 60 * 1000;
    const timer = setInterval(() => {
      handleManualTriggerSync();
    }, intervalMs);

    return () => clearInterval(timer);
  }, [syncConfig, categories, bookmarks]);

  // Initial Pull on Load (if configured)
  useEffect(() => {
    if (syncConfig.autoSync && syncConfig.provider !== 'none') {
      if (syncConfig.provider === 'gist' && syncConfig.gist.token && syncConfig.gist.gistId) {
        handleManualTriggerSync();
      }
    }
  }, []);

  // Filter private bookmarks if locked
  const visibleBookmarks = useMemo(() => {
    return bookmarks.filter((bm) => {
      if (bm.isPrivate) {
        if (!settings.masterPasswordHash) return true;
        return isUnlocked;
      }
      return true;
    });
  }, [bookmarks, settings.masterPasswordHash, isUnlocked]);

  // Count pinned
  const pinnedCount = useMemo(() => {
    return visibleBookmarks.filter((b) => b.isPinned).length;
  }, [visibleBookmarks]);

  // Bookmark Actions
  const handleBookmarkClick = (bm: Bookmark) => {
    const updated = bookmarks.map((b) =>
      b.id === bm.id ? { ...b, clicks: (b.clicks || 0) + 1 } : b
    );
    setBookmarks(updated);
    saveStoredBookmarks(updated);
  };

  const handleTogglePin = (bm: Bookmark) => {
    const updated = bookmarks.map((b) =>
      b.id === bm.id ? { ...b, isPinned: !b.isPinned } : b
    );
    handleUpdateBookmarks(updated);
  };

  const handleReorderBookmarks = (activeId: string, overId: string, targetCategoryId?: string) => {
    const updated = reorderBookmarksList(bookmarks, activeId, overId, targetCategoryId);
    setBookmarks(updated);
    triggerAutoPush(categories, updated);
  };

  const handleDeleteBookmark = (bmId: string) => {
    if (window.confirm('确定要删除这个书签吗？')) {
      const updated = bookmarks.filter((b) => b.id !== bmId);
      handleUpdateBookmarks(updated);
    }
  };

  const handleSaveBookmark = (data: Partial<Bookmark>) => {
    if (editingBookmark) {
      // update
      const updated = bookmarks.map((b) =>
        b.id === editingBookmark.id
          ? {
              ...b,
              ...data,
              updatedAt: Date.now(),
            }
          : b
      );
      handleUpdateBookmarks(updated);
      setEditingBookmark(null);
    } else {
      // create new
      const newBm: Bookmark = {
        id: 'bm-' + Date.now(),
        categoryId: data.categoryId || categories[0]?.id || 'cat-dev',
        title: data.title || '新书签',
        url: data.url || 'https://',
        icon: data.icon,
        description: data.description,
        tags: data.tags,
        isPrivate: Boolean(data.isPrivate),
        isPinned: Boolean(data.isPinned),
        order: bookmarks.length + 1,
        clicks: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      handleUpdateBookmarks([newBm, ...bookmarks]);
    }
  };

  // Lock Private Session
  const handleLockPrivate = () => {
    setIsUnlocked(false);
    setPrivateUnlockedSession(false);
  };

  const hasWallpaper = settings.wallpaper && settings.wallpaper.type !== 'none';

  return (
    <div className="min-h-screen flex flex-col relative text-slate-900 dark:text-slate-100 transition-colors">
      {/* Dynamic Custom Wallpaper Layer */}
      {hasWallpaper && (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          {settings.wallpaper.type === 'gradient' ? (
            <div
              className="absolute inset-0 w-full h-full"
              style={{
                background: settings.wallpaper.gradient,
                filter: `blur(${settings.wallpaper.blur || 0}px) brightness(${
                  settings.wallpaper.brightness || 100
                }%)`,
                transform: settings.wallpaper.blur ? 'scale(1.05)' : 'none',
              }}
            />
          ) : (
            <div
              className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat transition-all duration-700"
              style={{
                backgroundImage: `url(${settings.wallpaper.url})`,
                filter: `blur(${settings.wallpaper.blur || 0}px) brightness(${
                  settings.wallpaper.brightness || 100
                }%)`,
                transform: settings.wallpaper.blur ? 'scale(1.05)' : 'none',
              }}
            />
          )}

          {/* Mask Overlay for Readability */}
          <div
            className="absolute inset-0 bg-slate-900 transition-opacity duration-300"
            style={{
              opacity: (settings.wallpaper.opacity ?? 25) / 100,
            }}
          />
        </div>
      )}

      {/* Default Base Background with ambient glass glow when no wallpaper is selected */}
      {!hasWallpaper && (
        <div className="fixed inset-0 pointer-events-none -z-10 bg-slate-50/80 dark:bg-[#0b1120] overflow-hidden transition-colors">
          {/* Ambient luminous orbs for frosted glass reflections */}
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-blue-400/20 dark:bg-blue-600/15 blur-[100px] pointer-events-none" />
          <div className="absolute top-1/4 -right-32 w-96 h-96 rounded-full bg-indigo-400/20 dark:bg-indigo-600/15 blur-[120px] pointer-events-none" />
          <div className="absolute bottom-10 left-1/3 w-80 h-80 rounded-full bg-sky-300/20 dark:bg-cyan-600/10 blur-[90px] pointer-events-none" />
        </div>
      )}

      {/* Main UI Content (Relative Z-10) */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Top Navigation */}
        <Navbar
          settings={settings}
          syncConfig={syncConfig}
          isUnlocked={isUnlocked}
          onUpdateSettings={handleUpdateSettings}
          onOpenAddBookmark={() => {
            setEditingBookmark(null);
            setInitialAddCategory(
              activeCategoryId !== 'all' && activeCategoryId !== 'pinned' ? activeCategoryId : undefined
            );
            setIsAddBookmarkOpen(true);
          }}
          onOpenCategories={() => setIsCategoriesOpen(true)}
          onOpenSyncSettings={(tab) => {
            setSyncModalDefaultTab(tab || 'gist');
            setIsSyncModalOpen(true);
          }}
          onOpenUnlockModal={() => setIsUnlockModalOpen(true)}
          onOpenWallpaperModal={() => setIsWallpaperOpen(true)}
          onLockPrivate={handleLockPrivate}
          onTriggerSync={handleManualTriggerSync}
          onToggleSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        />

        {/* Hero / Search Section */}
        <SearchHeader
          engines={settings.customEngines}
          activeEngineId={activeEngineId}
          onChangeEngine={(id) => {
            setActiveEngineId(id);
          }}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          bookmarks={visibleBookmarks}
          bookmarksCount={visibleBookmarks.length}
          wallpaper={settings.wallpaper}
          onBookmarkClick={handleBookmarkClick}
          openInNewTab={settings.openInNewTab}
        />

        {/* Main Layout Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-4 pb-12">
          <div className="flex gap-6 items-start">
            {/* Categories Sidebar */}
            <Sidebar
              categories={categories}
              bookmarks={visibleBookmarks}
              allBookmarks={bookmarks}
              activeCategoryId={activeCategoryId}
              onSelectCategory={(catId) => {
                setActiveCategoryId(catId);
                setSearchQuery('');
                setSelectedTag(null);
                setIsMobileSidebarOpen(false); // Auto-close drawer on category click
              }}
              onOpenAddCategory={() => setIsCategoriesOpen(true)}
              pinnedCount={pinnedCount}
              onBookmarkClick={handleBookmarkClick}
              openInNewTab={settings.openInNewTab}
              isMobileOpen={isMobileSidebarOpen}
              onCloseMobile={() => setIsMobileSidebarOpen(false)}
            />

            {/* Bookmarks Display Grid */}
            <BookmarkGrid
              categories={categories}
              bookmarks={visibleBookmarks}
              activeCategoryId={activeCategoryId}
              searchQuery={searchQuery}
              selectedTag={selectedTag}
              layout={settings.cardLayout}
              showClicks={settings.showClickCount}
              showDesc={settings.showDescription}
              openInNewTab={settings.openInNewTab}
              onBookmarkClick={handleBookmarkClick}
              onEdit={(bm) => {
                setEditingBookmark(bm);
                setIsAddBookmarkOpen(true);
              }}
              onDelete={handleDeleteBookmark}
              onTogglePin={handleTogglePin}
              onOpenAddBookmarkWithCat={(catId) => {
                setEditingBookmark(null);
                setInitialAddCategory(catId);
                setIsAddBookmarkOpen(true);
              }}
              onClearFilter={() => {
                setSearchQuery('');
                setSelectedTag(null);
              }}
              onTagClick={(tag) => setSelectedTag(tag)}
              onReorderBookmarks={handleReorderBookmarks}
            />
          </div>
        </main>

        {/* Footer: Ultra-clean transparent footer with only developer & ICP filing info */}
        <footer
          id="app-footer"
          className={`w-full pt-8 pb-12 px-4 text-center transition-colors ${
            hasWallpaper
              ? 'text-white/80 drop-shadow-sm'
              : 'text-slate-400 dark:text-slate-500'
          }`}
        >
          <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-xs">
            {/* Developer / Site Info */}
            <div className="flex items-center gap-2">
              <span>{settings.customFooterText || `© ${new Date().getFullYear()} ${settings.title}`}</span>
              {settings.developerName && (
                <>
                  <span className="opacity-40">·</span>
                  {settings.developerUrl ? (
                    <a
                      href={settings.developerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-blue-500 dark:hover:text-blue-400 transition-colors font-medium"
                    >
                      {settings.developerName}
                    </a>
                  ) : (
                    <span>{settings.developerName}</span>
                  )}
                </>
              )}
              <span className="opacity-40">·</span>
              <span className="font-mono text-[11px] opacity-75">{APP_VERSION}</span>
            </div>

            {/* ICP Filing Compliance Info */}
            {settings.icpNumber ? (
              <>
                <span className="opacity-40">·</span>
                <a
                  href={settings.icpUrl || 'https://beian.miit.gov.cn/'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-500 dark:hover:text-blue-400 transition-colors font-medium inline-flex items-center gap-1"
                  title="工信部 ICP 备案管理系统"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500/90 shrink-0" />
                  <span>{settings.icpNumber}</span>
                </a>
              </>
            ) : null}
          </div>
        </footer>
      </div>

      {/* Modals */}
      <AddEditBookmarkModal
        isOpen={isAddBookmarkOpen}
        onClose={() => {
          setIsAddBookmarkOpen(false);
          setEditingBookmark(null);
        }}
        onSave={handleSaveBookmark}
        categories={categories}
        initialCategory={initialAddCategory}
        editBookmark={editingBookmark}
      />

      <CategoryModal
        isOpen={isCategoriesOpen}
        onClose={() => setIsCategoriesOpen(false)}
        categories={categories}
        bookmarks={bookmarks}
        onSaveCategories={handleUpdateCategories}
      />

      <SyncSettingsModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        syncConfig={syncConfig}
        onUpdateSyncConfig={handleUpdateSyncConfig}
        categories={categories}
        bookmarks={bookmarks}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onApplySyncData={(newCats, newBms) => {
          setCategories(newCats);
          saveStoredCategories(newCats);
          setBookmarks(newBms);
          saveStoredBookmarks(newBms);
        }}
        defaultTab={syncModalDefaultTab}
      />

      <UnlockModal
        isOpen={isUnlockModalOpen}
        onClose={() => setIsUnlockModalOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onUnlockedSuccess={() => setIsUnlocked(true)}
      />

      {/* Wallpaper Settings Modal */}
      <WallpaperModal
        isOpen={isWallpaperOpen}
        onClose={() => setIsWallpaperOpen(false)}
        wallpaper={settings.wallpaper}
        onUpdateWallpaper={(newWp) => handleUpdateSettings({ wallpaper: newWp })}
      />

      {/* Global Toast for Sync Failures */}
      <SyncErrorToast
        syncConfig={syncConfig}
        onDismiss={() => {
          setSyncConfig((prev) => ({
            ...prev,
            lastSyncError: null,
            lastSyncStatus: 'idle',
          }));
        }}
        onRetry={handleManualTriggerSync}
        onOpenSettings={(provider) => {
          setSyncModalDefaultTab(provider || 'cloudflare_d1');
          setIsSyncModalOpen(true);
        }}
      />

      {/* Back to Top Floating Button */}
      {showScrollTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-40 p-3 rounded-2xl bg-white/80 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-lg border border-slate-200/60 dark:border-slate-700/60 backdrop-blur-md transition-all duration-300 hover:scale-105 active:scale-95 group"
          title="一键置顶"
        >
          <ArrowUp className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
        </button>
      )}
    </div>
  );
}
