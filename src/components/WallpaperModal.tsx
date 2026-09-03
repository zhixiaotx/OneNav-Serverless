import React, { useState, useRef } from 'react';
import {
  WallpaperConfig,
  WallpaperPreset,
  WallpaperType,
} from '../types';
import {
  WALLPAPER_PRESETS,
  BING_TODAY_URL,
  BING_UHD_URL,
  getRandomWallpaperUrl,
  convertFileToBase64,
  DEFAULT_WALLPAPER_CONFIG,
} from '../services/wallpaperService';
import {
  X,
  Image as ImageIcon,
  Sparkles,
  RefreshCw,
  Sliders,
  Upload,
  Link,
  Check,
  RotateCcw,
  Eye,
  Sun,
  Layers,
  Palette,
  Compass,
} from 'lucide-react';

interface WallpaperModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallpaper: WallpaperConfig;
  onUpdateWallpaper: (config: WallpaperConfig) => void;
}

export const WallpaperModal: React.FC<WallpaperModalProps> = ({
  isOpen,
  onClose,
  wallpaper,
  onUpdateWallpaper,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [customUrlInput, setCustomUrlInput] = useState<string>(
    wallpaper.type === 'custom' ? wallpaper.url || '' : ''
  );
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const categories = [
    { id: 'all', name: '全部精选' },
    { id: 'bing', name: 'Bing 每日' },
    { id: 'scenery', name: '自然风景' },
    { id: 'minimal', name: '极简空间' },
    { id: 'gradient', name: '渐变光影' },
    { id: 'cyberpunk', name: '赛博夜景' },
    { id: 'anime', name: '插画动漫' },
    { id: 'custom', name: '自定义与上传' },
  ];

  const filteredPresets =
    activeCategory === 'all'
      ? WALLPAPER_PRESETS
      : WALLPAPER_PRESETS.filter((p) => p.category === activeCategory);

  // Apply a preset
  const handleSelectPreset = (preset: WallpaperPreset) => {
    if (preset.type === 'gradient') {
      onUpdateWallpaper({
        ...wallpaper,
        type: 'gradient',
        gradient: preset.gradient,
        url: '',
        name: preset.name,
      });
    } else {
      onUpdateWallpaper({
        ...wallpaper,
        type: preset.type,
        url: preset.url,
        gradient: '',
        name: preset.name,
      });
    }
  };

  // Apply Today's Bing 4K
  const handleSelectBingToday = (is4K = false) => {
    const url = is4K ? BING_UHD_URL : BING_TODAY_URL;
    onUpdateWallpaper({
      ...wallpaper,
      type: 'bing',
      url: url,
      gradient: '',
      name: is4K ? 'Bing 4K 超清每日壁纸' : 'Bing 今日高清壁纸',
    });
  };

  // Apply Random Wallpaper
  const handleApplyRandom = () => {
    const url = getRandomWallpaperUrl();
    onUpdateWallpaper({
      ...wallpaper,
      type: 'random',
      url: url,
      gradient: '',
      name: '随机灵感壁纸',
    });
  };

  // Apply Custom URL
  const handleApplyCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrlInput.trim()) return;
    let finalUrl = customUrlInput.trim();
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = 'https://' + finalUrl;
    }
    onUpdateWallpaper({
      ...wallpaper,
      type: 'custom',
      url: finalUrl,
      gradient: '',
      name: '自定义网络壁纸',
    });
  };

  // Handle Local File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('请选择有效的图片文件 (JPG, PNG, WebP)');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    try {
      const base64 = await convertFileToBase64(file);
      onUpdateWallpaper({
        ...wallpaper,
        type: 'upload',
        url: base64,
        gradient: '',
        name: `本地图片 (${file.name})`,
      });
    } catch (err) {
      console.error('Failed to read image file:', err);
      setUploadError('图片读取失败，请尝试换一张图片');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Reset to Default / None
  const handleResetToNone = () => {
    onUpdateWallpaper({
      ...DEFAULT_WALLPAPER_CONFIG,
      type: 'none',
      url: '',
      gradient: '',
      name: '纯净原生',
    });
  };

  return (
    <div
      id="modal-wallpaper-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/50 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="modal-wallpaper-content"
        className="w-full max-w-4xl bg-white/92 dark:bg-slate-900/92 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/60 dark:border-white/10 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  个性化壁纸与视觉特效
                </h2>
                {wallpaper.type !== 'none' && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-medium">
                    当前: {wallpaper.name || wallpaper.type}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                支持 Bing 必应每日、精选风景、赛博渐变、自定义外链及本地上传
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Random & Reset buttons in header */}
            <button
              id="btn-random-wallpaper"
              type="button"
              onClick={handleApplyRandom}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 rounded-xl transition-all active:scale-95"
              title="随机切换一张高画质壁纸"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">随机壁纸</span>
            </button>

            {wallpaper.type !== 'none' && (
              <button
                id="btn-reset-wallpaper"
                type="button"
                onClick={handleResetToNone}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                title="恢复系统默认原生纯净背景"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">恢复原生</span>
              </button>
            )}

            <button
              id="btn-close-wallpaper-modal"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body: Tabs + Grid + Controls */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-slate-200/80 dark:border-slate-800/80">
            {categories.map((cat) => (
              <button
                key={cat.id}
                id={`tab-wallpaper-cat-${cat.id}`}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-full transition-all whitespace-nowrap shrink-0 ${
                  activeCategory === cat.id
                    ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Quick Action Banner for Bing or Custom */}
          {activeCategory === 'bing' && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 border border-blue-200/60 dark:border-blue-800/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-600 text-white">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    必应每日壁纸 (Bing Daily Auto-sync)
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    微软 Bing 官方每日自动同步，探索全球各地绝美自然风光与地标
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleSelectBingToday(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-all active:scale-95"
                >
                  应用今日 1080P
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectBingToday(true)}
                  className="px-3.5 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition-all active:scale-95"
                >
                  应用今日 4K 超清
                </button>
              </div>
            </div>
          )}

          {/* Custom & Upload View */}
          {activeCategory === 'custom' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Custom Image URL */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center gap-2">
                  <Link className="w-4 h-4 text-indigo-500" />
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    网络图片直链 URL
                  </h3>
                </div>
                <form onSubmit={handleApplyCustomUrl} className="space-y-2.5">
                  <input
                    type="text"
                    value={customUrlInput}
                    onChange={(e) => setCustomUrlInput(e.target.value)}
                    placeholder="https://example.com/wallpaper.jpg"
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                  <div className="flex items-center justify-end">
                    <button
                      type="submit"
                      disabled={!customUrlInput.trim()}
                      className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl transition-colors shadow-xs"
                    >
                      应用此网络壁纸
                    </button>
                  </div>
                </form>
              </div>

              {/* Local File Upload */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center gap-2">
                  <Upload className="w-4 h-4 text-indigo-500" />
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    本地电脑/手机图片上传
                  </h3>
                </div>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-xl p-6 text-center cursor-pointer transition-colors bg-white/60 dark:bg-slate-800/40"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <ImageIcon className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {isUploading ? '正在处理图片并压缩...' : '点击或拖拽图片到此处上传'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    自动智能压缩并保存在浏览器本地，无需占用服务器
                  </p>
                </div>
                {uploadError && (
                  <p className="text-xs text-red-500">{uploadError}</p>
                )}
              </div>
            </div>
          ) : (
            /* Presets Grid */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
              {/* Pure None Card */}
              <div
                onClick={handleResetToNone}
                className={`relative group rounded-2xl border overflow-hidden p-3 cursor-pointer transition-all flex flex-col items-center justify-center min-h-[110px] text-center ${
                  wallpaper.type === 'none'
                    ? 'border-indigo-600 ring-2 ring-indigo-600/30 bg-indigo-50/40 dark:bg-indigo-950/30'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center mb-1.5 text-slate-500">
                  <Sun className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  纯净原生背景
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">无壁纸 / 极简明暗</span>
                {wallpaper.type === 'none' && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                    <Check className="w-3 h-3" />
                  </div>
                )}
              </div>

              {/* Preset Cards */}
              {filteredPresets.map((preset) => {
                const isSelected =
                  preset.type === 'gradient'
                    ? wallpaper.type === 'gradient' && wallpaper.gradient === preset.gradient
                    : wallpaper.url === preset.url;

                return (
                  <div
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset)}
                    className={`relative group rounded-2xl border overflow-hidden cursor-pointer transition-all aspect-video flex flex-col justify-end p-2.5 shadow-2xs hover:shadow-md ${
                      isSelected
                        ? 'border-indigo-600 ring-2 ring-indigo-600/40'
                        : 'border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700'
                    }`}
                  >
                    {/* Background Preview */}
                    {preset.type === 'gradient' ? (
                      <div
                        className="absolute inset-0 transition-transform duration-300 group-hover:scale-105"
                        style={{ background: preset.gradient }}
                      />
                    ) : (
                      <img
                        src={preset.thumbnail}
                        alt={preset.name}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    )}

                    {/* Dark gradient overlay for title contrast */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                    {/* Meta info */}
                    <div className="relative z-10 text-white">
                      <p className="text-xs font-semibold drop-shadow-xs line-clamp-1">
                        {preset.name}
                      </p>
                      {preset.author && (
                        <p className="text-[10px] text-white/70 drop-shadow-xs truncate">
                          {preset.author}
                        </p>
                      )}
                    </div>

                    {/* Selected Badge */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 z-10 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Visual FX & Fine-tune Controls Panel */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-500" />
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  壁纸视觉微调与毛玻璃拟态
                </h3>
              </div>
              <span className="text-[11px] text-slate-400">
                实时调节背景高斯模糊与文字阅读对比度
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Blur Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300">
                  <span>背景高斯模糊 (Blur)</span>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {wallpaper.blur}px
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="25"
                  step="1"
                  value={wallpaper.blur}
                  onChange={(e) =>
                    onUpdateWallpaper({ ...wallpaper, blur: Number(e.target.value) })
                  }
                  className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none"
                />
              </div>

              {/* Mask Darkness Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300">
                  <span>暗色遮罩深度 (Mask)</span>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {wallpaper.opacity}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="80"
                  step="5"
                  value={wallpaper.opacity}
                  onChange={(e) =>
                    onUpdateWallpaper({ ...wallpaper, opacity: Number(e.target.value) })
                  }
                  className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none"
                />
              </div>

              {/* Brightness Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300">
                  <span>壁纸亮度 (Brightness)</span>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {wallpaper.brightness}%
                  </span>
                </div>
                <input
                  type="range"
                  min="60"
                  max="140"
                  step="5"
                  value={wallpaper.brightness}
                  onChange={(e) =>
                    onUpdateWallpaper({ ...wallpaper, brightness: Number(e.target.value) })
                  }
                  className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none"
                />
              </div>

              {/* Card Glassmorphism Toggle */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    书签卡片毛玻璃效果
                  </p>
                  <p className="text-[10px] text-slate-400">Backdrop-blur 半透明晶透质感</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={wallpaper.cardGlassmorphism}
                    onChange={(e) =>
                      onUpdateWallpaper({
                        ...wallpaper,
                        cardGlassmorphism: e.target.checked,
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {/* Card Opacity Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300">
                  <span>卡片不透明度</span>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {wallpaper.cardOpacity}%
                  </span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="100"
                  step="5"
                  value={wallpaper.cardOpacity}
                  onChange={(e) =>
                    onUpdateWallpaper({ ...wallpaper, cardOpacity: Number(e.target.value) })
                  }
                  className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none"
                />
              </div>

              {/* Daily Auto Refresh Toggle */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    每日自动更换壁纸
                  </p>
                  <p className="text-[10px] text-slate-400">每天首次访问时自动拉取 Bing 今日图</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(wallpaper.dailyAutoRefresh)}
                    onChange={(e) =>
                      onUpdateWallpaper({
                        ...wallpaper,
                        dailyAutoRefresh: e.target.checked,
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>壁纸配置将随您的云同步配置持久化存储</span>
          </div>

          <button
            id="btn-done-wallpaper"
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition-colors"
          >
            完成设置
          </button>
        </div>
      </div>
    </div>
  );
};
