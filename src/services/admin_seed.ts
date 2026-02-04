import bcrypt from "bcryptjs";
import type { Db } from "../db.js";

export function ensureAdminUser(db: Db) {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const tempPassword = process.env.ADMIN_TEMP_PASSWORD;
  if (!email || !tempPassword) return;

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email) as
    | { id: number }
    | undefined;
  if (existing) return;

  const passwordHash = bcrypt.hashSync(tempPassword, 12);
  const createdAt = new Date().toISOString();
  db.prepare(
    `INSERT INTO users (email, password_hash, role, status, temp_password, created_at)
     VALUES (?, ?, 'admin', 'ACTIVE', 1, ?)`
  ).run(email, passwordHash, createdAt);
}
