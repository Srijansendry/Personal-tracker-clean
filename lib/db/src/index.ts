import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { newDb } from "pg-mem";
import * as schema from "./schema";

const { Pool } = pg;

let clientPool: any;

if (process.env.DATABASE_URL) {
  clientPool = new Pool({ connectionString: process.env.DATABASE_URL });
} else {
  // Use pg-mem for zero-dependency in-memory Postgres engine
  const mem = newDb();
  
  // Register necessary postgres functions/types for pg-mem if needed
  mem.public.registerFunction({
    name: "to_char",
    implementation: (d: any, fmt: any) => {
      if (!d) return null;
      const date = new Date(d);
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      if (fmt === "YYYY-MM") return `${yyyy}-${mm}`;
      if (fmt === "YYYY-MM-DD") return `${yyyy}-${mm}-${dd}`;
      return `${yyyy}-${mm}-${dd}`;
    },
  });

  const adapter = mem.adapters.createPg();
  clientPool = new adapter.Pool();
  
  // Patch getTypeParser and query for Drizzle ORM node-postgres driver compatibility
  const patchQuery = (target: any) => {
    const origQuery = target.query.bind(target);
    target.query = function (config: any, values: any, cb: any) {
      let isArrayMode = false;
      if (typeof config === "object" && config !== null) {
        if (config.rowMode === "array") {
          isArrayMode = true;
        }
        delete config.rowMode;
        delete config.types;
      }
      const toCamel = (s: string) => s.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      const toSnake = (s: string) => s.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

      const formatRow = (row: any, fields: any[]) => {
        if (Array.isArray(row)) return row;
        if (!row || typeof row !== "object") return row;
        if (fields && fields.length > 0) {
          return fields.map((f: any) => {
            const key = typeof f === "string" ? f : f?.name;
            if (!key) return null;
            let val = row[key];
            if (val === undefined) val = row[toCamel(key)];
            if (val === undefined) val = row[toSnake(key)];
            if (val === undefined) val = row[key.toLowerCase()];
            if (val === undefined) val = null;
            if (val instanceof Date) return val.toISOString();
            return val;
          });
        }
        return Object.values(row);
      };
      if (typeof cb === "function") {
        return origQuery(config, values, (err: any, res: any) => {
          if (!err && res && isArrayMode && Array.isArray(res.rows)) {
            const fields = res.fields || [];
            res.rows = res.rows.map((row: any) => formatRow(row, fields));
          }
          cb(err, res);
        });
      }
      const promise = origQuery(config, values);
      if (promise && typeof promise.then === "function") {
        return promise.then((res: any) => {
          if (res && isArrayMode && Array.isArray(res.rows)) {
            const fields = res.fields || [];
            res.rows = res.rows.map((row: any) => formatRow(row, fields));
          }
          return res;
        });
      }
      return promise;
    };
  };
  clientPool.getTypeParser = (oid: number) => (val: any) => val;
  patchQuery(clientPool);

  const origConnect = clientPool.connect.bind(clientPool);
  clientPool.connect = async () => {
    const client = await origConnect();
    client.getTypeParser = (oid: number) => (val: any) => val;
    patchQuery(client);
    return client;
  };

  // Create tables in pg-mem
  clientPool.query(`
    CREATE TABLE IF NOT EXISTS tags (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#6366f1',
      icon TEXT,
      is_custom BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      priority TEXT NOT NULL DEFAULT 'medium',
      due_date DATE,
      due_time TEXT,
      tag_id INTEGER REFERENCES tags(id) ON DELETE SET NULL,
      completed_at TIMESTAMP,
      from_pdf BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
    CREATE TABLE IF NOT EXISTS habits (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      color TEXT DEFAULT '#FFB6C1',
      streak INTEGER NOT NULL DEFAULT 0,
      current_streak INTEGER NOT NULL DEFAULT 0,
      longest_streak INTEGER NOT NULL DEFAULT 0,
      level INTEGER NOT NULL DEFAULT 1,
      last_checked DATE,
      tag_id INTEGER REFERENCES tags(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
    CREATE TABLE IF NOT EXISTS user_stats (
      id SERIAL PRIMARY KEY,
      daily_streak INTEGER NOT NULL DEFAULT 0,
      level INTEGER NOT NULL DEFAULT 1,
      xp INTEGER NOT NULL DEFAULT 0,
      total_tasks_completed INTEGER NOT NULL DEFAULT 0,
      total_habits_checked INTEGER NOT NULL DEFAULT 0,
      last_active_date DATE,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
    CREATE TABLE IF NOT EXISTS finances (
      id SERIAL PRIMARY KEY,
      type TEXT NOT NULL,
      amount NUMERIC(12,2) NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      date DATE NOT NULL,
      due_date DATE,
      is_paid BOOLEAN NOT NULL DEFAULT true,
      tag_id INTEGER REFERENCES tags(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
    CREATE TABLE IF NOT EXISTS badges (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      icon TEXT NOT NULL,
      rarity TEXT NOT NULL DEFAULT 'common',
      earned_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
    CREATE TABLE IF NOT EXISTS user_integrations (
      id SERIAL PRIMARY KEY,
      platform TEXT NOT NULL,
      username TEXT NOT NULL,
      api_key TEXT,
      verified BOOLEAN NOT NULL DEFAULT true,
      last_synced_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS problems (
      id SERIAL PRIMARY KEY,
      platform TEXT NOT NULL,
      problem_slug TEXT NOT NULL,
      title TEXT NOT NULL,
      difficulty TEXT NOT NULL DEFAULT 'Medium',
      category TEXT NOT NULL DEFAULT 'homework',
      url TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      solved_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS leetcode_notes (
      id SERIAL PRIMARY KEY,
      problem_number TEXT NOT NULL,
      title TEXT NOT NULL,
      difficulty TEXT NOT NULL DEFAULT 'Medium',
      date_solved DATE NOT NULL,
      notes_image_url TEXT,
      code_solution TEXT,
      code_image_url TEXT,
      tags TEXT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
    CREATE TABLE IF NOT EXISTS webdev_notes (
      id SERIAL PRIMARY KEY,
      topic TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'General',
      date DATE NOT NULL,
      notes_url TEXT,
      code_snippet TEXT,
      tags TEXT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    );

    INSERT INTO problems (platform, problem_slug, title, difficulty, category, url, status) VALUES
      ('leetcode', 'delete-node-in-a-linked-list', 'Delete Node in a Linked List', 'Medium', 'classwork', 'https://leetcode.com/problems/delete-node-in-a-linked-list/', 'pending'),
      ('leetcode', 'linked-list-cycle', 'Linked List Cycle', 'Easy', 'classwork', 'https://leetcode.com/problems/linked-list-cycle/', 'solved'),
      ('leetcode', 'middle-of-the-linked-list', 'Middle of the Linked List', 'Easy', 'homework', 'https://leetcode.com/problems/middle-of-the-linked-list/', 'solved'),
      ('leetcode', 'reverse-linked-list', 'Reverse Linked List', 'Easy', 'homework', 'https://leetcode.com/problems/reverse-linked-list/', 'pending'),
      ('leetcode', 'min-stack', 'Min Stack', 'Medium', 'classwork', 'https://leetcode.com/problems/min-stack/', 'pending'),
      ('leetcode', 'valid-parentheses', 'Valid Parentheses', 'Easy', 'homework', 'https://leetcode.com/problems/valid-parentheses/', 'solved'),
      ('gfg', 'rat-in-a-maze-problem', 'Rat in a Maze Problem - I', 'Medium', 'classwork', 'https://www.geeksforgeeks.org/problems/rat-in-a-maze-problem/1', 'pending'),
      ('gfg', 'subset-sums', 'Subset Sums', 'Medium', 'homework', 'https://www.geeksforgeeks.org/problems/subset-sums1533/1', 'solved');

    INSERT INTO tags (name, color, icon, is_custom) VALUES
      ('Work', '#FFB6C1', 'Briefcase', false),
      ('Personal', '#C8A2C8', 'User', false),
      ('Health', '#90EE90', 'Heart', false),
      ('Learning', '#AFEEEE', 'Book', false),
      ('Finance', '#FFDAB9', 'DollarSign', false);

    INSERT INTO user_stats (daily_streak, level, xp, total_tasks_completed, total_habits_checked) VALUES
      (1, 1, 0, 0, 0);

    INSERT INTO badges (name, description, icon, rarity) VALUES
      ('First Step', 'Created your first task', 'Target', 'common'),
      ('Early Bird', 'Completed a task before noon', 'Zap', 'common');
  `).catch(console.error);
}

export const pool = clientPool;
export const db = drizzle(pool, { schema });

export * from "./schema";
