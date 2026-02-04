import session from "express-session";
import type { Db } from "../db.js";

type StoredSession = {
  cookie: {
    expires?: string | null;
  };
  passport?: {
    user?: number;
  };
};

function parseSession(data: string | null): StoredSession | null {
  if (!data) return null;
  try {
    return JSON.parse(data) as StoredSession;
  } catch {
    return null;
  }
}

export class SqliteSessionStore extends session.Store {
  private db: Db;

  constructor(db: Db) {
    super();
    this.db = db;
  }

  get(sid: string, callback: (err?: Error | null, session?: session.SessionData | null) => void) {
    try {
      const row = this.db
        .prepare("SELECT data, expires_at FROM sessions WHERE sid = ?")
        .get(sid) as { data: string | null; expires_at: string | null } | undefined;
      if (!row) return callback(null, null);

      if (row.expires_at) {
        const expiresAt = Date.parse(row.expires_at);
        if (Number.isFinite(expiresAt) && Date.now() > expiresAt) {
          this.destroy(sid, () => callback(null, null));
          return;
        }
      }

      const parsed = parseSession(row.data);
      if (!parsed) return callback(null, null);
      callback(null, parsed as session.SessionData);
    } catch (error) {
      callback(error as Error);
    }
  }

  set(sid: string, sess: session.SessionData, callback?: (err?: Error | null) => void) {
    try {
      const expires =
        sess.cookie?.expires instanceof Date ? sess.cookie.expires.toISOString() : sess.cookie?.expires ?? null;
      const userId =
        typeof sess.passport?.user === "number" ? sess.passport.user : null;
      const data = JSON.stringify(sess);
      this.db.prepare(
        `INSERT INTO sessions (sid, user_id, expires_at, data)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(sid) DO UPDATE SET user_id = excluded.user_id, expires_at = excluded.expires_at, data = excluded.data`
      ).run(sid, userId, expires, data);
      callback?.(null);
    } catch (error) {
      callback?.(error as Error);
    }
  }

  destroy(sid: string, callback?: (err?: Error | null) => void) {
    try {
      this.db.prepare("DELETE FROM sessions WHERE sid = ?").run(sid);
      callback?.(null);
    } catch (error) {
      callback?.(error as Error);
    }
  }

  touch(sid: string, sess: session.SessionData, callback?: (err?: Error | null) => void) {
    try {
      const expires =
        sess.cookie?.expires instanceof Date ? sess.cookie.expires.toISOString() : sess.cookie?.expires ?? null;
      this.db.prepare("UPDATE sessions SET expires_at = ? WHERE sid = ?").run(expires, sid);
      callback?.(null);
    } catch (error) {
      callback?.(error as Error);
    }
  }
}
