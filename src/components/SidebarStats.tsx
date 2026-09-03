import React, { useMemo } from 'react';
import { Bookmark, Category } from '../types';
import { BarChart3, PieChart, TrendingUp, Bookmark as BookmarkIcon, ExternalLink, MousePointerClick } from 'lucide-react';

interface SidebarStatsProps {
  categories: Category[];
  bookmarks: Bookmark[];
  onBookmarkClick?: (bookmark: Bookmark) => void;
  openInNewTab?: boolean;
}

const CATEGORY_COLORS = [
  { bar: 'bg-blue-500', text: 'text-blue-500', bgLight: 'bg-blue-50 dark:bg-blue-950/40' },
  { bar: 'bg-indigo-500', text: 'text-indigo-500', bgLight: 'bg-indigo-50 dark:bg-indigo-950/40' },
  { bar: 'bg-emerald-500', text: 'text-emerald-500', bgLight: 'bg-emerald-50 dark:bg-emerald-950/40' },
  { bar: 'bg-amber-500', text: 'text-amber-500', bgLight: 'bg-amber-50 dark:bg-amber-950/40' },
  { bar: 'bg-purple-500', text: 'text-purple-500', bgLight: 'bg-purple-50 dark:bg-purple-950/40' },
  { bar: 'bg-rose-500', text: 'text-rose-500', bgLight: 'bg-rose-50 dark:bg-rose-950/40' },
  { bar: 'bg-cyan-500', text: 'text-cyan-500', bgLight: 'bg-cyan-50 dark:bg-cyan-950/40' },
];

export const SidebarStats: React.FC<SidebarStatsProps> = ({
  categories,
  bookmarks,
  onBookmarkClick,
  openInNewTab = true,
}) => {
  // Total Counts
  const totalBookmarks = bookmarks.length;
  const totalCategories = categories.length;

  // Top 5 Most Frequently Clicked Bookmarks
  const topBookmarks = useMemo(() => {
    return [...bookmarks]
      .sort((a, b) => (b.clicks || 0) - (a.clicks || 0))
      .slice(0, 5);
  }, [bookmarks]);

  // Category Distribution calculation
  const categoryStats = useMemo(() => {
    if (totalBookmarks === 0) return [];

    const map = new Map<string, { category: Category; count: number }>();
    categories.forEach((cat) => {
      map.set(cat.id, { category: cat, count: 0 });
    });

    let uncategorizedCount = 0;
    bookmarks.forEach((bm) => {
      if (map.has(bm.categoryId)) {
        map.get(bm.categoryId)!.count += 1;
      } else {
        uncategorizedCount += 1;
      }
    });

    const list = Array.from(map.values())
      .filter((item) => item.count > 0)
      .map((item, idx) => ({
        id: item.category.id,
        name: item.category.name,
        count: item.count,
        percentage: Math.round((item.count / totalBookmarks) * 100),
        color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
      }))
      .sort((a, b) => b.count - a.count);

    return list;
  }, [categories, bookmarks, totalBookmarks]);

  const handleOpenTopBookmark = (bm: Bookmark, e: React.MouseEvent) => {
    if (onBookmarkClick) {
      onBookmarkClick(bm);
    }
  };

  return (
    <div id="sidebar-stats-widget" className="mt-4 pt-3 border-t border-slate-200/50 dark:border-white/10 space-y-3.5">
      {/* Header */}
      <div className="flex items-center justify-between text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1">
        <div className="flex items-center gap-1.5">
          <BarChart3 className="w-3.5 h-3.5 text-blue-500" />
          <span>数据概览与分布</span>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/50 flex flex-col justify-between">
          <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">总书签量</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-base font-bold text-slate-800 dark:text-slate-100">{totalBookmarks}</span>
            <span className="text-[10px] text-slate-400">个</span>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/50 flex flex-col justify-between">
          <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">分类总数</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-base font-bold text-slate-800 dark:text-slate-100">{totalCategories}</span>
            <span className="text-[10px] text-slate-400">个</span>
          </div>
        </div>
      </div>

      {/* Category Distribution Progress Bars */}
      {categoryStats.length > 0 && (
        <div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/50 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-medium text-slate-600 dark:text-slate-300">
            <span className="flex items-center gap-1">
              <PieChart className="w-3 h-3 text-indigo-500" />
              <span>分类分布占比</span>
            </span>
            <span className="text-[10px] text-slate-400">按占比排序</span>
          </div>

          {/* Multi-segment distribution bar */}
          <div className="h-2.5 w-full bg-slate-200/80 dark:bg-slate-700/80 rounded-full overflow-hidden flex shadow-2xs">
            {categoryStats.map((item) => (
              <div
                key={item.id}
                style={{ width: `${Math.max(item.percentage, 3)}%` }}
                className={`${item.color.bar} h-full transition-all duration-300`}
                title={`${item.name}: ${item.count}个 (${item.percentage}%)`}
              />
            ))}
          </div>

          {/* Detailed distribution list (top 4) */}
          <div className="space-y-1.5 pt-1">
            {categoryStats.slice(0, 4).map((item) => (
              <div key={item.id} className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 truncate max-w-[120px]">
                    <span className={`w-1.5 h-1.5 rounded-full ${item.color.bar} shrink-0`} />
                    <span className="truncate text-slate-700 dark:text-slate-300">{item.name}</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                    {item.count}个 ({item.percentage}%)
                  </span>
                </div>
                <div className="h-1 w-full bg-slate-200/60 dark:bg-slate-700/50 rounded-full overflow-hidden">
                  <div
                    className={`${item.color.bar} h-full rounded-full transition-all duration-300`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top 5 Most Clicked Bookmarks */}
      {topBookmarks.length > 0 && (
        <div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/50 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-medium text-slate-600 dark:text-slate-300">
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-rose-500" />
              <span>常用 Top 5</span>
            </span>
            <span className="text-[10px] text-slate-400">点击频次</span>
          </div>

          <div className="space-y-1">
            {topBookmarks.map((bm, index) => (
              <a
                key={bm.id}
                href={bm.url}
                target={openInNewTab ? '_blank' : '_self'}
                rel="noopener noreferrer"
                onClick={(e) => handleOpenTopBookmark(bm, e)}
                className="flex items-center justify-between p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700/70 transition-colors group text-left"
              >
                <div className="flex items-center gap-2 truncate pr-2">
                  <span
                    className={`text-[10px] font-bold font-mono w-4 h-4 rounded flex items-center justify-center shrink-0 ${
                      index === 0
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300'
                        : index === 1
                        ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                        : index === 2
                        ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className="text-[11px] text-slate-700 dark:text-slate-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 font-medium">
                    {bm.title}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200/60 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400">
                    {bm.clicks || 0}次
                  </span>
                  <ExternalLink className="w-2.5 h-2.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
