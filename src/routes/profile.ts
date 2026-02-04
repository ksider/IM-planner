import express from "express";
import bcrypt from "bcryptjs";
import type { Db } from "../db.js";
import { getUserPasswordHash, updateUserName, updateUserPassword } from "../repos/users_repo.js";
import { listExperimentsForOwnerWithMeta, type ExperimentListRow } from "../repos/experiments_repo.js";

export function createProfileRouter(db: Db) {
  const router = express.Router();

  const enrich = (experiments: ExperimentListRow[]) =>
    experiments.map((exp) => {
      const summaryCount = Number(exp.qual_summary_count || 0);
      const valueCount = Number(exp.qual_run_value_count || 0);
      let status = "not_started";
      let statusLabel = "Not started";
      if (exp.status_done_manual === 1) {
        status = "done";
        statusLabel = "Done";
      } else if (summaryCount >= 6) {
        status = "done";
        statusLabel = "Done";
      } else if (summaryCount > 0 || valueCount > 0) {
        status = "in_progress";
        statusLabel = "In progress";
      }
      return { ...exp, status, statusLabel };
    });

  router.get("/me", (req, res) => {
    const experiments = req.user?.id
      ? listExperimentsForOwnerWithMeta(db, req.user.id, false)
      : [];
    res.render("profile", { title: "Profile", experiments: enrich(experiments), error: null, notice: null });
  });

  router.post("/me/name", (req, res) => {
    const name = String(req.body?.name ?? "").trim();
    if (!req.user?.id) return res.redirect("/auth/login");
    updateUserName(db, req.user.id, name || null);
    return res.redirect("/me");
  });

  router.post("/me/password", (req, res) => {
    if (!req.user?.id) return res.redirect("/auth/login");
    const current = String(req.body?.current_password ?? "");
    const next = String(req.body?.new_password ?? "");
    const confirm = String(req.body?.confirm_password ?? "");

    const storedHash = getUserPasswordHash(db, req.user.id);
    if (!storedHash || !bcrypt.compareSync(current, storedHash)) {
      const experiments = listExperimentsForOwnerWithMeta(db, req.user.id, false);
      return res.render("profile", {
        title: "Profile",
        experiments: enrich(experiments),
        error: "Current password is incorrect.",
        notice: null
      });
    }
    if (next.length < 8 || next !== confirm) {
      const experiments = listExperimentsForOwnerWithMeta(db, req.user.id, false);
      return res.render("profile", {
        title: "Profile",
        experiments: enrich(experiments),
        error: "New password must be at least 8 characters and match confirmation.",
        notice: null
      });
    }
    const hash = bcrypt.hashSync(next, 12);
    updateUserPassword(db, req.user.id, hash);
    const experiments = listExperimentsForOwnerWithMeta(db, req.user.id, false);
    return res.render("profile", {
      title: "Profile",
      experiments: enrich(experiments),
      error: null,
      notice: "Password updated."
    });
  });

  return router;
}
