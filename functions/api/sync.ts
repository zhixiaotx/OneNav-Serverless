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
  DB?: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;

  try {
    // 1. Try D1
    if (env.DB) {
      const result = await env.DB.prepare(
        "SELECT data, updated_at FROM onenav_sync WHERE id = 'main_data' LIMIT 1"
      ).first<{ data: string; updated_at: number }>();

      if (result && result.data) {
        return new Response(result.data, {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
          },
        });
      }
    }

    // 2. Try KV
    if (env.ONENAV_KV) {
      const value = await env.ONENAV_KV.get('onenav_bookmarks');
      if (value) {
        return new Response(value, {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
          },
        });
      }
    }

    return new Response(
      JSON.stringify({ error: 'No data stored yet in KV or D1' }),
      {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'Failed to read from Cloudflare storage' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { env, request } = context;

  try {
    const rawData = await request.text();
    // Validate JSON format
    JSON.parse(rawData);

    // 1. Save to D1 if configured
    if (env.DB) {
      await env.DB.exec(
        "CREATE TABLE IF NOT EXISTS onenav_sync (id TEXT PRIMARY KEY, data TEXT NOT NULL, updated_at INTEGER NOT NULL);"
      );
      await env.DB.prepare(
        "INSERT OR REPLACE INTO onenav_sync (id, data, updated_at) VALUES ('main_data', ?, ?);"
      )
        .bind(rawData, Date.now())
        .run();
    }

    // 2. Save to KV if configured
    if (env.ONENAV_KV) {
      await env.ONENAV_KV.put('onenav_bookmarks', rawData);
    }

    if (!env.DB && !env.ONENAV_KV) {
      return new Response(
        JSON.stringify({ error: 'Neither DB (D1) nor ONENAV_KV binding is configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Saved to Cloudflare storage' }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'Failed to write to Cloudflare storage' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
