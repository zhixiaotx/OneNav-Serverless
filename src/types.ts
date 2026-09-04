export interface Category {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  order: number;
  parentId?: string | null;
}

export interface Bookmark {
  id: string;
  categoryId: string;
  title: string;
  url: string;
  icon?: string;
  description?: string;
  tags?: string[];
  isPrivate?: boolean;
  order: number;
  clicks: number;
  isPinned?: boolean;
  createdAt: number;
  updatedAt: number;
}

export type SearchEngineCategory = 'common' | 'dev' | 'community' | 'ai' | 'media' | 'tools' | 'general' | 'local' | 'custom';

export interface SearchEngine {
  id?: string;
  value?: string;
  name: string;
  urlPattern?: string; // e.g. "https://www.google.com/search?q=%s"
  url?: string;        // e.g. "https://www.google.com/search?q="
  icon: string;
  placeholder?: string;
  category?: SearchEngineCategory;
  group?: string;
  suggestType?: 'baidu' | 'google' | 'bing' | 'none';
}

export interface ThemeConfig {
  id: string;
  name: string;
  nameEn?: string;
  icon?: string;
  type?: 'light' | 'dark';
  themeGroup?: string;
  primaryColor?: string;
  accentColor?: string;
  bgColor?: string;
  tags?: string[];
}

export type WallpaperType = 'none' | 'bing' | 'unsplash' | 'random' | 'gradient' | 'custom' | 'upload';

export interface WallpaperConfig {
  type: WallpaperType;
  url?: string;
  gradient?: string;
  name?: string;
  blur: number; // 0 - 30 px
  opacity: number; // 0 - 90 % (dark overlay opacity)
  brightness: number; // 50 - 150 %
  cardGlassmorphism: boolean; // whether cards have translucent glass blur
  cardOpacity: number; // 50 - 100 %
  dailyAutoRefresh?: boolean;
}

export interface WallpaperPreset {
  id: string;
  name: string;
  type: WallpaperType;
  category: 'bing' | 'scenery' | 'minimal' | 'gradient' | 'anime' | 'cyberpunk';
  thumbnail: string;
  url?: string;
  gradient?: string;
  author?: string;
}

export type SyncProvider =
  | 'gist'
  | 'github_repo'
  | 'webdav'
  | 'custom_api'
  | 'cloudflare_kv'
  | 'cloudflare_d1'
  | 'none';

export interface GistSyncConfig {
  token: string;
  gistId: string;
  filename: string;
}

export interface GitHubRepoSyncConfig {
  token: string;
  owner: string;
  repo: string;
  branch: string;
  path: string;
}

export interface WebDAVSyncConfig {
  url: string;
  username: string;
  password: string;
  path: string;
}

export interface CustomApiSyncConfig {
  endpoint: string;
  secretToken?: string;
}

export interface CloudflareKVConfig {
  accountId: string;
  namespaceId: string;
  apiToken: string;
  keyName: string;
  secretToken?: string;
}

export interface CloudflareD1Config {
  accountId: string;
  databaseId: string;
  apiToken: string;
  tableName: string;
  secretToken?: string;
}

export interface SyncConfig {
  provider: SyncProvider;
  gist: GistSyncConfig;
  githubRepo: GitHubRepoSyncConfig;
  webdav: WebDAVSyncConfig;
  customApi: CustomApiSyncConfig;
  cloudflareKv: CloudflareKVConfig;
  cloudflareD1: CloudflareD1Config;
  autoSync: boolean;
  syncIntervalMinutes: number;
  lastSyncTime: number | null;
  lastSyncStatus: 'idle' | 'syncing' | 'success' | 'error';
  lastSyncError: string | null;
}

export type CardLayout = 'cards' | 'compact' | 'minimal';
export type ThemeMode = 'light' | 'dark' | 'system';

export type IconSource =
  | 'favicon_im'
  | 'favicon_myhkw'
  | 'favicon_iowen'
  | 'favicon_baidu'
  | 'favicon_afmax'
  | 'favicon_la4'
  | 'favicon_vvhan'
  | 'favicon_xinac'
  | 'favicon_vip'
  | 'favicon_cravatar'
  | 'direct'
  | 'favicon_duckduckgo'
  | 'favicon_extractor'
  | 'favicon_pub'
  | 'google'
  | 'clearbit'
  | 'icons_duckduckgo'
  | 'iconhorse'
  | 'logo_surf'
  | 'iconify'
  | 'custom';

export interface BookmarkItem {
  id?: string;
  name?: string;
  title?: string;
  url?: string;
  icon?: string;
  iconifyIcon?: string;
  customIcon?: string;
  isFolder?: boolean;
  deleted?: boolean;
  children?: BookmarkItem[];
  [key: string]: any;
}

export const APP_VERSION = 'v1.3.2';

export interface AppSettings {
  title: string;
  subtitle: string;
  logoText?: string;
  themeMode: ThemeMode;
  cardLayout: CardLayout;
  openInNewTab: boolean;
  showClickCount: boolean;
  showDescription: boolean;
  hidePrivateBookmarks: boolean;
  masterPasswordHash?: string | null;
  defaultSearchEngine: string;
  customEngines: SearchEngine[];
  lastSelectedCategory?: string;
  wallpaper: WallpaperConfig;
  enableSearchSuggestions?: boolean;
  searchHistory?: string[];
  icpNumber?: string;
  icpUrl?: string;
  customFooterText?: string;
  developerName?: string;
  developerUrl?: string;

  // Global Custom Meta & Open Graph Share Tags
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogUrl?: string;
  ogType?: string;
  ogSiteName?: string;
  twitterCard?: 'summary_large_image' | 'summary';
}

export interface OneNavSyncPayload {
  version: string;
  updatedAt: number;
  categories: Category[];
  bookmarks: Bookmark[];
  settings?: Partial<AppSettings>;
}
