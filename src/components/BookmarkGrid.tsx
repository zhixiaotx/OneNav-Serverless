import React, { useState } from 'react';
import { Bookmark, CardLayout, Category } from '../types';
import { BookmarkCard } from './BookmarkCard';
import { SortableBookmarkCard } from './SortableBookmarkCard';
import { DynamicIcon } from './DynamicIcon';
import { BookmarkPlus, Inbox, Move, Pin, Sparkles } from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';

interface BookmarkGridProps {
  categories: Category[];
  bookmarks: Bookmark[];
  activeCategoryId: string;
  searchQuery: string;
  selectedTag: string | null;
  layout: CardLayout;
  showClicks: boolean;
  showDesc: boolean;
  openInNewTab: boolean;
  onBookmarkClick: (bm: Bookmark) => void;
  onEdit: (bm: Bookmark) => void;
  onDelete: (id: string) => void;
  onTogglePin: (bm: Bookmark) => void;
  onOpenAddBookmarkWithCat: (catId: string) => void;
  onClearFilter: () => void;
  onTagClick: (tag: string) => void;
  onReorderBookmarks: (activeId: string, overId: string, targetCategoryId?: string) => void;
}

export const BookmarkGrid: React.FC<BookmarkGridProps> = ({
  categories,
  bookmarks,
  activeCategoryId,
  searchQuery,
  selectedTag,
  layout,
  showClicks,
  showDesc,
  openInNewTab,
  onBookmarkClick,
  onEdit,
  onDelete,
  onTogglePin,
  onOpenAddBookmarkWithCat,
  onClearFilter,
  onTagClick,
  onReorderBookmarks,
}) => {
  const [activeBookmark, setActiveBookmark] = useState<Bookmark | null>(null);

  // Setup DND Sensors with activation constraint to prevent conflict with standard clicks
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement threshold triggers dragging, allowing normal clicks
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const found = bookmarks.find((bm) => bm.id === active.id);
    if (found) {
      setActiveBookmark(found);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveBookmark(null);

    if (!over || active.id === over.id) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    // Determine target category from the hovered item
    const overBookmark = bookmarks.find((b) => b.id === overId);
    const targetCategoryId = overBookmark ? overBookmark.categoryId : undefined;

    onReorderBookmarks(activeId, overId, targetCategoryId);
  };

  const handleDragCancel = () => {
    setActiveBookmark(null);
  };

  // Filter by search query and tag
  const filteredBookmarks = bookmarks.filter((bm) => {
    if (selectedTag && (!bm.tags || !bm.tags.includes(selectedTag))) {
      return false;
    }

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const matchTitle = bm.title.toLowerCase().includes(q);
    const matchUrl = bm.url.toLowerCase().includes(q);
    const matchDesc = bm.description?.toLowerCase().includes(q);
    const matchTags = bm.tags?.some((t) => t.toLowerCase().includes(q));

    return matchTitle || matchUrl || matchDesc || matchTags;
  });

  // Get responsive grid classes based on layout
  const getGridClass = () => {
    if (layout === 'minimal') {
      return 'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3';
    }
    if (layout === 'compact') {
      return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5';
    }
    // Cards layout
    return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4';
  };

  const isFilterActive = Boolean(searchQuery.trim() || selectedTag);

  // If search query or tag filter is active
  if (isFilterActive) {
    return (
      <div className="flex-1 pb-16">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              筛选结果 ({filteredBookmarks.length})
            </span>
            {searchQuery && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                关键词: &ldquo;{searchQuery}&rdquo;
              </span>
            )}
            {selectedTag && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
                标签: #{selectedTag}
              </span>
            )}
          </div>
          <button
            onClick={onClearFilter}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            清除筛选
          </button>
        </div>

        {filteredBookmarks.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center">
            <Inbox className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              未找到符合条件的书签
            </p>
            <button
              onClick={onClearFilter}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-medium rounded-xl transition-colors"
            >
              返回全部书签
            </button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <SortableContext
              items={filteredBookmarks.map((bm) => bm.id)}
              strategy={rectSortingStrategy}
            >
              <div className={getGridClass()}>
                {filteredBookmarks.map((bm) => (
                  <SortableBookmarkCard
                    key={bm.id}
                    bookmark={bm}
                    layout={layout}
                    showClicks={showClicks}
                    showDesc={showDesc}
                    openInNewTab={openInNewTab}
                    onBookmarkClick={onBookmarkClick}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onTogglePin={onTogglePin}
                    onTagClick={onTagClick}
                  />
                ))}
              </div>
            </SortableContext>
            <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
              {activeBookmark ? (
                <div className="w-full">
                  <BookmarkCard
                    bookmark={activeBookmark}
                    layout={layout}
                    showClicks={showClicks}
                    showDesc={showDesc}
                    openInNewTab={openInNewTab}
                    isOverlay={true}
                    onBookmarkClick={() => {}}
                    onEdit={() => {}}
                    onDelete={() => {}}
                    onTogglePin={() => {}}
                  />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    );
  }

  // If 'pinned' view is selected
  if (activeCategoryId === 'pinned') {
    const pinnedBookmarks = filteredBookmarks.filter((bm) => bm.isPinned);
    return (
      <div className="flex-1 pb-16">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Pin className="w-5 h-5 text-amber-500 fill-amber-500" />
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              常用置顶书签
            </h2>
          </div>
        </div>

        {pinnedBookmarks.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <Sparkles className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              暂无置顶书签，可以在书签卡片右上角点击星标置顶
            </p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <SortableContext
              items={pinnedBookmarks.map((bm) => bm.id)}
              strategy={rectSortingStrategy}
            >
              <div className={getGridClass()}>
                {pinnedBookmarks.map((bm) => (
                  <SortableBookmarkCard
                    key={bm.id}
                    bookmark={bm}
                    layout={layout}
                    showClicks={showClicks}
                    showDesc={showDesc}
                    openInNewTab={openInNewTab}
                    onBookmarkClick={onBookmarkClick}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onTogglePin={onTogglePin}
                    onTagClick={onTagClick}
                  />
                ))}
              </div>
            </SortableContext>
            <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
              {activeBookmark ? (
                <div className="w-full">
                  <BookmarkCard
                    bookmark={activeBookmark}
                    layout={layout}
                    showClicks={showClicks}
                    showDesc={showDesc}
                    openInNewTab={openInNewTab}
                    isOverlay={true}
                    onBookmarkClick={() => {}}
                    onEdit={() => {}}
                    onDelete={() => {}}
                    onTogglePin={() => {}}
                  />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    );
  }

  // If a specific category is selected
  if (activeCategoryId !== 'all') {
    const getDescendantCategoryIds = (catId: string, allCats: Category[]): string[] => {
      const ids = [catId];
      const children = allCats.filter(c => c.parentId === catId);
      children.forEach(child => {
        ids.push(...getDescendantCategoryIds(child.id, allCats));
      });
      return ids;
    };

    const currentCat = categories.find((c) => c.id === activeCategoryId);
    const descendantIds = getDescendantCategoryIds(activeCategoryId, categories);
    const catBookmarks = filteredBookmarks.filter((bm) => descendantIds.includes(bm.categoryId));

    return (
      <div className="flex-1 pb-16">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <DynamicIcon
                name={currentCat?.icon}
                className="w-5 h-5"
              />
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-tight">
              {currentCat?.name || '分类书签'}
            </h2>
          </div>
        </div>

        {catBookmarks.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
            <Inbox className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              该分类暂无书签
            </p>
            <button
              onClick={() => onOpenAddBookmarkWithCat(activeCategoryId)}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
            >
              添加第一个书签
            </button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <SortableContext
              items={catBookmarks.map((bm) => bm.id)}
              strategy={rectSortingStrategy}
            >
              <div className={getGridClass()}>
                {catBookmarks.map((bm) => (
                  <SortableBookmarkCard
                    key={bm.id}
                    bookmark={bm}
                    layout={layout}
                    showClicks={showClicks}
                    showDesc={showDesc}
                    openInNewTab={openInNewTab}
                    onBookmarkClick={onBookmarkClick}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onTogglePin={onTogglePin}
                    onTagClick={onTagClick}
                  />
                ))}
              </div>
            </SortableContext>
            <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
              {activeBookmark ? (
                <div className="w-full">
                  <BookmarkCard
                    bookmark={activeBookmark}
                    layout={layout}
                    showClicks={showClicks}
                    showDesc={showDesc}
                    openInNewTab={openInNewTab}
                    isOverlay={true}
                    onBookmarkClick={() => {}}
                    onEdit={() => {}}
                    onDelete={() => {}}
                    onTogglePin={() => {}}
                  />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    );
  }

  // Default: All categories view (unified DndContext across categories)
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex-1 space-y-10 pb-20">
        {categories.map((cat) => {
          const catBookmarks = filteredBookmarks.filter((bm) => bm.categoryId === cat.id);
          if (catBookmarks.length === 0) return null;

          return (
            <section key={cat.id} id={`section-${cat.id}`} className="scroll-mt-24">
              {/* Section Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <DynamicIcon name={cat.icon} className="w-4 h-4" />
                  </div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                    {cat.name}
                  </h2>
                </div>
              </div>

              {/* Grid of sortable bookmarks */}
              <SortableContext
                items={catBookmarks.map((bm) => bm.id)}
                strategy={rectSortingStrategy}
              >
                <div className={getGridClass()}>
                  {catBookmarks.map((bm) => (
                    <SortableBookmarkCard
                      key={bm.id}
                      bookmark={bm}
                      layout={layout}
                      showClicks={showClicks}
                      showDesc={showDesc}
                      openInNewTab={openInNewTab}
                      onBookmarkClick={onBookmarkClick}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onTogglePin={onTogglePin}
                      onTagClick={onTagClick}
                    />
                  ))}
                </div>
              </SortableContext>
            </section>
          );
        })}
      </div>

      <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
        {activeBookmark ? (
          <div className="w-full">
            <BookmarkCard
              bookmark={activeBookmark}
              layout={layout}
              showClicks={showClicks}
              showDesc={showDesc}
              openInNewTab={openInNewTab}
              isOverlay={true}
              onBookmarkClick={() => {}}
              onEdit={() => {}}
              onDelete={() => {}}
              onTogglePin={() => {}}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
