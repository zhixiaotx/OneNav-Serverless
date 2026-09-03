import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  Search,
  X,
  Globe,
  ExternalLink,
  Bookmark as BookmarkIcon,
  Bot,
  Code,
  MessageSquare,
  Tv,
  Sparkles,
  History,
  Trash2,
  ArrowRight,
  TrendingUp,
  ChevronDown,
  Compass,
} from 'lucide-react';
import { Bookmark, SearchEngine, SearchEngineCategory, WallpaperConfig } from '../types';
import { DynamicIcon } from './DynamicIcon';
import {
  SEARCH_CATEGORIES,
  COMPREHENSIVE_SEARCH_ENGINES,
  fetchSearchSuggestions,
  searchLocalBookmarks,
} from '../services/searchService';
import { getFaviconUrl } from '../utils/storage';

interface SearchHeaderProps {
  engines: SearchEngine[];
  activeEngineId: string;
  onChangeEngine: (engineId: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  bookmarks: Bookmark[];
  bookmarksCount: number;
  wallpaper?: WallpaperConfig;
  onBookmarkClick?: (bm: Bookmark) => void;
  openInNewTab?: boolean;
}

export const SearchHeader: React.FC<SearchHeaderProps> = ({
  engines = COMPREHENSIVE_SEARCH_ENGINES,
  activeEngineId,
  onChangeEngine,
  searchQuery,
  onSearchChange,
  bookmarks = [],
  bookmarksCount,
  wallpaper,
  onBookmarkClick,
  openInNewTab = true,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const engineMenuRef = useRef<HTMLDivElement>(null);

  // Active Category for engine group
  const [selectedCategory, setSelectedCategory] = useState<SearchEngineCategory | 'all'>('common');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isEngineMenuOpen, setIsEngineMenuOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('onenav_search_history');
      return stored ? JSON.parse(stored) : ['GitHub', 'DeepSeek', 'Tailwind CSS', 'Vite'];
    } catch {
      return [];
    }
  });

  const debounceTimerRef = useRef<any>(null);

  // Helper getters
  const getEngineKey = (e?: SearchEngine) => e?.value || e?.id || '';
  const getEngineCategory = (e?: SearchEngine) => e?.category || (e?.group === 'ai' ? 'ai' : e?.group === 'general' ? 'common' : 'common');

  // Comprehensive engines merge
  const allEngines = useMemo(() => {
    const map = new Map<string, SearchEngine>();
    (COMPREHENSIVE_SEARCH_ENGINES || []).forEach((eng) => {
      const key = getEngineKey(eng);
      if (key) map.set(key, eng);
    });
    if (Array.isArray(engines)) {
      engines.forEach((eng) => {
        const key = getEngineKey(eng);
        if (key) map.set(key, eng);
      });
    }
    return Array.from(map.values());
  }, [engines]);

  // Find active engine
  const activeEngine = useMemo(() => {
    if (activeEngineId === 'local') {
      return {
        id: 'local',
        value: 'local',
        name: '站内书签',
        icon: '🔍',
        placeholder: "即时搜索书签名称、链接、描述或标签 (快捷键 '/' 或 'Ctrl+K')...",
      } as SearchEngine;
    }
    return allEngines.find((e) => getEngineKey(e) === activeEngineId) || allEngines[0];
  }, [allEngines, activeEngineId]);

  // Synchronize category with active engine
  useEffect(() => {
    if (activeEngineId === 'local') {
      // stay
    } else if (activeEngine) {
      const cat = getEngineCategory(activeEngine);
      if (cat) setSelectedCategory(cat);
    }
  }, [activeEngineId, activeEngine]);

  // Keyboard shortcut '/' or 'Ctrl+K' / 'Cmd+K' to quickly focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === '/' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        inputRef.current?.focus();
        setIsDropdownOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Click outside to close suggestion dropdown and engine menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
        setIsEngineMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch online search suggestions when query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      setSelectedIndex(-1);
      return;
    }

    if (activeEngineId === 'local') {
      setSuggestions([]);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const results = await fetchSearchSuggestions(searchQuery);
        setSuggestions(results);
        setSelectedIndex(-1);
      } catch (err) {
        console.error('Failed to get suggestions:', err);
      }
    }, 180);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [searchQuery, activeEngineId]);

  // Filter matching local bookmarks for dropdown
  const matchingBookmarks = useMemo(() => {
    return searchLocalBookmarks(bookmarks, searchQuery, 4);
  }, [bookmarks, searchQuery]);

  // Save query to search history
  const recordSearchHistory = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    const filtered = searchHistory.filter((item) => item.toLowerCase() !== trimmed.toLowerCase());
    const updated = [trimmed, ...filtered].slice(0, 10);
    setSearchHistory(updated);
    try {
      localStorage.setItem('onenav_search_history', JSON.stringify(updated));
    } catch {}
  };

  const handleClearHistory = () => {
    setSearchHistory([]);
    try {
      localStorage.removeItem('onenav_search_history');
    } catch {}
  };

  const handleRemoveHistoryItem = (e: React.MouseEvent, item: string) => {
    e.stopPropagation();
    const updated = searchHistory.filter((i) => i !== item);
    setSearchHistory(updated);
    try {
      localStorage.setItem('onenav_search_history', JSON.stringify(updated));
    } catch {}
  };

  // Perform search execution
  const executeSearch = (targetQuery: string, engineToUse?: SearchEngine | string) => {
    const query = targetQuery.trim();
    if (!query) return;

    recordSearchHistory(query);
    setIsDropdownOpen(false);

    const engId = typeof engineToUse === 'string' ? engineToUse : (engineToUse ? getEngineKey(engineToUse) : activeEngineId);

    if (engId === 'local') {
      onSearchChange(query);
      return;
    }

    const eng = typeof engineToUse === 'object' ? engineToUse : allEngines.find((e) => getEngineKey(e) === engId) || activeEngine;
    if (eng) {
      const pattern = eng.urlPattern || (eng.url ? (eng.url.includes('%s') ? eng.url : eng.url + '%s') : '');
      if (pattern) {
        const targetUrl = pattern.replace('%s', encodeURIComponent(query));
        if (openInNewTab) {
          window.open(targetUrl, '_blank', 'noopener,noreferrer');
        } else {
          window.location.href = targetUrl;
        }
      }
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIndex >= 0 && suggestions[selectedIndex]) {
      executeSearch(suggestions[selectedIndex]);
    } else {
      executeSearch(searchQuery);
    }
  };

  // Keyboard navigation for suggestions dropdown
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isDropdownOpen) {
      if (e.key === 'ArrowDown') {
        setIsDropdownOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Escape') {
      setIsDropdownOpen(false);
      setIsEngineMenuOpen(false);
    } else if (e.key === 'Tab') {
      // Cycle through engines in category
      e.preventDefault();
      const currentEngines = allEngines.filter((eng) => !getEngineCategory(eng) || getEngineCategory(eng) === selectedCategory);
      if (currentEngines.length > 0) {
        const currentIndex = currentEngines.findIndex((eng) => getEngineKey(eng) === activeEngineId);
        const nextIndex = (currentIndex + 1) % currentEngines.length;
        onChangeEngine(getEngineKey(currentEngines[nextIndex]));
      }
    }
  };

  // Engines belonging to current category
  const visibleEngines = useMemo(() => {
    if (selectedCategory === 'all') return allEngines;
    return allEngines.filter((e) => getEngineCategory(e) === selectedCategory);
  }, [allEngines, selectedCategory]);

  const hasWallpaper = wallpaper && wallpaper.type !== 'none';

  return (
    <div
      id="search-section"
      ref={containerRef}
      className="w-full pt-4 sm:pt-6 pb-4 relative z-20"
    >
      <div className="max-w-3xl mx-auto px-3 sm:px-4">
        {/* Category & Mode Selector Tabs */}
        <div className="flex items-center justify-center flex-wrap gap-1.5 mb-3">
          {/* Station / Local Bookmark Search Pill */}
          <button
            id="tab-search-local"
            type="button"
            onClick={() => {
              onChangeEngine('local');
              setSelectedCategory('common');
            }}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all backdrop-blur-md ${
              activeEngineId === 'local'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 font-semibold'
                : 'bg-white/50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-800/80 shadow-2xs'
            }`}
          >
            <BookmarkIcon className="w-3.5 h-3.5" />
            <span>站内搜索 ({bookmarksCount})</span>
          </button>

          {/* Categories for External Web Engines */}
          {SEARCH_CATEGORIES.map((cat) => {
            const isCatActive = selectedCategory === cat.id && activeEngineId !== 'local';
            return (
              <button
                key={cat.id}
                id={`tab-search-cat-${cat.id}`}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat.id);
                  const firstInCat = allEngines.find((e) => getEngineCategory(e) === cat.id);
                  if (firstInCat && activeEngineId === 'local') {
                    onChangeEngine(getEngineKey(firstInCat));
                  }
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all backdrop-blur-md ${
                  isCatActive
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-md font-semibold'
                    : 'bg-white/50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-800/80 shadow-2xs'
                }`}
              >
                <DynamicIcon name={cat.icon} className="w-3.5 h-3.5" fallback="Globe" />
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>

        {/* Engine Buttons for Active Category */}
        {activeEngineId !== 'local' && visibleEngines.length > 0 && (
          <div className="flex items-center justify-center flex-wrap gap-1.5 mb-3.5 animate-in fade-in duration-150">
            {visibleEngines.map((eng) => {
              const engKey = getEngineKey(eng);
              const isSelected = activeEngineId === engKey;
              return (
                <button
                  key={engKey}
                  id={`btn-engine-${engKey}`}
                  type="button"
                  onClick={() => onChangeEngine(engKey)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all backdrop-blur-md ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs font-semibold scale-105'
                      : 'bg-white/40 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-slate-800/70 shadow-2xs'
                  }`}
                >
                  <DynamicIcon name={eng.icon} className="w-3.5 h-3.5 shrink-0" fallback="Globe" />
                  <span>{eng.name}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Main Search Input Form - Capsule Pill Shape with Frosted Glass */}
        <form onSubmit={handleSearchSubmit} className="relative w-full">
          <div
            className={`relative flex items-center rounded-full transition-all overflow-visible backdrop-blur-2xl ${
              hasWallpaper
                ? 'bg-white/85 dark:bg-slate-900/85 shadow-xl shadow-black/10'
                : 'bg-white/80 dark:bg-slate-900/80 shadow-lg shadow-blue-500/5'
            } focus-within:ring-4 focus-within:ring-blue-500/20 focus-within:bg-white/95 dark:focus-within:bg-slate-900/95`}
          >
            {/* Quick Engine Switcher Capsule on the Left */}
            <div className="relative shrink-0 pl-1.5" ref={engineMenuRef}>
              <button
                type="button"
                id="btn-engine-quick-switch"
                onClick={() => setIsEngineMenuOpen(!isEngineMenuOpen)}
                className="flex items-center gap-1.5 py-1.5 pl-3 pr-2.5 rounded-full bg-slate-100/80 dark:bg-slate-800/80 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-200 border border-slate-200/50 dark:border-white/5 transition-all text-xs font-medium shrink-0"
                title="切换站内搜 / 站外搜索引擎"
              >
                {activeEngineId === 'local' ? (
                  <BookmarkIcon className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                ) : (
                  <DynamicIcon
                    name={activeEngine?.icon || 'Globe'}
                    className="w-3.5 h-3.5 text-blue-500 shrink-0"
                    fallback="Globe"
                  />
                )}
                <span className="font-semibold truncate max-w-[70px] sm:max-w-[90px]">
                  {activeEngine?.name || '搜索'}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
              </button>

              {/* Quick Engine Menu Dropdown */}
              {isEngineMenuOpen && (
                <div className="absolute top-full left-0 mt-2 w-64 rounded-2xl border shadow-2xl overflow-hidden z-40 animate-in fade-in slide-in-from-top-1 duration-150 backdrop-blur-2xl bg-white/95 dark:bg-slate-900/95 border-white/60 dark:border-white/10 p-2">
                  <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 py-1 mb-1">
                    选择搜索模式
                  </div>

                  {/* 1. Station Search Option */}
                  <button
                    type="button"
                    onClick={() => {
                      onChangeEngine('local');
                      setIsEngineMenuOpen(false);
                      inputRef.current?.focus();
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                      activeEngineId === 'local'
                        ? 'bg-blue-600 text-white font-semibold'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <BookmarkIcon className="w-4 h-4 text-blue-400" />
                      <span>站内书签搜索</span>
                    </div>
                    <span className="text-[10px] opacity-75">{bookmarksCount} 条</span>
                  </button>

                  <div className="my-1.5 border-t border-slate-200/60 dark:border-white/10" />

                  {/* 2. Web Search Categories and Engines */}
                  <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 py-1">
                    站外搜索引擎
                  </div>
                  <div className="max-h-56 overflow-y-auto custom-scrollbar space-y-0.5 pr-1 mt-0.5">
                    {allEngines.map((eng) => {
                      const engKey = getEngineKey(eng);
                      const catKey = getEngineCategory(eng);
                      return (
                        <button
                          key={engKey}
                          type="button"
                          onClick={() => {
                            onChangeEngine(engKey);
                            if (catKey) setSelectedCategory(catKey);
                            setIsEngineMenuOpen(false);
                            inputRef.current?.focus();
                          }}
                          className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs transition-colors ${
                            activeEngineId === engKey
                              ? 'bg-blue-600 text-white font-semibold'
                              : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <DynamicIcon name={eng.icon} className="w-3.5 h-3.5 shrink-0" fallback="Globe" />
                          <span className="truncate">{eng.name}</span>
                          {catKey && (
                            <span className="ml-auto text-[10px] text-slate-400 dark:text-slate-500">
                              {SEARCH_CATEGORIES.find((c) => c.id === catKey)?.name}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Input Element */}
            <input
              ref={inputRef}
              id="main-search-input"
              type="text"
              value={searchQuery}
              onFocus={() => setIsDropdownOpen(true)}
              onChange={(e) => {
                onSearchChange(e.target.value);
                setIsDropdownOpen(true);
              }}
              onKeyDown={handleKeyDown}
              placeholder={
                activeEngineId === 'local'
                  ? "即时搜索书签名称、链接、描述或标签 (快捷键 '/' 或 'Ctrl+K')..."
                  : activeEngine?.placeholder || `使用 ${activeEngine?.name} 智能搜索... (按 Tab 切换引擎)`
              }
              className="w-full py-3.5 px-3.5 text-sm bg-transparent text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none font-medium min-w-0"
              autoComplete="off"
            />

            {/* Clear Button */}
            {searchQuery && (
              <button
                id="btn-clear-search"
                type="button"
                onClick={() => {
                  onSearchChange('');
                  setSuggestions([]);
                  inputRef.current?.focus();
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full transition-colors mr-1"
                title="清空搜索内容 (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Submit Action Capsule Button */}
            <div className="pr-1.5 shrink-0">
              <button
                id="btn-submit-search"
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 shadow-md shadow-blue-500/20 backdrop-blur-md shrink-0"
              >
                {activeEngineId === 'local' ? (
                  <span>筛选</span>
                ) : (
                  <>
                    <span>搜索</span>
                    <ExternalLink className="w-3 h-3 opacity-80" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Autocomplete & Suggestions & History Dropdown */}
          {isDropdownOpen && (
            <div
              id="search-suggestions-dropdown"
              className="absolute top-full left-0 right-0 mt-2.5 rounded-3xl border shadow-2xl overflow-hidden z-30 animate-in fade-in slide-in-from-top-1 duration-150 backdrop-blur-2xl bg-white/90 dark:bg-slate-900/90 border-white/60 dark:border-white/10"
            >
              {/* 1. Matching Local Bookmarks Preview (if any matches found) */}
              {searchQuery.trim() && matchingBookmarks.length > 0 && (
                <div className="p-3 border-b border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    <BookmarkIcon className="w-3 h-3 text-blue-500" />
                    <span>站内精准匹配书签</span>
                  </div>
                  <div className="space-y-1 mt-1">
                    {matchingBookmarks.map((bm) => (
                      <div
                        key={bm.id}
                        onClick={() => {
                          if (onBookmarkClick) onBookmarkClick(bm);
                          if (openInNewTab) {
                            window.open(bm.url, '_blank', 'noopener,noreferrer');
                          } else {
                            window.location.href = bm.url;
                          }
                          setIsDropdownOpen(false);
                        }}
                        className="flex items-center justify-between p-2 rounded-2xl hover:bg-blue-50/80 dark:hover:bg-blue-950/40 cursor-pointer transition-colors group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={getFaviconUrl(bm.url, bm.icon)}
                            alt=""
                            className="w-4 h-4 rounded-xs shrink-0 object-contain"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                            {bm.title}
                          </span>
                          <span className="text-[11px] text-slate-400 truncate hidden sm:inline">
                            {bm.url}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          <span>直达</span>
                          <ArrowRight className="w-3 h-3" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. Online Search Suggestions (Suggestions List) */}
              {suggestions.length > 0 && (
                <div className="p-2">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    <TrendingUp className="w-3 h-3 text-amber-500" />
                    <span>联想搜索建议</span>
                  </div>
                  <ul className="space-y-0.5">
                    {suggestions.map((sug, idx) => (
                      <li
                        key={idx}
                        onClick={() => executeSearch(sug)}
                        className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition-colors ${
                          selectedIndex === idx
                            ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-semibold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Search className="w-3.5 h-3.5 text-slate-400" />
                          <span>{sug}</span>
                        </div>
                        <span className="text-[10px] text-slate-400">回车搜索</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 3. Search History (Shown when input is empty or has history) */}
              {!searchQuery.trim() && searchHistory.length > 0 && (
                <div className="p-3">
                  <div className="flex items-center justify-between px-1 mb-2">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      <History className="w-3 h-3 text-slate-400" />
                      <span>搜索历史</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearHistory}
                      className="text-[11px] text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>清空历史</span>
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {searchHistory.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          onSearchChange(item);
                          executeSearch(item);
                        }}
                        className="group inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors"
                      >
                        <span>{item}</span>
                        <button
                          type="button"
                          onClick={(e) => handleRemoveHistoryItem(e, item)}
                          className="opacity-40 group-hover:opacity-100 hover:text-red-500 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

