import React, { useState } from 'react';
import { Bookmark, CardLayout } from '../types';
import { getFaviconUrl } from '../utils/storage';
import { getLetterAvatar, getColorForString } from '../services/faviconService';
import {
  Pin,
  Trash2,
  Edit2,
  Copy,
  Check,
  Lock,
  GripVertical,
} from 'lucide-react';

interface BookmarkCardProps {
  bookmark: Bookmark;
  layout: CardLayout;
  showClicks: boolean;
  showDesc: boolean;
  openInNewTab: boolean;
  isDragging?: boolean;
  isOverlay?: boolean;
  dragHandleProps?: Record<string, any>;
  onBookmarkClick: (bookmark: Bookmark) => void;
  onEdit: (bookmark: Bookmark) => void;
  onDelete: (bookmarkId: string) => void;
  onTogglePin: (bookmark: Bookmark) => void;
  onTagClick?: (tag: string) => void;
}

export const BookmarkCard: React.FC<BookmarkCardProps> = ({
  bookmark,
  layout,
  showClicks,
  showDesc,
  openInNewTab,
  isDragging = false,
  isOverlay = false,
  dragHandleProps,
  onBookmarkClick,
  onEdit,
  onDelete,
  onTogglePin,
  onTagClick,
}) => {
  const [imgError, setImgError] = useState(false);
  const [copied, setCopied] = useState(false);

  const favicon = getFaviconUrl(bookmark.url, bookmark.icon);

  const handleOpenLink = (e: React.MouseEvent) => {
    if (isOverlay) return;
    // If target is an action button or drag handle, don't navigate
    if ((e.target as HTMLElement).closest('.card-action-btn') || (e.target as HTMLElement).closest('.drag-handle-btn')) {
      return;
    }
    onBookmarkClick(bookmark);
    window.open(bookmark.url, openInNewTab ? '_blank' : '_self', 'noopener,noreferrer');
  };

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(bookmark.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Minimal View
  if (layout === 'minimal') {
    return (
      <div
        id={`bm-minimal-${bookmark.id}`}
        onClick={handleOpenLink}
        {...(!isOverlay ? dragHandleProps : {})}
        className={`group relative flex flex-col items-center justify-between h-full w-full min-h-[100px] p-3 rounded-2xl backdrop-blur-md transition-all cursor-grab active:cursor-grabbing text-center select-none ${
          isOverlay
            ? 'border-blue-500 shadow-2xl scale-105 ring-2 ring-blue-500/40 bg-white/90 dark:bg-slate-800/90 z-50'
            : isDragging
            ? 'opacity-30 border-dashed border-blue-400 bg-blue-50/20 dark:bg-blue-900/10'
            : 'bg-white/70 dark:bg-slate-900/60 hover:bg-white/90 dark:hover:bg-slate-800/80 shadow-xs hover:shadow-md hover:-translate-y-0.5'
        }`}
      >
        {/* Drag handle hint for minimal */}
        <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-60 transition-opacity text-slate-400 drag-handle-btn">
          <GripVertical className="w-3 h-3" />
        </div>

        {bookmark.isPinned && (
          <div className="absolute top-2 left-2 text-amber-500">
            <Pin className="w-3 h-3 fill-amber-500" />
          </div>
        )}
        {bookmark.isPrivate && (
          <div className="absolute top-2 right-2 text-slate-400">
            <Lock className="w-3 h-3" />
          </div>
        )}

        <div className="w-12 h-12 flex items-center justify-center my-auto overflow-hidden shrink-0 group-hover:scale-110 transition-transform pointer-events-none">
          {!imgError && favicon ? (
            <img
              src={favicon}
              alt=""
              onError={() => setImgError(true)}
              className="w-9 h-9 object-contain"
              loading="lazy"
            />
          ) : (
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold font-sans select-none shadow-xs"
              style={{ background: getColorForString(bookmark.title || bookmark.url) }}
            >
              {getLetterAvatar(bookmark.title || bookmark.url)}
            </div>
          )}
        </div>

        <span className="text-xs font-medium text-slate-800 dark:text-slate-200 break-words leading-tight max-w-full px-1 pointer-events-none line-clamp-2 mt-1">
          {bookmark.title}
        </span>
      </div>
    );
  }

  // Compact View
  if (layout === 'compact') {
    return (
      <div
        id={`bm-compact-${bookmark.id}`}
        onClick={handleOpenLink}
        {...(!isOverlay ? dragHandleProps : {})}
        className={`group relative flex items-center justify-between h-full w-full min-h-[56px] px-3.5 py-2.5 rounded-2xl backdrop-blur-md transition-all cursor-grab active:cursor-grabbing select-none ${
          isOverlay
            ? 'border-blue-500 shadow-2xl scale-102 ring-2 ring-blue-500/40 bg-white/90 dark:bg-slate-800/90 z-50'
            : isDragging
            ? 'opacity-30 border-dashed border-blue-400 bg-blue-50/20 dark:bg-blue-900/10'
            : 'bg-white/70 dark:bg-slate-900/60 hover:bg-white/90 dark:hover:bg-slate-800/80 shadow-xs hover:shadow-md hover:-translate-y-0.5'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {/* Subtle drag handle icon */}
          <div
            className="drag-handle-btn text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing shrink-0"
            title="拖拽可调整排序"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </div>

          <div className="w-9 h-9 flex items-center justify-center shrink-0 overflow-hidden pointer-events-none">
            {!imgError && favicon ? (
              <img
                src={favicon}
                alt=""
                onError={() => setImgError(true)}
                className="w-7 h-7 object-contain"
                loading="lazy"
              />
            ) : (
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold font-sans select-none shadow-xs"
                style={{ background: getColorForString(bookmark.title || bookmark.url) }}
              >
                {getLetterAvatar(bookmark.title || bookmark.url)}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 pointer-events-none">
            <div className="flex items-center flex-wrap gap-1.5">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 break-words group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {bookmark.title}
              </span>
              {bookmark.isPinned && (
                <Pin className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
              )}
              {bookmark.isPrivate && (
                <Lock className="w-3 h-3 text-slate-400 shrink-0" />
              )}
            </div>
            {showDesc && bookmark.description && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {bookmark.description}
              </p>
            )}
          </div>
        </div>

        {/* Hover Quick Actions */}
        {!isOverlay && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="card-action-btn p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/80 dark:hover:bg-slate-700/80 rounded-lg transition-colors"
              title="复制网址"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onTogglePin(bookmark);
              }}
              className={`card-action-btn p-1.5 rounded-lg transition-colors ${
                bookmark.isPinned
                  ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/80 dark:hover:bg-slate-700/80'
              }`}
              title={bookmark.isPinned ? '取消置顶' : '置顶'}
            >
              <Pin className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(bookmark);
              }}
              className="card-action-btn p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white/80 dark:hover:bg-slate-700/80 rounded-lg transition-colors"
              title="编辑"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(bookmark.id);
              }}
              className="card-action-btn p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-white/80 dark:hover:bg-slate-700/80 rounded-lg transition-colors"
              title="删除"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    );
  }

  // Standard Card View (Default OneNav Experience)
  return (
    <div
      id={`bm-card-${bookmark.id}`}
      onClick={handleOpenLink}
      {...(!isOverlay ? dragHandleProps : {})}
      className={`group relative flex flex-col justify-between h-full w-full min-h-[110px] p-4 rounded-2xl backdrop-blur-md transition-all duration-200 cursor-grab active:cursor-grabbing select-none ${
        isOverlay
          ? 'border-blue-500 shadow-2xl scale-105 ring-2 ring-blue-500/40 bg-white/90 dark:bg-slate-800/90 z-50'
          : isDragging
          ? 'opacity-30 border-dashed border-blue-400 bg-blue-50/20 dark:bg-blue-900/10'
          : 'bg-white/70 dark:bg-slate-900/60 hover:bg-white/90 dark:hover:bg-slate-800/80 shadow-xs hover:shadow-md hover:-translate-y-0.5'
      }`}
    >
      <div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Grip handle */}
            <div
              className="drag-handle-btn text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing shrink-0 -ml-1"
              title="按住鼠标拖拽排序"
            >
              <GripVertical className="w-3.5 h-3.5" />
            </div>

            <div className="w-11 h-11 flex items-center justify-center shrink-0 overflow-hidden group-hover:scale-110 transition-transform pointer-events-none">
              {!imgError && favicon ? (
                <img
                  src={favicon}
                  alt=""
                  onError={() => setImgError(true)}
                  className="w-9 h-9 object-contain"
                  loading="lazy"
                />
              ) : (
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold font-sans select-none shadow-xs"
                  style={{ background: getColorForString(bookmark.title || bookmark.url) }}
                >
                  {getLetterAvatar(bookmark.title || bookmark.url)}
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1 pointer-events-none">
              <div className="flex items-center flex-wrap gap-1.5">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 break-words group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {bookmark.title}
                </h3>
                {bookmark.isPinned && (
                  <Pin className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                )}
                {bookmark.isPrivate && (
                  <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                )}
              </div>
            </div>
          </div>

          {/* Card Top Right Quick Actions */}
          {!isOverlay && (
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={handleCopyLink}
                className="card-action-btn p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/80 dark:hover:bg-slate-700/80 rounded-lg transition-colors"
                title="复制网址"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePin(bookmark);
                }}
                className={`card-action-btn p-1.5 rounded-lg transition-colors ${
                  bookmark.isPinned
                    ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/80 dark:hover:bg-slate-700/80'
                }`}
                title={bookmark.isPinned ? '取消置顶' : '置顶'}
              >
                <Pin className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(bookmark);
                }}
                className="card-action-btn p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white/80 dark:hover:bg-slate-700/80 rounded-lg transition-colors"
                title="编辑"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(bookmark.id);
                }}
                className="card-action-btn p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-white/80 dark:hover:bg-slate-700/80 rounded-lg transition-colors"
                title="删除"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Description */}
        {showDesc && bookmark.description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-2 leading-relaxed pointer-events-none">
            {bookmark.description}
          </p>
        )}
      </div>
    </div>
  );
};
