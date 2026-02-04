import type { Db } from "../db.js";

export type AdminSettings = {
  id: number;
  allowed_domain: string | null;
  require_https: number;
  updated_at: string;
  updated_by: number | null;
};

export function getAdminSettings(db: Db): AdminSettings {
  const row = db.prepare("SELECT * FROM admin_settings ORDER BY id LIMIT 1").get() as AdminSettings | undefined;
  if (!row) {
    const result = db.prepare("INSERT INTO admin_settings (allowed_domain) VALUES (NULL)").run();
    return db.prepare("SELECT * FROM admin_settings WHERE id = ?").get(result.lastInsertRowid) as AdminSettings;
  }
  return row;
}

export function updateAllowedDomain(db: Db, domain: string | null, actorId: number | null) {
  db.prepare("UPDATE admin_settings SET allowed_domain = ?, updated_at = datetime('now'), updated_by = ? WHERE id = 1")
    .run(domain, actorId);
}

export function updateRequireHttps(db: Db, requireHttps: number, actorId: number | null) {
  db.prepare("UPDATE admin_settings SET require_https = ?, updated_at = datetime('now'), updated_by = ? WHERE id = 1")
    .run(requireHttps, actorId);
}
