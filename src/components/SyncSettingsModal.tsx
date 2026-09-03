import React, { useState, useEffect } from 'react';
import {
  APP_VERSION,
  AppSettings,
  Bookmark,
  Category,
  OneNavSyncPayload,
  SyncConfig,
  SyncProvider,
  ThemeMode,
} from '../types';
import {
  createGistStorage,
  pullRemoteData,
  pushRemoteData,
  SYNC_DATA_VERSION,
} from '../services/syncService';
import {
  testCloudflareKVConnection,
  fetchFromCloudflareKV,
  saveToCloudflareKV,
  testCloudflareD1Connection,
  initAndTestCloudflareD1,
  fetchFromCloudflareD1,
  saveToCloudflareD1,
  checkGistConnectionStatus,
} from '../services/cloudflareService';
import {
  exportOneNavJson,
  parseOneNavJson,
  exportToHtmlBookmarks,
  parseHtmlBookmarks,
} from '../services/bookmarkParser';
import { INITIAL_CATEGORIES, INITIAL_BOOKMARKS, DEFAULT_SETTINGS } from '../utils/storage';
import { DataPreviewInspector } from './DataPreviewInspector';
import {
  X,
  Cloud,
  Github,
  Server,
  Download,
  Upload,
  Rocket,
  Check,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Copy,
  FileCode,
  HardDrive,
  Info,
  Database,
  Eye,
  EyeOff,
  Activity,
  Zap,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Key,
  Radio,
  Wifi,
  Sparkles,
  SlidersHorizontal,
  Shield,
  Globe,
  FileText,
  Trash2,
  RotateCcw,
  CloudUpload,
  BarChart2,
  Share2,
  Image,
  Tag,
  Link,
  AlertTriangle,
  ShieldAlert,
  FolderPlus,
  Folder,
  Plus,
  Edit3,
  Filter,
  Pin,
  Lock,
  Unlock,
  CheckSquare,
  Square,
  ArrowUp,
  ArrowDown,
  Layers,
  MoveRight,
  ListFilter,
  Search,
  FilePlus,
  Wrench,
} from 'lucide-react';

interface SyncSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncConfig: SyncConfig;
  onUpdateSyncConfig: (newConfig: SyncConfig) => void;
  categories: Category[];
  bookmarks: Bookmark[];
  settings: AppSettings;
  onUpdateSettings?: (newSettings: Partial<AppSettings>) => void;
  onApplySyncData: (categories: Category[], bookmarks: Bookmark[]) => void;
  defaultTab?: string;
}

interface EngineHealth {
  status: 'idle' | 'checking' | 'online' | 'error' | 'unconfigured';
  latencyMs?: number;
  message?: string;
  lastChecked?: number;
  details?: Record<string, any>;
}

// Helper to merge imported categories and bookmarks incrementally
function mergeImportData(
  currentCategories: Category[],
  currentBookmarks: Bookmark[],
  importedCategories: Category[],
  importedBookmarks: Bookmark[]
): { categories: Category[]; bookmarks: Bookmark[] } {
  const finalCategories = [...currentCategories];
  const finalBookmarks = [...currentBookmarks];

  // Map from imported category ID to the final category ID
  const categoryIdMap = new Map<string, string>();

  // Helper to find a category by name case-insensitive
  const findCategoryByName = (name: string) => {
    return finalCategories.find(c => c.name.trim().toLowerCase() === name.trim().toLowerCase());
  };

  // Next order for new categories
  let nextCatOrder = finalCategories.length > 0 
    ? Math.max(...finalCategories.map(c => c.order)) + 1 
    : 1;

  // Process categories
  importedCategories.forEach((importedCat) => {
    const existingCat = findCategoryByName(importedCat.name);
    if (existingCat) {
      // Map the imported ID to the existing ID
      categoryIdMap.set(importedCat.id, existingCat.id);
    } else {
      // It's a new category. To prevent ID collisions with existing ones, we check collision
      const idCollides = finalCategories.some(c => c.id === importedCat.id);
      const targetCatId = idCollides 
        ? 'cat-import-' + Math.random().toString(36).substring(2, 8)
        : importedCat.id;
      
      categoryIdMap.set(importedCat.id, targetCatId);
      finalCategories.push({
        ...importedCat,
        id: targetCatId,
        order: nextCatOrder++,
      });
    }
  });

  // Next order for bookmarks
  let nextBmOrder = finalBookmarks.length > 0
    ? Math.max(...finalBookmarks.map(b => b.order)) + 1
    : 1;

  // Process bookmarks
  importedBookmarks.forEach((importedBm) => {
    // Get the final mapped category ID for this bookmark
    const targetCategoryId = categoryIdMap.get(importedBm.categoryId) || importedBm.categoryId;

    // Check if a bookmark with the same URL already exists in that target category
    const isDuplicate = finalBookmarks.some(
      (b) => b.categoryId === targetCategoryId && b.url.trim().toLowerCase() === importedBm.url.trim().toLowerCase()
    );

    if (!isDuplicate) {
      // Prevent ID collisions
      const idCollides = finalBookmarks.some(b => b.id === importedBm.id);
      const targetBmId = idCollides
        ? 'bm-import-' + Math.random().toString(36).substring(2, 9)
        : importedBm.id;

      finalBookmarks.push({
        ...importedBm,
        id: targetBmId,
        categoryId: targetCategoryId,
        order: nextBmOrder++,
        createdAt: importedBm.createdAt || Date.now(),
        updatedAt: Date.now(),
      });
    }
  });

  return { categories: finalCategories, bookmarks: finalBookmarks };
}

export const SyncSettingsModal: React.FC<SyncSettingsModalProps> = ({
  isOpen,
  onClose,
  syncConfig,
  onUpdateSyncConfig,
  categories,
  bookmarks,
  settings,
  onUpdateSettings,
  onApplySyncData,
  defaultTab = 'cloudflare_d1',
}) => {
  const [activeTab, setActiveTab] = useState<string>(defaultTab);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Local sync config state
  const [config, setConfigInternal] = useState<SyncConfig>(syncConfig);
  const setConfig = (updater: SyncConfig | ((prev: SyncConfig) => SyncConfig)) => {
    setConfigInternal(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      onUpdateSyncConfig(next);
      return next;
    });
  };
  // Local app settings state for General / ICP settings
  const [localSettings, setLocalSettingsInternal] = useState<AppSettings>(settings);
  const setLocalSettings = (updater: AppSettings | ((prev: AppSettings) => AppSettings)) => {
    setLocalSettingsInternal(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (onUpdateSettings) {
        onUpdateSettings(next);
      }
      return next;
    });
  };

  // Mask / Unmask visibility states for sensitive credentials
  const [showGistToken, setShowGistToken] = useState(false);
  const [showKvToken, setShowKvToken] = useState(false);
  const [showD1Token, setShowD1Token] = useState(false);
  const [showRepoToken, setShowRepoToken] = useState(false);
  const [showWebdavPassword, setShowWebdavPassword] = useState(false);

  // Drag over states for file dropzones
  const [isDraggingJson, setIsDraggingJson] = useState(false);
  const [isDraggingHtml, setIsDraggingHtml] = useState(false);
  const [isOneClickSyncing, setIsOneClickSyncing] = useState(false);

  // Secondary Confirmation Modal State for Data Management Center
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'clear_all' | 'factory_reset' | 'reset_stats' | 'restore_json' | 'restore_html';
    title: string;
    description: string;
    warningDetails?: string[];
    requireKeyword?: string;
    confirmText: string;
    confirmButtonClass?: string;
    pendingData?: { categories: Category[]; bookmarks: Bookmark[] };
  } | null>(null);
  const [confirmInputText, setConfirmInputText] = useState('');
  const [importMode, setImportMode] = useState<'merge' | 'overwrite'>('merge');

  // Export Security Authentication State
  const [exportAuth, setExportAuth] = useState<{
    isOpen: boolean;
    username: string;
    password: string;
    error: string;
    onSuccess: (() => void) | null;
  }>({
    isOpen: false,
    username: '',
    password: '',
    error: '',
    onSuccess: null,
  });
  const [showExportPassword, setShowExportPassword] = useState(false);

  // Real-time Status Indicators State
  const [gistHealth, setGistHealth] = useState<EngineHealth>({ status: 'idle' });
  const [kvHealth, setKvHealth] = useState<EngineHealth>({ status: 'idle' });
  const [d1Health, setD1Health] = useState<EngineHealth>({ status: 'idle' });
  const [isCheckingAll, setIsCheckingAll] = useState(false);

  // Bookmark & Category Management System State
  const [manageSubTab, setManageSubTab] = useState<'categories' | 'bookmarks' | 'batch_add' | 'health'>('categories');

  // Category Modal Form State
  const [showCatModal, setShowCatModal] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catFormName, setCatFormName] = useState('');
  const [catFormIcon, setCatFormIcon] = useState('🌐');
  const [catFormDesc, setCatFormDesc] = useState('');

  // Bookmark Modal Form State
  const [showBmModal, setShowBmModal] = useState(false);
  const [editingBmId, setEditingBmId] = useState<string | null>(null);
  const [bmFormTitle, setBmFormTitle] = useState('');
  const [bmFormUrl, setBmFormUrl] = useState('');
  const [bmFormCatId, setBmFormCatId] = useState('');
  const [bmFormDesc, setBmFormDesc] = useState('');
  const [bmFormIcon, setBmFormIcon] = useState('');
  const [bmFormTags, setBmFormTags] = useState('');
  const [bmFormIsPinned, setBmFormIsPinned] = useState(false);
  const [bmFormIsPrivate, setBmFormIsPrivate] = useState(false);

  // Bookmark Filter & Batch Selection State
  const [bmSearchQuery, setBmSearchQuery] = useState('');
  const [bmSelectedCatFilter, setBmSelectedCatFilter] = useState('all');
  const [selectedBmIds, setSelectedBmIds] = useState<string[]>([]);
  const [batchTargetCatId, setBatchTargetCatId] = useState('');

  // Batch Quick Add State
  const [batchRawText, setBatchRawText] = useState('');
  const [batchAddCatId, setBatchAddCatId] = useState('');

  // --- Category Handlers ---
  const handleOpenAddCategory = () => {
    setEditingCatId(null);
    setCatFormName('');
    setCatFormIcon('🌐');
    setCatFormDesc('');
    setShowCatModal(true);
  };

  const handleOpenEditCategory = (cat: Category) => {
    setEditingCatId(cat.id);
    setCatFormName(cat.name);
    setCatFormIcon(cat.icon || '🌐');
    setCatFormDesc(cat.description || '');
    setShowCatModal(true);
  };

  const handleSaveCategory = () => {
    if (!catFormName.trim()) {
      showMsg('error', '请输入分类名称');
      return;
    }
    if (editingCatId) {
      const updatedCats = categories.map((c) =>
        c.id === editingCatId
          ? {
              ...c,
              name: catFormName.trim(),
              icon: catFormIcon.trim() || '🌐',
              description: catFormDesc.trim(),
            }
          : c
      );
      onApplySyncData(updatedCats, bookmarks);
      showMsg('success', `分类 [${catFormName.trim()}] 修改成功！`);
    } else {
      const newCat: Category = {
        id: `cat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: catFormName.trim(),
        icon: catFormIcon.trim() || '🌐',
        description: catFormDesc.trim(),
        order: categories.length + 1,
      };
      onApplySyncData([...categories, newCat], bookmarks);
      showMsg('success', `成功创建分类 [${newCat.name}]！`);
    }
    setShowCatModal(false);
    setEditingCatId(null);
    setCatFormName('');
    setCatFormDesc('');
  };

  const handleDeleteCategory = (catId: string) => {
    const targetCat = categories.find((c) => c.id === catId);
    if (!targetCat) return;
    const bmsUnderCat = bookmarks.filter((b) => b.categoryId === catId);

    setConfirmInputText('');
    setConfirmModal({
      isOpen: true,
      type: 'clear_all',
      title: `🗑️ 确定删除分类 [${targetCat.name}] 吗？`,
      description: `该分类下现有 ${bmsUnderCat.length} 个书签。删除分类后关联书签将被重定向至“未分类”。`,
      warningDetails: [
        `删除分类：${targetCat.name}`,
        bmsUnderCat.length > 0
          ? `${bmsUnderCat.length} 个书签将保留并转移到“未分类”`
          : '该分类下无关联书签',
      ],
      confirmText: '确认删除该分类',
      confirmButtonClass: 'bg-red-600 hover:bg-red-700 text-white shadow-xs',
      pendingData: {
        categories: categories.filter((c) => c.id !== catId),
        bookmarks: bookmarks.map((b) =>
          b.categoryId === catId ? { ...b, categoryId: 'uncategorized' } : b
        ),
      },
    });
  };

  const handleMoveCatOrder = (catId: string, direction: 'up' | 'down') => {
    const idx = categories.findIndex((c) => c.id === catId);
    if (idx < 0) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === categories.length - 1) return;

    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    const newCats = [...categories];
    const temp = newCats[idx];
    newCats[idx] = newCats[targetIdx];
    newCats[targetIdx] = temp;

    const reordered = newCats.map((c, i) => ({ ...c, order: i + 1 }));
    onApplySyncData(reordered, bookmarks);
  };

  // --- Bookmark Handlers ---
  const handleOpenAddBookmark = (defaultCatId?: string) => {
    setEditingBmId(null);
    setBmFormTitle('');
    setBmFormUrl('');
    setBmFormCatId(defaultCatId || (categories[0] ? categories[0].id : ''));
    setBmFormDesc('');
    setBmFormIcon('');
    setBmFormTags('');
    setBmFormIsPinned(false);
    setBmFormIsPrivate(false);
    setShowBmModal(true);
  };

  const handleOpenEditBookmark = (bm: Bookmark) => {
    setEditingBmId(bm.id);
    setBmFormTitle(bm.title);
    setBmFormUrl(bm.url);
    setBmFormCatId(bm.categoryId);
    setBmFormDesc(bm.description || '');
    setBmFormIcon(bm.icon || '');
    setBmFormTags(bm.tags ? bm.tags.join(', ') : '');
    setBmFormIsPinned(!!bm.isPinned);
    setBmFormIsPrivate(!!bm.isPrivate);
    setShowBmModal(true);
  };

  const handleSaveBookmark = () => {
    if (!bmFormUrl.trim()) {
      showMsg('error', '请输入有效的网址 (URL)');
      return;
    }

    let formattedUrl = bmFormUrl.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = 'https://' + formattedUrl;
    }

    let extractedHostname = '';
    try {
      extractedHostname = new URL(formattedUrl).hostname.replace(/^www\./, '');
    } catch {
      extractedHostname = formattedUrl;
    }

    const targetTitle = bmFormTitle.trim() || extractedHostname || '未命名书签';
    const targetCatId = bmFormCatId || (categories[0] ? categories[0].id : 'uncategorized');
    const tagList = bmFormTags
      .split(/[,，]/)
      .map((t) => t.trim())
      .filter(Boolean);

    if (editingBmId) {
      const updated = bookmarks.map((b) =>
        b.id === editingBmId
          ? {
              ...b,
              title: targetTitle,
              url: formattedUrl,
              categoryId: targetCatId,
              description: bmFormDesc.trim(),
              icon: bmFormIcon.trim(),
              tags: tagList,
              isPinned: bmFormIsPinned,
              isPrivate: bmFormIsPrivate,
              updatedAt: Date.now(),
            }
          : b
      );
      onApplySyncData(categories, updated);
      showMsg('success', `书签 [${targetTitle}] 修改成功！`);
    } else {
      const newBm: Bookmark = {
        id: `bm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        categoryId: targetCatId,
        title: targetTitle,
        url: formattedUrl,
        icon: bmFormIcon.trim(),
        description: bmFormDesc.trim(),
        tags: tagList,
        isPinned: bmFormIsPinned,
        isPrivate: bmFormIsPrivate,
        order: bookmarks.length + 1,
        clicks: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      onApplySyncData(categories, [newBm, ...bookmarks]);
      showMsg('success', `成功创建书签 [${newBm.title}]！`);
    }

    setShowBmModal(false);
    setEditingBmId(null);
  };

  const handleDeleteSingleBookmark = (bmId: string) => {
    const target = bookmarks.find((b) => b.id === bmId);
    if (!target) return;
    const updated = bookmarks.filter((b) => b.id !== bmId);
    onApplySyncData(categories, updated);
    setSelectedBmIds((prev) => prev.filter((id) => id !== bmId));
    showMsg('info', `已删除书签 [${target.title}]`);
  };

  const handleTogglePinSingleBookmark = (bmId: string) => {
    const updated = bookmarks.map((b) => (b.id === bmId ? { ...b, isPinned: !b.isPinned } : b));
    onApplySyncData(categories, updated);
  };

  const handleTogglePrivateSingleBookmark = (bmId: string) => {
    const updated = bookmarks.map((b) => (b.id === bmId ? { ...b, isPrivate: !b.isPrivate } : b));
    onApplySyncData(categories, updated);
  };

  const handleToggleSelectBookmark = (bmId: string) => {
    setSelectedBmIds((prev) =>
      prev.includes(bmId) ? prev.filter((id) => id !== bmId) : [...prev, bmId]
    );
  };

  const handleSelectAllBookmarks = (filteredBms: Bookmark[]) => {
    if (selectedBmIds.length === filteredBms.length && filteredBms.length > 0) {
      setSelectedBmIds([]);
    } else {
      setSelectedBmIds(filteredBms.map((b) => b.id));
    }
  };

  const handleBatchMoveBookmarks = (targetCatId: string) => {
    if (!targetCatId || selectedBmIds.length === 0) return;
    const updated = bookmarks.map((b) =>
      selectedBmIds.includes(b.id) ? { ...b, categoryId: targetCatId } : b
    );
    onApplySyncData(categories, updated);
    showMsg('success', `已批量将 ${selectedBmIds.length} 个书签转移到新分类！`);
    setSelectedBmIds([]);
  };

  const handleBatchTogglePinned = (pinState: boolean) => {
    if (selectedBmIds.length === 0) return;
    const updated = bookmarks.map((b) =>
      selectedBmIds.includes(b.id) ? { ...b, isPinned: pinState } : b
    );
    onApplySyncData(categories, updated);
    showMsg('success', `已批量 ${pinState ? '固定' : '取消固定'} ${selectedBmIds.length} 个书签！`);
    setSelectedBmIds([]);
  };

  const handleBatchTogglePrivate = (privState: boolean) => {
    if (selectedBmIds.length === 0) return;
    const updated = bookmarks.map((b) =>
      selectedBmIds.includes(b.id) ? { ...b, isPrivate: privState } : b
    );
    onApplySyncData(categories, updated);
    showMsg('success', `已批量 ${privState ? '设为私密' : '设为公开'} ${selectedBmIds.length} 个书签！`);
    setSelectedBmIds([]);
  };

  const handleBatchDeleteBookmarks = () => {
    if (selectedBmIds.length === 0) return;
    const updated = bookmarks.filter((b) => !selectedBmIds.includes(b.id));
    onApplySyncData(categories, updated);
    showMsg('info', `已批量删除 ${selectedBmIds.length} 个书签`);
    setSelectedBmIds([]);
  };

  const handleExecuteBatchQuickAdd = () => {
    if (!batchRawText.trim()) {
      showMsg('error', '请输入需要添加的网址文本');
      return;
    }

    const lines = batchRawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const targetCat = batchAddCatId || (categories[0] ? categories[0].id : 'uncategorized');
    const newBms: Bookmark[] = [];

    lines.forEach((line) => {
      const parts = line.split(/[|丨]/).map((p) => p.trim());
      let rawUrl = parts[0];
      if (!rawUrl) return;

      if (!/^https?:\/\//i.test(rawUrl)) {
        rawUrl = 'https://' + rawUrl;
      }

      let host = '新书签';
      try {
        host = new URL(rawUrl).hostname.replace(/^www\./, '');
      } catch {
        host = rawUrl;
      }

      const title = parts[1] || host;
      const desc = parts[2] || '';

      newBms.push({
        id: `bm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        categoryId: targetCat,
        title,
        url: rawUrl,
        description: desc,
        tags: [],
        isPinned: false,
        isPrivate: false,
        order: bookmarks.length + newBms.length + 1,
        clicks: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    if (newBms.length === 0) {
      showMsg('error', '未能从输入的文本中解析出有效的网址');
      return;
    }

    onApplySyncData(categories, [...newBms, ...bookmarks]);
    showMsg('success', `成功批量快速导入 ${newBms.length} 个新书签！`);
    setBatchRawText('');
  };

  const getDuplicateBookmarks = () => {
    const urlMap = new Map<string, Bookmark[]>();
    bookmarks.forEach((bm) => {
      const lower = bm.url.trim().toLowerCase().replace(/\/$/, '');
      if (!urlMap.has(lower)) {
        urlMap.set(lower, []);
      }
      urlMap.get(lower)!.push(bm);
    });

    const duplicates: { url: string; count: number; items: Bookmark[] }[] = [];
    urlMap.forEach((items, url) => {
      if (items.length > 1) {
        duplicates.push({ url, count: items.length, items });
      }
    });

    return duplicates;
  };

  const handleCleanDuplicates = () => {
    const duplicates = getDuplicateBookmarks();
    if (duplicates.length === 0) {
      showMsg('info', '未检测到任何重复的网址书签');
      return;
    }

    const keepIds = new Set<string>();
    const urlSeen = new Set<string>();

    bookmarks.forEach((bm) => {
      const lower = bm.url.trim().toLowerCase().replace(/\/$/, '');
      if (!urlSeen.has(lower)) {
        urlSeen.add(lower);
        keepIds.add(bm.id);
      }
    });

    const cleaned = bookmarks.filter((bm) => keepIds.has(bm.id));
    const removedCount = bookmarks.length - cleaned.length;
    onApplySyncData(categories, cleaned);
    showMsg('success', `清理完成！共自动去重并删除了 ${removedCount} 个重复网址！`);
  };

  useEffect(() => {
    setConfigInternal(syncConfig);
  }, [syncConfig, isOpen]);

  useEffect(() => {
    setLocalSettingsInternal(settings);
  }, [settings, isOpen]);

  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab, isOpen]);

  // Initial passive health check when opened
  useEffect(() => {
    if (isOpen) {
      // Evaluate initial unconfigured / idle states
      if (!config.gist.token || !config.gist.gistId) {
        setGistHealth({ status: 'unconfigured', message: '尚未填写 Gist 凭证' });
      }
      if (!config.cloudflareKv.accountId || !config.cloudflareKv.apiToken) {
        setKvHealth({ status: 'unconfigured', message: '尚未配置 KV 凭证' });
      }
      if (!config.cloudflareD1.accountId || !config.cloudflareD1.apiToken) {
        setD1Health({ status: 'unconfigured', message: '尚未配置 D1 凭证' });
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const showMsg = (type: 'success' | 'error' | 'info', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => {
      setStatusMessage(null);
    }, 4500);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleSaveConfig = () => {
    onUpdateSyncConfig(config);
    if (onUpdateSettings) {
      onUpdateSettings(localSettings);
    }
    showMsg('success', '所有设置与同步配置已安全保存在本地');
  };

  // Check Gist Connection
  const handleCheckGist = async () => {
    if (!config.gist.token.trim() || !config.gist.gistId.trim()) {
      setGistHealth({ status: 'unconfigured', message: '请先填写 Token 与 Gist ID' });
      showMsg('error', '请先填写 GitHub Token 和 Gist ID');
      return;
    }
    setGistHealth({ status: 'checking', message: '正在探测 GitHub API 延迟...' });
    const res = await checkGistConnectionStatus(config.gist.token, config.gist.gistId, config.gist.filename);
    if (res.ok) {
      setGistHealth({
        status: 'online',
        latencyMs: res.latencyMs,
        message: res.message,
        lastChecked: res.lastChecked,
        details: res.details,
      });
      showMsg('success', res.message);
    } else {
      setGistHealth({
        status: 'error',
        latencyMs: res.latencyMs,
        message: res.message,
        lastChecked: res.lastChecked,
      });
      showMsg('error', res.message);
    }
  };

  // Check KV Connection
  const handleCheckKV = async () => {
    if (!config.cloudflareKv.accountId || !config.cloudflareKv.namespaceId || !config.cloudflareKv.apiToken) {
      setKvHealth({ status: 'unconfigured', message: '请先填写完整 Cloudflare KV 凭证' });
      showMsg('error', '请完整填写 Cloudflare Account ID、KV Namespace ID 与 API 令牌');
      return;
    }
    setKvHealth({ status: 'checking', message: '正在连接 Cloudflare KV 全球边缘节点...' });
    const res = await testCloudflareKVConnection(config.cloudflareKv);
    if (res.ok) {
      setKvHealth({
        status: 'online',
        latencyMs: res.latencyMs,
        message: res.message,
        lastChecked: res.lastChecked,
        details: res.details,
      });
      showMsg('success', res.message);
    } else {
      setKvHealth({
        status: 'error',
        latencyMs: res.latencyMs,
        message: res.message,
        lastChecked: res.lastChecked,
      });
      showMsg('error', res.message);
    }
  };

  // Check D1 Connection
  const handleCheckD1 = async () => {
    if (!config.cloudflareD1.accountId || !config.cloudflareD1.databaseId || !config.cloudflareD1.apiToken) {
      setD1Health({ status: 'unconfigured', message: '请先填写完整 Cloudflare D1 凭证' });
      showMsg('error', '请完整填写 Cloudflare Account ID、D1 Database ID 与 API 令牌');
      return;
    }
    setD1Health({ status: 'checking', message: '正在查询 Cloudflare D1 关系数据库...' });
    const res = await testCloudflareD1Connection(config.cloudflareD1);
    if (res.ok) {
      setD1Health({
        status: 'online',
        latencyMs: res.latencyMs,
        message: res.message,
        lastChecked: res.lastChecked,
        details: res.details,
      });
      showMsg('success', res.message);
    } else {
      setD1Health({
        status: 'error',
        latencyMs: res.latencyMs,
        message: res.message,
        lastChecked: res.lastChecked,
      });
      showMsg('error', res.message);
    }
  };

  // Ping / Check all services simultaneously
  const handleCheckAllEngines = async () => {
    setIsCheckingAll(true);
    await Promise.allSettled([
      config.gist.token && config.gist.gistId ? handleCheckGist() : Promise.resolve(),
      config.cloudflareKv.accountId && config.cloudflareKv.apiToken ? handleCheckKV() : Promise.resolve(),
      config.cloudflareD1.accountId && config.cloudflareD1.apiToken ? handleCheckD1() : Promise.resolve(),
    ]);
    setIsCheckingAll(false);
  };

  // 1-Click Create Gist on GitHub
  const handleAutoCreateGist = async () => {
    if (!config.gist.token.trim()) {
      showMsg('error', '请先填写您的 GitHub Personal Access Token');
      return;
    }

    setLoadingAction('createGist');
    const payload: OneNavSyncPayload = {
      version: SYNC_DATA_VERSION,
      updatedAt: Date.now(),
      categories,
      bookmarks,
      settings,
    };

    const res = await createGistStorage(config.gist.token, config.gist.filename, payload);
    setLoadingAction(null);

    if (res.success && res.gistId) {
      const updated: SyncConfig = {
        ...config,
        provider: 'gist',
        gist: {
          ...config.gist,
          gistId: res.gistId,
        },
        lastSyncTime: Date.now(),
        lastSyncStatus: 'success',
        lastSyncError: null,
      };
      setConfig(updated);
      onUpdateSyncConfig(updated);
      setGistHealth({
        status: 'online',
        message: `Gist 创建并关联成功 (ID: ${res.gistId})`,
        lastChecked: Date.now(),
      });
      showMsg('success', `Gist 创建成功！已自动关联 ID: ${res.gistId}`);
    } else {
      showMsg('error', `创建失败: ${res.error || 'Token 权限不足或网络异常'}`);
    }
  };

  // 1-Click Init Table in D1
  const handleInitD1Table = async () => {
    if (!config.cloudflareD1.accountId || !config.cloudflareD1.databaseId || !config.cloudflareD1.apiToken) {
      showMsg('error', '请先填写 Cloudflare Account ID、D1 Database ID 与 API 令牌');
      return;
    }

    setLoadingAction('initD1Table');
    const res = await initAndTestCloudflareD1(config.cloudflareD1);
    setLoadingAction(null);

    if (res.success) {
      setD1Health({
        status: 'online',
        latencyMs: res.latencyMs,
        message: res.message,
        lastChecked: Date.now(),
      });
      showMsg('success', res.message);
    } else {
      setD1Health({
        status: 'error',
        message: res.message,
        lastChecked: Date.now(),
      });
      showMsg('error', res.message);
    }
  };

  // Pull from Cloudflare KV
  const handlePullFromKV = async () => {
    setLoadingAction('pullKV');
    const res = await fetchFromCloudflareKV(config.cloudflareKv);
    setLoadingAction(null);

    if (res.success && res.data) {
      applyRemoteDataConfirmation(res.data, 'Cloudflare KV');
    } else {
      showMsg('error', res.message);
    }
  };

  // Push to Cloudflare KV
  const handlePushToKV = async () => {
    setLoadingAction('pushKV');
    const payload: OneNavSyncPayload = {
      version: SYNC_DATA_VERSION,
      updatedAt: Date.now(),
      categories,
      bookmarks,
      settings,
    };
    const res = await saveToCloudflareKV(config.cloudflareKv, payload);
    setLoadingAction(null);

    if (res.success) {
      const updated: SyncConfig = {
        ...config,
        lastSyncTime: Date.now(),
        lastSyncStatus: 'success',
        lastSyncError: null,
      };
      setConfig(updated);
      onUpdateSyncConfig(updated);
      setKvHealth({
        status: 'online',
        latencyMs: res.latencyMs,
        message: '数据已最新保存至 Cloudflare KV',
        lastChecked: Date.now(),
      });
      showMsg('success', res.message);
    } else {
      showMsg('error', res.message);
    }
  };

  // Pull from Cloudflare D1
  const handlePullFromD1 = async () => {
    setLoadingAction('pullD1');
    const res = await fetchFromCloudflareD1(config.cloudflareD1);
    setLoadingAction(null);

    if (res.success && res.data) {
      applyRemoteDataConfirmation(res.data, 'Cloudflare D1');
    } else {
      showMsg('error', res.message);
    }
  };

  // Push to Cloudflare D1
  const handlePushToD1 = async () => {
    setLoadingAction('pushD1');
    const payload: OneNavSyncPayload = {
      version: SYNC_DATA_VERSION,
      updatedAt: Date.now(),
      categories,
      bookmarks,
      settings,
    };
    const res = await saveToCloudflareD1(config.cloudflareD1, payload);
    setLoadingAction(null);

    if (res.success) {
      const updated: SyncConfig = {
        ...config,
        lastSyncTime: Date.now(),
        lastSyncStatus: 'success',
        lastSyncError: null,
      };
      setConfig(updated);
      onUpdateSyncConfig(updated);
      setD1Health({
        status: 'online',
        latencyMs: res.latencyMs,
        message: '数据已最新保存至 Cloudflare D1 数据库',
        lastChecked: Date.now(),
      });
      showMsg('success', res.message);
    } else {
      showMsg('error', res.message);
    }
  };

  // Universal Pull Test
  const handleTestPull = async () => {
    setLoadingAction('pull');
    const res = await pullRemoteData(config);
    setLoadingAction(null);

    if (res.success && res.data) {
      applyRemoteDataConfirmation(res.data, config.provider.toUpperCase());
    } else {
      showMsg('error', res.message || '从云端读取数据失败');
    }
  };

  // Universal Push Now
  const handlePushNow = async () => {
    setLoadingAction('push');
    const payload: OneNavSyncPayload = {
      version: SYNC_DATA_VERSION,
      updatedAt: Date.now(),
      categories,
      bookmarks,
      settings,
    };

    const res = await pushRemoteData(config, payload);
    setLoadingAction(null);

    if (res.success) {
      const updated = {
        ...config,
        lastSyncTime: Date.now(),
        lastSyncStatus: 'success' as const,
        lastSyncError: null,
      };
      setConfig(updated);
      onUpdateSyncConfig(updated);
      showMsg('success', '本地书签已成功推送并同步到云端！');
    } else {
      showMsg('error', res.message || '推送失败');
    }
  };

  const applyRemoteDataConfirmation = (remoteData: OneNavSyncPayload, sourceName: string) => {
    if (
      window.confirm(
        `从「${sourceName}」获取到 ${remoteData.categories?.length || 0} 个分类和 ${
          remoteData.bookmarks?.length || 0
        } 个书签。\n数据更新时间: ${
          remoteData.updatedAt ? new Date(remoteData.updatedAt).toLocaleString() : '未知'
        }\n\n点击“确定”以合并加载至本地导航。`
      )
    ) {
      onApplySyncData(remoteData.categories || [], remoteData.bookmarks || []);
      const updated = {
        ...config,
        lastSyncTime: Date.now(),
        lastSyncStatus: 'success' as const,
        lastSyncError: null,
      };
      setConfig(updated);
      onUpdateSyncConfig(updated);
      showMsg('success', `已成功加载并应用来自 ${sourceName} 的书签数据！`);
    }
  };

  // Helper to process HTML File
  const processHtmlFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const { categories: newCats, bookmarks: newBms } = parseHtmlBookmarks(content);
        if (newBms.length === 0) {
          showMsg('error', '未能从 HTML 文件中解析到有效书签');
          return;
        }

        setImportMode('merge');
        setConfirmInputText('');
        setConfirmModal({
          isOpen: true,
          type: 'restore_html',
          title: '🌐 确定导入浏览器 HTML 书签吗？',
          description: `从文件 [${file.name}] 中成功解析到 ${newCats.length} 个分类与 ${newBms.length} 个书签。`,
          confirmText: '确认合并导入书签',
          confirmButtonClass: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm',
          pendingData: { categories: newCats, bookmarks: newBms },
        });
      }
    };
    reader.readAsText(file);
  };

  // Helper to process JSON File
  const processJsonFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const parsed = parseOneNavJson(content);
        if (!parsed || (parsed.bookmarks.length === 0 && parsed.categories.length === 0)) {
          showMsg('error', '未能识别此 JSON 备份格式，未找到有效的分类或书签数据');
          return;
        }

        setImportMode('merge');
        setConfirmInputText('');
        setConfirmModal({
          isOpen: true,
          type: 'restore_json',
          title: '📥 确定从本地 JSON 导入书签数据吗？',
          description: `读取备份文件 [${file.name}] 成功！包含 ${parsed.categories.length} 个分类与 ${parsed.bookmarks.length} 个书签。`,
          confirmText: '确认合并导入书签',
          confirmButtonClass: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm',
          pendingData: { categories: parsed.categories, bookmarks: parsed.bookmarks },
        });
      }
    };
    reader.readAsText(file);
  };

  // Handle HTML Bookmarks Import
  const handleImportHtmlFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processHtmlFile(file);
    }
    e.target.value = '';
  };

  // Handle JSON Import
  const handleImportJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processJsonFile(file);
    }
    e.target.value = '';
  };

  // Request Export Security Authentication
  const requestExportAuth = (onSuccessCallback: () => void) => {
    setExportAuth({
      isOpen: true,
      username: '',
      password: '',
      error: '',
      onSuccess: onSuccessCallback,
    });
  };

  const handleConfirmExport = () => {
    if (exportAuth.username.trim() === 'admin' && exportAuth.password === '123456') {
      if (exportAuth.onSuccess) {
        exportAuth.onSuccess();
      }
      setExportAuth({
        isOpen: false,
        username: '',
        password: '',
        error: '',
        onSuccess: null,
      });
      setShowExportPassword(false);
    } else {
      setExportAuth({
        ...exportAuth,
        error: '管理员账号或密码错误，请重新输入',
      });
    }
  };

  // Export JSON (Secured)
  const handleExportJson = () => {
    requestExportAuth(() => {
      const payload: OneNavSyncPayload = {
        version: SYNC_DATA_VERSION,
        updatedAt: Date.now(),
        categories,
        bookmarks,
        settings,
      };
      const blob = new Blob([exportOneNavJson(payload)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `onenav-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showMsg('success', '已成功一键导出 OneNav JSON 离线备份文件');
    });
  };

  // Export HTML Bookmarks (Secured)
  const handleExportHtml = () => {
    requestExportAuth(() => {
      const html = exportToHtmlBookmarks(categories, bookmarks);
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bookmarks-${new Date().toISOString().slice(0, 10)}.html`;
      a.click();
      URL.revokeObjectURL(url);
      showMsg('success', '已成功导出 Chrome / Edge 标准书签 HTML 文件');
    });
  };

  // Reset to default sample
  const handleResetSample = () => {
    setConfirmInputText('');
    setConfirmModal({
      isOpen: true,
      type: 'restore_json',
      title: '🔄 确定要恢复为初始示例导航吗？',
      description: '此操作将使用系统初始的内置演示数据替换现有的分类与书签。',
      warningDetails: [
        '替换当前自定义数据为系统默认的导航分类与示例书签',
      ],
      confirmText: '确认恢复示例导航',
      confirmButtonClass: 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm',
      pendingData: { categories: INITIAL_CATEGORIES, bookmarks: INITIAL_BOOKMARKS },
    });
  };

  // One-Click: Clear All Data
  const handleOneClickClearAll = () => {
    setConfirmInputText('');
    setConfirmModal({
      isOpen: true,
      type: 'clear_all',
      title: '⚠️ 高危确认：确定要一键清空所有存储数据吗？',
      description: '此操作将一键物理注销并清除当前保存在浏览器与本地的全部分类和书签。',
      warningDetails: [
        `即将清空删除全站 ${categories.length} 个分类与 ${bookmarks.length} 个书签`,
        '本地清空后无法自动撤销，建议您提前先导出 JSON 离线备份',
      ],
      requireKeyword: 'CLEAR',
      confirmText: '确认清空所有存储数据',
      confirmButtonClass: 'bg-red-600 hover:bg-red-700 text-white shadow-sm',
    });
  };

  // One-Click: Factory Reset
  const handleOneClickFactoryReset = () => {
    setConfirmInputText('');
    setConfirmModal({
      isOpen: true,
      type: 'factory_reset',
      title: '🚨 高危重置：确定要还原系统到出厂初始状态吗？',
      description: '此操作将全量注销并恢复出厂设置，重置所有自定义分类、书签、壁纸主题、搜索引擎与云端同步连接。',
      warningDetails: [
        '全量替换所有分类与书签为初始示例状态',
        '重置站点名称、自定义标题与 SEO 全局 Meta / Open Graph 社交标签',
        '重置所有 Cloudflare D1/KV/Gist 云端同步账号密钥',
      ],
      requireKeyword: 'RESET',
      confirmText: '确认还原到出厂初始状态',
      confirmButtonClass: 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm',
    });
  };

  // One-Click: Reset Click Statistics
  const handleOneClickResetStats = () => {
    setConfirmInputText('');
    setConfirmModal({
      isOpen: true,
      type: 'reset_stats',
      title: '📊 确定要重置所有书签的点击访问量吗？',
      description: '此操作将清空全站所有书签的累计点击次数与热度统计，书签及分类不会被删除。',
      warningDetails: [
        `包含全站 ${bookmarks.length} 个书签的访问计数清零`,
        '书签名称与网址不受任何影响',
      ],
      confirmText: '确认归零访问统计',
      confirmButtonClass: 'bg-purple-600 hover:bg-purple-700 text-white shadow-sm',
    });
  };

  // Execute Confirmed High-Risk Action
  const executeConfirmedAction = () => {
    if (!confirmModal) return;
    const { type, pendingData } = confirmModal;

    if (type === 'clear_all') {
      onApplySyncData([], []);
      showMsg('info', '已成功一键清空所有存储数据');
    } else if (type === 'factory_reset') {
      onApplySyncData(INITIAL_CATEGORIES, INITIAL_BOOKMARKS);
      if (onUpdateSettings) {
        onUpdateSettings(DEFAULT_SETTINGS);
      }
      onUpdateSyncConfig({
        provider: 'none',
        autoSync: true,
        syncIntervalMinutes: 10,
        lastSyncTime: null,
        lastSyncStatus: 'idle',
        lastSyncError: null,
        gist: { token: '', gistId: '', filename: 'onenav-bookmarks.json' },
        githubRepo: { token: '', owner: '', repo: '', branch: 'main', path: 'data/onenav.json' },
        webdav: { url: '', username: '', password: '', path: '/onenav/bookmarks.json' },
        customApi: { endpoint: '', secretToken: '' },
        cloudflareKv: { accountId: '', namespaceId: '', apiToken: '', keyName: 'onenav_bookmarks' },
        cloudflareD1: { accountId: '', databaseId: '', apiToken: '', tableName: 'onenav_sync' },
      });
      showMsg('success', '已全量恢复系统出厂初始状态');
    } else if (type === 'reset_stats') {
      const resetBookmarks = bookmarks.map((b) => ({ ...b, clicks: 0 }));
      onApplySyncData(categories, resetBookmarks);
      showMsg('success', '已成功归零所有书签点击访问量');
    } else if ((type === 'restore_json' || type === 'restore_html') && pendingData) {
      if (importMode === 'overwrite') {
        onApplySyncData(pendingData.categories, pendingData.bookmarks);
        showMsg('success', `覆盖导入成功！已全量恢复 ${pendingData.categories.length} 个分类与 ${pendingData.bookmarks.length} 个书签！`);
      } else {
        const merged = mergeImportData(categories, bookmarks, pendingData.categories, pendingData.bookmarks);
        onApplySyncData(merged.categories, merged.bookmarks);
        showMsg(
          'success',
          `增量合并导入成功！已成功新增 ${merged.categories.length - categories.length} 个分类与 ${merged.bookmarks.length - bookmarks.length} 个书签！`
        );
      }
    }

    setConfirmModal(null);
    setConfirmInputText('');
  };

  // One-Click: Force Cloud Push
  const handleOneClickCloudPush = async () => {
    if (config.provider === 'local') {
      showMsg('info', '当前为本地存储模式，请先配置并选中 Cloudflare 或 Gist 云端引擎');
      return;
    }
    setIsOneClickSyncing(true);
    try {
      const payload: OneNavSyncPayload = {
        version: SYNC_DATA_VERSION,
        updatedAt: Date.now(),
        categories,
        bookmarks,
        settings: localSettings,
      };
      const res = await pushRemoteData(config, payload);
      if (res.success) {
        showMsg('success', res.message || '已一键将全站数据推送到云端');
      } else {
        showMsg('error', res.message || '一键推送到云端失败');
      }
    } catch (err: any) {
      showMsg('error', `推送到云端失败: ${err.message || '网络连接异常'}`);
    } finally {
      setIsOneClickSyncing(false);
    }
  };

  // Workflows code
  const GITHUB_ACTIONS_WORKFLOW = `name: Deploy OneNav to GitHub Pages
on:
  push:
    branches: [ main ]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: 'pages'
  cancel-in-progress: true

jobs:
  build-and-deploy:
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build static site
        run: npm run build

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4`;

  const warningDetailsToRender = (() => {
    if (!confirmModal) return [];
    if (confirmModal.type !== 'restore_json' && confirmModal.type !== 'restore_html') {
      return confirmModal.warningDetails || [];
    }

    const rawCats = confirmModal.pendingData?.categories || [];
    const rawBms = confirmModal.pendingData?.bookmarks || [];

    if (importMode === 'overwrite') {
      return [
        `全量覆盖导入：现有 ${categories.length} 个分类 与 ${bookmarks.length} 个书签 将被全部清空！`,
        `替换为导入文件内的数据：${rawCats.length} 个分类 与 ${rawBms.length} 个书签`,
        '⚠️ 警告：此操作不可逆，请在确定前做好备份！',
      ];
    } else {
      const merged = mergeImportData(categories, bookmarks, rawCats, rawBms);
      const addedCats = merged.categories.length - categories.length;
      const addedBms = merged.bookmarks.length - bookmarks.length;
      return [
        `智能增量导入：保留您现有的 ${categories.length} 个分类 与 ${bookmarks.length} 个书签`,
        `新增类别：${addedCats} 个 (若同名分类已存在，会将网址智能合并)`,
        `实际新增网址：${addedBms} 个 (已自动为您去重，避免重复导入相同链接)`,
        `合并后总数据量：${merged.categories.length} 个分类 · ${merged.bookmarks.length} 个网址书签`,
      ];
    }
  })();

  const dynamicConfirmText = (() => {
    if (!confirmModal) return '';
    if (confirmModal.type !== 'restore_json' && confirmModal.type !== 'restore_html') {
      return confirmModal.confirmText;
    }
    return importMode === 'overwrite' ? '确认清空并覆盖导入' : '确认合并导入';
  })();

  const dynamicConfirmButtonClass = (() => {
    if (!confirmModal) return '';
    if (confirmModal.type !== 'restore_json' && confirmModal.type !== 'restore_html') {
      return confirmModal.confirmButtonClass;
    }
    return importMode === 'overwrite'
      ? 'bg-red-600 hover:bg-red-700 text-white shadow-sm font-bold'
      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-bold';
  })();

  return (
    <div
      id="modal-sync-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/50 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="modal-sync-content"
        className="w-full max-w-4xl bg-white/92 dark:bg-slate-900/92 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/60 dark:border-white/10 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 flex items-center justify-center">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>无服务器数据存储与多端同步</span>
                <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                  纯客户端直连 · 免服务器
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                支持 Cloudflare D1 原生 SQLite、Cloudflare Workers KV、GitHub Gist 及 WebDAV
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Real-time Status Indicators Banner */}
        <div className="px-6 py-3 bg-slate-100/70 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700/80 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <Activity className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
              <span>实时存储连接状态</span>
              <span className="text-[10px] text-slate-400 font-normal">
                (当前主同步源:{' '}
                <span className="font-bold text-blue-600 dark:text-blue-400 uppercase">
                  {config.provider}
                </span>
                )
              </span>
            </div>
            <button
              type="button"
              onClick={handleCheckAllEngines}
              disabled={isCheckingAll}
              className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isCheckingAll ? 'animate-spin' : ''}`} />
              <span>探测所有连接</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            {/* 1. Cloudflare D1 Status Card */}
            <div
              id="status-card-d1"
              onClick={() => setActiveTab('cloudflare_d1')}
              className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden ${
                activeTab === 'cloudflare_d1'
                  ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-950/30 shadow-md ring-1 ring-orange-500/30'
                  : 'border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800 hover:border-orange-300 dark:hover:border-orange-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                  <Database className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                  <span>Cloudflare D1</span>
                </div>
                {config.provider === 'cloudflare_d1' && (
                  <span className="text-[9px] bg-orange-500 text-white px-2 py-0.5 rounded-full font-bold shadow-2xs">
                    主同步源
                  </span>
                )}
              </div>

              {/* Status or Skeleton */}
              {d1Health.status === 'checking' ? (
                <div className="mt-2 space-y-1.5 animate-pulse">
                  <div className="flex items-center gap-1.5">
                    <RefreshCw className="w-3 h-3 animate-spin text-orange-500" />
                    <div className="h-3.5 bg-orange-200 dark:bg-orange-900/60 rounded-md w-24"></div>
                  </div>
                  <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded-md w-3/4"></div>
                </div>
              ) : (
                <div className="flex items-center justify-between mt-2 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    {d1Health.status === 'online' && (
                      <div className="relative flex items-center justify-center">
                        <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </div>
                    )}
                    {d1Health.status === 'error' && (
                      <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    )}
                    {d1Health.status === 'unconfigured' && (
                      <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" />
                    )}
                    {d1Health.status === 'idle' && (
                      <span className="w-2 h-2 rounded-full bg-slate-400" />
                    )}

                    <span
                      className={`font-semibold ${
                        d1Health.status === 'online'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : d1Health.status === 'error'
                          ? 'text-red-500'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {d1Health.status === 'online'
                        ? `已连通 (${d1Health.latencyMs || 0}ms)`
                        : d1Health.status === 'error'
                        ? '连接异常'
                        : d1Health.status === 'unconfigured'
                        ? '待配置'
                        : '就绪'}
                    </span>
                  </div>

                  <button
                    id="btn-test-d1-card"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCheckD1();
                    }}
                    className="px-2 py-0.5 text-[10px] font-semibold text-orange-600 dark:text-orange-400 bg-orange-100/60 dark:bg-orange-950/60 hover:bg-orange-200 dark:hover:bg-orange-900 rounded-md transition-colors"
                  >
                    测试连接
                  </button>
                </div>
              )}
            </div>

            {/* 2. Cloudflare KV Status Card */}
            <div
              id="status-card-kv"
              onClick={() => setActiveTab('cloudflare_kv')}
              className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden ${
                activeTab === 'cloudflare_kv'
                  ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 shadow-md ring-1 ring-amber-500/30'
                  : 'border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800 hover:border-amber-300 dark:hover:border-amber-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                  <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>Cloudflare KV</span>
                </div>
                {config.provider === 'cloudflare_kv' && (
                  <span className="text-[9px] bg-amber-500 text-white px-2 py-0.5 rounded-full font-bold shadow-2xs">
                    主同步源
                  </span>
                )}
              </div>

              {/* Status or Skeleton */}
              {kvHealth.status === 'checking' ? (
                <div className="mt-2 space-y-1.5 animate-pulse">
                  <div className="flex items-center gap-1.5">
                    <RefreshCw className="w-3 h-3 animate-spin text-amber-500" />
                    <div className="h-3.5 bg-amber-200 dark:bg-amber-900/60 rounded-md w-24"></div>
                  </div>
                  <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded-md w-3/4"></div>
                </div>
              ) : (
                <div className="flex items-center justify-between mt-2 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    {kvHealth.status === 'online' && (
                      <div className="relative flex items-center justify-center">
                        <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </div>
                    )}
                    {kvHealth.status === 'error' && (
                      <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    )}
                    {kvHealth.status === 'unconfigured' && (
                      <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" />
                    )}
                    {kvHealth.status === 'idle' && (
                      <span className="w-2 h-2 rounded-full bg-slate-400" />
                    )}

                    <span
                      className={`font-semibold ${
                        kvHealth.status === 'online'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : kvHealth.status === 'error'
                          ? 'text-red-500'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {kvHealth.status === 'online'
                        ? `已连通 (${kvHealth.latencyMs || 0}ms)`
                        : kvHealth.status === 'error'
                        ? '连接异常'
                        : kvHealth.status === 'unconfigured'
                        ? '待配置'
                        : '就绪'}
                    </span>
                  </div>

                  <button
                    id="btn-test-kv-card"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCheckKV();
                    }}
                    className="px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-100/60 dark:bg-amber-950/60 hover:bg-amber-200 dark:hover:bg-amber-900 rounded-md transition-colors"
                  >
                    测试连接
                  </button>
                </div>
              )}
            </div>

            {/* 3. GitHub Gist Status Card */}
            <div
              id="status-card-gist"
              onClick={() => setActiveTab('gist')}
              className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden ${
                activeTab === 'gist'
                  ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 shadow-md ring-1 ring-blue-500/30'
                  : 'border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800 hover:border-blue-300 dark:hover:border-blue-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                  <Github className="w-3.5 h-3.5 text-slate-800 dark:text-slate-200 shrink-0" />
                  <span>GitHub Gist</span>
                </div>
                {config.provider === 'gist' && (
                  <span className="text-[9px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-bold shadow-2xs">
                    主同步源
                  </span>
                )}
              </div>

              {/* Status or Skeleton */}
              {gistHealth.status === 'checking' ? (
                <div className="mt-2 space-y-1.5 animate-pulse">
                  <div className="flex items-center gap-1.5">
                    <RefreshCw className="w-3 h-3 animate-spin text-blue-500" />
                    <div className="h-3.5 bg-blue-200 dark:bg-blue-900/60 rounded-md w-24"></div>
                  </div>
                  <div className="h-2.5 bg-slate-200 dark:bg-slate-700 rounded-md w-3/4"></div>
                </div>
              ) : (
                <div className="flex items-center justify-between mt-2 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    {gistHealth.status === 'online' && (
                      <div className="relative flex items-center justify-center">
                        <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </div>
                    )}
                    {gistHealth.status === 'error' && (
                      <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    )}
                    {gistHealth.status === 'unconfigured' && (
                      <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" />
                    )}
                    {gistHealth.status === 'idle' && (
                      <span className="w-2 h-2 rounded-full bg-slate-400" />
                    )}

                    <span
                      className={`font-semibold ${
                        gistHealth.status === 'online'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : gistHealth.status === 'error'
                          ? 'text-red-500'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {gistHealth.status === 'online'
                        ? `已连通 (${gistHealth.latencyMs || 0}ms)`
                        : gistHealth.status === 'error'
                        ? '连接异常'
                        : gistHealth.status === 'unconfigured'
                        ? '待配置'
                        : '就绪'}
                    </span>
                  </div>

                  <button
                    id="btn-test-gist-card"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCheckGist();
                    }}
                    className="px-2 py-0.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-100/60 dark:bg-blue-950/60 hover:bg-blue-200 dark:hover:bg-blue-900 rounded-md transition-colors"
                  >
                    测试连接
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 bg-slate-50/70 dark:bg-slate-800/40 shrink-0 overflow-x-auto gap-1">
          <button
            onClick={() => setActiveTab('general')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'general'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>站点与 ICP 备案</span>
          </button>

          <button
            onClick={() => setActiveTab('bookmarks_manage')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'bookmarks_manage'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <FolderPlus className="w-3.5 h-3.5 text-purple-500" />
            <span>📑 书签与分类管理</span>
          </button>

          <button
            onClick={() => setActiveTab('cloudflare_d1')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'cloudflare_d1'
                ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Cloudflare D1 (推荐)</span>
          </button>

          <button
            onClick={() => setActiveTab('cloudflare_kv')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'cloudflare_kv'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Cloudflare KV (高速)</span>
          </button>

          <button
            onClick={() => setActiveTab('gist')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'gist'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Github className="w-3.5 h-3.5" />
            <span>GitHub Gist</span>
          </button>

          <button
            onClick={() => setActiveTab('repo_webdav')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'repo_webdav'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Git / WebDAV</span>
          </button>

          <button
            onClick={() => setActiveTab('backup')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'backup'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-indigo-500" />
            <span>📦 书签管理中心</span>
          </button>

          <button
            onClick={() => setActiveTab('deploy')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'deploy'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Rocket className="w-3.5 h-3.5" />
            <span>Pages 部署指南</span>
          </button>
        </div>

        {/* Status Toast */}
        {statusMessage && (
          <div
            className={`mx-6 mt-4 p-3 rounded-xl text-xs flex items-center gap-2 animate-in fade-in duration-150 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : statusMessage.type === 'error'
                ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
            }`}
          >
            {statusMessage.type === 'success' && <Check className="w-4 h-4 shrink-0" />}
            {statusMessage.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0" />}
            {statusMessage.type === 'info' && <Info className="w-4 h-4 shrink-0" />}
            <span className="flex-1">{statusMessage.text}</span>
          </div>
        )}

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* TAB: GENERAL SITE & ICP COMPLIANCE */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              {/* Site Identity & Developer Card */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      站点与开发者信息
                    </span>
                  </div>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-semibold">
                    版本: {APP_VERSION}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      站点主标题
                    </label>
                    <input
                      type="text"
                      value={localSettings.title}
                      onChange={(e) =>
                        setLocalSettings({ ...localSettings, title: e.target.value })
                      }
                      placeholder="OneNav Serverless"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      副标题 / Slogan
                    </label>
                    <input
                      type="text"
                      value={localSettings.subtitle}
                      onChange={(e) =>
                        setLocalSettings({ ...localSettings, subtitle: e.target.value })
                      }
                      placeholder="免服务器极速书签导航与多端自动同步"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      开发者名称 (可选)
                    </label>
                    <input
                      type="text"
                      value={localSettings.developerName || ''}
                      onChange={(e) =>
                        setLocalSettings({ ...localSettings, developerName: e.target.value })
                      }
                      placeholder="例如: YourName / Studio"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      开发者链接 / 个人主页 (可选)
                    </label>
                    <input
                      type="url"
                      value={localSettings.developerUrl || ''}
                      onChange={(e) =>
                        setLocalSettings({ ...localSettings, developerUrl: e.target.value })
                      }
                      placeholder="https://github.com/..."
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* ICP Filing & Compliance */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      站长合规与 ICP 备案信息
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    适用于个人站长与自建域名合规
                  </span>
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed">
                  在国内部署或使用自定义域名时，填写 ICP 备案号将在页脚优雅展示，并自动生成工信部备案查询链接。留空则在页脚自动隐藏。
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      ICP 备案号 (可选)
                    </label>
                    <input
                      id="input-icp-number"
                      type="text"
                      value={localSettings.icpNumber || ''}
                      onChange={(e) =>
                        setLocalSettings({ ...localSettings, icpNumber: e.target.value.trim() })
                      }
                      placeholder="例如: 京ICP备2024012345号-1 或 粤ICP备12345678号 (留空不显示)"
                      className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        工信部备案系统跳转链接
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setLocalSettings({
                            ...localSettings,
                            icpUrl: 'https://beian.miit.gov.cn/',
                          })
                        }
                        className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        重置为工信部默认 (https://beian.miit.gov.cn/)
                      </button>
                    </div>
                    <input
                      id="input-icp-url"
                      type="url"
                      value={localSettings.icpUrl || 'https://beian.miit.gov.cn/'}
                      onChange={(e) =>
                        setLocalSettings({ ...localSettings, icpUrl: e.target.value.trim() })
                      }
                      placeholder="https://beian.miit.gov.cn/"
                      className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      自定义页脚附加文字 (可选)
                    </label>
                    <input
                      id="input-custom-footer"
                      type="text"
                      value={localSettings.customFooterText || ''}
                      onChange={(e) =>
                        setLocalSettings({ ...localSettings, customFooterText: e.target.value })
                      }
                      placeholder="例如: © 2026 My Studio. 个人极简导航"
                      className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Footer Preview Live Box */}
                <div className="mt-3 p-3 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-dashed border-slate-300 dark:border-slate-700 text-xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">
                    页脚实时预览 (极简无框布局)
                  </span>
                  <div className="flex flex-wrap items-center gap-2 text-slate-600 dark:text-slate-400 text-[11px]">
                    <span>{localSettings.customFooterText || `© ${new Date().getFullYear()} ${localSettings.title || 'OneNav'}`}</span>
                    {localSettings.developerName && (
                      <>
                        <span>·</span>
                        <span className="text-blue-600 dark:text-blue-400 font-medium">{localSettings.developerName}</span>
                      </>
                    )}
                    <span>·</span>
                    <span className="font-mono text-[10px]">{APP_VERSION}</span>
                    {localSettings.icpNumber ? (
                      <>
                        <span>·</span>
                        <span className="text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-500" />
                          <span>{localSettings.icpNumber}</span>
                        </span>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Global Meta Tags & Open Graph Social Sharing Configuration */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-purple-500" />
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      全局 Meta 标签 & Open Graph 社交卡片 (SEO)
                    </span>
                  </div>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-semibold">
                    OG & SEO
                  </span>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  自定义网页全局 Head Meta 属性与 Open Graph (og:title, og:description, og:image) 标签。确保在微信、X (Twitter)、Discord、Telegram 或 Slack 中分享网站链接时显示精美的封面卡片。
                </p>

                <div className="space-y-3">
                  {/* Meta Title & Meta Keywords */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        自定义 Meta Title (网页标题)
                      </label>
                      <input
                        type="text"
                        value={localSettings.metaTitle || ''}
                        onChange={(e) =>
                          setLocalSettings({ ...localSettings, metaTitle: e.target.value })
                        }
                        placeholder={`留空则默认使用: ${localSettings.title || 'OneNav'}`}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        Meta Keywords (SEO 关键词，逗号隔开)
                      </label>
                      <input
                        type="text"
                        value={localSettings.metaKeywords || ''}
                        onChange={(e) =>
                          setLocalSettings({ ...localSettings, metaKeywords: e.target.value })
                        }
                        placeholder="例如: OneNav,书签导航,Serverless,个人导航"
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>

                  {/* Meta Description */}
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      自定义 Meta Description (SEO 网页描述)
                    </label>
                    <textarea
                      rows={2}
                      value={localSettings.metaDescription || ''}
                      onChange={(e) =>
                        setLocalSettings({ ...localSettings, metaDescription: e.target.value })
                      }
                      placeholder={`留空则默认使用副标题: ${localSettings.subtitle || '免服务器极速书签导航'}`}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-purple-500 resize-none"
                    />
                  </div>

                  {/* Open Graph Title & Open Graph Description */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        Open Graph 标题 (og:title)
                      </label>
                      <input
                        type="text"
                        value={localSettings.ogTitle || ''}
                        onChange={(e) =>
                          setLocalSettings({ ...localSettings, ogTitle: e.target.value })
                        }
                        placeholder="留空默认等同于 Meta Title"
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        Open Graph 描述 (og:description)
                      </label>
                      <input
                        type="text"
                        value={localSettings.ogDescription || ''}
                        onChange={(e) =>
                          setLocalSettings({ ...localSettings, ogDescription: e.target.value })
                        }
                        placeholder="留空默认等同于 Meta Description"
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>

                  {/* Open Graph Image & Canonical URL */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        Open Graph 封面图片 URL (og:image)
                      </label>
                      <input
                        type="url"
                        value={localSettings.ogImage || ''}
                        onChange={(e) =>
                          setLocalSettings({ ...localSettings, ogImage: e.target.value })
                        }
                        placeholder="https://example.com/cover.png (建议 1200x630)"
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-purple-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        Open Graph 标准 URL (og:url)
                      </label>
                      <input
                        type="url"
                        value={localSettings.ogUrl || ''}
                        onChange={(e) =>
                          setLocalSettings({ ...localSettings, ogUrl: e.target.value })
                        }
                        placeholder="留空则自动识别当前浏览器 window.location.href"
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-purple-500 font-mono"
                      />
                    </div>
                  </div>

                  {/* Open Graph Site Name & Twitter Card Type */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        Open Graph 站点名称 (og:site_name)
                      </label>
                      <input
                        type="text"
                        value={localSettings.ogSiteName || ''}
                        onChange={(e) =>
                          setLocalSettings({ ...localSettings, ogSiteName: e.target.value })
                        }
                        placeholder={`默认使用: ${localSettings.title || 'OneNav Serverless'}`}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        Twitter Card 展现模式 (twitter:card)
                      </label>
                      <select
                        value={localSettings.twitterCard || 'summary_large_image'}
                        onChange={(e) =>
                          setLocalSettings({
                            ...localSettings,
                            twitterCard: e.target.value as 'summary_large_image' | 'summary',
                          })
                        }
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-purple-500 font-medium"
                      >
                        <option value="summary_large_image">🖼️ 大图卡片 (summary_large_image)</option>
                        <option value="summary">📄 标准小图摘要 (summary)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Open Graph Live Preview Card */}
                <div className="mt-3 p-3.5 rounded-xl bg-slate-900 text-white space-y-2 border border-slate-800 shadow-md">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono uppercase tracking-wider">
                    <span>社交平台分享卡片实时效果预览 (Discord / Twitter / WeChat / Slack)</span>
                    <span className="text-purple-400 font-bold">og:image & og:title</span>
                  </div>

                  <div className="rounded-lg overflow-hidden border border-slate-800 bg-slate-950 flex flex-col">
                    {/* Cover Banner */}
                    <div className="h-32 w-full bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 relative overflow-hidden flex items-center justify-center">
                      {localSettings.ogImage ? (
                        <img
                          src={localSettings.ogImage}
                          alt="Open Graph Cover Preview"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-1.5 text-center px-4">
                          <Share2 className="w-6 h-6 text-purple-400/80" />
                          <span className="text-xs font-bold text-white/90">
                            {localSettings.ogTitle || localSettings.metaTitle || localSettings.title || 'OneNav Serverless'}
                          </span>
                          <span className="text-[10px] text-purple-200/70">
                            {localSettings.ogSiteName || localSettings.title || 'OneNav Navigation'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Meta Card Details */}
                    <div className="p-3 bg-slate-900/90 space-y-1">
                      <div className="text-[10px] text-slate-400 font-mono truncate">
                        {localSettings.ogUrl || 'https://nav.example.com'}
                      </div>
                      <div className="text-xs font-bold text-slate-100 truncate">
                        {localSettings.ogTitle || localSettings.metaTitle || localSettings.title || 'OneNav Serverless'}
                      </div>
                      <div className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                        {localSettings.ogDescription || localSettings.metaDescription || localSettings.subtitle || '免服务器极速书签导航盘，支持多端自动同步。'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Behavior & Display Options */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-slate-100">
                  <FileText className="w-4 h-4 text-indigo-500" />
                  <span>交互与界面显示</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="sm:col-span-2 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
                    <div>
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                        外观主题模式
                      </span>
                      <span className="text-[11px] text-slate-400 block">
                        可手动选择浅色/深色，或跟随操作系统设置自动切换
                      </span>
                    </div>
                    <select
                      id="select-theme-mode"
                      value={localSettings.themeMode || 'light'}
                      onChange={(e) =>
                        setLocalSettings({ ...localSettings, themeMode: e.target.value as ThemeMode })
                      }
                      className="px-3 py-1.5 text-xs font-medium rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 shrink-0"
                    >
                      <option value="light">☀️ 浅色明亮</option>
                      <option value="dark">🌙 深色暗黑</option>
                      <option value="system">💻 跟随系统</option>
                    </select>
                  </div>

                  <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={localSettings.openInNewTab}
                      onChange={(e) =>
                        setLocalSettings({ ...localSettings, openInNewTab: e.target.checked })
                      }
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>在新标签页打开书签外链</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={localSettings.showClickCount}
                      onChange={(e) =>
                        setLocalSettings({ ...localSettings, showClickCount: e.target.checked })
                      }
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>显示卡片点击访问统计</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={localSettings.showDescription}
                      onChange={(e) =>
                        setLocalSettings({ ...localSettings, showDescription: e.target.checked })
                      }
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>显示书签描述信息</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={localSettings.enableSearchSuggestions ?? true}
                      onChange={(e) =>
                        setLocalSettings({
                          ...localSettings,
                          enableSearchSuggestions: e.target.checked,
                        })
                      }
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>开启搜索框关键词智能联想</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB: CLOUDFLARE D1 */}
          {activeTab === 'cloudflare_d1' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-orange-50/70 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900/50 text-xs text-slate-700 dark:text-slate-300 space-y-2 leading-relaxed">
                <div className="font-semibold text-orange-900 dark:text-orange-300 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Database className="w-4 h-4" />
                    <span>Cloudflare D1 原生关系型 SQL 存储 (Serverless SQLite)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>凭据保存在本地</span>
                    </span>
                  </div>
                </div>
                <p>
                  Cloudflare D1 是构建在全球边缘网络上的分布式 SQL 数据库，具备自动备份与事务一致性。无需自建 MySQL 数据库，直接通过 Cloudflare REST API 实现书签的极速双向同步与持久化！
                </p>
              </div>

              {/* D1 Connection Health & Diagnostics Panel */}
              <div
                id="d1-connection-diagnostics"
                className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 shadow-xs"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-orange-500" />
                      <span>D1 实时连接与网络探测</span>
                    </span>
                    {d1Health.latencyMs !== undefined && d1Health.status === 'online' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800/60">
                        ⚡ {d1Health.latencyMs}ms
                      </span>
                    )}
                  </div>

                  <button
                    id="btn-test-d1-connection"
                    type="button"
                    onClick={handleCheckD1}
                    disabled={d1Health.status === 'checking'}
                    className="px-3 py-1 rounded-xl text-xs font-semibold bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-50 transition-colors flex items-center gap-1.5 shadow-2xs"
                  >
                    <RefreshCw className={`w-3 h-3 ${d1Health.status === 'checking' ? 'animate-spin' : ''}`} />
                    <span>{d1Health.status === 'checking' ? '正在测试...' : '测试连接'}</span>
                  </button>
                </div>

                {/* Status or Skeleton */}
                {d1Health.status === 'checking' ? (
                  <div className="p-3 rounded-xl bg-orange-50/50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/40 space-y-2 animate-pulse">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 text-orange-500 animate-spin" />
                      <div className="h-3.5 bg-orange-200 dark:bg-orange-900/60 rounded-md w-48"></div>
                    </div>
                    <div className="h-3 bg-slate-200 dark:bg-slate-700/60 rounded-md w-3/4"></div>
                  </div>
                ) : (
                  <div
                    className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
                      d1Health.status === 'online'
                        ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-200'
                        : d1Health.status === 'error'
                        ? 'bg-red-50/80 dark:bg-red-950/30 border-red-200 dark:border-red-800/80 text-red-800 dark:text-red-200'
                        : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {d1Health.status === 'online' && (
                      <div className="p-1 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    )}
                    {d1Health.status === 'error' && (
                      <div className="p-1 rounded-lg bg-red-500/20 text-red-500 shrink-0">
                        <XCircle className="w-4 h-4" />
                      </div>
                    )}
                    {(d1Health.status === 'unconfigured' || d1Health.status === 'idle') && (
                      <div className="p-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-500 shrink-0">
                        <Info className="w-4 h-4" />
                      </div>
                    )}

                    <div className="flex-1 space-y-0.5">
                      <div className="font-semibold flex items-center justify-between">
                        <span>
                          {d1Health.status === 'online'
                            ? 'D1 数据库连接成功，服务状态畅通'
                            : d1Health.status === 'error'
                            ? 'D1 连接验证失败'
                            : '尚未验证 D1 连接'}
                        </span>
                        {d1Health.lastChecked && (
                          <span className="text-[10px] font-normal text-slate-400">
                            {new Date(d1Health.lastChecked).toLocaleTimeString()}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] opacity-90 leading-relaxed font-mono break-all">
                        {d1Health.message ||
                          (d1Health.status === 'unconfigured'
                            ? '请先填写 Account ID、Database ID 与 API 令牌，然后点击「测试连接」'
                            : '就绪')}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Engine Switch */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="radio-provider-d1"
                    name="main-sync-provider"
                    checked={config.provider === 'cloudflare_d1'}
                    onChange={() => setConfig({ ...config, provider: 'cloudflare_d1' })}
                    className="text-orange-500 focus:ring-orange-500"
                  />
                  <label
                    htmlFor="radio-provider-d1"
                    className="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    设为主要同步引擎 (开启后台自动推送与定时更新)
                  </label>
                </div>
                <span className="text-[11px] text-orange-600 dark:text-orange-400 font-medium">
                  {config.provider === 'cloudflare_d1' ? '当前激活' : '点击启用'}
                </span>
              </div>

              {/* Form inputs */}
              <div className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Account ID */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between mb-1.5">
                      <span>Cloudflare Account ID (账户 ID) *</span>
                      <a
                        href="https://dash.cloudflare.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-orange-600 hover:underline flex items-center gap-0.5"
                      >
                        <span>控制台右侧复制</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </label>
                    <input
                      type="text"
                      value={config.cloudflareD1.accountId}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          cloudflareD1: { ...config.cloudflareD1, accountId: e.target.value.trim() },
                        })
                      }
                      placeholder="例如: 8a4b6c8d0e1f2a3b4c5d6e7f8a9b0c1d"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  {/* Database ID */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between mb-1.5">
                      <span>D1 Database ID (数据库 UUID) *</span>
                      <a
                        href="https://dash.cloudflare.com/?to=/:account/workers-and-pages/d1"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-orange-600 hover:underline flex items-center gap-0.5"
                      >
                        <span>前往 D1 管理</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </label>
                    <input
                      type="text"
                      value={config.cloudflareD1.databaseId}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          cloudflareD1: { ...config.cloudflareD1, databaseId: e.target.value.trim() },
                        })
                      }
                      placeholder="例如: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                {/* API Token */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Key className="w-3.5 h-3.5 text-orange-500" />
                      <span>Cloudflare API 令牌 (Token) *</span>
                    </label>
                    <a
                      href="https://dash.cloudflare.com/profile/api-tokens"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-orange-600 hover:underline flex items-center gap-0.5"
                    >
                      <span>创建令牌 (需包含 D1 写入权限)</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="relative">
                    <input
                      type={showD1Token ? 'text' : 'password'}
                      value={config.cloudflareD1.apiToken}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          cloudflareD1: { ...config.cloudflareD1, apiToken: e.target.value.trim() },
                        })
                      }
                      placeholder="例如: V8k_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      className="w-full pl-3.5 pr-10 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-orange-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowD1Token(!showD1Token)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      title={showD1Token ? '隐藏令牌' : '查看令牌'}
                    >
                      {showD1Token ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    在 Cloudflare API Tokens 中创建自定义令牌，权限选择：<strong>Account → D1 → Edit</strong>。
                  </p>
                </div>

                {/* Table name */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                    数据库表名 (Table Name)
                  </label>
                  <input
                    type="text"
                    value={config.cloudflareD1.tableName || 'onenav_sync'}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        cloudflareD1: { ...config.cloudflareD1, tableName: e.target.value.trim() },
                      })
                    }
                    placeholder="onenav_sync"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      id="btn-d1-test-and-init"
                      type="button"
                      onClick={handleInitD1Table}
                      disabled={loadingAction === 'initD1Table'}
                      className="px-3 py-1.5 text-xs font-medium rounded-xl bg-orange-50 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800 hover:bg-orange-100 dark:hover:bg-orange-900/60 disabled:opacity-40 transition-colors flex items-center gap-1.5"
                    >
                      {loadingAction === 'initD1Table' ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Database className="w-3.5 h-3.5" />
                      )}
                      <span>初始化数据表</span>
                    </button>

                    <button
                      id="btn-d1-test-conn"
                      type="button"
                      onClick={handleCheckD1}
                      disabled={d1Health.status === 'checking'}
                      className="px-3 py-1.5 text-xs font-medium rounded-xl border border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950/40 disabled:opacity-40 transition-colors flex items-center gap-1.5"
                    >
                      <Wifi className="w-3.5 h-3.5 text-orange-500" />
                      <span>测试连接</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      id="btn-pull-d1"
                      type="button"
                      onClick={handlePullFromD1}
                      disabled={loadingAction === 'pullD1'}
                      className="px-3.5 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors flex items-center gap-1"
                    >
                      {loadingAction === 'pullD1' && <RefreshCw className="w-3 h-3 animate-spin" />}
                      <span>从 D1 拉取</span>
                    </button>

                    <button
                      id="btn-push-d1"
                      type="button"
                      onClick={handlePushToD1}
                      disabled={loadingAction === 'pushD1'}
                      className="px-3.5 py-1.5 text-xs font-medium rounded-xl bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-40 transition-colors flex items-center gap-1 shadow-xs"
                    >
                      {loadingAction === 'pushD1' && <RefreshCw className="w-3 h-3 animate-spin" />}
                      <span>推送到 D1 保存</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Cloudflare D1 Raw Data Preview Inspector Component */}
              <DataPreviewInspector
                d1Config={config.cloudflareD1}
                currentLocalData={{
                  version: SYNC_DATA_VERSION,
                  updatedAt: Date.now(),
                  categories,
                  bookmarks,
                  settings,
                }}
              />
            </div>
          )}

          {/* TAB: CLOUDFLARE KV */}
          {activeTab === 'cloudflare_kv' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50 text-xs text-slate-700 dark:text-slate-300 space-y-2 leading-relaxed">
                <div className="font-semibold text-amber-900 dark:text-amber-300 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-4 h-4" />
                    <span>Cloudflare Workers KV 边缘键值存储</span>
                  </div>
                  <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>全球 CDN 缓存秒级响应</span>
                  </span>
                </div>
                <p>
                  利用 Cloudflare 全球 300+ 边缘机房的 KV 存储网络，读写延迟低至毫秒级。可作为高速书签同步源或与 Cloudflare Pages Functions 无缝配合。
                </p>
              </div>

              {/* KV Connection Health & Diagnostics Panel */}
              <div
                id="kv-connection-diagnostics"
                className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 shadow-xs"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-amber-500" />
                      <span>KV 实时连接与网络探测</span>
                    </span>
                    {kvHealth.latencyMs !== undefined && kvHealth.status === 'online' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                        ⚡ {kvHealth.latencyMs}ms
                      </span>
                    )}
                  </div>

                  <button
                    id="btn-test-kv-connection"
                    type="button"
                    onClick={handleCheckKV}
                    disabled={kvHealth.status === 'checking'}
                    className="px-3 py-1 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-50 transition-colors flex items-center gap-1.5 shadow-2xs"
                  >
                    <RefreshCw className={`w-3 h-3 ${kvHealth.status === 'checking' ? 'animate-spin' : ''}`} />
                    <span>{kvHealth.status === 'checking' ? '正在测试...' : '测试连接'}</span>
                  </button>
                </div>

                {/* Status or Skeleton */}
                {kvHealth.status === 'checking' ? (
                  <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 space-y-2 animate-pulse">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                      <div className="h-3.5 bg-amber-200 dark:bg-amber-900/60 rounded-md w-48"></div>
                    </div>
                    <div className="h-3 bg-slate-200 dark:bg-slate-700/60 rounded-md w-3/4"></div>
                  </div>
                ) : (
                  <div
                    className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
                      kvHealth.status === 'online'
                        ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-200'
                        : kvHealth.status === 'error'
                        ? 'bg-red-50/80 dark:bg-red-950/30 border-red-200 dark:border-red-800/80 text-red-800 dark:text-red-200'
                        : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {kvHealth.status === 'online' && (
                      <div className="p-1 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    )}
                    {kvHealth.status === 'error' && (
                      <div className="p-1 rounded-lg bg-red-500/20 text-red-500 shrink-0">
                        <XCircle className="w-4 h-4" />
                      </div>
                    )}
                    {(kvHealth.status === 'unconfigured' || kvHealth.status === 'idle') && (
                      <div className="p-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-500 shrink-0">
                        <Info className="w-4 h-4" />
                      </div>
                    )}

                    <div className="flex-1 space-y-0.5">
                      <div className="font-semibold flex items-center justify-between">
                        <span>
                          {kvHealth.status === 'online'
                            ? 'KV 命名空间连接成功，边缘节点就绪'
                            : kvHealth.status === 'error'
                            ? 'KV 连接验证失败'
                            : '尚未验证 KV 连接'}
                        </span>
                        {kvHealth.lastChecked && (
                          <span className="text-[10px] font-normal text-slate-400">
                            {new Date(kvHealth.lastChecked).toLocaleTimeString()}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] opacity-90 leading-relaxed font-mono break-all">
                        {kvHealth.message ||
                          (kvHealth.status === 'unconfigured'
                            ? '请先填写 Account ID、KV Namespace ID 与 API 令牌，然后点击「测试连接」'
                            : '就绪')}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Engine Switch */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="radio-provider-kv"
                    name="main-sync-provider"
                    checked={config.provider === 'cloudflare_kv'}
                    onChange={() => setConfig({ ...config, provider: 'cloudflare_kv' })}
                    className="text-amber-500 focus:ring-amber-500"
                  />
                  <label
                    htmlFor="radio-provider-kv"
                    className="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    设为主要同步引擎 (开启后台自动推送与定时更新)
                  </label>
                </div>
                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                  {config.provider === 'cloudflare_kv' ? '当前激活' : '点击启用'}
                </span>
              </div>

              {/* Form inputs */}
              <div className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Account ID */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between mb-1.5">
                      <span>Cloudflare Account ID (账户 ID) *</span>
                      <a
                        href="https://dash.cloudflare.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-amber-600 hover:underline flex items-center gap-0.5"
                      >
                        <span>控制台复制</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </label>
                    <input
                      type="text"
                      value={config.cloudflareKv.accountId}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          cloudflareKv: { ...config.cloudflareKv, accountId: e.target.value.trim() },
                        })
                      }
                      placeholder="例如: 8a4b6c8d0e1f2a3b4c5d6e7f8a9b0c1d"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* Namespace ID */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between mb-1.5">
                      <span>KV Namespace ID (命名空间 ID) *</span>
                      <a
                        href="https://dash.cloudflare.com/?to=/:account/workers-and-pages/kv/namespaces"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-amber-600 hover:underline flex items-center gap-0.5"
                      >
                        <span>前往 KV 列表</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </label>
                    <input
                      type="text"
                      value={config.cloudflareKv.namespaceId}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          cloudflareKv: { ...config.cloudflareKv, namespaceId: e.target.value.trim() },
                        })
                      }
                      placeholder="例如: 9d8c7b6a5e4f3a2b1c0d9e8f7a6b5c4d"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* API Token */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Key className="w-3.5 h-3.5 text-amber-500" />
                      <span>Cloudflare API 令牌 (Token) *</span>
                    </label>
                    <a
                      href="https://dash.cloudflare.com/profile/api-tokens"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-amber-600 hover:underline flex items-center gap-0.5"
                    >
                      <span>创建令牌 (需包含 KV Storage 权限)</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="relative">
                    <input
                      type={showKvToken ? 'text' : 'password'}
                      value={config.cloudflareKv.apiToken}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          cloudflareKv: { ...config.cloudflareKv, apiToken: e.target.value.trim() },
                        })
                      }
                      placeholder="例如: k4y_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      className="w-full pl-3.5 pr-10 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKvToken(!showKvToken)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      title={showKvToken ? '隐藏令牌' : '查看令牌'}
                    >
                      {showKvToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    在 Cloudflare API Tokens 中创建自定义令牌，权限选择：<strong>Account → Workers KV Storage → Edit</strong>。
                  </p>
                </div>

                {/* Key Name */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 block">
                    KV 存储键名 (Key Name)
                  </label>
                  <input
                    type="text"
                    value={config.cloudflareKv.keyName || 'onenav_bookmarks'}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        cloudflareKv: { ...config.cloudflareKv, keyName: e.target.value.trim() },
                      })
                    }
                    placeholder="onenav_bookmarks"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={handleCheckKV}
                    className="px-3 py-1.5 text-xs font-medium rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors flex items-center gap-1.5"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>测试 KV 连接状态</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handlePullFromKV}
                      disabled={loadingAction === 'pullKV'}
                      className="px-3.5 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors flex items-center gap-1"
                    >
                      {loadingAction === 'pullKV' && <RefreshCw className="w-3 h-3 animate-spin" />}
                      <span>从 KV 拉取</span>
                    </button>

                    <button
                      type="button"
                      onClick={handlePushToKV}
                      disabled={loadingAction === 'pushKV'}
                      className="px-3.5 py-1.5 text-xs font-medium rounded-xl bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-40 transition-colors flex items-center gap-1 shadow-xs"
                    >
                      {loadingAction === 'pushKV' && <RefreshCw className="w-3 h-3 animate-spin" />}
                      <span>推送到 KV 保存</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: GITHUB GIST SYNC */}
          {activeTab === 'gist' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 text-xs text-slate-700 dark:text-slate-300 space-y-1.5 leading-relaxed">
                <div className="font-semibold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                  <Github className="w-4 h-4" />
                  <span>GitHub Gist 极简云同步</span>
                </div>
                <p>
                  GitHub Gist 提供免费私密且自带完整历史版本控制的云端存储。前端直接与 GitHub API 交互，多设备只需填写相同的 Token 和 Gist ID 即可实现全自动同步。
                </p>
              </div>

              {/* Engine Switch */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    id="radio-provider-gist"
                    name="main-sync-provider"
                    checked={config.provider === 'gist'}
                    onChange={() => setConfig({ ...config, provider: 'gist' })}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <label
                    htmlFor="radio-provider-gist"
                    className="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    设为主要同步引擎 (开启后台自动推送与定时更新)
                  </label>
                </div>
                <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                  {config.provider === 'gist' ? '当前激活' : '点击启用'}
                </span>
              </div>

              <div className="space-y-3.5">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Key className="w-3.5 h-3.5 text-blue-500" />
                      <span>GitHub Personal Access Token (PAT) *</span>
                    </label>
                    <a
                      href="https://github.com/settings/tokens/new?scopes=gist&description=OneNav-Serverless-Sync"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-0.5"
                    >
                      <span>前往 GitHub 一键生成 (仅需勾选 gist 权限)</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="relative">
                    <input
                      type={showGistToken ? 'text' : 'password'}
                      value={config.gist.token}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          gist: { ...config.gist, token: e.target.value.trim() },
                        })
                      }
                      placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      className="w-full pl-3.5 pr-10 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowGistToken(!showGistToken)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showGistToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Gist ID (数据存储文件 ID) *
                    </label>
                    <button
                      type="button"
                      onClick={handleAutoCreateGist}
                      disabled={loadingAction === 'createGist'}
                      className="text-[11px] text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-medium flex items-center gap-1 disabled:opacity-50"
                    >
                      {loadingAction === 'createGist' ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <Rocket className="w-3 h-3" />
                      )}
                      <span>没有 Gist？点此一键在云端自动创建</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={config.gist.gistId}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        gist: { ...config.gist, gistId: e.target.value.trim() },
                      })
                    }
                    placeholder="例如: 3a1b2c4d5e6f7g8h9i0j (创建后会自动填入)"
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    在其它设备上只需填入相同的 Token 和 Gist ID 即可自动获取所有分类与书签。
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="flex items-center gap-2">
                    <input
                      id="check-auto-sync"
                      type="checkbox"
                      checked={config.autoSync}
                      onChange={(e) => setConfig({ ...config, autoSync: e.target.checked })}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label
                      htmlFor="check-auto-sync"
                      className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                      启用后台自动定时轮询同步
                    </label>
                  </div>

                  <div className="flex items-center gap-2 justify-end">
                    <span className="text-xs text-slate-500">轮询间隔:</span>
                    <select
                      value={config.syncIntervalMinutes}
                      onChange={(e) =>
                        setConfig({ ...config, syncIntervalMinutes: Number(e.target.value) })
                      }
                      className="text-xs px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                    >
                      <option value={5}>每 5 分钟</option>
                      <option value={10}>每 10 分钟</option>
                      <option value={30}>每 30 分钟</option>
                      <option value={60}>每 1 小时</option>
                    </select>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {config.lastSyncTime ? (
                      <span>最近同步: {new Date(config.lastSyncTime).toLocaleString()}</span>
                    ) : (
                      <span>尚未执行过云端同步</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleTestPull}
                      disabled={loadingAction === 'pull' || !config.gist.token || !config.gist.gistId}
                      className="px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors flex items-center gap-1"
                    >
                      {loadingAction === 'pull' && <RefreshCw className="w-3 h-3 animate-spin" />}
                      <span>从 Gist 拉取</span>
                    </button>

                    <button
                      type="button"
                      onClick={handlePushNow}
                      disabled={loadingAction === 'push' || !config.gist.token || !config.gist.gistId}
                      className="px-3 py-1.5 text-xs font-medium rounded-xl bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 transition-colors flex items-center gap-1"
                    >
                      {loadingAction === 'push' && <RefreshCw className="w-3 h-3 animate-spin" />}
                      <span>推送到 Gist</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: REPO & WEBDAV */}
          {activeTab === 'repo_webdav' && (
            <div className="space-y-5">
              {/* GitHub Repo */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id="radio-provider-repo"
                      name="main-sync-provider"
                      checked={config.provider === 'github_repo'}
                      onChange={() => setConfig({ ...config, provider: 'github_repo' })}
                    />
                    <label
                      htmlFor="radio-provider-repo"
                      className="text-xs font-bold text-slate-900 dark:text-slate-100 cursor-pointer"
                    >
                      GitHub 代码仓库文件同步
                    </label>
                  </div>
                  <span className="text-[10px] text-slate-400">将数据存入指定仓库分支</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-500 mb-1">GitHub PAT Token</label>
                    <div className="relative">
                      <input
                        type={showRepoToken ? 'text' : 'password'}
                        value={config.githubRepo.token}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            githubRepo: { ...config.githubRepo, token: e.target.value.trim() },
                          })
                        }
                        placeholder="ghp_xxx (需repo权限)"
                        className="w-full pl-3 pr-8 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRepoToken(!showRepoToken)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                      >
                        {showRepoToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">仓库所有者 (Owner)</label>
                    <input
                      type="text"
                      value={config.githubRepo.owner}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          githubRepo: { ...config.githubRepo, owner: e.target.value.trim() },
                        })
                      }
                      placeholder="你的GitHub用户名"
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">仓库名称 (Repo)</label>
                    <input
                      type="text"
                      value={config.githubRepo.repo}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          githubRepo: { ...config.githubRepo, repo: e.target.value.trim() },
                        })
                      }
                      placeholder="例如: my-onenav"
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">存储路径 (Path)</label>
                    <input
                      type="text"
                      value={config.githubRepo.path}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          githubRepo: { ...config.githubRepo, path: e.target.value.trim() },
                        })
                      }
                      placeholder="data/onenav.json"
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* WebDAV */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id="radio-provider-webdav"
                      name="main-sync-provider"
                      checked={config.provider === 'webdav'}
                      onChange={() => setConfig({ ...config, provider: 'webdav' })}
                    />
                    <label
                      htmlFor="radio-provider-webdav"
                      className="text-xs font-bold text-slate-900 dark:text-slate-100 cursor-pointer"
                    >
                      WebDAV 同步 (支持坚果云、Nextcloud 等)
                    </label>
                  </div>
                  <span className="text-[10px] text-slate-400">标准 WebDAV 协议</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="sm:col-span-2">
                    <label className="block text-slate-500 mb-1">WebDAV 服务器地址</label>
                    <input
                      type="text"
                      value={config.webdav.url}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          webdav: { ...config.webdav, url: e.target.value.trim() },
                        })
                      }
                      placeholder="https://dav.jianguoyun.com/dav/"
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">账号 / 用户名</label>
                    <input
                      type="text"
                      value={config.webdav.username}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          webdav: { ...config.webdav, username: e.target.value.trim() },
                        })
                      }
                      placeholder="账户邮箱"
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">应用专用密码</label>
                    <div className="relative">
                      <input
                        type={showWebdavPassword ? 'text' : 'password'}
                        value={config.webdav.password}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            webdav: { ...config.webdav, password: e.target.value },
                          })
                        }
                        placeholder="坚果云/Nextcloud 应用密码"
                        className="w-full pl-3 pr-8 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                      />
                      <button
                        type="button"
                        onClick={() => setShowWebdavPassword(!showWebdavPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                      >
                        {showWebdavPassword ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: BOOKMARK & CATEGORY MANAGEMENT SYSTEM */}
          {activeTab === 'bookmarks_manage' && (
            <div className="space-y-4">
              {/* Top Sub-Navigation Pills */}
              <div className="flex items-center justify-between p-2 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60">
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setManageSubTab('categories')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      manageSubTab === 'categories'
                        ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs border border-slate-200/80 dark:border-slate-700'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <Folder className="w-3.5 h-3.5" />
                    <span>📂 分类管理 ({categories.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setManageSubTab('bookmarks')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      manageSubTab === 'bookmarks'
                        ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs border border-slate-200/80 dark:border-slate-700'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>🔗 网址书签列表 ({bookmarks.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setManageSubTab('batch_add')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      manageSubTab === 'batch_add'
                        ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs border border-slate-200/80 dark:border-slate-700'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <FilePlus className="w-3.5 h-3.5" />
                    <span>⚡ 批量快速添加</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setManageSubTab('health')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      manageSubTab === 'health'
                        ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs border border-slate-200/80 dark:border-slate-700'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>🔍 重复与死链检测</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {manageSubTab === 'categories' && (
                    <button
                      type="button"
                      onClick={handleOpenAddCategory}
                      className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>新建分类</span>
                    </button>
                  )}
                  {manageSubTab === 'bookmarks' && (
                    <button
                      type="button"
                      onClick={() => handleOpenAddBookmark()}
                      className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>新建书签</span>
                    </button>
                  )}
                </div>
              </div>

              {/* SUB-VIEW 1: CATEGORY MANAGER */}
              {manageSubTab === 'categories' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
                    <span>共有 {categories.length} 个分类，支持自定义顺序、编辑名称与添加描述</span>
                    <span className="text-[11px] text-slate-400">点击 ⬆️ ⬇️ 可对首页分类导航排序</span>
                  </div>

                  <div className="divide-y divide-slate-200 dark:divide-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 overflow-hidden">
                    {categories.map((cat, index) => {
                      const count = bookmarks.filter((b) => b.categoryId === cat.id).length;
                      return (
                        <div
                          key={cat.id}
                          className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-100/60 dark:hover:bg-slate-800/80 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-xl shrink-0 p-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700">
                              {cat.icon || '🌐'}
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                                  {cat.name}
                                </span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-300 font-mono font-medium border border-purple-200 dark:border-purple-800/60">
                                  {count} 个书签
                                </span>
                              </div>
                              {cat.description && (
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                  {cat.description}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              disabled={index === 0}
                              onClick={() => handleMoveCatOrder(cat.id, 'up')}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-20"
                              title="向上移动"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={index === categories.length - 1}
                              onClick={() => handleMoveCatOrder(cat.id, 'down')}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-20"
                              title="向下移动"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenAddBookmark(cat.id)}
                              className="p-1.5 rounded-lg text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-950/60"
                              title="在此分类下加书签"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEditCategory(cat)}
                              className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-950/60"
                              title="编辑分类"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCategory(cat.id)}
                              className="p-1.5 rounded-lg text-red-500 hover:bg-red-100 dark:hover:bg-red-950/60"
                              title="删除分类"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SUB-VIEW 2: BOOKMARK LIST & BATCH OPERATIONS */}
              {manageSubTab === 'bookmarks' && (
                <div className="space-y-3">
                  {/* Search & Filter Controls */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="relative sm:col-span-2">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={bmSearchQuery}
                        onChange={(e) => setBmSearchQuery(e.target.value)}
                        placeholder="搜索标题、网址、描述或 Tag 标签..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <select
                      value={bmSelectedCatFilter}
                      onChange={(e) => setBmSelectedCatFilter(e.target.value)}
                      className="px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none"
                    >
                      <option value="all">全部分类 ({bookmarks.length})</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.icon} {c.name} ({bookmarks.filter((b) => b.categoryId === c.id).length})
                        </option>
                      ))}
                      <option value="uncategorized">未分类</option>
                    </select>
                  </div>

                  {/* Batch Actions Bar (Shows when items selected) */}
                  {selectedBmIds.length > 0 && (
                    <div className="p-3 rounded-xl bg-purple-900/90 text-white flex flex-wrap items-center justify-between gap-2 shadow-md animate-in fade-in duration-150 border border-purple-700">
                      <div className="flex items-center gap-2 text-xs font-bold">
                        <CheckSquare className="w-4 h-4 text-purple-300" />
                        <span>已选 {selectedBmIds.length} 项</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <div className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-lg">
                          <select
                            value={batchTargetCatId}
                            onChange={(e) => setBatchTargetCatId(e.target.value)}
                            className="bg-transparent text-xs text-white border-none focus:outline-none"
                          >
                            <option value="" className="text-slate-900">选择目标分类...</option>
                            {categories.map((c) => (
                              <option key={c.id} value={c.id} className="text-slate-900">
                                {c.name}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => handleBatchMoveBookmarks(batchTargetCatId)}
                            className="px-2 py-0.5 bg-purple-500 hover:bg-purple-600 rounded text-[10px] font-bold"
                          >
                            转移
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleBatchTogglePinned(true)}
                          className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-semibold"
                        >
                          📌 固定
                        </button>
                        <button
                          type="button"
                          onClick={() => handleBatchTogglePrivate(true)}
                          className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-semibold"
                        >
                          🔒 设为私密
                        </button>
                        <button
                          type="button"
                          onClick={handleBatchDeleteBookmarks}
                          className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded-lg text-xs font-bold"
                        >
                          🗑️ 删除
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedBmIds([])}
                          className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Filtered Bookmarks List */}
                  {(() => {
                    const filtered = bookmarks.filter((bm) => {
                      if (bmSelectedCatFilter !== 'all' && bm.categoryId !== bmSelectedCatFilter) {
                        return false;
                      }
                      if (bmSearchQuery.trim()) {
                        const q = bmSearchQuery.toLowerCase();
                        const matchTitle = bm.title.toLowerCase().includes(q);
                        const matchUrl = bm.url.toLowerCase().includes(q);
                        const matchDesc = (bm.description || '').toLowerCase().includes(q);
                        const matchTags = (bm.tags || []).some((t) => t.toLowerCase().includes(q));
                        return matchTitle || matchUrl || matchDesc || matchTags;
                      }
                      return true;
                    });

                    if (filtered.length === 0) {
                      return (
                        <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
                          <p className="text-xs text-slate-500">未找到匹配的书签导航</p>
                          <button
                            type="button"
                            onClick={() => handleOpenAddBookmark()}
                            className="px-3 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-semibold"
                          >
                            立即新建书签
                          </button>
                        </div>
                      );
                    }

                    const isAllSelected = selectedBmIds.length === filtered.length && filtered.length > 0;

                    return (
                      <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 overflow-hidden">
                        {/* Table Header */}
                        <div className="p-2.5 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs text-slate-500 font-semibold px-3">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleSelectAllBookmarks(filtered)}
                              className="p-1 text-slate-500 hover:text-purple-600"
                            >
                              {isAllSelected ? (
                                <CheckSquare className="w-4 h-4 text-purple-600" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                            <span>显示 {filtered.length} 个书签</span>
                          </div>
                          <span>操作控制</span>
                        </div>

                        {/* List Items */}
                        <div className="divide-y divide-slate-200 dark:divide-slate-800 max-h-[360px] overflow-y-auto">
                          {filtered.map((bm) => {
                            const cat = categories.find((c) => c.id === bm.categoryId);
                            const isSelected = selectedBmIds.includes(bm.id);

                            return (
                              <div
                                key={bm.id}
                                className={`p-2.5 flex items-center justify-between gap-3 text-xs transition-colors ${
                                  isSelected
                                    ? 'bg-purple-50 dark:bg-purple-950/40'
                                    : 'hover:bg-slate-100/60 dark:hover:bg-slate-800/80'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleSelectBookmark(bm.id)}
                                    className="p-0.5 text-slate-400 hover:text-purple-600 shrink-0"
                                  >
                                    {isSelected ? (
                                      <CheckSquare className="w-4 h-4 text-purple-600" />
                                    ) : (
                                      <Square className="w-4 h-4" />
                                    )}
                                  </button>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-slate-900 dark:text-slate-100 truncate">
                                        {bm.title}
                                      </span>
                                      {cat && (
                                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                          {cat.icon} {cat.name}
                                        </span>
                                      )}
                                      {bm.isPinned && (
                                        <span className="text-[10px] px-1 py-0.2 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-600 font-bold">
                                          📌 首页固定
                                        </span>
                                      )}
                                      {bm.isPrivate && (
                                        <span className="text-[10px] px-1 py-0.2 rounded bg-red-100 dark:bg-red-950/80 text-red-600 font-bold">
                                          🔒 私密
                                        </span>
                                      )}
                                    </div>
                                    <a
                                      href={bm.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline truncate block max-w-md mt-0.5"
                                    >
                                      {bm.url}
                                    </a>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleTogglePinSingleBookmark(bm.id)}
                                    className={`p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 ${
                                      bm.isPinned ? 'text-amber-500' : 'text-slate-400'
                                    }`}
                                    title="固定到首页"
                                  >
                                    <Pin className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleTogglePrivateSingleBookmark(bm.id)}
                                    className={`p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 ${
                                      bm.isPrivate ? 'text-red-500' : 'text-slate-400'
                                    }`}
                                    title="私密设置"
                                  >
                                    {bm.isPrivate ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditBookmark(bm)}
                                    className="p-1 text-blue-600 rounded hover:bg-blue-100 dark:hover:bg-blue-950/60"
                                    title="编辑"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSingleBookmark(bm.id)}
                                    className="p-1 text-red-500 rounded hover:bg-red-100 dark:hover:bg-red-950/60"
                                    title="删除"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* SUB-VIEW 3: BATCH QUICK ADD */}
              {manageSubTab === 'batch_add' && (
                <div className="space-y-3.5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-amber-500" />
                      <span>⚡ 批量快捷解析添加网址</span>
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      支持每行一条网址。例如：<code className="bg-slate-200 dark:bg-slate-700 px-1 rounded text-[10px]">https://github.com | GitHub | 代码托管平台</code>
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      选择导入的目标分类：
                    </label>
                    <select
                      value={batchAddCatId}
                      onChange={(e) => setBatchAddCatId(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.icon} {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      粘贴网址列表（每行一条）：
                    </label>
                    <textarea
                      rows={6}
                      value={batchRawText}
                      onChange={(e) => setBatchRawText(e.target.value)}
                      placeholder="https://google.com | Google 搜索
https://github.com | GitHub 社区
https://v2ex.com | V2EX"
                      className="w-full p-3 text-xs font-mono rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleExecuteBatchQuickAdd}
                    className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs transition-colors"
                  >
                    🚀 确认一键解析并导入书签
                  </button>
                </div>
              )}

              {/* SUB-VIEW 4: HEALTH & DUPLICATES */}
              {manageSubTab === 'health' && (
                <div className="space-y-3.5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <Wrench className="w-4 h-4 text-purple-500" />
                        <span>网址死链与重复体检工具</span>
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        扫描检测全站书签中的相同重复 URL 网址
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleCleanDuplicates}
                      className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs"
                    >
                      ✨ 一键去重清理
                    </button>
                  </div>

                  {(() => {
                    const dups = getDuplicateBookmarks();
                    if (dups.length === 0) {
                      return (
                        <div className="p-6 text-center text-xs text-emerald-600 dark:text-emerald-400 space-y-1">
                          <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500" />
                          <p className="font-bold">全站书签健康度 100%！未发现重复 URL</p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-2">
                        <div className="text-xs font-bold text-amber-600 dark:text-amber-400">
                          ⚠️ 检测到 {dups.length} 组完全重复的网址：
                        </div>
                        <div className="space-y-2 max-h-[260px] overflow-y-auto">
                          {dups.map((d, i) => (
                            <div
                              key={i}
                              className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-1"
                            >
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-mono text-blue-600 font-semibold truncate max-w-sm">
                                  {d.url}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-600 font-bold">
                                  重复 {d.count} 次
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500">
                                包含于：{d.items.map((it) => it.title).join(' / ')}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* TAB: DATA MANAGEMENT CENTER (UNIFIED BACKUP, RESTORE & SYSTEM RESET) */}
          {activeTab === 'backup' && (
            <div className="space-y-4">
              {/* 📦 书签管理中心 Dashboard Header */}
              <div className="p-4.5 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white space-y-3.5 shadow-lg relative overflow-hidden border border-indigo-900/60">
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                  <div className="flex items-center gap-2 font-bold text-xs text-indigo-300">
                    <Database className="w-4 h-4 text-indigo-400" />
                    <span>书签管理中心 (Bookmarks Management Center)</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                    v{SYNC_DATA_VERSION} · 本地与云端同步盘
                  </span>
                </div>

                {/* Storage Statistics Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-[10px] text-slate-400">分类总量</div>
                    <div className="text-sm font-bold text-white font-mono mt-0.5">{categories.length}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-[10px] text-slate-400">书签总量</div>
                    <div className="text-sm font-bold text-indigo-300 font-mono mt-0.5">{bookmarks.length}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-[10px] text-slate-400">数据预估占用</div>
                    <div className="text-sm font-bold text-emerald-300 font-mono mt-0.5">
                      {((JSON.stringify({ categories, bookmarks, settings }).length) / 1024).toFixed(1)} KB
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-[10px] text-slate-400">云端同步引擎</div>
                    <div className="text-xs font-bold text-amber-300 uppercase mt-1 truncate">
                      {config.provider === 'none' ? '仅本地存储' : config.provider}
                    </div>
                  </div>
                </div>

                {/* Function Action Matrix */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                  {/* 1. 导出 JSON 书签备份 */}
                  <button
                    type="button"
                    onClick={handleExportJson}
                    className="p-3 rounded-xl bg-white/10 hover:bg-indigo-600/30 text-left transition-all border border-white/10 flex flex-col justify-between gap-1.5 group cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-semibold text-xs text-indigo-200">
                        <Download className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
                        <span>导出 JSON 书签备份</span>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">EXPORT JSON</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-tight">
                      一键导出包含分类、书签及全量系统设置的标准 JSON 备份文件
                    </p>
                  </button>

                  {/* 2. 导入 JSON 书签备份 */}
                  <label className="p-3 rounded-xl bg-white/10 hover:bg-emerald-600/30 text-left transition-all border border-white/10 flex flex-col justify-between gap-1.5 group cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-semibold text-xs text-emerald-300">
                        <Upload className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
                        <span>导入 JSON 书签备份</span>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">IMPORT JSON</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-tight">
                      选择本地导出的 JSON 格式备份文件进行全量覆盖还原
                    </p>
                    <input
                      type="file"
                      accept=".json,application/json"
                      onChange={handleImportJsonFile}
                      className="hidden"
                    />
                  </label>

                  {/* 导入 HTML 浏览器书签 */}
                  <label className="p-3 rounded-xl bg-white/10 hover:bg-teal-600/30 text-left transition-all border border-white/10 flex flex-col justify-between gap-1.5 group cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-semibold text-xs text-teal-300">
                        <HardDrive className="w-3.5 h-3.5 text-teal-400 group-hover:scale-110 transition-transform" />
                        <span>导入 HTML 浏览器书签</span>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 font-mono">IMPORT HTML</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-tight">
                      选择 Chrome 或 Edge 等浏览器导出的 HTML 书签文件合并导入
                    </p>
                    <input
                      type="file"
                      accept=".html,.htm"
                      onChange={handleImportHtmlFile}
                      className="hidden"
                    />
                  </label>

                  {/* 导出 HTML 浏览器书签 */}
                  <button
                    type="button"
                    onClick={handleExportHtml}
                    className="p-3 rounded-xl bg-white/10 hover:bg-emerald-600/30 text-left transition-all border border-white/10 flex flex-col justify-between gap-1.5 group cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-semibold text-xs text-emerald-300">
                        <Download className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
                        <span>导出 HTML 浏览器书签</span>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">EXPORT HTML</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-tight">
                      导出标准的 Netscape HTML 书签文件，可完美导入 Chrome/Edge/Safari
                    </p>
                  </button>

                  {/* 3. 一键同步推送到云端 */}
                  <button
                    type="button"
                    onClick={handleOneClickCloudPush}
                    disabled={isOneClickSyncing}
                    className="p-3 rounded-xl bg-white/10 hover:bg-sky-600/30 text-left transition-all border border-white/10 flex flex-col justify-between gap-1.5 group disabled:opacity-50 cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-semibold text-xs text-sky-300">
                        <CloudUpload className={`w-3.5 h-3.5 text-sky-400 ${isOneClickSyncing ? 'animate-bounce' : 'group-hover:scale-110'} transition-transform`} />
                        <span>一键同步推送到云端</span>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 uppercase font-mono">{config.provider}</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-tight">
                      将当前改动即时推送到 Cloudflare D1/KV 或 Gist
                    </p>
                  </button>

                  {/* 4. 一键清空所有存储数据 */}
                  <button
                    type="button"
                    onClick={handleOneClickClearAll}
                    className="p-3 rounded-xl bg-red-500/20 hover:bg-red-500/35 text-left transition-all border border-red-500/30 flex flex-col justify-between gap-1.5 group cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-semibold text-xs text-red-300">
                        <Trash2 className="w-3.5 h-3.5 text-red-400 group-hover:scale-110 transition-transform" />
                        <span>一键清除存储数据</span>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/30 text-red-200 font-bold">高危二次确认</span>
                    </div>
                    <p className="text-[11px] text-red-200/80 leading-tight">
                      物理清除当前所有书签与分类，无法撤销
                    </p>
                  </button>

                  {/* 5. 重置系统到初始状态 */}
                  <button
                    type="button"
                    onClick={handleOneClickFactoryReset}
                    className="p-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/35 text-left transition-all border border-amber-500/30 flex flex-col justify-between gap-1.5 group cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-semibold text-xs text-amber-300">
                        <RotateCcw className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
                        <span>重置系统到初始状态</span>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-200 font-bold">出厂重置</span>
                    </div>
                    <p className="text-[11px] text-amber-200/80 leading-tight">
                      全量重置壁纸、站点名称、Meta 标签与演示数据
                    </p>
                  </button>

                  {/* 6. 重置点击热度 */}
                  <button
                    type="button"
                    onClick={handleOneClickResetStats}
                    className="p-3 rounded-xl bg-white/10 hover:bg-purple-600/30 text-left transition-all border border-white/10 flex flex-col justify-between gap-1.5 group cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-semibold text-xs text-purple-300">
                        <BarChart2 className="w-3.5 h-3.5 text-purple-400 group-hover:scale-110 transition-transform" />
                        <span>一键重置点击热度</span>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono">STATS</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-tight">
                      归零所有书签的点击次数与热度排名
                    </p>
                  </button>
                </div>
              </div>

              {/* Local Backup Detail Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* JSON Export & Import */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 bg-slate-50/50 dark:bg-slate-900/30">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-slate-100">
                    <FileCode className="w-4 h-4 text-blue-500" />
                    <span>JSON 格式完全备份</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    包含所有分类层级、书签 URL、自定义图标、描述、个性化设置与标签信息。
                  </p>
                  <div className="flex flex-col gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleExportJson}
                      className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>导出 JSON 本地备份文件</span>
                    </button>

                    <label
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDraggingJson(true);
                      }}
                      onDragLeave={() => setIsDraggingJson(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDraggingJson(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file) processJsonFile(file);
                      }}
                      className={`w-full py-2.5 px-3 rounded-xl border border-dashed text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                        isDraggingJson
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 ring-2 ring-blue-500/30'
                          : 'border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800'
                      }`}
                    >
                      <Upload className="w-3.5 h-3.5 text-blue-500" />
                      <span>{isDraggingJson ? '释放以直接导入 JSON 文件' : '从本地 JSON 文件恢复数据 (支持拖拽)'}</span>
                      <input
                        type="file"
                        accept=".json,application/json"
                        onChange={handleImportJsonFile}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* HTML Bookmarks Export & Import */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 bg-slate-50/50 dark:bg-slate-900/30">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-slate-100">
                    <HardDrive className="w-4 h-4 text-emerald-500" />
                    <span>浏览器书签 HTML</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    支持 Chrome、Edge、Safari、Firefox 导出的书签 HTML 文件直接一键导入。
                  </p>
                  <div className="flex flex-col gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleExportHtml}
                      className="w-full py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>导出 Chrome HTML 书签</span>
                    </button>

                    <label
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDraggingHtml(true);
                      }}
                      onDragLeave={() => setIsDraggingHtml(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDraggingHtml(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file) processHtmlFile(file);
                      }}
                      className={`w-full py-2.5 px-3 rounded-xl border border-dashed text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                        isDraggingHtml
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/30'
                          : 'border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800'
                      }`}
                    >
                      <Upload className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{isDraggingHtml ? '释放以直接导入 HTML 书签' : '从 HTML 文件导入浏览器书签 (支持拖拽)'}</span>
                      <input
                        type="file"
                        accept=".html,.htm"
                        onChange={handleImportHtmlFile}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Reset sample */}
              <div className="pt-2 flex justify-between items-center text-xs">
                <span className="text-slate-400">需要测试样例数据？</span>
                <button
                  type="button"
                  onClick={handleResetSample}
                  className="text-slate-500 hover:text-amber-600 transition-colors"
                >
                  恢复初始演示书签
                </button>
              </div>
            </div>
          )}

          {/* TAB: SERVERLESS DEPLOYMENT GUIDE */}
          {activeTab === 'deploy' && (
            <div className="space-y-5 text-xs text-slate-700 dark:text-slate-300">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
                <span className="font-bold text-slate-900 dark:text-slate-100 block">
                  🚀 为什么能彻底摆脱服务器与虚拟机？
                </span>
                <p className="text-[12px] leading-relaxed text-slate-600 dark:text-slate-400">
                  原版 OneNav 依赖 PHP 环境与本地数据库，因此必须常年租用 VPS 主机。
                  二次开发的 <strong>OneNav Serverless</strong> 采用现代 Jamstack 静态架构：
                </p>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-500 dark:text-slate-400 pl-1">
                  <li><strong>前端：</strong>GitHub Pages / Cloudflare Pages / Vercel 全球 CDN 免费托管。</li>
                  <li><strong>存储：</strong>通过 Cloudflare D1 / Workers KV / GitHub Gist 实现多端自动云同步。</li>
                  <li><strong>零成本：</strong>免服务器续费，抗高并发，不会因欠费或关机宕机！</li>
                </ul>
              </div>

              {/* Cloudflare Pages */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cloud className="w-4 h-4 text-orange-500" />
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      1. Cloudflare Pages 部署 (支持 D1 / KV 绑定 · 强烈推荐)
                    </span>
                  </div>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                  <li>登录 Cloudflare Dashboard，进入 <strong>Compute (Workers &amp; Pages) → Pages</strong>。</li>
                  <li>点击 <strong>Create application → Connect to Git</strong>，选择你的导航仓库。</li>
                  <li>构建预设选择 <code>Vite</code>，构建命令 <code>npm run build</code>，输出目录 <code>dist</code>。</li>
                  <li>点击 <strong>Save and Deploy</strong>，即可获得 Cloudflare 全球 CDN 加速的专属域名。</li>
                  <li>
                    <strong>（可选）绑定原生 Functions 数据库：</strong>
                    进入 Pages 项目的 <strong>Settings → Functions</strong>：
                    <ul className="list-disc list-inside pl-4 mt-1 space-y-1 text-slate-500">
                      <li>绑定 D1：变量名填 <code>DB</code>，绑定你的 D1 数据库。</li>
                      <li>绑定 KV：变量名填 <code>ONENAV_KV</code>，绑定你的 KV 命名空间。</li>
                      <li>本项目自带 <code>functions/api/sync.ts</code> 边缘函数，绑定后即可同源免 Token 秒级读写！</li>
                    </ul>
                  </li>
                </ol>
              </div>

              {/* GitHub Pages */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Github className="w-4 h-4 text-slate-900 dark:text-slate-100" />
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      2. GitHub Pages 部署方案
                    </span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(GITHUB_ACTIONS_WORKFLOW, 'gh-actions')}
                    className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700"
                  >
                    {copiedCode === 'gh-actions' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>复制 Actions 工作流</span>
                  </button>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                  <li>在 GitHub 创建仓库并提交代码。</li>
                  <li>在仓库内创建 <code>.github/workflows/deploy.yml</code> 并粘贴右上角复制的代码。</li>
                  <li>在仓库 <strong>Settings → Pages</strong> 将来源设为 <strong>GitHub Actions</strong> 即可自动构建发布。</li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900 shrink-0">
          <div className="flex items-center gap-1 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>所有 Token 与 API 密钥仅加密保存在当前浏览器，绝不经过第三方服务器</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
            >
              关闭
            </button>
            <button
              type="button"
              onClick={handleSaveConfig}
              className="px-5 py-2 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors"
            >
              保存配置
            </button>
          </div>
        </div>
        {/* Category Create/Edit Modal Overlay */}
        {showCatModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-150">
            <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 relative">
              <button
                type="button"
                onClick={() => setShowCatModal(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FolderPlus className="w-4 h-4 text-purple-500" />
                <span>{editingCatId ? '编辑分类' : '新建导航分类'}</span>
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    分类名称：
                  </label>
                  <input
                    type="text"
                    value={catFormName}
                    onChange={(e) => setCatFormName(e.target.value)}
                    placeholder="如：AI 常用工具、开发社区"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    分类图标 (Emoji 或 图标名)：
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={catFormIcon}
                      onChange={(e) => setCatFormIcon(e.target.value)}
                      placeholder="如：🌐 ⚡ 📚 🎬 💼"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      {['🌐', '⚡', '📚', '🎬', '🛠️', '🔒'].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setCatFormIcon(preset)}
                          className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-purple-100 text-sm"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    分类描述 (可选)：
                  </label>
                  <input
                    type="text"
                    value={catFormDesc}
                    onChange={(e) => setCatFormDesc(e.target.value)}
                    placeholder="简短说明该分类包含内容"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCatModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleSaveCategory}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold"
                >
                  保存分类
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bookmark Create/Edit Modal Overlay */}
        {showBmModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-150">
            <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 relative">
              <button
                type="button"
                onClick={() => setShowBmModal(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Globe className="w-4 h-4 text-purple-500" />
                <span>{editingBmId ? '编辑书签属性' : '新建书签网址'}</span>
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    网址 (URL)：<span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={bmFormUrl}
                    onChange={(e) => setBmFormUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      标题名称：
                    </label>
                    <input
                      type="text"
                      value={bmFormTitle}
                      onChange={(e) => setBmFormTitle(e.target.value)}
                      placeholder="留空自动提取域名"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      所属分类：
                    </label>
                    <select
                      value={bmFormCatId}
                      onChange={(e) => setBmFormCatId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.icon} {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    描述备注 (可选)：
                  </label>
                  <input
                    type="text"
                    value={bmFormDesc}
                    onChange={(e) => setBmFormDesc(e.target.value)}
                    placeholder="简短描述该网址的主要功能或工具特点"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Favicon/图标 (URL 或 Emoji)：
                    </label>
                    <input
                      type="text"
                      value={bmFormIcon}
                      onChange={(e) => setBmFormIcon(e.target.value)}
                      placeholder="留空使用默认获取"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Tag 标签 (逗号分隔)：
                    </label>
                    <input
                      type="text"
                      value={bmFormTags}
                      onChange={(e) => setBmFormTags(e.target.value)}
                      placeholder="如：AI, 免费, 生产力"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-6 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bmFormIsPinned}
                      onChange={(e) => setBmFormIsPinned(e.target.checked)}
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">📌 固定置顶到首页</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bmFormIsPrivate}
                      onChange={(e) => setBmFormIsPrivate(e.target.checked)}
                      className="rounded text-red-600 focus:ring-red-500"
                    />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">🔒 设为私密书签</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowBmModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleSaveBookmark}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold"
                >
                  保存书签
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Secondary Confirmation Dialog Modal for High-Risk & Data Actions */}
        {confirmModal && confirmModal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-150">
            <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 relative">
              <button
                type="button"
                onClick={() => {
                  setConfirmModal(null);
                  setConfirmInputText('');
                }}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-start gap-3">
                <div
                  className={`p-3 rounded-2xl shrink-0 ${
                    confirmModal.type === 'clear_all' || confirmModal.type === 'factory_reset'
                      ? 'bg-red-100 dark:bg-red-950/70 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/60'
                      : confirmModal.type === 'restore_json' || confirmModal.type === 'restore_html'
                      ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60'
                      : 'bg-amber-100 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60'
                  }`}
                >
                  <AlertTriangle className="w-6 h-6 animate-pulse" />
                </div>
                <div className="space-y-1 pr-6">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {confirmModal.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {confirmModal.description}
                  </p>
                </div>
              </div>

              {/* 📂 选择导入模式：增量 or 覆盖 */}
              {(confirmModal.type === 'restore_json' || confirmModal.type === 'restore_html') && (
                <div className="space-y-1.5 pt-1">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    📂 选择导入模式：
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/80">
                    <button
                      type="button"
                      onClick={() => setImportMode('merge')}
                      className={`py-1.5 px-3 text-xs font-semibold rounded-lg transition-all ${
                        importMode === 'merge'
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                      }`}
                    >
                      📥 增量导入 (合并)
                    </button>
                    <button
                      type="button"
                      onClick={() => setImportMode('overwrite')}
                      className={`py-1.5 px-3 text-xs font-semibold rounded-lg transition-all ${
                        importMode === 'overwrite'
                          ? 'bg-red-500 text-white shadow-xs'
                          : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                      }`}
                    >
                      ⚠️ 覆盖导入 (全替换)
                    </button>
                  </div>
                </div>
              )}

              {warningDetailsToRender && warningDetailsToRender.length > 0 && (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 space-y-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                    <span>即将执行的操作结果：</span>
                  </div>
                  <ul className="space-y-1 list-disc list-inside text-[11px] text-slate-600 dark:text-slate-400 pl-1">
                    {warningDetailsToRender.map((detail, idx) => (
                      <li key={idx} className="leading-snug">{detail}</li>
                    ))}
                  </ul>
                </div>
              )}

              {confirmModal.requireKeyword && (
                <div className="space-y-1.5 pt-1">
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    请输入验证字母 <span className="font-mono text-red-500 font-bold px-1 py-0.5 rounded bg-red-100 dark:bg-red-950/80">{confirmModal.requireKeyword}</span> 以二次确认：
                  </label>
                  <input
                    type="text"
                    value={confirmInputText}
                    onChange={(e) => setConfirmInputText(e.target.value)}
                    placeholder={`在此输入 ${confirmModal.requireKeyword}`}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-red-500"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmModal(null);
                    setConfirmInputText('');
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
                >
                  取消
                </button>
                <button
                  type="button"
                  disabled={
                    confirmModal.requireKeyword
                      ? confirmInputText.trim().toUpperCase() !== confirmModal.requireKeyword
                      : false
                  }
                  onClick={executeConfirmedAction}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold shadow-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                    dynamicConfirmButtonClass || 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {dynamicConfirmText}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Export Data Security Authentication Modal Overlay */}
        {exportAuth.isOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 shadow-2xl animate-in zoom-in-95 duration-200 space-y-4">
              <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-500">
                  <Lock className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    导出数据安全验证
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    此操作需要管理员凭证，以保证敏感书签安全
                  </p>
                </div>
              </div>

              {exportAuth.error && (
                <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs flex items-center gap-1.5 leading-snug">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{exportAuth.error}</span>
                </div>
              )}

              <div className="space-y-3 py-1">
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    管理员账号
                  </label>
                  <input
                    type="text"
                    value={exportAuth.username}
                    onChange={(e) => setExportAuth({ ...exportAuth, username: e.target.value })}
                    placeholder="请输入管理员账号"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                    autoFocus
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    安全密码
                  </label>
                  <div className="relative">
                    <input
                      type={showExportPassword ? 'text' : 'password'}
                      value={exportAuth.password}
                      onChange={(e) => setExportAuth({ ...exportAuth, password: e.target.value })}
                      placeholder="请输入安全验证密码"
                      className="w-full pl-3 pr-9 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500 font-mono"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleConfirmExport();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowExportPassword(!showExportPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
                    >
                      {showExportPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setExportAuth({ ...exportAuth, isOpen: false });
                    setShowExportPassword(false);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleConfirmExport}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>验证并导出</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
