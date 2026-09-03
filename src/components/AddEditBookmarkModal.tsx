import React, { useState, useEffect, useRef } from 'react';
import { Bookmark, Category, IconSource } from '../types';
import {
  X,
  Sparkles,
  Lock,
  Pin,
  RefreshCw,
  SlidersHorizontal,
  CheckCircle2,
  Zap,
  Globe,
  Tag,
  Folder,
} from 'lucide-react';
import {
  iconSources,
  getFaviconUrl,
  getHostname,
  suggestSiteName,
  getLetterAvatar,
  getColorForString,
  getFaviconUrlWithFallback,
} from '../services/faviconService';

interface AddEditBookmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (bookmarkData: Partial<Bookmark>) => void;
  categories: Category[];
  initialCategory?: string;
  editBookmark?: Bookmark | null;
}

export const AddEditBookmarkModal: React.FC<AddEditBookmarkModalProps> = ({
  isOpen,
  onClose,
  onSave,
  categories,
  initialCategory,
  editBookmark,
}) => {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [icon, setIcon] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isPinned, setIsPinned] = useState(false);

  // Favicon & Icon Source state
  const [selectedSource, setSelectedSource] = useState<IconSource>('favicon_im');
  const [isProbing, setIsProbing] = useState(false);
  const [faviconLoadError, setFaviconLoadError] = useState(false);
  const [isFaviconLoading, setIsFaviconLoading] = useState(false);
  const [showAdvancedIcons, setShowAdvancedIcons] = useState(false);
  const [probeSuccessSource, setProbeSuccessSource] = useState<string | null>(null);

  const lastAutoSuggestedTitle = useRef<string>('');

  useEffect(() => {
    if (editBookmark) {
      setTitle(editBookmark.title || '');
      setUrl(editBookmark.url || '');
      setCategoryId(editBookmark.categoryId || (categories[0]?.id ?? ''));
      setDescription(editBookmark.description || '');
      setTagsInput(editBookmark.tags ? editBookmark.tags.join(', ') : '');
      setIcon(editBookmark.icon || '');
      setIsPrivate(Boolean(editBookmark.isPrivate));
      setIsPinned(Boolean(editBookmark.isPinned));
      setFaviconLoadError(false);
      setProbeSuccessSource(null);
      lastAutoSuggestedTitle.current = '';
    } else {
      setTitle('');
      setUrl('');
      setCategoryId(initialCategory || (categories[0]?.id ?? ''));
      setDescription('');
      setTagsInput('');
      setIcon('');
      setIsPrivate(false);
      setIsPinned(false);
      setSelectedSource('favicon_im');
      setFaviconLoadError(false);
      setProbeSuccessSource(null);
      lastAutoSuggestedTitle.current = '';
    }
  }, [editBookmark, initialCategory, categories, isOpen]);

  // URL change: auto title & reset error
  const handleUrlChange = (newUrl: string) => {
    setUrl(newUrl);
    setFaviconLoadError(false);
    setProbeSuccessSource(null);
    setIsFaviconLoading(true);

    const domain = getHostname(newUrl);
    if (domain) {
      const suggested = suggestSiteName(newUrl);
      if (!title || title === lastAutoSuggestedTitle.current) {
        setTitle(suggested);
        lastAutoSuggestedTitle.current = suggested;
      }
    }
  };

  // Full probe with Fallback
  const handleProbeBestFavicon = async () => {
    if (!url.trim()) return;
    setIsProbing(true);
    setFaviconLoadError(false);
    try {
      let formattedUrl = url.trim();
      if (!/^https?:\/\//i.test(formattedUrl)) {
        formattedUrl = 'https://' + formattedUrl;
        setUrl(formattedUrl);
      }

      // If title is empty, suggest it
      if (!title.trim()) {
        const suggested = suggestSiteName(formattedUrl);
        if (suggested) setTitle(suggested);
      }

      // Priority list: include fast domestic and global services
      const probeSources: IconSource[] = [
        'favicon_im',
        'favicon_myhkw',
        'favicon_iowen',
        'google',
        'favicon_duckduckgo',
        'clearbit',
      ];

      const itemToTest = { url: formattedUrl, title: title || suggestSiteName(formattedUrl) };
      const best = await getFaviconUrlWithFallback(itemToTest, probeSources);

      setSelectedSource(best.source);
      setProbeSuccessSource(best.source);
      setIcon(best.url);
      setFaviconLoadError(false);
    } catch {
      // Fallback
    } finally {
      setIsProbing(false);
    }
  };

  const handleSourceChange = (src: IconSource) => {
    setSelectedSource(src);
    setFaviconLoadError(false);
    setIsFaviconLoading(true);
    setProbeSuccessSource(null);

    if (url.trim()) {
      const resolved = getFaviconUrl({ url, title }, src);
      if (src !== 'custom') {
        setIcon(resolved);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !url.trim()) return;

    let finalUrl = url.trim();
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl;
    }

    const tags = tagsInput
      .split(/[,，]/)
      .map((t) => t.trim())
      .filter(Boolean);

    // If user has custom icon input or selected source, prepare icon string
    let finalIcon = icon.trim() || undefined;
    if (!finalIcon && finalUrl) {
      finalIcon = getFaviconUrl({ url: finalUrl, title }, selectedSource);
    }

    onSave({
      title: title.trim(),
      url: finalUrl,
      categoryId: categoryId || categories[0]?.id,
      description: description.trim(),
      tags,
      icon: finalIcon,
      isPrivate,
      isPinned,
    });

    onClose();
  };

  if (!isOpen) return null;

  // Derive preview URL & avatar
  const currentHostname = getHostname(url);
  const letterAvatar = getLetterAvatar(title || currentHostname || 'Nav');
  const avatarGradient = getColorForString(currentHostname || title || 'nav');

  const previewFavicon = icon.trim()
    ? icon.trim()
    : url.trim()
    ? getFaviconUrl({ url, title: title || currentHostname }, selectedSource)
    : '';

  return (
    <div
      id="modal-bookmark-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="modal-bookmark-content"
        className="w-full max-w-lg bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/60 dark:border-white/10 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {editBookmark ? '编辑书签与图标' : '添加新书签'}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                输入网址自动抓取高清 Favicon 与网站名称
              </p>
            </div>
          </div>
          <button
            id="btn-close-bm-modal"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* URL with Smart Fetch */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              网站链接 (URL) *
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  id="input-bm-url"
                  type="text"
                  required
                  value={url}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full pl-8 pr-3.5 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-slate-100 font-mono text-xs"
                />
                <Globe className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              </div>
              <button
                id="btn-auto-probe-favicon"
                type="button"
                onClick={handleProbeBestFavicon}
                disabled={!url.trim() || isProbing}
                className="px-3 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 transition-colors flex items-center gap-1.5 shadow-2xs shrink-0"
                title="探测多源并抓取最佳 Favicon"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isProbing ? 'animate-spin' : ''}`} />
                <span>{isProbing ? '正在抓取...' : '自动抓取'}</span>
              </button>
            </div>
          </div>

          {/* Favicon & Title Visual Card */}
          <div className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <span>图标与标题预览</span>
                {probeSuccessSource && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    已匹配: {probeSuccessSource}
                  </span>
                )}
              </span>

              <button
                type="button"
                onClick={() => setShowAdvancedIcons(!showAdvancedIcons)}
                className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
              >
                <SlidersHorizontal className="w-3 h-3" />
                <span>{showAdvancedIcons ? '收起图标设置' : '切换图标源 / 自定义'}</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              {/* Favicon Preview Box with Fallback Letter Avatar */}
              <div
                id="favicon-preview-avatar"
                className="w-11 h-11 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs bg-white dark:bg-slate-800 relative group"
              >
                {!faviconLoadError && previewFavicon ? (
                  <>
                    <img
                      src={previewFavicon}
                      alt={title || 'favicon'}
                      onLoad={() => {
                        setIsFaviconLoading(false);
                        setFaviconLoadError(false);
                      }}
                      onError={() => {
                        setIsFaviconLoading(false);
                        setFaviconLoadError(true);
                      }}
                      className="w-6 h-6 object-contain transition-transform group-hover:scale-110"
                    />
                    {isFaviconLoading && (
                      <div className="absolute inset-0 bg-white/70 dark:bg-slate-900/70 flex items-center justify-center">
                        <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                      </div>
                    )}
                  </>
                ) : (
                  /* Domain Letter Initial Avatar Fallback */
                  <div
                    className="w-full h-full flex flex-col items-center justify-center text-white text-base font-black shadow-inner transition-transform group-hover:scale-105 select-none"
                    style={{ background: avatarGradient }}
                    title={`获取失败，展示首字母「${letterAvatar}」占位图标`}
                  >
                    <span>{letterAvatar}</span>
                  </div>
                )}
              </div>

              {/* Title Input */}
              <div className="flex-1">
                <input
                  id="input-bm-title"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    lastAutoSuggestedTitle.current = '';
                  }}
                  placeholder="网站标题 (如: GitHub)"
                  className="w-full px-3.5 py-2 text-sm rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-slate-100 font-medium"
                />
              </div>
            </div>

            {/* Error or Fallback notification */}
            {faviconLoadError && (
              <div className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2.5 py-1.5 rounded-lg border border-amber-200 dark:border-amber-900/40">
                <Zap className="w-3 h-3 shrink-0" />
                <span>该源未获取到图标，已自动切换为基于首字母「{letterAvatar}」的专属渐变占位图标</span>
              </div>
            )}

            {/* Advanced Icon Source Switcher Panel */}
            {showAdvancedIcons && (
              <div
                id="panel-advanced-icons"
                className="pt-2.5 mt-2 border-t border-slate-200/80 dark:border-slate-700/80 space-y-3 animate-in fade-in duration-100"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      选择抓取图标源 (支持国内高速 / 国际聚合 / 首字母文字)
                    </label>
                  </div>
                  <select
                    id="select-icon-source"
                    value={selectedSource}
                    onChange={(e) => handleSourceChange(e.target.value as IconSource)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    {iconSources.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label} ({s.detail})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1 block">
                    自定义图标直链或 Emoji (可选)
                  </label>
                  <input
                    id="input-bm-icon"
                    type="text"
                    value={icon}
                    onChange={(e) => {
                      setIcon(e.target.value);
                      setFaviconLoadError(false);
                      setIsFaviconLoading(true);
                      if (e.target.value) {
                        setSelectedSource('custom');
                      }
                    }}
                    placeholder="可填写图片直链 URL、Data URI 或 Emoji (如 🚀)"
                    className="w-full px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Category Select */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
              <Folder className="w-3.5 h-3.5 text-slate-400" />
              <span>归属分类</span>
            </label>
            <select
              id="select-bm-category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-blue-500 text-slate-900 dark:text-slate-100"
            >
              {(() => {
                const result: { id: string; name: string }[] = [];
                const addChildren = (parentId: string | null, depth: number) => {
                  const children = categories.filter(c => (parentId === null ? !c.parentId : c.parentId === parentId));
                  children.sort((a, b) => a.order - b.order);
                  children.forEach(child => {
                    const prefix = depth > 0 ? '\u00A0\u00A0'.repeat(depth) + '└─ ' : '';
                    result.push({ id: child.id, name: prefix + child.name });
                    addChildren(child.id, depth + 1);
                  });
                };
                addChildren(null, 0);
                // Handle any orphaned categories
                categories.forEach(c => {
                  if (c.parentId && !categories.some(parent => parent.id === c.parentId) && !result.some(r => r.id === c.id)) {
                    result.push({ id: c.id, name: '└─ ' + c.name });
                    addChildren(c.id, 1);
                  }
                });
                return result.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ));
              })()}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              简要描述
            </label>
            <textarea
              id="input-bm-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="简述网站功能、特点或用途..."
              className="w-full px-3.5 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-blue-500 text-slate-900 dark:text-slate-100 resize-none"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-slate-400" />
              <span>标签 (以逗号分隔)</span>
            </label>
            <input
              id="input-bm-tags"
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="开发, 工具, 开源"
              className="w-full px-3.5 py-2 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-blue-500 text-slate-900 dark:text-slate-100"
            />
          </div>

          {/* Options: Private & Pinned */}
          <div className="pt-2 flex items-center gap-6 border-t border-slate-200/70 dark:border-slate-800/70">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300 select-none">
              <input
                id="check-bm-pinned"
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <Pin className="w-3.5 h-3.5 text-amber-500" />
              <span>置顶到常用推荐</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300 select-none">
              <input
                id="check-bm-private"
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>私密书签 (受密码保护)</span>
            </label>
          </div>

          {/* Footer Buttons */}
          <div className="pt-4 flex items-center justify-end gap-2.5">
            <button
              id="btn-cancel-bm"
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              取消
            </button>
            <button
              id="btn-save-bm"
              type="submit"
              className="px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <span>{editBookmark ? '保存修改' : '立即添加'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
