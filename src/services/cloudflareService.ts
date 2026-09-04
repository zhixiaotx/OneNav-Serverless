import { CloudflareD1Config, CloudflareKVConfig, OneNavSyncPayload } from '../types';

export interface CloudflareServiceResult {
  success: boolean;
  message: string;
  data?: OneNavSyncPayload;
  latencyMs?: number;
  details?: any;
}

export interface CloudflareConnectionStatus {
  ok: boolean;
  latencyMs?: number;
  message: string;
  lastChecked?: number;
  details?: Record<string, any>;
}

const DEFAULT_TIMEOUT_MS = 12000;

/**
 * Helper to fetch with timeout
 */
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error(`请求超时 (${timeoutMs / 1000}s)`);
    }
    throw err;
  }
}

/**
 * Helper to determine Cloudflare API endpoint (uses Vite proxy /api/cloudflare in dev/preview to bypass CORS)
 */
function getCloudflareApiUrl(path: string): string {
  const isDevOrPreview = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1' || 
    window.location.hostname.includes('run.app') ||
    window.location.port === '3000'
  );
  return isDevOrPreview ? `/api/cloudflare/client/v4${path}` : `https://api.cloudflare.com/client/v4${path}`;
}

function formatFetchError(err: any, defaultMsg: string): string {
  if (err && err.message && err.message.includes('Failed to fetch')) {
    return '网络连接异常 (Failed to fetch): 浏览器端直接调用 Cloudflare API 会被 CORS 跨域拦截。请将项目部署至 Cloudflare Pages 以使用内置的 /api/sync 后端接口。';
  }
  if (err) {
    return `网络连接异常: ${err.message}`;
  }
  return defaultMsg;
}

// ==========================================
// 1. Cloudflare Workers KV Operations
// ==========================================

/**
 * Tests connection to Cloudflare KV namespace and checks token permissions
 */
export async function testCloudflareKVConnection(
  config: CloudflareKVConfig
): Promise<CloudflareConnectionStatus> {
  let lastError: any = null;
  const startTime = performance.now();
  const { accountId, namespaceId, apiToken, keyName } = config;

  // 1. If credentials are provided, try direct API first (using Vite proxy in dev/preview)
  if (accountId && namespaceId && apiToken) {
    const targetKey = keyName.trim() || 'onenav_bookmarks';
    const apiPath = `/accounts/${accountId.trim()}/storage/kv/namespaces/${namespaceId.trim()}/values/${encodeURIComponent(targetKey)}`;
    const url = getCloudflareApiUrl(apiPath);

    try {
      const res = await fetchWithTimeout(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiToken.trim()}`,
        },
      });

      const latencyMs = Math.round(performance.now() - startTime);

      if (res.status === 404) {
        return {
          ok: true,
          latencyMs,
          message: `连接正常 (延迟 ${latencyMs}ms)，键「${targetKey}」尚未写入数据`,
          lastChecked: Date.now(),
          details: { keyExists: false },
        };
      }

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({ errors: [{ message: res.statusText }] }));
        const errorMsg = errJson.errors?.[0]?.message || `HTTP ${res.status} ${res.statusText}`;
        return {
          ok: false,
          latencyMs,
          message: `KV 鉴权失败: ${errorMsg}`,
          lastChecked: Date.now(),
        };
      }

      const text = await res.text();
      let dataLength = 0;
      try {
        const parsed = JSON.parse(text);
        dataLength = parsed.bookmarks?.length || 0;
      } catch {
        // not parsed
      }

      return {
        ok: true,
        latencyMs,
        message: `KV 连接畅通 (延迟 ${latencyMs}ms)，读取到 ${dataLength} 条书签数据`,
        lastChecked: Date.now(),
        details: { keyExists: true, count: dataLength },
      };
    } catch (err: any) { lastError = err; }
  }

  // 2. Try native Cloudflare Pages Functions endpoint (/api/sync)
  try {
    const headers: Record<string, string> = {};
    if (config.secretToken) {
      headers['x-sync-secret'] = config.secretToken;
    }

    const nativeRes = await fetch('/api/sync', { method: 'GET', headers });
    const contentType = nativeRes.headers.get('content-type') || '';
    const latencyMs = Math.round(performance.now() - startTime);
    if ((nativeRes.ok || nativeRes.status === 404) && (contentType.includes('application/json') || nativeRes.status === 404)) {
      const data = nativeRes.status === 200 ? await nativeRes.json().catch(() => ({})) : {};
      return {
        ok: true,
        latencyMs,
        message: `Cloudflare Pages 绑定就绪，后端接口 (/api/sync) 连接畅通！(延迟 ${latencyMs}ms)`,
        lastChecked: Date.now(),
        details: data
      };
    }
  } catch (err: any) {
    lastError = err;
  }

  const latencyMs = Math.round(performance.now() - startTime);
  return {
    ok: false,
    latencyMs,
    message: formatFetchError(
      lastError,
      '未能连通 Cloudflare Pages /api/sync 接口。若已在 Pages 绑定 KV，请确认已重新部署(Redeploy)；若未部署到 Pages，请填写上方凭证。'
    ),
    lastChecked: Date.now(),
  };
}

/**
 * Fetch bookmarks data directly from Cloudflare KV
 */
export async function fetchFromCloudflareKV(
  config: CloudflareKVConfig
): Promise<CloudflareServiceResult> {
  let lastError: any = null;
  const { accountId, namespaceId, apiToken, keyName } = config;

  // 1. If credentials provided, try direct API first
  if (accountId && namespaceId && apiToken) {
    const startTime = performance.now();
    const targetKey = keyName.trim() || 'onenav_bookmarks';
    const apiPath = `/accounts/${accountId.trim()}/storage/kv/namespaces/${namespaceId.trim()}/values/${encodeURIComponent(targetKey)}`;
    const url = getCloudflareApiUrl(apiPath);

    try {
      const res = await fetchWithTimeout(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiToken.trim()}`,
        },
      });

      const latencyMs = Math.round(performance.now() - startTime);

      if (res.status === 404) {
        return {
          success: false,
          message: `KV 中尚未存储键为「${targetKey}」的书签数据，请先执行“推送到 KV 保存”`,
          latencyMs,
        };
      }

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({ errors: [{ message: res.statusText }] }));
        const errMsg = errJson.errors?.[0]?.message || `HTTP ${res.status}`;
        return {
          success: false,
          message: `读取 KV 失败: ${errMsg}`,
          latencyMs,
        };
      }

      const text = await res.text();
      const payload: OneNavSyncPayload = JSON.parse(text);
      return {
        success: true,
        message: '已成功从 Cloudflare KV 同步数据',
        data: payload,
        latencyMs,
      };
    } catch (err: any) { lastError = err; }
  }

  // 2. Try native Cloudflare Pages Functions endpoint (/api/sync)
  try {
    const headers: Record<string, string> = {};
    if (config.secretToken) {
      headers['x-sync-secret'] = config.secretToken;
    }

    const nativeRes = await fetch('/api/sync', { method: 'GET', headers });
    const contentType = nativeRes.headers.get('content-type') || '';
    if (nativeRes.ok && (contentType.includes('application/json') || !contentType.includes('text/html'))) {
      const payload: OneNavSyncPayload = await nativeRes.json();
      return {
        success: true,
        message: '已通过 Cloudflare Pages 后端接口 (/api/sync) 成功同步 KV 数据',
        data: payload,
      };
    } else if (nativeRes.status === 404) {
      return {
        success: false,
        message: 'Cloudflare 存储连接畅通，但云端暂无书签数据，请先点击「推送到 KV 保存」进行首次备份',
      };
    }
  } catch (err: any) {
    lastError = err;
  }

  return {
    success: false,
    message: formatFetchError(lastError, '未能连通 Cloudflare Pages /api/sync 接口。若已在 Pages 绑定，请确认已重新部署(Redeploy)；或填写上方凭证。'),
  };
}

/**
 * Save bookmarks payload directly to Cloudflare KV
 */
export async function saveToCloudflareKV(
  config: CloudflareKVConfig,
  payload: OneNavSyncPayload
): Promise<CloudflareServiceResult> {
  let lastError: any = null;
  const { accountId, namespaceId, apiToken, keyName } = config;

  // 1. If credentials provided, try direct API first
  if (accountId && namespaceId && apiToken) {
    const startTime = performance.now();
    const targetKey = keyName.trim() || 'onenav_bookmarks';
    const apiPath = `/accounts/${accountId.trim()}/storage/kv/namespaces/${namespaceId.trim()}/values/${encodeURIComponent(targetKey)}`;
    const url = getCloudflareApiUrl(apiPath);
    const jsonStr = JSON.stringify(payload);

    try {
      const res = await fetchWithTimeout(url, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${apiToken.trim()}`,
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: jsonStr,
      });

      const latencyMs = Math.round(performance.now() - startTime);

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({ errors: [{ message: res.statusText }] }));
        const errMsg = errJson.errors?.[0]?.message || `HTTP ${res.status}`;
        return {
          success: false,
          message: `保存到 KV 失败: ${errMsg}`,
          latencyMs,
        };
      }

      return {
        success: true,
        message: '已成功保存至 Cloudflare KV',
        data: payload,
        latencyMs,
      };
    } catch (err: any) { lastError = err; }
  }

  // 2. Try native Cloudflare Pages Functions endpoint (/api/sync)
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (config.secretToken) {
      headers['x-sync-secret'] = config.secretToken;
    }

    const nativeRes = await fetch('/api/sync', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (nativeRes.ok) {
      return {
        success: true,
        message: '已通过 Cloudflare Pages 后端接口 (/api/sync) 成功持久化至 KV',
        data: payload,
      };
    } else {
      const errJson = await nativeRes.json().catch(() => null);
      if (errJson?.error) {
        return {
          success: false,
          message: `Cloudflare Pages 写入失败: ${errJson.error}`,
        };
      }
    }
  } catch (err: any) {
    lastError = err;
  }

  return {
    success: false,
    message: formatFetchError(
      lastError,
      '未能通过 Cloudflare Pages /api/sync 接口保存。若已在 Pages 绑定，请确认已重新部署(Redeploy)；或填写上方凭证。'
    ),
  };
}

// ==========================================
// 2. Cloudflare D1 SQL Database Operations
// ==========================================

export async function testCloudflareD1Connection(
  config: CloudflareD1Config
): Promise<CloudflareConnectionStatus> {
  let lastError: any = null;
  const startTime = performance.now();
  const { accountId, databaseId, apiToken, tableName } = config;

  if (accountId && databaseId && apiToken) {
    const table = (tableName || 'onenav_sync').trim();
    const apiPath = `/accounts/${accountId.trim()}/d1/database/${databaseId.trim()}/query`;
    const url = getCloudflareApiUrl(apiPath);

    try {
      const res = await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sql: `SELECT name FROM sqlite_master WHERE type='table' AND name='${table}';`,
          params: [],
        }),
      });

      const latencyMs = Math.round(performance.now() - startTime);

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({ errors: [{ message: res.statusText }] }));
        const errMsg = errJson.errors?.[0]?.message || `HTTP ${res.status}`;
        return {
          ok: false,
          latencyMs,
          message: `D1 鉴权或查询失败: ${errMsg}`,
          lastChecked: Date.now(),
        };
      }

      return {
        ok: true,
        latencyMs,
        message: `D1 数据库连接验证成功 (延迟 ${latencyMs}ms)`,
        lastChecked: Date.now(),
        details: { tableExists: true },
      };
    } catch (err: any) { lastError = err; }
  }

  // 2. Try native Cloudflare Pages Functions endpoint (/api/sync)
  try {
    const headers: Record<string, string> = {};
    if (config.secretToken) {
      headers['x-sync-secret'] = config.secretToken;
    }

    const nativeRes = await fetch('/api/sync', { method: 'GET', headers });
    const contentType = nativeRes.headers.get('content-type') || '';
    const latencyMs = Math.round(performance.now() - startTime);
    if ((nativeRes.ok || nativeRes.status === 404) && (contentType.includes('application/json') || nativeRes.status === 404)) {
      return {
        ok: true,
        latencyMs,
        message: `Cloudflare Pages 绑定就绪，后端接口 (/api/sync) 连接畅通！(延迟 ${latencyMs}ms)`,
        lastChecked: Date.now(),
      };
    }
  } catch (err: any) {
    lastError = err;
  }

  const latencyMs = Math.round(performance.now() - startTime);
  return {
    ok: false,
    latencyMs,
    message: formatFetchError(
      lastError,
      '未能连通 Cloudflare Pages /api/sync 接口。若已在 Pages 绑定 D1，请确认已重新部署(Redeploy)；若未部署到 Pages，请填写上方凭证。'
    ),
    lastChecked: Date.now(),
  };
}

export async function initAndTestCloudflareD1(
  config: CloudflareD1Config
): Promise<CloudflareServiceResult> {
  let lastError: any = null;
  const startTime = performance.now();
  const { accountId, databaseId, apiToken, tableName } = config;

  if (accountId && databaseId && apiToken) {
    const table = (tableName || 'onenav_sync').trim();
    const apiPath = `/accounts/${accountId.trim()}/d1/database/${databaseId.trim()}/query`;
    const url = getCloudflareApiUrl(apiPath);
    const initSql = `CREATE TABLE IF NOT EXISTS ${table} (id TEXT PRIMARY KEY, data TEXT NOT NULL, updated_at INTEGER NOT NULL);`;

    try {
      const res = await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sql: initSql,
          params: [],
        }),
      });

      const latencyMs = Math.round(performance.now() - startTime);

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({ errors: [{ message: res.statusText }] }));
        const errMsg = errJson.errors?.[0]?.message || `HTTP ${res.status}`;
        return {
          success: false,
          message: `初始化 D1 表失败: ${errMsg}`,
          latencyMs,
        };
      }

      return {
        success: true,
        message: `D1 数据库连接成功并已确保「${table}」表就绪 (耗时 ${latencyMs}ms)`,
        latencyMs,
      };
    } catch (err: any) { lastError = err; }
  }

  try {
    const headers: Record<string, string> = {};
    if (config.secretToken) {
      headers['x-sync-secret'] = config.secretToken;
    }

    const nativeRes = await fetch('/api/sync', { method: 'GET', headers });
    const contentType = nativeRes.headers.get('content-type') || '';
    const latencyMs = Math.round(performance.now() - startTime);
    if ((nativeRes.ok || nativeRes.status === 404) && (contentType.includes('application/json') || nativeRes.status === 404)) {
      return {
        success: true,
        message: `Cloudflare Pages 绑定就绪 (/api/sync 延迟 ${latencyMs}ms)，表结构将在首次保存时全自动建立！`,
        latencyMs,
      };
    }
  } catch (err: any) {
    lastError = err;
  }

  return {
    success: false,
    message: formatFetchError(
      lastError,
      '未能连通 Cloudflare Pages /api/sync 接口。若已在 Pages 绑定 D1，请确认已重新部署(Redeploy)；或填写上方凭证。'
    ),
  };
}

export async function fetchFromCloudflareD1(
  config: CloudflareD1Config
): Promise<CloudflareServiceResult> {
  let lastError: any = null;
  const { accountId, databaseId, apiToken, tableName } = config;

  if (accountId && databaseId && apiToken) {
    const startTime = performance.now();
    const table = (tableName || 'onenav_sync').trim();
    const apiPath = `/accounts/${accountId.trim()}/d1/database/${databaseId.trim()}/query`;
    const url = getCloudflareApiUrl(apiPath);

    try {
      const res = await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sql: `SELECT data, updated_at FROM ${table} WHERE id = 'main_data' LIMIT 1;`,
          params: [],
        }),
      });

      const latencyMs = Math.round(performance.now() - startTime);

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({ errors: [{ message: res.statusText }] }));
        const errMsg = errJson.errors?.[0]?.message || `HTTP ${res.status}`;
        return {
          success: false,
          message: `D1 查询失败: ${errMsg}`,
          latencyMs,
        };
      }

      const json = await res.json();
      const rows = json.result?.[0]?.results;

      if (!rows || rows.length === 0 || !rows[0].data) {
        return {
          success: false,
          message: `D1 表「${table}」中暂无同步记录，请先点击“推送到 D1 保存”`,
          latencyMs,
        };
      }

      const rawData = rows[0].data;
      const payload: OneNavSyncPayload = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;

      return {
        success: true,
        message: '从 Cloudflare D1 关系型数据库读取成功',
        data: payload,
        latencyMs,
      };
    } catch (err: any) { lastError = err; }
  }

  // 2. Try native Cloudflare Pages Functions endpoint (/api/sync)
  try {
    const headers: Record<string, string> = {};
    if (config.secretToken) {
      headers['x-sync-secret'] = config.secretToken;
    }

    const nativeRes = await fetch('/api/sync', { method: 'GET', headers });
    const contentType = nativeRes.headers.get('content-type') || '';
    if (nativeRes.ok && (contentType.includes('application/json') || !contentType.includes('text/html'))) {
      const payload: OneNavSyncPayload = await nativeRes.json();
      return {
        success: true,
        message: '已通过 Cloudflare Pages 后端接口 (/api/sync) 成功同步 D1 数据',
        data: payload,
      };
    } else if (nativeRes.status === 404) {
      return {
        success: false,
        message: 'Cloudflare D1 连接畅通，但数据库暂无书签数据，请先点击「推送到 D1 保存」进行首次备份',
      };
    }
  } catch (err: any) {
    lastError = err;
  }

  return {
    success: false,
    message: formatFetchError(
      lastError,
      '未能连通 Cloudflare Pages /api/sync 接口。若已在 Pages 绑定 D1，请确认已重新部署(Redeploy)；或填写上方凭证。'
    ),
  };
}

export async function saveToCloudflareD1(
  config: CloudflareD1Config,
  payload: OneNavSyncPayload
): Promise<CloudflareServiceResult> {
  let lastError: any = null;
  const { accountId, databaseId, apiToken, tableName } = config;

  if (accountId && databaseId && apiToken) {
    const startTime = performance.now();
    const table = (tableName || 'onenav_sync').trim();
    const apiPath = `/accounts/${accountId.trim()}/d1/database/${databaseId.trim()}/query`;
    const url = getCloudflareApiUrl(apiPath);
    const jsonStr = JSON.stringify(payload);
    const now = Date.now();

    try {
      const statements = [
        {
          sql: `CREATE TABLE IF NOT EXISTS ${table} (id TEXT PRIMARY KEY, data TEXT NOT NULL, updated_at INTEGER NOT NULL);`,
          params: [],
        },
        {
          sql: `INSERT OR REPLACE INTO ${table} (id, data, updated_at) VALUES ('main_data', ?, ?);`,
          params: [jsonStr, now],
        },
      ];

      const res = await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(statements),
      });

      const latencyMs = Math.round(performance.now() - startTime);

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({ errors: [{ message: res.statusText }] }));
        const errMsg = errJson.errors?.[0]?.message || `HTTP ${res.status}`;
        return {
          success: false,
          message: `D1 保存失败: ${errMsg}`,
          latencyMs,
        };
      }

      return {
        success: true,
        message: '已成功保存至 Cloudflare D1 关系型数据库',
        data: payload,
        latencyMs,
      };
    } catch (err: any) { lastError = err; }
  }

  // 2. Try native Cloudflare Pages Functions endpoint (/api/sync)
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (config.secretToken) {
      headers['x-sync-secret'] = config.secretToken;
    }

    const nativeRes = await fetch('/api/sync', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (nativeRes.ok) {
      return {
        success: true,
        message: '已通过 Cloudflare Pages 后端接口 (/api/sync) 成功写入 D1 数据库',
        data: payload,
      };
    } else {
      const errJson = await nativeRes.json().catch(() => null);
      if (errJson?.error) {
        return {
          success: false,
          message: `Cloudflare Pages 写入失败: ${errJson.error}`,
        };
      }
    }
  } catch (err: any) {
    lastError = err;
  }

  return {
    success: false,
    message: formatFetchError(
      lastError,
      '未能通过 Cloudflare Pages /api/sync 接口保存。若已在 Pages 绑定，请确认已重新部署(Redeploy)；或填写上方凭证。'
    ),
  };
}

// ==========================================
// 3. Cloudflare GitHub Gist Health Check
// ==========================================

export async function checkGistConnectionStatus(
  token: string,
  gistId: string,
  filename?: string
): Promise<CloudflareConnectionStatus> {
  if (!token || !gistId) {
    return {
      ok: false,
      message: '尚未配置 GitHub Token 或 Gist ID',
    };
  }

  const startTime = performance.now();
  try {
    const res = await fetchWithTimeout(`https://api.github.com/gists/${gistId.trim()}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token.trim()}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    const latencyMs = Math.round(performance.now() - startTime);

    if (!res.ok) {
      return {
        ok: false,
        latencyMs,
        message: `Gist 鉴权失败: HTTP ${res.status}`,
        lastChecked: Date.now(),
      };
    }

    const gistData = await res.json();
    const targetFilename = filename || 'onenav-bookmarks.json';
    const files = gistData.files || {};
    const fileExists = Object.keys(files).some(
      (f) => f.toLowerCase() === targetFilename.toLowerCase()
    );

    return {
      ok: true,
      latencyMs,
      message: fileExists
        ? `Gist 连接正常 (延迟 ${latencyMs}ms)，找到目标文件「${targetFilename}」`
        : `Gist 连接成功 (延迟 ${latencyMs}ms)，但未找到文件「${targetFilename}」（首次保存时将自动创建）`,
      lastChecked: Date.now(),
      details: { fileExists },
    };
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - startTime);
    return {
      ok: false,
      latencyMs,
      message: `网络连接异常: ${err.message || '无法连接到 GitHub'}`,
      lastChecked: Date.now(),
    };
  }
}
