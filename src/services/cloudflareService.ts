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

// ==========================================
// 1. Cloudflare Workers KV Operations
// ==========================================

/**
 * Tests connection to Cloudflare KV namespace and checks token permissions
 */
export async function testCloudflareKVConnection(
  config: CloudflareKVConfig
): Promise<CloudflareConnectionStatus> {
  const startTime = performance.now();

  // 1. Try testing native Cloudflare Pages Functions endpoint (/api/sync) first
  try {
    const nativeRes = await fetch('/api/sync', { method: 'GET' });
    const latencyMs = Math.round(performance.now() - startTime);
    if (nativeRes.ok || nativeRes.status === 404) {
      return {
        ok: true,
        latencyMs,
        message: `Cloudflare Pages 后端接口 (/api/sync) 连接成功！(延迟 ${latencyMs}ms)`,
        lastChecked: Date.now(),
      };
    }
  } catch {
    // ignore and try direct API
  }

  const { accountId, namespaceId, apiToken, keyName } = config;
  if (!accountId || !namespaceId || !apiToken) {
    return {
      ok: false,
      message: '请完整填写 Account ID、KV Namespace ID、API 令牌，或将项目部署至 Cloudflare Pages 使用 /api/sync 接口',
    };
  }

  const targetKey = keyName.trim() || 'onenav_bookmarks';
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId.trim()}/storage/kv/namespaces/${namespaceId.trim()}/values/${encodeURIComponent(targetKey)}`;

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
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - startTime);
    return {
      ok: false,
      latencyMs,
      message: `网络连接异常 (Failed to fetch): 浏览器端直接调用 Cloudflare API 会被 CORS 跨域拦截。请将项目部署至 Cloudflare Pages 以使用内置的 /api/sync 后端接口。`,
      lastChecked: Date.now(),
    };
  }
}

/**
 * Fetch bookmarks data directly from Cloudflare KV
 */
export async function fetchFromCloudflareKV(
  config: CloudflareKVConfig
): Promise<CloudflareServiceResult> {
  // 1. Try native Cloudflare Pages Functions endpoint (/api/sync) FIRST (avoids browser CORS)
  try {
    const nativeRes = await fetch('/api/sync', { method: 'GET' });
    if (nativeRes.ok) {
      const payload: OneNavSyncPayload = await nativeRes.json();
      return {
        success: true,
        message: '已通过 Cloudflare Pages 后端接口 (/api/sync) 成功同步 KV 数据',
        data: payload,
      };
    }
  } catch {
    // ignore and fallback to direct API if configured
  }

  const { accountId, namespaceId, apiToken, keyName } = config;

  // 2. Direct Cloudflare API fallback
  if (accountId && namespaceId && apiToken) {
    const startTime = performance.now();
    const targetKey = keyName.trim() || 'onenav_bookmarks';
    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId.trim()}/storage/kv/namespaces/${namespaceId.trim()}/values/${encodeURIComponent(targetKey)}`;

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
    } catch (err: any) {
      return {
        success: false,
        message: `KV 读取异常: 浏览器跨域拦截 (Failed to fetch)。请将项目部署至 Cloudflare Pages 并使用内置的 /api/sync 接口。`,
      };
    }
  }

  return {
    success: false,
    message: '请先配置 Cloudflare Pages 后端绑定或 Account ID、Namespace ID 与 API Token',
  };
}

/**
 * Save bookmarks payload directly to Cloudflare KV
 */
export async function saveToCloudflareKV(
  config: CloudflareKVConfig,
  payload: OneNavSyncPayload
): Promise<CloudflareServiceResult> {
  // 1. Try native Cloudflare Pages Functions endpoint (/api/sync) FIRST
  try {
    const nativeRes = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (nativeRes.ok) {
      return {
        success: true,
        message: '已通过 Cloudflare Pages 后端接口 (/api/sync) 成功持久化至 KV',
        data: payload,
      };
    }
  } catch {
    // ignore
  }

  const { accountId, namespaceId, apiToken, keyName } = config;

  // 2. Direct Cloudflare API fallback
  if (accountId && namespaceId && apiToken) {
    const startTime = performance.now();
    const targetKey = keyName.trim() || 'onenav_bookmarks';
    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId.trim()}/storage/kv/namespaces/${namespaceId.trim()}/values/${encodeURIComponent(targetKey)}`;
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
          message: `写入 KV 失败: ${errMsg}`,
          latencyMs,
        };
      }

      return {
        success: true,
        message: '已成功持久化至 Cloudflare KV 全球边缘存储',
        data: payload,
        latencyMs,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `KV 写入异常: 浏览器跨域拦截 (Failed to fetch)。建议使用 Cloudflare Pages 后端接口 (/api/sync)。`,
      };
    }
  }

  return {
    success: false,
    message: '请先配置 Cloudflare Pages 后端绑定或 Account ID、Namespace ID 与 API Token',
  };
}

// ==========================================
// 2. Cloudflare D1 Database Operations
// ==========================================

/**
 * Test D1 connection and optionally auto-initialize the SQLite schema table
 */
export async function testCloudflareD1Connection(
  config: CloudflareD1Config
): Promise<CloudflareConnectionStatus> {
  const { accountId, databaseId, apiToken, tableName } = config;
  if (!accountId || !databaseId || !apiToken) {
    return {
      ok: false,
      message: '请完整填写 Account ID、D1 Database ID 和 API 令牌',
    };
  }

  const startTime = performance.now();
  const table = (tableName || 'onenav_sync').trim();
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId.trim()}/d1/database/${databaseId.trim()}/query`;

  try {
    const res = await fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sql: `SELECT name FROM sqlite_master WHERE type='table' AND name=?;`,
        params: [table],
      }),
    });

    const latencyMs = Math.round(performance.now() - startTime);

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({ errors: [{ message: res.statusText }] }));
      const errMsg = errJson.errors?.[0]?.message || `HTTP ${res.status}`;
      return {
        ok: false,
        latencyMs,
        message: `D1 鉴权失败: ${errMsg}`,
        lastChecked: Date.now(),
      };
    }

    const json = await res.json();
    const tableFound = json.result?.[0]?.results?.length > 0;

    if (!tableFound) {
      return {
        ok: true,
        latencyMs,
        message: `D1 数据库连接成功 (${latencyMs}ms)，数据表「${table}」尚未建立，请点击“初始化表”`,
        lastChecked: Date.now(),
        details: { tableExists: false },
      };
    }

    return {
      ok: true,
      latencyMs,
      message: `D1 数据库与「${table}」表状态正常 (延迟 ${latencyMs}ms)`,
      lastChecked: Date.now(),
      details: { tableExists: true },
    };
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - startTime);
    return {
      ok: false,
      latencyMs,
      message: `D1 连接异常: ${err.message || '网络连接失败'}`,
      lastChecked: Date.now(),
    };
  }
}

/**
 * Initialize SQLite table in Cloudflare D1
 */
export async function initAndTestCloudflareD1(
  config: CloudflareD1Config
): Promise<CloudflareServiceResult> {
  const startTime = performance.now();

  // 1. Try testing native Cloudflare Pages Functions endpoint (/api/sync) first
  try {
    const nativeRes = await fetch('/api/sync', { method: 'GET' });
    const latencyMs = Math.round(performance.now() - startTime);
    if (nativeRes.ok || nativeRes.status === 404) {
      return {
        success: true,
        message: `Cloudflare Pages 后端接口 (/api/sync) 连接成功！(延迟 ${latencyMs}ms)`,
        latencyMs,
      };
    }
  } catch {
    // ignore and try direct API
  }

  const { accountId, databaseId, apiToken, tableName } = config;
  if (!accountId || !databaseId || !apiToken) {
    return {
      success: false,
      message: '请完整填写 Account ID、D1 Database ID、API 令牌，或将项目部署至 Cloudflare Pages 使用 /api/sync 接口',
    };
  }

  const table = (tableName || 'onenav_sync').trim();
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId.trim()}/d1/database/${databaseId.trim()}/query`;

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
  } catch (err: any) {
    return {
      success: false,
      message: `网络连接异常 (Failed to fetch): 浏览器端直接调用 Cloudflare API 会被 CORS 跨域拦截。请将项目部署至 Cloudflare Pages 以使用内置的 /api/sync 后端接口。`,
    };
  }
}

/**
 * Fetch bookmarks data directly from Cloudflare D1
 */
export async function fetchFromCloudflareD1(
  config: CloudflareD1Config
): Promise<CloudflareServiceResult> {
  // 1. Try native Cloudflare Pages Functions endpoint (/api/sync) FIRST (avoids browser CORS)
  try {
    const nativeRes = await fetch('/api/sync', { method: 'GET' });
    if (nativeRes.ok) {
      const payload: OneNavSyncPayload = await nativeRes.json();
      return {
        success: true,
        message: '已通过 Cloudflare Pages 后端接口 (/api/sync) 成功同步 D1 数据',
        data: payload,
      };
    }
  } catch {
    // ignore and fallback to direct API if configured
  }

  const { accountId, databaseId, apiToken, tableName } = config;

  // 2. Direct D1 REST API fallback
  if (accountId && databaseId && apiToken) {
    const startTime = performance.now();
    const table = (tableName || 'onenav_sync').trim();
    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId.trim()}/d1/database/${databaseId.trim()}/query`;

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
    } catch (err: any) {
      return {
        success: false,
        message: `D1 读取异常: 浏览器跨域拦截 (Failed to fetch)。请将项目部署至 Cloudflare Pages 并使用内置的 /api/sync 接口。`,
      };
    }
  }

  return {
    success: false,
    message: '请先配置 Cloudflare Pages 后端绑定或 Account ID、Database ID 与 API 令牌',
  };
}

/**
 * Save bookmarks payload directly to Cloudflare D1
 */
export async function saveToCloudflareD1(
  config: CloudflareD1Config,
  payload: OneNavSyncPayload
): Promise<CloudflareServiceResult> {
  // 1. Try native Cloudflare Pages Functions endpoint (/api/sync) FIRST
  try {
    const nativeRes = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (nativeRes.ok) {
      return {
        success: true,
        message: '已通过 Cloudflare Pages 后端接口 (/api/sync) 成功持久化至 D1',
        data: payload,
      };
    }
  } catch {
    // ignore
  }

  const { accountId, databaseId, apiToken, tableName } = config;

  // 2. Direct D1 REST API fallback
  if (accountId && databaseId && apiToken) {
    const startTime = performance.now();
    const table = (tableName || 'onenav_sync').trim();
    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId.trim()}/d1/database/${databaseId.trim()}/query`;

    const jsonStr = JSON.stringify(payload);
    const now = Date.now();

    try {
      // First ensure table exists and execute upsert in a transaction batch
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
    } catch (err: any) {
      return {
        success: false,
        message: `D1 保存异常: 浏览器跨域拦截 (Failed to fetch)。建议使用 Cloudflare Pages 后端接口 (/api/sync)。`,
      };
    }
  }

  return {
    success: false,
    message: '请先配置 Cloudflare Pages 后端绑定或 Account ID、Database ID 与 API 令牌',
  };
}

// ==========================================
// 3. GitHub Gist Health Check (for status indicator)
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
      const err = await res.json().catch(() => ({ message: res.statusText }));
      return {
        ok: false,
        latencyMs,
        message: `GitHub Gist 访问异常: ${err.message || res.statusText}`,
        lastChecked: Date.now(),
      };
    }

    const json = await res.json();
    const targetFile = json.files?.[filename || 'onenav-bookmarks.json'];

    return {
      ok: true,
      latencyMs,
      message: `GitHub Gist 在线 (${latencyMs}ms)，${targetFile ? '已绑定有效书签文件' : '文件就绪'}`,
      lastChecked: Date.now(),
      details: {
        updatedAt: json.updated_at,
        filesCount: Object.keys(json.files || {}).length,
      },
    };
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - startTime);
    return {
      ok: false,
      latencyMs,
      message: `网络连接异常: ${err.message}`,
      lastChecked: Date.now(),
    };
  }
}
