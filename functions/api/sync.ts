// Cloudflare Pages / Workers Type Definitions
interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
}

interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  first<T = unknown>(): Promise<T | null>;
  run(): Promise<any>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
  exec(query: string): Promise<any>;
}

interface EventContext<Env, P extends string, Data> {
  request: Request;
  functionPath: string;
  waitUntil: (promise: Promise<any>) => void;
  next: (input?: Request | string, init?: RequestInit) => Promise<Response>;
  env: Env;
  params: Record<P, string | string[]>;
  data: Data;
}

type PagesFunction<Env = unknown, P extends string = string, Data extends Record<string, unknown> = Record<string, unknown>> = (
  context: EventContext<Env, P, Data>
) => Response | Promise<Response>;

interface Env {
  ONENAV_KV?: KVNamespace;
  SYNC_SECRET?: string; // Optional secret token for API protection
  [key: string]: any; // Allow custom binding names like MY_DB, BOOKMARK_DB, etc.
}

function getDatabase(env: Env): D1Database | undefined {
  if (env.DB) return env.DB;
  if (env.D1) return env.D1;
  // Fallback to search any binding that looks like a D1 database (has .prepare)
  for (const key of Object.keys(env)) {
    const val = env[key];
    if (val && typeof val === 'object' && typeof (val as any).prepare === 'function') {
      return val as D1Database;
    }
  }
  return undefined;
}

function getKV(env: Env): KVNamespace | undefined {
  if (env.ONENAV_KV) return env.ONENAV_KV;
  if (env.KV) return env.KV;
  // Fallback to search any binding that looks like a KV namespace (has .get and .put)
  for (const key of Object.keys(env)) {
    const val = env[key];
    if (val && typeof val === 'object' && typeof (val as any).get === 'function' && typeof (val as any).put === 'function') {
      return val as KVNamespace;
    }
  }
  return undefined;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-sync-secret',
  'Access-Control-Max-Age': '86400',
};

function verifySecret(env: Env, request: Request): boolean {
  const envSecret = env.SYNC_SECRET;
  if (!envSecret) return true; // No secret configured in environment, allow all

  const clientSecret = request.headers.get('Authorization')?.replace('Bearer ', '') || 
                       request.headers.get('x-sync-secret') ||
                       new URL(request.url).searchParams.get('secret');

  return clientSecret === envSecret;
}

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, request } = context;
  const url = new URL(request.url);
  const action = url.searchParams.get('action') || url.searchParams.get('ping');

  // 1. Verify secret if configured
  if (!verifySecret(env, request)) {
    return new Response(JSON.stringify({ error: 'Unauthorized: Invalid sync secret' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const db = getDatabase(env);
    const kv = getKV(env);

    // Health check / probe endpoint
    if (action === 'health' || action === 'ping' || action === '1') {
      return new Response(
        JSON.stringify({
          ok: true,
          status: 'ready',
          hasD1: Boolean(db),
          hasKV: Boolean(kv),
          authRequired: Boolean(env.SYNC_SECRET),
          message: 'Cloudflare Pages 后端服务与存储绑定正常',
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
          },
        }
      );
    }

    // 1. Try D1
    if (db) {
      const result = await db.prepare(
        "SELECT data, updated_at FROM onenav_sync WHERE id = 'main_data' LIMIT 1"
      ).first<{ data: string; updated_at: number }>().catch(() => {
        // Table might not exist yet
        return null;
      });

      if (result && result.data) {
        return new Response(result.data, {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
          },
        });
      }
    }

    // 2. Try KV
    if (kv) {
      const value = await kv.get('onenav_bookmarks');
      if (value) {
        return new Response(value, {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
          },
        });
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        empty: true,
        hasD1: Boolean(db),
        hasKV: Boolean(kv),
        message: 'Cloudflare 存储已连接，暂无云端书签数据',
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'Failed to read from Cloudflare storage' }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { env, request } = context;

  // 1. Verify secret if configured
  if (!verifySecret(env, request)) {
    return new Response(JSON.stringify({ error: 'Unauthorized: Invalid sync secret' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const rawData = await request.text();
    // Validate JSON format
    JSON.parse(rawData);

    const db = getDatabase(env);
    const kv = getKV(env);

    // 1. Save to D1 if configured
    if (db) {
      // Ensure table exists on write if it doesn't
      await db.exec(
        "CREATE TABLE IF NOT EXISTS onenav_sync (id TEXT PRIMARY KEY, data TEXT NOT NULL, updated_at INTEGER NOT NULL);"
      ).catch(() => {});

      await db.prepare(
        "INSERT OR REPLACE INTO onenav_sync (id, data, updated_at) VALUES ('main_data', ?, ?);"
      )
        .bind(rawData, Date.now())
        .run();
    }

    // 2. Save to KV if configured
    if (kv) {
      await kv.put('onenav_bookmarks', rawData);
    }

    if (!db && !kv) {
      return new Response(
        JSON.stringify({ error: 'Neither D1 database nor KV namespace binding is configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Saved to Cloudflare storage' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'Failed to write to Cloudflare storage' }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
};
