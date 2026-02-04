import express from "express";
import type { Db } from "../db.js";
import { listAudit } from "../repos/audit_repo.js";

export function createAuditRouter(db: Db) {
  const router = express.Router();
  const hasRole = (req: express.Request, roles: string[]) => roles.includes(req.user?.role ?? "");

  router.get("/", (req, res) => {
    if (!hasRole(req, ["admin", "manager"])) {
      return res.status(403).send("Forbidden");
    }
    const audit = listAudit(db, 200);
    res.render("audit", { title: "Audit Log", audit });
  });

  return router;
}
