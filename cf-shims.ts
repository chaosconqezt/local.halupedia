import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

export class LocalKV {
  private db: any;
  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS kv (
        namespace TEXT,
        key TEXT,
        value TEXT,
        metadata TEXT,
        expirationTtl INTEGER,
        PRIMARY KEY (namespace, key)
      )
    `);
  }

  getDb() { return this.db; }

  namespace(name: string) {
    const db = this.db;
    return {
      async get(key: string, type?: 'text' | 'json') {
        const row = db.prepare('SELECT value, metadata FROM kv WHERE namespace = ? AND key = ?').get(name, key);
        if (!row) return null;
        if (type === 'json') return JSON.parse(row.value);
        return row.value;
      },
      async put(key: string, value: string, options?: any) {
        let metadata = null;
        if (options && options.metadata) metadata = JSON.stringify(options.metadata);
        db.prepare('INSERT OR REPLACE INTO kv (namespace, key, value, metadata, expirationTtl) VALUES (?, ?, ?, ?, ?)').run(
          name, key, value, metadata, options?.expirationTtl || null
        );
      },
      async delete(key: string) {
        db.prepare('DELETE FROM kv WHERE namespace = ? AND key = ?').run(name, key);
      },
      async list(options?: { prefix?: string, limit?: number, cursor?: string }) {
        let query = 'SELECT key, metadata FROM kv WHERE namespace = ?';
        const params: any[] = [name];
        if (options?.prefix) {
          query += ' AND key LIKE ?';
          params.push(options.prefix + '%');
        }
        query += ' ORDER BY key ASC';
        if (options?.limit) {
          query += ' LIMIT ?';
          params.push(options.limit);
        }
        
        const rows = db.prepare(query).all(...params);
        return {
          keys: rows.map((r: any) => ({
            name: r.key,
            metadata: r.metadata ? JSON.parse(r.metadata) : undefined
          })),
          list_complete: true,
          cursor: null
        };
      }
    };
  }
}

export class LocalD1 {
  private db: any;
  constructor(dbPath: string) {
    this.db = new Database(dbPath);
  }

  prepare(query: string) {
    const db = this.db;
    let bindArgs: any[] = [];
    const stmt = {
      bind(...args: any[]) {
        bindArgs = args;
        return stmt;
      },
      async all() {
        try {
            const results = db.prepare(query).all(...bindArgs);
            return { success: true, results };
        } catch (e: any) {
             return { success: false, error: e.message, results: [] };
        }
      },
      async first(colName?: string) {
        const result = db.prepare(query).get(...bindArgs);
        if (!result) return null;
        if (colName) return result[colName];
        return result;
      },
      async run() {
        try {
            const info = db.prepare(query).run(...bindArgs);
            return { success: true, meta: { changes: info.changes } };
        } catch (e: any) {
            return { success: false, error: e.message };
        }
      }
    };
    return stmt;
  }
  
  async batch(statements: any[]) {
      // Very crude batch
      const results = [];
      for (const stmt of statements) {
          results.push(await stmt.run());
      }
      return results;
  }
  
  async exec(query: string) {
      this.db.exec(query);
      return { count: 1, duration: 0 };
  }
}

export class LocalR2 {
  private dir: string;
  constructor(dir: string) {
    this.dir = dir;
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  async get(key: string) {
    const p = path.join(this.dir, key);
    if (!fs.existsSync(p)) return null;
    const body = fs.readFileSync(p);
    return {
      body,
      async arrayBuffer() { return body.buffer; },
      async text() { return body.toString('utf-8'); },
      bodyStream: null // crude fallback
    };
  }

  async put(key: string, value: string | ArrayBuffer) {
    const p = path.join(this.dir, key);
    if (typeof value === 'string') {
        fs.writeFileSync(p, value);
    } else if (value instanceof Buffer) {
        fs.writeFileSync(p, value);
    } else if (value instanceof ArrayBuffer) {
        fs.writeFileSync(p, Buffer.from(value));
    } else {
        // stream
        fs.writeFileSync(p, 'stream-not-supported');
    }
  }
}
