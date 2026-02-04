import type { Request, Response, NextFunction } from "express";
import type { Db } from "../db.js";
import { getAdminSettings } from "../repos/admin_settings_repo.js";

export function createHttpsRedirect(db: Db) {
  return (req: Request, res: Response, next: NextFunction) => {
    const settings = getAdminSettings(db);
    if (!settings.require_https) return next();
    if (req.secure) return next();
    const proto = req.headers["x-forwarded-proto"];
    if (proto && String(proto).includes("https")) return next();
    const host = req.headers.host;
    if (!host) return next();
    return res.redirect(301, `https://${host}${req.originalUrl}`);
  };
}
