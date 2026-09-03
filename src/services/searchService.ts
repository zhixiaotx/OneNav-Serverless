import { Bookmark, SearchEngine, SearchEngineCategory } from '../types';
import { SEARCH_ENGINES } from './data';

export { SEARCH_ENGINES };

export interface SearchCategoryMeta {
  id: SearchEngineCategory;
  name: string;
  icon: string;
}

export const SEARCH_CATEGORIES: SearchCategoryMeta[] = [
  { id: 'common', name: '全网常用', icon: 'Search' },
  { id: 'ai', name: 'AI 智能', icon: 'Bot' },
  { id: 'dev', name: '代码开发', icon: 'Code' },
  { id: 'community', name: '社区知识', icon: 'MessageSquare' },
  { id: 'media', name: '影音娱乐', icon: 'Tv' },
];

const mappedFromData: SearchEngine[] = SEARCH_ENGINES.filter((e) => e.value !== 'local').map((e) => {
  const id = e.value || e.id || '';
  const urlPattern = e.urlPattern || (e.url ? (e.url.includes('%s') ? e.url : e.url + '%s') : '');
  let category: SearchEngineCategory = 'common';

  if (['metaso', 'nami', 'felo', 'tiangong'].includes(id) || e.group === 'ai') {
    category = 'ai';
  } else if (['youtube', 'bilibili'].includes(id) || e.group === 'media') {
    category = 'media';
  } else if (['zhihu', 'weixin', 'jike'].includes(id) || e.group === 'community') {
    category = 'community';
  } else if (['github', 'juejin', 'devv', 'stackoverflow'].includes(id) || e.group === 'dev') {
    category = 'dev';
  } else if (['taobao', 'jd', 'bing', 'baidu', 'google', 'duckduckgo', 'sogou', 'so', 'sm', 'yahoo', 'yandex', 'brave', 'startpage', 'ecosia', 'naver'].includes(id) || e.group === 'general') {
    category = 'common';
  } else if (e.category) {
    category = e.category;
  }

  return {
    id,
    value: id,
    name: e.name,
    urlPattern,
    url: e.url || urlPattern.replace('%s', ''),
    icon: e.icon,
    placeholder: `使用 ${e.name} 搜索...`,
    category,
    group: e.group || category,
    suggestType: 'baidu',
  };
});

const additionalEngines: SearchEngine[] = [
  {
    id: 'deepseek',
    value: 'deepseek',
    name: 'DeepSeek',
    urlPattern: 'https://chat.deepseek.com/?q=%s',
    url: 'https://chat.deepseek.com/?q=',
    icon: 'Cpu',
    placeholder: '向 DeepSeek 深度求索提问...',
    category: 'ai',
    group: 'ai',
    suggestType: 'baidu',
  },
  {
    id: 'chatgpt',
    value: 'chatgpt',
    name: 'ChatGPT',
    urlPattern: 'https://chat.openai.com/?q=%s',
    url: 'https://chat.openai.com/?q=',
    icon: 'Sparkles',
    placeholder: '向 ChatGPT 提出任何问题...',
    category: 'ai',
    group: 'ai',
    suggestType: 'google',
  },
  {
    id: 'claude',
    value: 'claude',
    name: 'Claude',
    urlPattern: 'https://claude.ai/new?q=%s',
    url: 'https://claude.ai/new?q=',
    icon: 'Bot',
    placeholder: '在 Claude 中开启全新对话...',
    category: 'ai',
    group: 'ai',
    suggestType: 'google',
  },
  {
    id: 'kimi',
    value: 'kimi',
    name: 'Kimi',
    urlPattern: 'https://kimi.moonshot.cn/?q=%s',
    url: 'https://kimi.moonshot.cn/?q=',
    icon: 'Moon',
    placeholder: 'Kimi 长文本与联网搜索...',
    category: 'ai',
    group: 'ai',
    suggestType: 'baidu',
  },
  {
    id: 'github',
    value: 'github',
    name: 'GitHub',
    urlPattern: 'https://github.com/search?q=%s',
    url: 'https://github.com/search?q=',
    icon: 'Github',
    placeholder: '搜索 GitHub 开源项目与代码...',
    category: 'dev',
    group: 'dev',
    suggestType: 'google',
  },
  {
    id: 'juejin',
    value: 'juejin',
    name: '掘金',
    urlPattern: 'https://juejin.cn/search?query=%s',
    url: 'https://juejin.cn/search?query=',
    icon: 'BookOpen',
    placeholder: '在掘金搜索前端、后端与架构文章...',
    category: 'dev',
    group: 'dev',
    suggestType: 'baidu',
  },
  {
    id: 'devv',
    value: 'devv',
    name: 'Devv AI',
    urlPattern: 'https://devv.ai/search?q=%s',
    url: 'https://devv.ai/search?q=',
    icon: 'Terminal',
    placeholder: '专为程序员打造的新一代 AI 搜索...',
    category: 'dev',
    group: 'dev',
    suggestType: 'google',
  },
  {
    id: 'stackoverflow',
    value: 'stackoverflow',
    name: 'StackOverflow',
    urlPattern: 'https://stackoverflow.com/questions/tagged/%s',
    url: 'https://stackoverflow.com/questions/tagged/',
    icon: 'HelpCircle',
    placeholder: '搜索 StackOverflow 报错与问答...',
    category: 'dev',
    group: 'dev',
    suggestType: 'google',
  },
];

// Combine unique engines by id/value
const engineMap = new Map<string, SearchEngine>();
[...mappedFromData, ...additionalEngines].forEach((eng) => {
  const key = eng.id || eng.value;
  if (key && !engineMap.has(key)) {
    engineMap.set(key, eng);
  }
});

export const COMPREHENSIVE_SEARCH_ENGINES: SearchEngine[] = Array.from(engineMap.values());

// JSONP / Fallback Search Suggestions Provider
let currentJsonpCallbackId = 0;

export async function fetchSearchSuggestions(keyword: string): Promise<string[]> {
  const trimmed = keyword.trim();
  if (!trimmed) return [];

  // Use JSONP callback for Baidu Sugrec
  return new Promise((resolve) => {
    const callbackName = `baidu_sugrec_cb_${Date.now()}_${++currentJsonpCallbackId}`;
    const script = document.createElement('script');
    
    const timeout = setTimeout(() => {
      cleanup();
      resolve([]);
    }, 1200);

    const cleanup = () => {
      clearTimeout(timeout);
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      delete (window as any)[callbackName];
    };

    (window as any)[callbackName] = (data: any) => {
      cleanup();
      if (data && Array.isArray(data.g)) {
        const results = data.g.map((item: any) => item.q).filter(Boolean);
        resolve(results.slice(0, 8));
      } else if (data && Array.isArray(data.s)) {
        resolve(data.s.slice(0, 8));
      } else {
        resolve([]);
      }
    };

    script.src = `https://suggestion.baidu.com/su?wd=${encodeURIComponent(trimmed)}&cb=${callbackName}&action=opensearch`;
    script.onerror = () => {
      cleanup();
      resolve([]);
    };

    document.body.appendChild(script);
  });
}

export function searchLocalBookmarks(bookmarks: Bookmark[], query: string, limit = 5): Bookmark[] {
  if (!query.trim()) return [];
  const q = query.trim().toLowerCase();

  return bookmarks
    .filter((bm) => {
      const matchTitle = bm.title.toLowerCase().includes(q);
      const matchUrl = bm.url.toLowerCase().includes(q);
      const matchDesc = bm.description ? bm.description.toLowerCase().includes(q) : false;
      const matchTags = bm.tags ? bm.tags.some((t) => t.toLowerCase().includes(q)) : false;
      return matchTitle || matchUrl || matchDesc || matchTags;
    })
    .slice(0, limit);
}
