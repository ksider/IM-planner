import type { Request, Response, NextFunction } from "express";

export function ensureAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }

  const wantsHtml = req.accepts("html");
  if (wantsHtml) {
    return res.redirect("/auth/login");
  }

  return res.status(401).json({ error: "unauthorized" });
}

export function ensureAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role === "admin") {
    return next();
  }
  return res.status(403).send("Forbidden");
}
