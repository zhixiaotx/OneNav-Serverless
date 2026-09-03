import React, { useState } from 'react';
import { Bookmark, Category } from '../types';
import { DynamicIcon } from './DynamicIcon';
import { SidebarStats } from './SidebarStats';
import { Pin, FolderPlus, Compass, PanelLeftClose, PanelLeftOpen, ChevronDown, ChevronRight } from 'lucide-react';

interface SidebarProps {
  categories: Category[];
  bookmarks: Bookmark[];
  allBookmarks?: Bookmark[];
  activeCategoryId: string;
  onSelectCategory: (categoryId: string) => void;
  onOpenAddCategory: () => void;
  pinnedCount: number;
  onBookmarkClick?: (bookmark: Bookmark) => void;
  openInNewTab?: boolean;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  categories,
  bookmarks,
  allBookmarks,
  activeCategoryId,
  onSelectCategory,
  onOpenAddCategory,
  pinnedCount,
  onBookmarkClick,
  openInNewTab = true,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [collapsedCategoryIds, setCollapsedCategoryIds] = useState<Record<string, boolean>>({});
  const totalBookmarksList = allBookmarks || bookmarks;

  const getDescendantCategoryIds = (catId: string, allCats: Category[]): string[] => {
    const ids = [catId];
    const children = allCats.filter(c => c.parentId === catId);
    children.forEach(child => {
      ids.push(...getDescendantCategoryIds(child.id, allCats));
    });
    return ids;
  };

  const getCategoryPath = (c: Category): string => {
    const path = [c.name];
    let curr = c;
    while (curr.parentId) {
      const parent = categories.find(p => p.id === curr.parentId);
      if (!parent) break;
      path.unshift(parent.name);
      curr = parent;
    }
    return path.join(' > ');
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          id="sidebar-backdrop"
          className="fixed inset-0 z-[45] bg-slate-950/45 backdrop-blur-xs md:hidden animate-in fade-in duration-200"
          onClick={onCloseMobile}
        />
      )}

      <aside
        id="app-sidebar"
        className={`sidebar-container select-none transition-all duration-300 md:shrink-0 md:sticky md:top-20 md:self-start z-[48] md:z-20 ${
          isMobileOpen ? 'open' : ''
        } ${isCollapsed ? 'md:w-16' : 'md:w-56'}`}
      >
        <div className={`flex flex-col gap-1 rounded-r-2xl md:rounded-2xl bg-white dark:bg-slate-900 md:bg-white/60 md:dark:bg-slate-900/60 md:backdrop-blur-xl shadow-xs pb-4 h-full md:max-h-[calc(100vh-90px)] overflow-y-auto custom-scrollbar transition-all duration-300 ${
          isCollapsed ? 'p-2 md:items-center' : 'p-3'
        }`}>
          {/* Header with Expand/Collapse toggle */}
          {!isCollapsed ? (
            <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 mb-1 flex items-center justify-between">
              <span>导航分类</span>
              <div className="flex items-center gap-0.5">
                <button
                  id="btn-sidebar-add-cat"
                  onClick={onOpenAddCategory}
                  className="p-1 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white/50 dark:hover:bg-slate-800/50 rounded-lg transition-colors"
                  title="添加新分类"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                </button>
                <button
                  id="btn-sidebar-toggle-collapse"
                  onClick={() => setIsCollapsed(true)}
                  className="p-1 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white/50 dark:hover:bg-slate-800/50 rounded-lg transition-colors text-slate-400"
                  title="折叠分类侧边栏"
                >
                  <PanelLeftClose className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5 w-full pb-1 border-b border-slate-200/50 dark:border-white/10">
              <button
                id="btn-sidebar-toggle-expand"
                onClick={() => setIsCollapsed(false)}
                className="p-2 hover:bg-blue-50 dark:hover:bg-blue-950/50 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl transition-colors"
                title="展开侧边栏"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* All Bookmarks entry */}
          {!isCollapsed ? (
            <button
              id="nav-cat-all"
              onClick={() => onSelectCategory('all')}
              className={`flex items-center justify-between px-3 py-3.5 md:py-2 rounded-xl text-xs font-medium transition-all ${
                activeCategoryId === 'all'
                  ? 'bg-blue-600/90 text-white font-semibold shadow-xs backdrop-blur-md'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <Compass className={`w-4 h-4 shrink-0 ${activeCategoryId === 'all' ? 'text-white' : 'text-blue-500'}`} />
                <span className="truncate">全部书签</span>
              </div>
              <span
                className={`text-[10px] px-1 py-0.5 ${
                  activeCategoryId === 'all'
                    ? 'text-white/80'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {totalBookmarksList.length}
              </span>
            </button>
          ) : (
            <button
              id="nav-cat-all"
              onClick={() => onSelectCategory('all')}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all relative ${
                activeCategoryId === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-slate-800/60'
              }`}
              title={`全部书签 (${totalBookmarksList.length})`}
            >
              <Compass className="w-4 h-4" />
            </button>
          )}

          {/* Pinned Bookmarks entry */}
          {pinnedCount > 0 && (
            !isCollapsed ? (
              <button
                id="nav-cat-pinned"
                onClick={() => onSelectCategory('pinned')}
                className={`flex items-center justify-between px-3 py-3.5 md:py-2 rounded-xl text-xs font-medium transition-all ${
                  activeCategoryId === 'pinned'
                    ? 'bg-amber-500/90 text-white font-semibold shadow-xs backdrop-blur-md'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Pin className={`w-4 h-4 shrink-0 ${activeCategoryId === 'pinned' ? 'text-white fill-white/40' : 'text-amber-500 fill-amber-500/20'}`} />
                  <span className="truncate">常用置顶</span>
                </div>
                <span
                  className={`text-[10px] px-1 py-0.5 ${
                    activeCategoryId === 'pinned'
                      ? 'text-white/80'
                      : 'text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {pinnedCount}
                </span>
              </button>
            ) : (
              <button
                id="nav-cat-pinned"
                onClick={() => onSelectCategory('pinned')}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all relative ${
                  activeCategoryId === 'pinned'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-slate-800/60'
                }`}
                title={`常用置顶 (${pinnedCount})`}
              >
                <Pin className="w-4 h-4 fill-current" />
              </button>
            )
          )}

          <div className="my-1.5 border-t border-slate-200/50 dark:border-white/10 w-full" />

          {/* Categories List */}
          <div className={`space-y-0.5 ${isCollapsed ? 'w-full flex flex-col items-center' : 'pr-1 w-full'}`}>
            {(() => {
              if (isCollapsed) {
                return categories.map((cat) => {
                  const descendantIds = getDescendantCategoryIds(cat.id, categories);
                  const count = totalBookmarksList.filter((b) => descendantIds.includes(b.categoryId)).length;
                  const isSelected = activeCategoryId === cat.id;
                  return (
                    <button
                      key={cat.id}
                      id={`nav-cat-${cat.id}`}
                      onClick={() => onSelectCategory(cat.id)}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all relative ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-slate-800/60'
                      }`}
                      title={`${getCategoryPath(cat)} (${count})`}
                    >
                      <DynamicIcon
                        name={cat.icon}
                        className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`}
                      />
                    </button>
                  );
                });
              }

              // Recursive tree rendering
              const renderCategoryTree = (parentId: string | null, depth: number = 0): React.ReactNode[] => {
                let levelCats: Category[] = [];
                if (parentId === null) {
                  levelCats = categories.filter(c => !c.parentId || !categories.some(parent => parent.id === c.parentId));
                } else {
                  levelCats = categories.filter(c => c.parentId === parentId);
                }

                levelCats.sort((a, b) => a.order - b.order);

                return levelCats.map((cat) => {
                  const children = categories.filter(c => c.parentId === cat.id);
                  const hasChildren = children.length > 0;
                  const isExpanded = !collapsedCategoryIds[cat.id];
                  const isSelected = activeCategoryId === cat.id;

                  const descendantIds = getDescendantCategoryIds(cat.id, categories);
                  const count = totalBookmarksList.filter((b) => descendantIds.includes(b.categoryId)).length;

                  return (
                    <div key={cat.id} className="flex flex-col w-full">
                      <div
                        className={`group w-full flex items-center justify-between py-1.5 rounded-xl text-xs font-medium transition-all text-left ${
                          isSelected
                            ? 'bg-blue-600/95 text-white font-semibold shadow-xs backdrop-blur-md'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-slate-800/60'
                        }`}
                        style={{ paddingLeft: `${depth * 14 + 10}px`, paddingRight: '8px' }}
                      >
                        <div
                          className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer"
                          onClick={() => onSelectCategory(cat.id)}
                        >
                          <DynamicIcon
                            name={cat.icon}
                            className={`w-3.5 h-3.5 shrink-0 ${
                              isSelected ? 'text-white' : 'text-slate-400 dark:text-slate-500'
                            }`}
                          />
                          <span className="truncate">{cat.name}</span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0 ml-1.5">
                          <span
                            className={`text-[10px] px-1 py-0.5 ${
                              isSelected ? 'text-white/80' : 'text-slate-400 dark:text-slate-500'
                            }`}
                          >
                            {count}
                          </span>
                          {hasChildren && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCollapsedCategoryIds(prev => ({
                                  ...prev,
                                  [cat.id]: !prev[cat.id]
                                }));
                              }}
                              className={`p-1 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 rounded-md transition-all ${
                                isSelected ? 'text-white/80 hover:bg-white/20' : 'text-slate-400 dark:text-slate-500'
                              }`}
                            >
                              {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                            </button>
                          )}
                        </div>
                      </div>
                      {hasChildren && isExpanded && (
                        <div className="flex flex-col w-full mt-0.5">
                          {renderCategoryTree(cat.id, depth + 1)}
                        </div>
                      )}
                    </div>
                  );
                });
              };

              return renderCategoryTree(null, 0);
            })()}
          </div>

        {/* Integrated Statistics Component */}
        {!isCollapsed && (
          <SidebarStats
            categories={categories}
            bookmarks={totalBookmarksList}
            onBookmarkClick={onBookmarkClick}
            openInNewTab={openInNewTab}
          />
        )}
      </div>
    </aside>
    </>
  );
};
