import express from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import type { Db } from "../db.js";
import { getAdminSettings, updateAllowedDomain, updateRequireHttps } from "../repos/admin_settings_repo.js";
import { insertAudit } from "../repos/audit_repo.js";
import {
  createUser,
  deleteSessionsByUser,
  deleteUser,
  listUsers,
  setTempPassword,
  setUserStatus,
  updateUser
} from "../repos/users_repo.js";
import { sendTempPasswordEmail } from "../services/email.js";
import { listExperiments, updateExperimentOwner, restoreExperiment } from "../repos/experiments_repo.js";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function wantsJson(req: express.Request) {
  return req.headers["x-requested-with"] === "fetch";
}

export function createAdminRouter(db: Db) {
  const router = express.Router();

  router.get("/", (_req, res) => {
    const settings = getAdminSettings(db);
    const users = listUsers(db);
    const experiments = listExperiments(db, true);
    const notice = typeof _req.query.notice === "string" ? _req.query.notice : null;
    const error = typeof _req.query.error === "string" ? _req.query.error : null;
    res.render("admin", {
      title: "Admin",
      settings,
      users,
      experiments,
      notice,
      error
    });
  });

  router.post("/domain", (req, res) => {
    const domain = String(req.body?.allowed_domain ?? "").trim().toLowerCase();
    const value = domain.length > 0 ? domain : null;
    updateAllowedDomain(db, value, req.user?.id ?? null);
    insertAudit(db, {
      actorUserId: req.user?.id ?? null,
      action: "admin.domain.update",
      targetUserId: null,
      detailsJson: JSON.stringify({ allowed_domain: value })
    });
    if (wantsJson(req)) {
      return res.json({ ok: true, message: "Domain updated" });
    }
    return res.redirect("/admin?notice=Domain updated");
  });

  router.post("/https", (req, res) => {
    const requireHttps = req.body?.require_https ? 1 : 0;
    updateRequireHttps(db, requireHttps, req.user?.id ?? null);
    insertAudit(db, {
      actorUserId: req.user?.id ?? null,
      action: "admin.https.update",
      targetUserId: null,
      detailsJson: JSON.stringify({ require_https: requireHttps })
    });
    if (wantsJson(req)) {
      return res.json({ ok: true, message: "HTTPS setting updated" });
    }
    return res.redirect("/admin?notice=HTTPS setting updated");
  });

  router.post("/users", async (req, res) => {
    const email = normalizeEmail(String(req.body?.email ?? ""));
    const name = String(req.body?.name ?? "").trim() || null;
    const role = String(req.body?.role ?? "").trim() || null;
    const status = String(req.body?.status ?? "ACTIVE").trim() || "ACTIVE";
    if (!email) {
      if (wantsJson(req)) {
        return res.status(400).json({ ok: false, message: "Email required" });
      }
      return res.redirect("/admin?error=Email required");
    }

    const tempPassword = crypto.randomBytes(6).toString("base64").replace(/[^a-zA-Z0-9]/g, "").slice(0, 10);
    const passwordHash = bcrypt.hashSync(tempPassword, 12);

    try {
      const userId = createUser(db, {
        email,
        name,
        passwordHash,
        role,
        status,
        tempPassword: 1
      });
      insertAudit(db, {
        actorUserId: req.user?.id ?? null,
        action: "admin.user.create",
        targetUserId: userId,
        detailsJson: JSON.stringify({ email, name, role, status })
      });

      const emailed = await sendTempPasswordEmail(email, tempPassword);
      const notice = emailed
        ? "User created and email sent"
        : `User created. Temporary password: ${tempPassword}`;
      if (wantsJson(req)) {
        return res.json({ ok: true, message: notice, tempPassword });
      }
      return res.redirect(`/admin?notice=${encodeURIComponent(notice)}`);
    } catch {
      if (wantsJson(req)) {
        return res.status(400).json({ ok: false, message: "Failed to create user (maybe duplicate email)" });
      }
      return res.redirect("/admin?error=Failed to create user (maybe duplicate email)");
    }
  });

  router.post("/users/:id", (req, res) => {
    const id = Number(req.params.id);
    const email = normalizeEmail(String(req.body?.email ?? ""));
    const name = String(req.body?.name ?? "").trim() || null;
    const role = String(req.body?.role ?? "").trim() || null;
    const status = String(req.body?.status ?? "ACTIVE").trim() || "ACTIVE";
    if (!email || Number.isNaN(id)) {
      if (wantsJson(req)) {
        return res.status(400).json({ ok: false, message: "Invalid user" });
      }
      return res.redirect("/admin?error=Invalid user");
    }
    updateUser(db, id, { name, email, role, status });
    insertAudit(db, {
      actorUserId: req.user?.id ?? null,
      action: "admin.user.update",
      targetUserId: id,
      detailsJson: JSON.stringify({ email, name, role, status })
    });
    if (wantsJson(req)) {
      return res.json({ ok: true, message: "User updated" });
    }
    return res.redirect("/admin?notice=User updated");
  });

  router.post("/users/:id/ban", (req, res) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      if (wantsJson(req)) {
        return res.status(400).json({ ok: false, message: "Invalid user" });
      }
      return res.redirect("/admin?error=Invalid user");
    }
    setUserStatus(db, id, "DISABLED");
    deleteSessionsByUser(db, id);
    insertAudit(db, {
      actorUserId: req.user?.id ?? null,
      action: "admin.user.ban",
      targetUserId: id,
      detailsJson: null
    });
    if (wantsJson(req)) {
      return res.json({ ok: true, message: "User banned" });
    }
    return res.redirect("/admin?notice=User banned");
  });

  router.post("/users/:id/unban", (req, res) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      if (wantsJson(req)) {
        return res.status(400).json({ ok: false, message: "Invalid user" });
      }
      return res.redirect("/admin?error=Invalid user");
    }
    setUserStatus(db, id, "ACTIVE");
    insertAudit(db, {
      actorUserId: req.user?.id ?? null,
      action: "admin.user.unban",
      targetUserId: id,
      detailsJson: null
    });
    if (wantsJson(req)) {
      return res.json({ ok: true, message: "User unbanned" });
    }
    return res.redirect("/admin?notice=User unbanned");
  });

  router.post("/users/:id/force-logout", (req, res) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      if (wantsJson(req)) {
        return res.status(400).json({ ok: false, message: "Invalid user" });
      }
      return res.redirect("/admin?error=Invalid user");
    }
    deleteSessionsByUser(db, id);
    insertAudit(db, {
      actorUserId: req.user?.id ?? null,
      action: "admin.user.force_logout",
      targetUserId: id,
      detailsJson: null
    });
    if (wantsJson(req)) {
      return res.json({ ok: true, message: "User logged out" });
    }
    return res.redirect("/admin?notice=User logged out");
  });

  router.post("/users/:id/delete", (req, res) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      if (wantsJson(req)) {
        return res.status(400).json({ ok: false, message: "Invalid user" });
      }
      return res.redirect("/admin?error=Invalid user");
    }
    deleteSessionsByUser(db, id);
    deleteUser(db, id);
    insertAudit(db, {
      actorUserId: req.user?.id ?? null,
      action: "admin.user.delete",
      targetUserId: id,
      detailsJson: null
    });
    if (wantsJson(req)) {
      return res.json({ ok: true, message: "User deleted" });
    }
    return res.redirect("/admin?notice=User deleted");
  });

  router.post("/experiments/:id/owner", (req, res) => {
    const experimentId = Number(req.params.id);
    const ownerUserId = req.body?.owner_user_id ? Number(req.body.owner_user_id) : null;
    if (!Number.isFinite(experimentId)) {
      if (wantsJson(req)) {
        return res.status(400).json({ ok: false, message: "Invalid experiment" });
      }
      return res.redirect("/admin?error=Invalid experiment");
    }
    if (req.body?.owner_user_id && !Number.isFinite(ownerUserId)) {
      if (wantsJson(req)) {
        return res.status(400).json({ ok: false, message: "Invalid owner" });
      }
      return res.redirect("/admin?error=Invalid owner");
    }
    updateExperimentOwner(db, experimentId, Number.isFinite(ownerUserId) ? ownerUserId : null);
    insertAudit(db, {
      actorUserId: req.user?.id ?? null,
      action: "admin.experiment.owner_update",
      targetUserId: Number.isFinite(ownerUserId) ? ownerUserId : null,
      detailsJson: JSON.stringify({ experiment_id: experimentId })
    });
    if (wantsJson(req)) {
      return res.json({ ok: true, message: "Experiment owner updated" });
    }
    return res.redirect("/admin?notice=Experiment owner updated");
  });

  router.post("/experiments/:id/restore", (req, res) => {
    const experimentId = Number(req.params.id);
    const ownerUserId = req.body?.owner_user_id ? Number(req.body.owner_user_id) : null;
    if (!Number.isFinite(experimentId)) {
      if (wantsJson(req)) {
        return res.status(400).json({ ok: false, message: "Invalid experiment" });
      }
      return res.redirect("/admin?error=Invalid experiment");
    }
    restoreExperiment(db, experimentId, Number.isFinite(ownerUserId) ? ownerUserId : null);
    insertAudit(db, {
      actorUserId: req.user?.id ?? null,
      action: "admin.experiment.restore",
      targetUserId: Number.isFinite(ownerUserId) ? ownerUserId : null,
      detailsJson: JSON.stringify({ experiment_id: experimentId })
    });
    if (wantsJson(req)) {
      return res.json({ ok: true, message: "Experiment restored" });
    }
    return res.redirect("/admin?notice=Experiment restored");
  });

  router.post("/users/:id/reset-password", async (req, res) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      if (wantsJson(req)) {
        return res.status(400).json({ ok: false, message: "Invalid user" });
      }
      return res.redirect("/admin?error=Invalid user");
    }

    const tempPassword = crypto.randomBytes(6).toString("base64").replace(/[^a-zA-Z0-9]/g, "").slice(0, 10);
    const passwordHash = bcrypt.hashSync(tempPassword, 12);
    setTempPassword(db, id, passwordHash);

    insertAudit(db, {
      actorUserId: req.user?.id ?? null,
      action: "admin.user.reset_password",
      targetUserId: id,
      detailsJson: null
    });

    const email = String(req.body?.email ?? "").trim();
    const emailed = email ? await sendTempPasswordEmail(email, tempPassword) : false;
    if (wantsJson(req)) {
      return res.json({ ok: true, tempPassword, emailed, message: emailed ? "Temporary password sent" : "Temporary password generated" });
    }
    const notice = emailed
      ? "Temporary password sent"
      : `Temporary password: ${tempPassword}`;
    return res.redirect(`/admin?notice=${encodeURIComponent(notice)}`);
  });

  return router;
}
