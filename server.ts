import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import { serve } from "@hono/node-server";
import { LocalKV, LocalD1, LocalR2 } from "./cf-shims.js";
import honoApp from "./server/index.js";
import { createServer as createViteServer } from "vite";

const PORT = 3000;
const DB_PATH = path.join(process.cwd(), ".data");

if (!fs.existsSync(DB_PATH)) fs.mkdirSync(DB_PATH, { recursive: true });

async function checkLLMApi() {
    console.log("Checking LLM API connection...");
    const baseUrl = process.env.OPENAI_BASE_URL || "https://openrouter.ai/api/v1";
    const apiKey = process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY;
    const model = process.env.LLM_MODEL || process.env.OPENAI_MODEL || "dummy";
    
    if (!apiKey || apiKey === "dummy") {
        console.warn("\n⚠️ WARNING: No OPENAI_API_KEY or OPENROUTER_API_KEY provided in .env! Text generation will fail.");
        return;
    }

    try {
        const res = await fetch(`${baseUrl}/models`, {
            headers: {
                "Authorization": `Bearer ${apiKey}` // Required by most APIs
            }
        });
        if (!res.ok) {
            console.error(`\n❌ ERROR: LLM API returned ${res.status} ${res.statusText}`);
            const text = await res.text().catch(() => "");
            console.error(text);
            console.error(`Please check your OPENAI_BASE_URL and API keys in .env\n`);
        } else {
            console.log(`✅ LLM API connection successful (${baseUrl}). Using model: ${model}`);
        }
    } catch (e: any) {
        console.error(`\n❌ ERROR: Failed to connect to LLM API at ${baseUrl}`);
        console.error(e.message);
        console.error(`If you are using a local LLM, make sure it is running. Otherwise check your internet connection and .env settings.\n`);
    }
}

async function startServer() {
  await checkLLMApi();
  const expressApp = express();

  const mockKv = new LocalKV(path.join(DB_PATH, "kv.sqlite"));
  const mockD1 = new LocalD1(path.join(DB_PATH, "d1.sqlite"));
  const mockR2 = new LocalR2(path.join(DB_PATH, "r2"));

  // Mock Env implementation
  const DUMMY_FETCH = {
      async fetch(req: any) {
          // crude dummy stub for ASSETS.fetch
          return new Response("Not found", { status: 404 });
      }
  };
  
  const DUMMY_DO = {
      idFromName(name: string) { return name; },
      get(id: string) {
          return {
             async fetch() { return new Response("Presence stub placeholder", { status: 200 }); }
          }
      }
  }

  // Create tables for D1 since D1 expects them
  await mockD1.exec(`
    CREATE TABLE IF NOT EXISTS articles (
        slug TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        score INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS article_votes (
        user_id TEXT NOT NULL,
        slug TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        PRIMARY KEY (user_id, slug)
    );
    CREATE TABLE IF NOT EXISTS article_moderation (
        slug TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        reason TEXT,
        enqueued_at INTEGER NOT NULL,
        checked_at INTEGER,
        created_ip TEXT
    );
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        username TEXT NOT NULL,
        created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS comments (
        id TEXT PRIMARY KEY,
        slug TEXT NOT NULL,
        parent_id TEXT,
        user_id TEXT NOT NULL,
        body TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        score INTEGER NOT NULL DEFAULT 0,
        moderation_status TEXT NOT NULL DEFAULT 'ok'
    );
    CREATE TABLE IF NOT EXISTS votes (
        user_id TEXT NOT NULL,
        comment_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        PRIMARY KEY (user_id, comment_id)
    );
    CREATE TABLE IF NOT EXISTS images (
        uuid TEXT PRIMARY KEY,
        slug TEXT NOT NULL,
        prompt TEXT,
        status TEXT,
        created_at INTEGER NOT NULL,
        generated_at INTEGER,
        error TEXT
    );
    CREATE TABLE IF NOT EXISTS link_hints (
        target_slug TEXT NOT NULL,
        source_slug TEXT NOT NULL,
        blurb TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        PRIMARY KEY (target_slug, source_slug)
    );
    CREATE TABLE IF NOT EXISTS admins (
        username TEXT PRIMARY KEY,
        password_sha512 TEXT NOT NULL
    );
  `);

  try {
      // Check if old schema exists
      const cols = await mockD1.prepare("PRAGMA table_info(link_hints)").all() as any;
      if (cols.results && cols.results.length > 0 && !cols.results.find((c: any) => c.name === "target_slug")) {
          // Drop and recreate because primary key changed from slug to (target_slug, source_slug)
          await mockD1.exec("DROP TABLE link_hints");
          await mockD1.exec(`
            CREATE TABLE link_hints (
                target_slug TEXT NOT NULL,
                source_slug TEXT NOT NULL,
                blurb TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                PRIMARY KEY (target_slug, source_slug)
            );
          `);
      }
  } catch(e) {
      // Ignore
  }
  
  // Inject mock environments into hono via middleware
  expressApp.use(async (req, res, next) => {
    // If the path isn't /api, /img, /halupedia, /hallucinopedia, skip Hono entirely so Vite can serve it
    if (!req.path.startsWith("/api") && 
        !req.path.startsWith("/img") && 
        !req.path.startsWith("/halupedia") && 
        !req.path.startsWith("/hallucinopedia")) {
        return next();
    }
    
    const env = {
      ARTICLES: mockKv.namespace("articles"),
      DB: mockD1,
      ASSETS: DUMMY_FETCH,
      IMAGES: mockR2,
      OPENROUTER_API_KEY: process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY || "dummy",
      OPENROUTER_MODEL: process.env.LLM_MODEL || process.env.OPENAI_MODEL || "dummy",
      PRESENCE: DUMMY_DO,
      // Pass other things or limits
      MAX_ARTICLES_PER_DAY: "5000",
      GEN_PER_IP_PER_HOUR: "100",
      SEARCH_PER_IP_PER_HOUR: "100",
      IDENT_PER_IP_PER_HOUR: "100",
    };
    
    // Instead of serving Hono directly with node-server for every request, 
    // we can wrap the web standard request
    try {
        const webReq = createWebRequest(req);
        // Extend the Request object to provide `c.env` implicitly via fetch execution context
        const honoRes = await honoApp.fetch(webReq, env, {
           waitUntil: (promise: Promise<any>) => {
               promise.catch(console.error);
           },
           passThroughOnException: () => {}
        } as any);
        
        // Translate Response back to express
        const headers: Record<string, string> = {};
        honoRes.headers.forEach((value, key) => { headers[key] = value; });
        res.status(honoRes.status);
        res.set(headers);
        
        if (honoRes.body) {
           const reader = honoRes.body.getReader();
           while (true) {
               const { done, value } = await reader.read();
               if (done) break;
               res.write(Buffer.from(value));
           }
           res.end();
        } else {
           res.end();
        }
    } catch (e: any) {
        console.error("Hono crash:", e);
        res.status(500).send(e.message);
    }
  });

  // Helper to convert Express Request -> Web Standard Request
  function createWebRequest(req: express.Request) {
     const url = `http://${req.headers.host || "localhost"}${req.originalUrl || req.url}`;
     const init: RequestInit = {
         method: req.method,
         headers: req.headers as Record<string, string>
     };
     if (req.method !== "GET" && req.method !== "HEAD") {
         init.body = req as any; // crude stream
         // @ts-ignore
         init.duplex = "half";
     }
     return new Request(url, init);
  }

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    expressApp.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    expressApp.use(express.static(distPath));
    expressApp.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  expressApp.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
