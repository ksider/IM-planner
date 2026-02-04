import express from "express";
import type { Db } from "../db.js";
import {
  listExperimentsForOwnerWithMeta,
  listExperimentsWithMeta,
  type ExperimentListRow
} from "../repos/experiments_repo.js";

export function createHomeRouter(db: Db) {
  const router = express.Router();

  const enrich = (experiments: ExperimentListRow[]) =>
    experiments.map((exp) => {
      const ownerLabel = exp.owner_name?.trim() || exp.owner_email?.trim() || "Unassigned";
      const summaryCount = Number(exp.qual_summary_count || 0);
      const valueCount = Number(exp.qual_run_value_count || 0);
      let status = "not_started";
      let statusLabel = "Not started";
      if (summaryCount >= 6) {
        status = "done";
        statusLabel = "Done";
      } else if (summaryCount > 0 || valueCount > 0) {
        status = "in_progress";
        statusLabel = "In progress";
      }
      return { ...exp, owner_label: ownerLabel, status, statusLabel };
    });

  router.get("/", (req, res) => {
    // Admin sees all active experiments; others see only their own.
    const experiments =
      req.user?.role === "admin"
        ? listExperimentsWithMeta(db, false)
        : req.user?.id
          ? listExperimentsForOwnerWithMeta(db, req.user.id, false)
          : [];
    res.render("home", { experiments: enrich(experiments) });
  });

  router.get("/my-experiments", (req, res) => {
    // Personal list for the current user.
    const experiments = req.user?.id
      ? listExperimentsForOwnerWithMeta(db, req.user.id, false)
      : [];
    res.render("my_experiments", { experiments: enrich(experiments) });
  });

  return router;
}
