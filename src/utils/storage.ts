import { AppSettings, Bookmark, Category, SearchEngine, SyncConfig, OneNavSyncPayload } from '../types';
import { getFaviconUrl as getServiceFaviconUrl } from '../services/faviconService';
import { COMPREHENSIVE_SEARCH_ENGINES } from '../services/searchService';
import { DEFAULT_WALLPAPER_CONFIG } from '../services/wallpaperService';

export const DEFAULT_SEARCH_ENGINES: SearchEngine[] = COMPREHENSIVE_SEARCH_ENGINES;

export const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat-dev', name: '开发协作', icon: 'Code', description: '代码托管与开发者常用平台', order: 1 },
  { id: 'cat-serverless', name: '无服务部署', icon: 'Cloud', description: 'Pages、Edge 与免服务器云服务', order: 2 },
  { id: 'cat-ai', name: '人工智能', icon: 'Cpu', description: 'AI 大模型与生产力助手', order: 3 },
  { id: 'cat-tools', name: '效率工具', icon: 'Wrench', description: '在线转换、格式化与实用小工具', order: 4 },
  { id: 'cat-design', name: '设计灵感', icon: 'Palette', description: 'UI设计、图标库与高清素材', order: 5 },
  { id: 'cat-docs', name: '技术文档', icon: 'BookMarked', description: '前端、后端与系统技术手册', order: 6 },
];

export const INITIAL_BOOKMARKS: Bookmark[] = [
  // 开发协作
  {
    id: 'bm-github',
    categoryId: 'cat-dev',
    title: 'GitHub',
    url: 'https://github.com',
    icon: 'https://github.githubassets.com/favicons/favicon.svg',
    description: '全球最大的开源代码托管与协作开发平台',
    tags: ['开源', 'Git', '开发'],
    order: 1,
    clicks: 142,
    isPinned: true,
    createdAt: Date.now() - 86400000 * 30,
    updatedAt: Date.now() - 86400000 * 30,
  },
  {
    id: 'bm-gitee',
    categoryId: 'cat-dev',
    title: 'Gitee 码云',
    url: 'https://gitee.com',
    icon: 'https://gitee.com/favicon.ico',
    description: '国内代码托管与研发协作平台，访问速度极快',
    tags: ['Git', '协作'],
    order: 2,
    clicks: 65,
    createdAt: Date.now() - 86400000 * 25,
    updatedAt: Date.now() - 86400000 * 25,
  },
  {
    id: 'bm-gitlab',
    categoryId: 'cat-dev',
    title: 'GitLab',
    url: 'https://gitlab.com',
    icon: 'https://gitlab.com/assets/favicon-72a40425282474138137703bab6562ec0882e664a30e12849a991cc09de9427e.png',
    description: '全流程 DevOps 平台与持续集成系统',
    tags: ['DevOps', 'CI/CD'],
    order: 3,
    clicks: 34,
    createdAt: Date.now() - 86400000 * 20,
    updatedAt: Date.now() - 86400000 * 20,
  },
  {
    id: 'bm-stackoverflow',
    categoryId: 'cat-dev',
    title: 'Stack Overflow',
    url: 'https://stackoverflow.com',
    icon: 'https://cdn.sstatic.net/Sites/stackoverflow/Img/favicon.ico',
    description: '开发者问答社区，解决各类技术疑难杂症',
    tags: ['社区', '问答'],
    order: 4,
    clicks: 89,
    createdAt: Date.now() - 86400000 * 18,
    updatedAt: Date.now() - 86400000 * 18,
  },

  // 无服务部署
  {
    id: 'bm-cloudflare',
    categoryId: 'cat-serverless',
    title: 'Cloudflare Pages',
    url: 'https://pages.cloudflare.com',
    icon: 'https://pages.cloudflare.com/favicon.ico',
    description: '全球极速静态托管与边缘无服务器计算平台',
    tags: ['Serverless', 'Pages', 'CDN'],
    order: 1,
    clicks: 110,
    isPinned: true,
    createdAt: Date.now() - 86400000 * 15,
    updatedAt: Date.now() - 86400000 * 15,
  },
  {
    id: 'bm-vercel',
    categoryId: 'cat-serverless',
    title: 'Vercel',
    url: 'https://vercel.com',
    icon: 'https://vercel.com/favicon.ico',
    description: '现代前端部署基础设施，支持 Next.js 与自动化流水线',
    tags: ['Hosting', 'React', 'Edge'],
    order: 2,
    clicks: 98,
    isPinned: true,
    createdAt: Date.now() - 86400000 * 14,
    updatedAt: Date.now() - 86400000 * 14,
  },
  {
    id: 'bm-netlify',
    categoryId: 'cat-serverless',
    title: 'Netlify',
    url: 'https://www.netlify.com',
    icon: 'https://www.netlify.com/favicon.ico',
    description: 'Jamstack 开拓者，一键连接代码仓库自动化发布',
    tags: ['Jamstack', 'Pages'],
    order: 3,
    clicks: 45,
    createdAt: Date.now() - 86400000 * 12,
    updatedAt: Date.now() - 86400000 * 12,
  },
  {
    id: 'bm-github-pages',
    categoryId: 'cat-serverless',
    title: 'GitHub Pages',
    url: 'https://pages.github.com',
    icon: 'https://github.githubassets.com/favicons/favicon.svg',
    description: '直接从 GitHub 仓库托管静态网页，永久免费',
    tags: ['免费', '托管'],
    order: 4,
    clicks: 76,
    createdAt: Date.now() - 86400000 * 10,
    updatedAt: Date.now() - 86400000 * 10,
  },

  // 人工智能
  {
    id: 'bm-chatgpt',
    categoryId: 'cat-ai',
    title: 'ChatGPT',
    url: 'https://chat.openai.com',
    icon: 'https://chatgpt.com/favicon.ico',
    description: 'OpenAI 语言大模型交互助手，处理文本与代码',
    tags: ['OpenAI', 'LLM', 'AI'],
    order: 1,
    clicks: 160,
    isPinned: true,
    createdAt: Date.now() - 86400000 * 9,
    updatedAt: Date.now() - 86400000 * 9,
  },
  {
    id: 'bm-claude',
    categoryId: 'cat-ai',
    title: 'Claude',
    url: 'https://claude.ai',
    icon: 'https://claude.ai/favicon.ico',
    description: 'Anthropic 出品，擅长长文阅读、逻辑推理与编程',
    tags: ['Anthropic', 'AI'],
    order: 2,
    clicks: 124,
    createdAt: Date.now() - 86400000 * 8,
    updatedAt: Date.now() - 86400000 * 8,
  },
  {
    id: 'bm-deepseek',
    categoryId: 'cat-ai',
    title: 'DeepSeek 深度求索',
    url: 'https://chat.deepseek.com',
    icon: 'https://chat.deepseek.com/favicon.svg',
    description: '开源高性能推理与代码模型，国内高性价比 AI 首选',
    tags: ['推理', '开源模型'],
    order: 3,
    clicks: 215,
    isPinned: true,
    createdAt: Date.now() - 86400000 * 7,
    updatedAt: Date.now() - 86400000 * 7,
  },
  {
    id: 'bm-gemini',
    categoryId: 'cat-ai',
    title: 'Google Gemini',
    url: 'https://gemini.google.com',
    icon: 'https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg',
    description: 'Google 原生多模态 AI 模型与智能助手',
    tags: ['Google', 'Multimodal'],
    order: 4,
    clicks: 85,
    createdAt: Date.now() - 86400000 * 6,
    updatedAt: Date.now() - 86400000 * 6,
  },

  // 效率工具
  {
    id: 'bm-caniuse',
    categoryId: 'cat-tools',
    title: 'Can I Use',
    url: 'https://caniuse.com',
    icon: 'https://caniuse.com/img/favicon-128.png',
    description: '查询现代浏览器对 HTML5、CSS3、JS 特性的兼容性支持',
    tags: ['前端', '兼容性'],
    order: 1,
    clicks: 67,
    createdAt: Date.now() - 86400000 * 5,
    updatedAt: Date.now() - 86400000 * 5,
  },
  {
    id: 'bm-transform',
    categoryId: 'cat-tools',
    title: 'Transform Tools',
    url: 'https://transform.tools',
    icon: 'https://transform.tools/favicon.ico',
    description: '多格式代码快速转换：JSON转TS、CSS转Tailwind等',
    tags: ['转换', '代码工具'],
    order: 2,
    clicks: 53,
    createdAt: Date.now() - 86400000 * 4,
    updatedAt: Date.now() - 86400000 * 4,
  },
  {
    id: 'bm-tinypng',
    categoryId: 'cat-tools',
    title: 'TinyPNG',
    url: 'https://tinypng.com',
    icon: 'https://tinypng.com/images/favicon.ico',
    description: '优秀的 WebP、PNG 与 JPEG 图片智能高压缩工具',
    tags: ['图片压缩', '工具'],
    order: 3,
    clicks: 72,
    createdAt: Date.now() - 86400000 * 3,
    updatedAt: Date.now() - 86400000 * 3,
  },

  // 设计灵感
  {
    id: 'bm-dribbble',
    categoryId: 'cat-design',
    title: 'Dribbble',
    url: 'https://dribbble.com',
    icon: 'https://cdn.dribbble.com/assets/favicon-b38525134603b9513174ec887944b025.ico',
    description: '全球设计师作品分享平台与前沿视觉灵感社区',
    tags: ['UI', '灵感'],
    order: 1,
    clicks: 58,
    createdAt: Date.now() - 86400000 * 3,
    updatedAt: Date.now() - 86400000 * 3,
  },
  {
    id: 'bm-lucide',
    categoryId: 'cat-design',
    title: 'Lucide Icons',
    url: 'https://lucide.dev',
    icon: 'https://lucide.dev/favicon.ico',
    description: '轻量优雅的开源矢量图标库，支持 React 与 Vue',
    tags: ['图标', '设计资源'],
    order: 2,
    clicks: 94,
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now() - 86400000 * 2,
  },

  // 技术文档
  {
    id: 'bm-mdn',
    categoryId: 'cat-docs',
    title: 'MDN Web Docs',
    url: 'https://developer.mozilla.org',
    icon: 'https://developer.mozilla.org/favicon-48x48.png',
    description: '权威的 Web 技术文档、JavaScript与CSS参考指南',
    tags: ['手册', '权威文档'],
    order: 1,
    clicks: 118,
    isPinned: true,
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now() - 86400000 * 2,
  },
  {
    id: 'bm-tailwind',
    categoryId: 'cat-docs',
    title: 'Tailwind CSS',
    url: 'https://tailwindcss.com',
    icon: 'https://tailwindcss.com/favicons/favicon.ico',
    description: '实用优先的原子化 CSS 框架官方文档',
    tags: ['CSS', '前端'],
    order: 2,
    clicks: 104,
    createdAt: Date.now() - 86400000 * 1,
    updatedAt: Date.now() - 86400000 * 1,
  },
];

export const DEFAULT_SETTINGS: AppSettings = {
  title: 'OneNav Serverless',
  subtitle: '免服务器极速书签导航与多端自动同步',
  logoText: 'OneNav',
  themeMode: 'light',
  cardLayout: 'minimal',
  openInNewTab: true,
  showClickCount: true,
  showDescription: true,
  hidePrivateBookmarks: false,
  masterPasswordHash: null,
  defaultSearchEngine: 'google',
  customEngines: DEFAULT_SEARCH_ENGINES,
  wallpaper: DEFAULT_WALLPAPER_CONFIG,
  enableSearchSuggestions: true,
  searchHistory: [],
  icpNumber: '',
  icpUrl: 'https://beian.miit.gov.cn/',
  customFooterText: '',
  developerName: '',
  developerUrl: '',
  metaTitle: '',
  metaDescription: '',
  metaKeywords: 'OneNav,书签导航,无服务器导航,Serverless,个人导航盘,网站导航',
  ogTitle: '',
  ogDescription: '',
  ogImage: '',
  ogUrl: '',
  ogType: 'website',
  ogSiteName: 'OneNav Serverless',
  twitterCard: 'summary_large_image',
};

export const DEFAULT_SYNC_CONFIG: SyncConfig = {
  provider: 'none',
  gist: {
    token: '',
    gistId: '',
    filename: 'onenav-bookmarks.json',
  },
  githubRepo: {
    token: '',
    owner: '',
    repo: '',
    branch: 'main',
    path: 'data/onenav.json',
  },
  webdav: {
    url: '',
    username: '',
    password: '',
    path: '/onenav/bookmarks.json',
  },
  customApi: {
    endpoint: '',
    secretToken: '',
  },
  cloudflareKv: {
    accountId: '',
    namespaceId: '',
    apiToken: '',
    keyName: 'onenav_bookmarks',
  },
  cloudflareD1: {
    accountId: '',
    databaseId: '',
    apiToken: '',
    tableName: 'onenav_sync',
  },
  autoSync: true,
  syncIntervalMinutes: 10,
  lastSyncTime: null,
  lastSyncStatus: 'idle',
  lastSyncError: null,
};

const STORAGE_KEYS = {
  CATEGORIES: 'onenav_categories_v2',
  BOOKMARKS: 'onenav_bookmarks_v2',
  SETTINGS: 'onenav_settings_v2',
  SYNC_CONFIG: 'onenav_sync_config_v2',
  PRIVATE_UNLOCKED: 'onenav_private_unlocked',
};

export function getStoredCategories(): Category[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
    if (!raw) return INITIAL_CATEGORIES;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_CATEGORIES;
  } catch (e) {
    console.error('Failed to load categories from localStorage:', e);
    return INITIAL_CATEGORIES;
  }
}

export function saveStoredCategories(categories: Category[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
  } catch (e) {
    console.error('Failed to save categories to localStorage:', e);
  }
}

export function getStoredBookmarks(): Bookmark[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BOOKMARKS);
    if (!raw) return INITIAL_BOOKMARKS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_BOOKMARKS;
  } catch (e) {
    console.error('Failed to load bookmarks from localStorage:', e);
    return INITIAL_BOOKMARKS;
  }
}

export function saveStoredBookmarks(bookmarks: Bookmark[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(bookmarks));
  } catch (e) {
    console.error('Failed to save bookmarks to localStorage:', e);
  }
}

/**
 * Reorders a bookmark from activeId to overId, correctly preserving the overall list and updating order indexes
 */
export function reorderBookmarksList(
  bookmarks: Bookmark[],
  activeId: string,
  overId: string,
  targetCategoryId?: string
): Bookmark[] {
  const activeIndex = bookmarks.findIndex((b) => b.id === activeId);
  const overIndex = bookmarks.findIndex((b) => b.id === overId);

  if (activeIndex === -1 || overIndex === -1) return bookmarks;

  const newBookmarks = [...bookmarks];
  const [movedItem] = newBookmarks.splice(activeIndex, 1);

  if (targetCategoryId) {
    movedItem.categoryId = targetCategoryId;
  }

  // Find the new insertion position after removal
  const newOverIndex = newBookmarks.findIndex((b) => b.id === overId);
  if (newOverIndex !== -1) {
    newBookmarks.splice(newOverIndex, 0, movedItem);
  } else {
    newBookmarks.splice(overIndex, 0, movedItem);
  }

  // Recalculate order indices for consistency and update timestamp
  const updatedList = newBookmarks.map((bm, idx) => ({
    ...bm,
    order: idx + 1,
    updatedAt: bm.id === activeId ? Date.now() : bm.updatedAt,
  }));

  // Persist immediately to storage
  saveStoredBookmarks(updatedList);
  return updatedList;
}

export function saveStoredBookmarksOrder(orderedBookmarks: Bookmark[]): void {
  saveStoredBookmarks(orderedBookmarks);
}

export function getStoredSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      wallpaper: {
        ...DEFAULT_WALLPAPER_CONFIG,
        ...(parsed.wallpaper || {}),
      },
      customEngines: Array.isArray(parsed.customEngines) && parsed.customEngines.length > 0
        ? parsed.customEngines
        : DEFAULT_SETTINGS.customEngines,
    };
  } catch (e) {
    console.error('Failed to load settings from localStorage:', e);
    return DEFAULT_SETTINGS;
  }
}

export function saveStoredSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings to localStorage:', e);
  }
}

export function getStoredSyncConfig(): SyncConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SYNC_CONFIG);
    if (!raw) return DEFAULT_SYNC_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SYNC_CONFIG,
      ...parsed,
      gist: { ...DEFAULT_SYNC_CONFIG.gist, ...(parsed.gist || {}) },
      githubRepo: { ...DEFAULT_SYNC_CONFIG.githubRepo, ...(parsed.githubRepo || {}) },
      webdav: { ...DEFAULT_SYNC_CONFIG.webdav, ...(parsed.webdav || {}) },
      customApi: { ...DEFAULT_SYNC_CONFIG.customApi, ...(parsed.customApi || {}) },
      cloudflareKv: { ...DEFAULT_SYNC_CONFIG.cloudflareKv, ...(parsed.cloudflareKv || {}) },
      cloudflareD1: { ...DEFAULT_SYNC_CONFIG.cloudflareD1, ...(parsed.cloudflareD1 || {}) },
    };
  } catch (e) {
    console.error('Failed to load syncConfig from localStorage:', e);
    return DEFAULT_SYNC_CONFIG;
  }
}

export function saveStoredSyncConfig(config: SyncConfig): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SYNC_CONFIG, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save syncConfig to localStorage:', e);
  }
}

export function isPrivateUnlockedSession(): boolean {
  return sessionStorage.getItem(STORAGE_KEYS.PRIVATE_UNLOCKED) === 'true';
}

export function setPrivateUnlockedSession(unlocked: boolean): void {
  if (unlocked) {
    sessionStorage.setItem(STORAGE_KEYS.PRIVATE_UNLOCKED, 'true');
  } else {
    sessionStorage.removeItem(STORAGE_KEYS.PRIVATE_UNLOCKED);
  }
}

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function getFaviconUrl(url: string, customIcon?: string): string {
  if (customIcon && customIcon.trim()) {
    return customIcon.trim();
  }
  if (!url) return '';
  return getServiceFaviconUrl({ url, customIcon }, 'favicon_im');
}
