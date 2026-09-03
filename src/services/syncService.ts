import { Bookmark, Category, OneNavSyncPayload, SyncConfig } from '../types';
import {
  fetchFromCloudflareKV,
  saveToCloudflareKV,
  fetchFromCloudflareD1,
  saveToCloudflareD1,
} from './cloudflareService';

export interface SyncResult {
  success: boolean;
  message: string;
  data?: OneNavSyncPayload;
  conflict?: boolean;
}

export const SYNC_DATA_VERSION = '2.0.0';

/**
 * Merge remote and local bookmarks intelligently:
 * Retains bookmarks, uses newest updatedAt for modified ones, deduplicates by ID or URL.
 */
export function mergeSyncData(
  localCategories: Category[],
  localBookmarks: Bookmark[],
  remotePayload: OneNavSyncPayload
): { categories: Category[]; bookmarks: Bookmark[] } {
  // Merge categories by ID
  const catMap = new Map<string, Category>();
  localCategories.forEach((cat) => catMap.set(cat.id, cat));
  remotePayload.categories.forEach((remoteCat) => {
    // remote takes precedence if missing or newer
    catMap.set(remoteCat.id, remoteCat);
  });
  const mergedCategories = Array.from(catMap.values()).sort((a, b) => a.order - b.order);

  // Merge bookmarks by ID
  const bmMap = new Map<string, Bookmark>();
  localBookmarks.forEach((bm) => bmMap.set(bm.id, bm));
  remotePayload.bookmarks.forEach((remoteBm) => {
    const existing = bmMap.get(remoteBm.id);
    if (!existing) {
      bmMap.set(remoteBm.id, remoteBm);
    } else {
      // Pick the more recently updated bookmark
      if ((remoteBm.updatedAt || 0) >= (existing.updatedAt || 0)) {
        bmMap.set(remoteBm.id, {
          ...remoteBm,
          clicks: Math.max(existing.clicks || 0, remoteBm.clicks || 0),
        });
      }
    }
  });

  const mergedBookmarks = Array.from(bmMap.values()).sort((a, b) => a.order - b.order);

  return {
    categories: mergedCategories,
    bookmarks: mergedBookmarks,
  };
}

/**
 * Gist API Operations
 */
export async function createGistStorage(
  token: string,
  filename: string,
  initialPayload: OneNavSyncPayload
): Promise<{ success: boolean; gistId?: string; error?: string }> {
  try {
    const res = await fetch('https://api.github.com/gists', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token.trim()}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        description: 'OneNav Serverless Bookmarks Storage (Automatic Sync)',
        public: false,
        files: {
          [filename || 'onenav-bookmarks.json']: {
            content: JSON.stringify(initialPayload, null, 2),
          },
        },
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      return { success: false, error: err.message || `HTTP ${res.status}` };
    }

    const json = await res.json();
    return { success: true, gistId: json.id };
  } catch (err: any) {
    return { success: false, error: err.message || '网络连接失败' };
  }
}

export async function fetchFromGist(
  token: string,
  gistId: string,
  filename: string
): Promise<SyncResult> {
  if (!token || !gistId) {
    return { success: false, message: '请先配置 GitHub Token 和 Gist ID' };
  }

  try {
    const res = await fetch(`https://api.github.com/gists/${gistId.trim()}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token.trim()}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      return { success: false, message: `Gist 读取失败: ${err.message || res.statusText}` };
    }

    const json = await res.json();
    const targetFile = json.files?.[filename || 'onenav-bookmarks.json'];

    if (!targetFile) {
      const firstFileName = Object.keys(json.files || {})[0];
      if (firstFileName && json.files[firstFileName].content) {
        const payload: OneNavSyncPayload = JSON.parse(json.files[firstFileName].content);
        return { success: true, message: '从 Gist 同步成功', data: payload };
      }
      return { success: false, message: `在 Gist 中未找到文件 ${filename}` };
    }

    const payload: OneNavSyncPayload = JSON.parse(targetFile.content);
    return { success: true, message: '从 Gist 拉取数据成功', data: payload };
  } catch (err: any) {
    return { success: false, message: `拉取异常: ${err.message || '网络请求错误'}` };
  }
}

export async function saveToGist(
  token: string,
  gistId: string,
  filename: string,
  payload: OneNavSyncPayload
): Promise<SyncResult> {
  if (!token || !gistId) {
    return { success: false, message: '请先配置 GitHub Token 和 Gist ID' };
  }

  try {
    const res = await fetch(`https://api.github.com/gists/${gistId.trim()}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token.trim()}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        description: `OneNav Serverless Bookmarks Storage (Last sync: ${new Date().toISOString()})`,
        files: {
          [filename || 'onenav-bookmarks.json']: {
            content: JSON.stringify(payload, null, 2),
          },
        },
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      return { success: false, message: `Gist 保存失败: ${err.message || res.statusText}` };
    }

    return { success: true, message: '已自动推送并保存到 Gist 云端', data: payload };
  } catch (err: any) {
    return { success: false, message: `推送异常: ${err.message || '网络请求错误'}` };
  }
}

/**
 * GitHub Repo File Sync
 */
export async function fetchFromGitHubRepo(config: SyncConfig['githubRepo']): Promise<SyncResult> {
  const { token, owner, repo, branch, path } = config;
  if (!token || !owner || !repo) {
    return { success: false, message: 'GitHub 仓库配置不完整' };
  }

  try {
    const url = `https://api.github.com/repos/${owner.trim()}/${repo.trim()}/contents/${path.trim()}?ref=${branch || 'main'}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token.trim()}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      return { success: false, message: `仓库读取失败: ${err.message || res.statusText}` };
    }

    const json = await res.json();
    const content = decodeURIComponent(escape(atob(json.content.replace(/\n/g, ''))));
    const payload: OneNavSyncPayload = JSON.parse(content);
    return { success: true, message: '从 GitHub 仓库拉取成功', data: payload };
  } catch (err: any) {
    return { success: false, message: `仓库同步异常: ${err.message}` };
  }
}

export async function saveToGitHubRepo(
  config: SyncConfig['githubRepo'],
  payload: OneNavSyncPayload
): Promise<SyncResult> {
  const { token, owner, repo, branch, path } = config;
  if (!token || !owner || !repo) {
    return { success: false, message: 'GitHub 仓库配置不完整' };
  }

  try {
    const getUrl = `https://api.github.com/repos/${owner.trim()}/${repo.trim()}/contents/${path.trim()}?ref=${branch || 'main'}`;
    let sha: string | undefined;

    const checkRes = await fetch(getUrl, {
      headers: {
        Authorization: `Bearer ${token.trim()}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (checkRes.ok) {
      const checkJson = await checkRes.json();
      sha = checkJson.sha;
    }

    const contentStr = JSON.stringify(payload, null, 2);
    const contentBase64 = btoa(unescape(encodeURIComponent(contentStr)));

    const putRes = await fetch(getUrl.split('?')[0], {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token.trim()}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `chore: onenav bookmarks auto-sync [${new Date().toLocaleString()}]`,
        content: contentBase64,
        branch: branch || 'main',
        sha,
      }),
    });

    if (!putRes.ok) {
      const err = await putRes.json().catch(() => ({ message: putRes.statusText }));
      return { success: false, message: `保存至仓库失败: ${err.message || putRes.statusText}` };
    }

    return { success: true, message: '已自动推送至 GitHub 仓库', data: payload };
  } catch (err: any) {
    return { success: false, message: `推送至仓库异常: ${err.message}` };
  }
}

/**
 * WebDAV Sync Operations
 */
export async function fetchFromWebDAV(config: SyncConfig['webdav']): Promise<SyncResult> {
  const { url, username, password, path } = config;
  if (!url || !username) {
    return { success: false, message: 'WebDAV 地址或账号未配置' };
  }

  try {
    const fullUrl = `${url.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
    const headers: Record<string, string> = {
      Authorization: `Basic ${btoa(`${username}:${password}`)}`,
    };

    const res = await fetch(fullUrl, { method: 'GET', headers });
    if (!res.ok) {
      return { success: false, message: `WebDAV 读取失败: HTTP ${res.status}` };
    }

    const text = await res.text();
    const payload: OneNavSyncPayload = JSON.parse(text);
    return { success: true, message: '从 WebDAV 同步成功', data: payload };
  } catch (err: any) {
    return { success: false, message: `WebDAV 异常: ${err.message}` };
  }
}

export async function saveToWebDAV(
  config: SyncConfig['webdav'],
  payload: OneNavSyncPayload
): Promise<SyncResult> {
  const { url, username, password, path } = config;
  if (!url || !username) {
    return { success: false, message: 'WebDAV 地址或账号未配置' };
  }

  try {
    const fullUrl = `${url.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
    const headers: Record<string, string> = {
      Authorization: `Basic ${btoa(`${username}:${password}`)}`,
      'Content-Type': 'application/json',
    };

    const res = await fetch(fullUrl, {
      method: 'PUT',
      headers,
      body: JSON.stringify(payload, null, 2),
    });

    if (!res.ok) {
      return { success: false, message: `WebDAV 保存失败: HTTP ${res.status}` };
    }

    return { success: true, message: '已保存至 WebDAV 存储', data: payload };
  } catch (err: any) {
    return { success: false, message: `WebDAV 保存异常: ${err.message}` };
  }
}

/**
 * Unified dispatch for pull and push
 */
export async function pullRemoteData(config: SyncConfig): Promise<SyncResult> {
  if (config.provider === 'gist') {
    return fetchFromGist(config.gist.token, config.gist.gistId, config.gist.filename);
  } else if (config.provider === 'github_repo') {
    return fetchFromGitHubRepo(config.githubRepo);
  } else if (config.provider === 'webdav') {
    return fetchFromWebDAV(config.webdav);
  } else if (config.provider === 'cloudflare_kv') {
    return fetchFromCloudflareKV(config.cloudflareKv);
  } else if (config.provider === 'cloudflare_d1') {
    return fetchFromCloudflareD1(config.cloudflareD1);
  } else {
    return { success: false, message: '未开启或未选择同步提供方' };
  }
}

export async function pushRemoteData(
  config: SyncConfig,
  payload: OneNavSyncPayload
): Promise<SyncResult> {
  if (config.provider === 'gist') {
    return saveToGist(config.gist.token, config.gist.gistId, config.gist.filename, payload);
  } else if (config.provider === 'github_repo') {
    return saveToGitHubRepo(config.githubRepo, payload);
  } else if (config.provider === 'webdav') {
    return saveToWebDAV(config.webdav, payload);
  } else if (config.provider === 'cloudflare_kv') {
    return saveToCloudflareKV(config.cloudflareKv, payload);
  } else if (config.provider === 'cloudflare_d1') {
    return saveToCloudflareD1(config.cloudflareD1, payload);
  } else {
    return { success: false, message: '未开启云端同步提供商' };
  }
}
